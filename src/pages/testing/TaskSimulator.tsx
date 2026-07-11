import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { RippleButton } from "../../components/RippleButton";
import { FlightSearchPage } from "../../features/cargo/FlightSearchPage";
import { sendPrototypeCommand } from "../../services/prototypeRegistry";
import { accessibleName, normalizeLabel } from "../../services/semanticEvents";
import { formatCommand, parseConditionScript, targetMatches, type Command } from "../../services/taskConditions";
import type { TestTask } from "../../types/testing";

interface SimTask {
  task: TestTask;
  commands: Command[];
}

interface Ring { top: number; left: number; width: number; height: number }

const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [role], [tabindex], label, summary";

function findTargetElement(root: HTMLElement, command: Command): HTMLElement | null {
  if (command.action === "Type" && !command.target) {
    return root.querySelector<HTMLElement>("input[type=text], input:not([type]), textarea");
  }
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR));
  let best: HTMLElement | null = null;
  let bestScore = 0;
  for (const el of candidates) {
    if (!el.offsetParent && el.tagName !== "BODY") continue; // skip invisible
    const name = accessibleName(el);
    if (!name || !targetMatches(command.target, name)) continue;
    // Prefer the tightest label match, then the smallest matching element.
    const score = 1000 - Math.abs(normalizeLabel(name).length - normalizeLabel(command.target).length) * 10 - Math.min(500, el.querySelectorAll("*").length);
    if (!best || score > bestScore) { best = el; bestScore = score; }
  }
  return best;
}

// Pre-publish dry run: mounts the real prototype, walks every task's success
// conditions, highlights the expected interaction target inside the prototype
// and reports whether each completion condition is currently reachable.
export function TaskSimulator({ tasks, onClose }: { tasks: TestTask[]; onClose: () => void }) {
  const simTasks = useMemo<SimTask[]>(
    () => tasks.map((task) => ({ task, commands: parseConditionScript(task.conditionScript ?? "").commands })),
    [tasks],
  );
  const steps = useMemo(
    () => simTasks.flatMap((entry, taskIndex) => entry.commands.map((command, commandIndex) => ({ ...entry, command, taskIndex, commandIndex }))),
    [simTasks],
  );

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [ring, setRing] = useState<Ring | null>(null);
  const [reachable, setReachable] = useState<Record<number, boolean>>({});

  useEffect(() => {
    sendPrototypeCommand("restart");
  }, []);

  const step = steps[stepIndex];

  const locate = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !step) { setRing(null); return; }
    const element = findTargetElement(stage, step.command);
    setReachable((current) => ({ ...current, [stepIndex]: Boolean(element) }));
    if (!element) { setRing(null); return; }
    element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    const stageRect = stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    setRing({
      top: rect.top - stageRect.top - 5,
      left: rect.left - stageRect.left - 5,
      width: rect.width + 10,
      height: rect.height + 10,
    });
  }, [step, stepIndex]);

  // Re-locate after mount/step change (give the prototype a beat to render),
  // and keep the ring anchored on resize.
  useEffect(() => {
    const timer = window.setTimeout(locate, 350);
    window.addEventListener("resize", locate);
    return () => { window.clearTimeout(timer); window.removeEventListener("resize", locate); };
  }, [locate]);

  const verified = Object.values(reachable).filter(Boolean).length;
  const checkedCount = Object.keys(reachable).length;

  if (!steps.length) {
    return (
      <div className="stb-sim" role="dialog" aria-label="Task simulation">
        <div className="stb-sim-empty qcx-card">
          <Icon icon="play_disabled" size={28} />
          <h2>Nothing to simulate</h2>
          <p>None of the tasks define success conditions yet. Add conditions in the Task Builder first.</p>
          <RippleButton className="qcx-button primary" onClick={onClose}>Back to editor</RippleButton>
        </div>
      </div>
    );
  }

  return (
    <div className="stb-sim" role="dialog" aria-label="Task simulation">
      <div className="stb-sim-stage" ref={stageRef}>
        <FlightSearchPage />
        {ring ? <div className="stb-sim-ring" style={{ top: ring.top, left: ring.left, width: ring.width, height: ring.height }} aria-hidden /> : null}
      </div>
      <aside className="stb-sim-panel">
        <header>
          <h2><Icon icon="play_circle" size={18} fill />Simulation</h2>
          <button className="qcx-icon-button" aria-label="Close simulation" onClick={onClose}><Icon icon="close" size={17} /></button>
        </header>
        <p className="stb-sim-summary">
          Step {stepIndex + 1} / {steps.length} · {verified}/{checkedCount} conditions reachable. Interact with the prototype freely to reach later screens, then re-check.
        </p>
        <div className="stb-sim-current">
          <span className="stb-sim-task">Task {step.taskIndex + 1}: {step.task.title || "Untitled"}</span>
          <code>{formatCommand(step.command)}</code>
          <span className={`stb-sim-flag ${reachable[stepIndex] === undefined ? "" : reachable[stepIndex] ? "ok" : "missing"}`}>
            {reachable[stepIndex] === undefined ? (
              <><Icon icon="search" size={13} />Locating…</>
            ) : reachable[stepIndex] ? (
              <><Icon icon="check_circle" size={13} fill />Target reachable — highlighted in the prototype</>
            ) : (
              <><Icon icon="warning" size={13} fill />Not reachable on the current screen — navigate the prototype there, then press Re-check</>
            )}
          </span>
        </div>
        <div className="stb-sim-controls">
          <button className="qcx-button ghost" disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}><Icon icon="arrow_back" size={15} />Previous</button>
          <button className="qcx-button ghost" onClick={locate}><Icon icon="refresh" size={15} />Re-check</button>
          <button className="qcx-button primary" disabled={stepIndex >= steps.length - 1} onClick={() => setStepIndex(stepIndex + 1)}>Next<Icon icon="arrow_forward" size={15} /></button>
        </div>
        <ol className="stb-sim-list">
          {steps.map((entry, index) => (
            <li key={index} className={index === stepIndex ? "active" : ""}>
              <button type="button" onClick={() => setStepIndex(index)}>
                <span className={`dot ${reachable[index] === undefined ? "" : reachable[index] ? "ok" : "missing"}`} />
                <code>{formatCommand(entry.command)}</code>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
