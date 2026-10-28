import type { jsPDF } from "jspdf";

/**
 * Exported PDFs are pictures of the board, so each one also carries the
 * board itself as an attached file. Opening the PDF in StickyBoard reads
 * that file back; other PDF readers list it under Attachments.
 */
const ATTACHMENT_NAME = "stickyboard-board.json";
/** Extra key on the attached file so it can be found without a full PDF parser. */
const MARKER_KEY = "StickyBoardData";

/** The parts of jsPDF's internal API used to write extra objects. */
interface JsPdfInternal {
  events: { subscribe: (event: string, handler: () => void) => void };
  newObject: () => number;
  write: (...text: string[]) => void;
  putStream: (options: {
    data: string;
    filters?: string[];
    objectId?: number;
    additionalKeyValues?: { key: string; value: string }[];
  }) => void;
}

/** jsPDF writes binary data as strings with one character per byte. */
function toBinaryString(bytes: Uint8Array) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return text;
}

/** Attaches `data` to the PDF as an embedded file. Call before `pdf.output()`. */
export function attachBoardData(pdf: jsPDF, data: Uint8Array) {
  const internal = pdf.internal as unknown as JsPdfInternal;
  let namesId = 0;
  internal.events.subscribe("postPutResources", () => {
    const fileId = internal.newObject();
    internal.putStream({
      data: toBinaryString(data),
      filters: ["FlateEncode"],
      objectId: fileId,
      additionalKeyValues: [
        { key: "Type", value: "/EmbeddedFile" },
        { key: "Subtype", value: "/application#2Fjson" },
        { key: "Params", value: `<< /Size ${data.length} >>` },
        { key: MARKER_KEY, value: "1" },
      ],
    });
    internal.write("endobj");

    const specId = internal.newObject();
    internal.write(
      `<< /Type /Filespec /F (${ATTACHMENT_NAME}) /UF (${ATTACHMENT_NAME}) ` +
        `/Desc (Editable StickyBoard board) /EF << /F ${fileId} 0 R >> >>`,
    );
    internal.write("endobj");

    namesId = internal.newObject();
    internal.write(`<< /Names [(${ATTACHMENT_NAME}) ${specId} 0 R] >>`);
    internal.write("endobj");
  });
  internal.events.subscribe("putCatalog", () => internal.write(`/Names << /EmbeddedFiles ${namesId} 0 R >>`));
}

/** A stream in the PDF: its dictionary and its raw bytes. */
interface PdfStream {
  dict: string;
  data: Uint8Array;
}

/**
 * Reads the stream that starts after `dictStart`. Only handles what
 * StickyBoard writes: a direct /Length and no encryption.
 */
function readStream(bytes: Uint8Array, text: string, dictStart: number): PdfStream | null {
  const streamAt = text.indexOf("stream", dictStart);
  if (streamAt < 0) return null;
  const dict = text.slice(dictStart, streamAt);
  const length = Number(/\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict)?.[1]);
  if (!Number.isFinite(length)) return null;
  let start = streamAt + "stream".length;
  if (text[start] === "\r") start++;
  if (text[start] === "\n") start++;
  return { dict, data: bytes.slice(start, start + length) };
}

async function inflate(data: Uint8Array) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Start of the object that contains `index`. */
const objectStart = (text: string, index: number) => Math.max(0, text.lastIndexOf(" obj", index));

/** One character per byte, so text positions are byte positions. */
const asText = toBinaryString;

/** The board file attached by `attachBoardData`, or null if there is none. */
export async function readBoardData(bytes: Uint8Array): Promise<Uint8Array | null> {
  const text = asText(bytes);
  const marker = text.indexOf(`/${MARKER_KEY} 1`);
  if (marker < 0) return null;
  const stream = readStream(bytes, text, objectStart(text, marker));
  if (!stream) return null;
  return stream.dict.includes("/FlateDecode") ? inflate(stream.data) : stream.data;
}

/** True if StickyBoard made this PDF (it sets itself as the creator). */
export const isStickyBoardPdf = (bytes: Uint8Array) => /\/Creator\s*\(StickyBoard\)/.test(asText(bytes));

/**
 * The JPEG page pictures in a StickyBoard PDF, in page order. Used for PDFs
 * exported before boards were attached to them.
 */
export async function readPageImages(bytes: Uint8Array) {
  const text = asText(bytes);
  const images: { blob: Blob; width: number; height: number }[] = [];
  const pattern = /\/Subtype\s*\/Image/g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const stream = readStream(bytes, text, objectStart(text, match.index));
    if (!stream || !stream.dict.includes("/DCTDecode")) continue;
    const width = Number(/\/Width\s+(\d+)/.exec(stream.dict)?.[1]);
    const height = Number(/\/Height\s+(\d+)/.exec(stream.dict)?.[1]);
    if (!width || !height) continue;
    const jpeg = stream.dict.includes("/FlateDecode") ? await inflate(stream.data) : stream.data;
    images.push({ blob: new Blob([jpeg as BlobPart], { type: "image/jpeg" }), width, height });
  }
  return images;
}

/** Decodes a PDF string such as the document title: plain or UTF-16 with escapes. */
export function readPdfTitle(bytes: Uint8Array) {
  const raw = /\/Title\s*\(((?:\\.|[^\\)])*)\)/s.exec(asText(bytes))?.[1];
  if (raw === undefined) return null;
  const unescaped = raw.replace(/\\([0-7]{1,3}|.)/gs, (_, c: string) =>
    /^[0-7]+$/.test(c)
      ? String.fromCharCode(parseInt(c, 8))
      : ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" } as Record<string, string>)[c] ?? c,
  );
  if (!unescaped.startsWith("þÿ")) return unescaped.trim() || null;
  const units = Uint8Array.from(unescaped.slice(2), (c) => c.charCodeAt(0));
  let title = "";
  for (let i = 0; i + 1 < units.length; i += 2) title += String.fromCharCode((units[i] << 8) | units[i + 1]);
  return title.trim() || null;
}
