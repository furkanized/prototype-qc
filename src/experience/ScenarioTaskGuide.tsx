import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Icon } from "../components/Icon";
import { attachSemanticBridge, onSemanticEvent, type SemanticEvent } from "../services/semanticEvents";
import { commandProgress, evaluateCondition, parseConditionScript } from "../services/taskConditions";
import type { ScenarioTask } from "../types";

// Floating guided-task companion for scenarios launched from the dashboard.
// Uses the same Smart Task engine as the User Testing Studio: semantic events
// from the running prototype are evaluated against each task's condition
// script, and the guide advances automatically when a task is completed.
// Tasks without a condition script fall back to a manual "Done" button.
export function ScenarioTaskGuide({ tasks, hostRef }: { tasks: ScenarioTask[]; hostRef: RefObject<HTMLDivElement | null> }) {
  const parsed = useMemo(() => tasks.map((task) => parseConditionScript(task.conditionScript ?? "")), [tasks]);
  const [taskIndex, setTaskIndex] = useState(0);
  const [metFlags, setMetFlags] = useState<boolean[]>([]);
  const [flash, setFlash] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [done, setDone] = useState(false);

  const taskIndexRef = useRef(0);
  taskIndexRef.current = taskIndex;
  const eventsRef = useRef<SemanticEvent[]>([]);
  const advancingRef = useRef(false);

  const advance = () => {
    eventsRef.current = [];
    setMetFlags([]);
    setShowHint(false);
    if (taskIndexRef.current + 1 < tasks.length) setTaskIndex(taskIndexRef.current + 1);
    else setDone(true);
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || done) return;
    const detach = attachSemanticBridge(host);
    const unsubscribe = onSemanticEvent((event) => {
      eventsRef.current.push(event);
      const current = parsed[taskIndexRef.current];
      if (!current?.node || advancingRef.current) return;
      setMetFlags(commandProgress(current.commands, eventsRef.current));
      if (evaluateCondition(current.node, eventsRef.current)) {
        advancingRef.current = true;
        setFlash(true);
        window.setTimeout(() => {
          setFlash(false);
          advancingRef.current = false;
          advanceRef.current();
        }, 950);
      }
    });
    return () => { detach(); unsubscribe(); };
  }, [hostRef, parsed, done]);

  if (!tasks.length) return null;

  const task = tasks[taskIndex];
  const current = parsed[taskIndex];
  const autoTracked = Boolean(current?.node);

  if (collapsed) {
    return (
      <button className="qcx-guide-pill" onClick={() => setCollapsed(false)} aria-label="Show guided tasks">
        <Icon icon="checklist" size={17} fill />
        {done ? tasks.length : taskIndex} / {tasks.length}
      </button>
    );
  }

  return (
    <>
      {flash ? (
        <div className="uts-task-flash" role="status">
          <Icon icon="check_circle" size={22} fill />✓ Task Completed
        </div>
      ) : null}
      <aside className="qcx-task-guide" aria-label="Guided tasks">
        <header>
          <span className="qcx-task-guide-step">
            {done ? <><Icon icon="celebration" size={14} fill /> Completed</> : <>Task {taskIndex + 1} / {tasks.length}</>}
          </span>
          <button className="qcx-icon-button" aria-label="Collapse guided tasks" onClick={() => setCollapsed(true)}>
            <Icon icon="remove" size={15} />
          </button>
        </header>
        {done ? (
          <p className="qcx-task-guide-done">All guided tasks completed — nice run! You can keep exploring the prototype.</p>
        ) : (
          <>
            <strong>{task.title}</strong>
            {showHint && task.hint ? (
              <p className="qcx-task-guide-hint"><Icon icon="lightbulb" size={13} fill /> {task.hint}</p>
            ) : task.instruction ? (
              <p>{task.instruction}</p>
            ) : null}
            {autoTracked && current.commands.length > 1 ? (
              <span className="uts-taskbar-progress" aria-label={`${metFlags.filter(Boolean).length} of ${current.commands.length} conditions met`}>
                {current.commands.map((_, index) => <i key={index} className={metFlags[index] ? "met" : ""} />)}
              </span>
            ) : null}
            <footer>
              {task.hint ? (
                <button className="qcx-button ghost" onClick={() => setShowHint((value) => !value)}>
                  <Icon icon="lightbulb" size={14} />{showHint ? "Hide Hint" : "Hint"}
                </button>
              ) : null}
              {autoTracked ? (
                <span className="uts-taskbar-auto"><Icon icon="automation" size={13} />Auto-tracked</span>
              ) : (
                <button className="qcx-button primary" onClick={() => advanceRef.current()}>
                  <Icon icon="check" size={15} />Done
                </button>
              )}
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
