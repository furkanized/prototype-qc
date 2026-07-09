import type { ActivityEntry } from "../types";
import { readStore, writeStore } from "./storage";

const KEY = "activity";
const LIMIT = 40;

export function getActivity(): ActivityEntry[] {
  return readStore<ActivityEntry[]>(KEY, []);
}

export function logActivity(icon: string, label: string, detail: string): ActivityEntry[] {
  const entry: ActivityEntry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    icon,
    label,
    detail,
    at: new Date().toISOString(),
  };
  const next = [entry, ...getActivity()].slice(0, LIMIT);
  writeStore(KEY, next);
  return next;
}

export function formatRelativeTime(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}
