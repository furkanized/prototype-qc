import { useCallback, useState } from "react";
import type { Settings } from "../types";
import { readStore, writeStore } from "../services/storage";

const DEFAULTS: Settings = {
  soundEnabled: true,
  reducedMotion: false,
  designerName: "Sina Yaşar",
  skipIntro: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, ...readStore<Partial<Settings>>("settings", {}) }));

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeStore("settings", next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
