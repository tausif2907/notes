import { useEffect } from "react";
import { useAppStore } from "../store/appStore";

const NOTICE_MS = 4000;

export function Notice() {
  const notice = useAppStore((s) => s.notice);
  const clearNotice = useAppStore((s) => s.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => clearNotice(notice.id), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);

  if (!notice) return null;
  return (
    <div className="notice" role="status">
      {notice.text}
    </div>
  );
}
