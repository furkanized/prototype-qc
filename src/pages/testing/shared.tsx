import { Icon } from "../../components/Icon";
import type { TestStatus } from "../../types/testing";

export function StarRating({ value, onChange, label }: { value: number; onChange?: (value: number) => void; label?: string }) {
  return (
    <span className="uts-stars" role={onChange ? "radiogroup" : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`uts-star ${star <= Math.round(value) ? "on" : ""} ${onChange ? "editable" : ""}`}
          disabled={!onChange}
          aria-label={`${star} of 5`}
          onClick={onChange ? () => onChange(star) : undefined}
        >
          <Icon icon="star" size={onChange ? 22 : 15} fill={star <= Math.round(value)} />
        </button>
      ))}
    </span>
  );
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const map: Record<TestStatus, { label: string; className: string }> = {
    active: { label: "Active", className: "qcx-status-ready" },
    draft: { label: "Draft", className: "qcx-status-draft" },
    completed: { label: "Completed", className: "qcx-status-archived" },
  };
  return <em className={`qcx-status ${map[status].className}`}>{map[status].label}</em>;
}

export function MetricBar({ label, value, max = 100, suffix = "%", tone = "blue" }: { label: string; value: number; max?: number; suffix?: string; tone?: "blue" | "green" | "red" | "amber" }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="uts-metric-bar">
      <div className="uts-metric-bar-head">
        <span>{label}</span>
        <strong>{value}{suffix}</strong>
      </div>
      <span className="uts-track"><span className={`uts-fill ${tone}`} style={{ width: `${width}%` }} /></span>
    </div>
  );
}
