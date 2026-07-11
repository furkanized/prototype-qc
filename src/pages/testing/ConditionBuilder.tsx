import { useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import {
  COMMAND_ACTIONS,
  formatCommand,
  parseConditionScript,
  scriptValidationStatus,
  validateCommandTarget,
  type CommandAction,
  type TargetEntry,
  type TaskValidationStatus,
} from "../../services/taskConditions";
import { normalizeLabel } from "../../services/semanticEvents";

const STATUS_META: Record<TaskValidationStatus, { icon: string; label: string; className: string }> = {
  empty: { icon: "radio_button_unchecked", label: "Manual completion", className: "empty" },
  valid: { icon: "check_circle", label: "Valid — auto-tracked", className: "valid" },
  warning: { icon: "warning", label: "Unknown target", className: "warning" },
  error: { icon: "error", label: "Invalid command", className: "error" },
};

// Visual command builder + raw script editor for one task's success
// conditions. Researchers pick Action → Target from searchable dropdowns and
// the generated command is appended to the script; the script itself stays
// editable with live per-command validation.
export function ConditionBuilder({
  script,
  onChange,
  catalog,
}: {
  script: string;
  onChange: (script: string) => void;
  catalog: TargetEntry[];
}) {
  const [action, setAction] = useState<CommandAction>("Click");
  const [targetQuery, setTargetQuery] = useState("");
  const [typedText, setTypedText] = useState("");
  const [connector, setConnector] = useState<"AND" | "OR" | "AND NOT">("AND");
  const [showTargets, setShowTargets] = useState(false);
  const targetBoxRef = useRef<HTMLDivElement | null>(null);

  const spec = COMMAND_ACTIONS.find((entry) => entry.action === action)!;
  const parsed = useMemo(() => parseConditionScript(script), [script]);
  const status = useMemo(() => scriptValidationStatus(script, catalog), [script, catalog]);
  const statusMeta = STATUS_META[status];

  const filteredTargets = useMemo(() => {
    const query = normalizeLabel(targetQuery);
    const matches = query ? catalog.filter((entry) => normalizeLabel(entry.label).includes(query)) : catalog;
    return matches.slice(0, 8);
  }, [catalog, targetQuery]);

  const previewCommand = spec.textArgument
    ? typedText.trim() ? `Type "${typedText.trim()}"` : ""
    : targetQuery.trim() ? `${action} [${targetQuery.trim()}]` : "";

  const addCommand = () => {
    if (!previewCommand) return;
    const negated = connector === "AND NOT";
    const commandText = negated ? `NOT ${previewCommand}` : previewCommand;
    const joiner = connector === "OR" ? "OR" : "AND";
    onChange(script.trim() ? `${script.trim()}\n${joiner} ${commandText}` : commandText);
    setTargetQuery("");
    setTypedText("");
    setShowTargets(false);
  };

  return (
    <div className="stb">
      <div className="stb-head">
        <span className="stb-title"><Icon icon="automation" size={15} />Success Conditions</span>
        <span className={`stb-status ${statusMeta.className}`}>
          <Icon icon={statusMeta.icon} size={13} fill />{statusMeta.label}
        </span>
      </div>

      <div className="stb-builder">
        <label className="stb-field">
          <span>Action</span>
          <select value={action} onChange={(event) => setAction(event.target.value as CommandAction)}>
            {COMMAND_ACTIONS.map((entry) => (
              <option key={entry.action} value={entry.action}>{entry.action}</option>
            ))}
          </select>
        </label>
        <span className="stb-arrow"><Icon icon="arrow_forward" size={14} /></span>
        {spec.textArgument ? (
          <label className="stb-field grow">
            <span>Text</span>
            <input value={typedText} onChange={(event) => setTypedText(event.target.value)} placeholder='e.g. John' />
          </label>
        ) : (
          <div className="stb-field grow stb-target" ref={targetBoxRef}>
            <span>Target</span>
            <input
              value={targetQuery}
              onChange={(event) => { setTargetQuery(event.target.value); setShowTargets(true); }}
              onFocus={() => setShowTargets(true)}
              onBlur={() => window.setTimeout(() => setShowTargets(false), 120)}
              placeholder="Search UI elements…"
              aria-label="Target UI element"
            />
            {showTargets && filteredTargets.length > 0 ? (
              <ul className="stb-target-list" role="listbox" aria-label="Available targets">
                {filteredTargets.map((entry) => (
                  <li key={`${entry.kind}-${entry.label}`}>
                    <button type="button" onMouseDown={(event) => { event.preventDefault(); setTargetQuery(entry.label); setShowTargets(false); }}>
                      <span>{entry.label}</span><em>{entry.kind}</em>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        <label className="stb-field">
          <span>Combine</span>
          <select value={connector} onChange={(event) => setConnector(event.target.value as typeof connector)} disabled={!script.trim()}>
            <option>AND</option>
            <option>OR</option>
            <option>AND NOT</option>
          </select>
        </label>
        <button type="button" className="qcx-button ghost stb-add" disabled={!previewCommand} onClick={addCommand}>
          <Icon icon="add" size={15} />Add
        </button>
      </div>

      {previewCommand ? (
        <div className="stb-preview">
          <Icon icon="terminal" size={13} /><span>Generated command:</span><code>{previewCommand}</code>
        </div>
      ) : (
        <p className="stb-hint-line">{spec.hint}.</p>
      )}

      <textarea
        className="stb-script"
        rows={Math.max(2, script.split("\n").length)}
        value={script}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"Click [Flight List]\nAND Select [TK1815]\nAND Click [Check-in]"}
        aria-label="Success condition script"
        spellCheck={false}
      />

      {script.trim() ? (
        <ul className="stb-checks" aria-live="polite">
          {parsed.issues.map((issue, index) => (
            <li key={`issue-${index}`} className="error"><Icon icon="error" size={13} fill />Line {issue.line}: {issue.message}</li>
          ))}
          {parsed.commands.map((command, index) => {
            const validity = validateCommandTarget(command, catalog);
            return validity === "valid" ? (
              <li key={index} className="valid"><Icon icon="check" size={13} />✓ Valid Command · <code>{formatCommand(command)}</code></li>
            ) : (
              <li key={index} className="warning"><Icon icon="warning" size={13} fill />⚠ Unknown Target · <code>{formatCommand(command)}</code> — element not found in this prototype</li>
            );
          })}
        </ul>
      ) : (
        <p className="stb-hint-line muted">No conditions — the participant completes this task manually with the “Mark Completed” button.</p>
      )}
    </div>
  );
}
