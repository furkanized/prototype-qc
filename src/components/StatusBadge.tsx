import type { ScenarioStatus } from "../types";

const LABELS: Record<ScenarioStatus, string> = {
  ready: "Ready",
  draft: "Draft",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: ScenarioStatus }) {
  return <em className={`qcx-status qcx-status-${status}`}>{LABELS[status]}</em>;
}
