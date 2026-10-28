import { useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore, type ThemeChoice } from "../store/appStore";

const CHOICES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "system", label: "Match Windows", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

/** Light / dark / match-Windows switch; also themes the window's title bar. */
export function ThemeSwitch() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    if (isTauri()) void getCurrentWindow().setTheme(theme === "system" ? null : theme).catch(console.error);
  }, [theme]);

  return (
    <div className="segmented theme-switch" role="radiogroup" aria-label="Appearance">
      {CHOICES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={theme === id}
          aria-label={label}
          title={label}
          className={theme === id ? "active" : ""}
          onClick={() => setTheme(id)}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
