import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "../../components/Icon";
import { RippleButton } from "../../components/RippleButton";
import { PROTOTYPES } from "../../services/prototypeRegistry";
import { getTargetCatalog } from "../../services/taskConditions";
import { makeId } from "../../services/testingService";
import type { ParticipantFieldConfig, ParticipantFieldKey, TestTask, TestType, UsabilityTest } from "../../types/testing";
import { TEST_TYPE_LABELS } from "../../types/testing";
import { ConditionBuilder } from "./ConditionBuilder";
import { TaskSimulator } from "./TaskSimulator";

const PARTICIPANT_FIELD_OPTIONS: Array<{ key: ParticipantFieldKey; label: string }> = [
  { key: "name", label: "Participant Name" },
  { key: "email", label: "Email" },
  { key: "ageRange", label: "Age Range" },
  { key: "deviceType", label: "Device Type" },
  { key: "browser", label: "Browser" },
  { key: "os", label: "Operating System" },
  { key: "experienceLevel", label: "Experience Level" },
];

const DEFAULT_PARTICIPANT_FIELDS: ParticipantFieldConfig = {
  name: true, email: false, ageRange: true, deviceType: true, browser: false, os: false, experienceLevel: true,
};

interface TaskDraft {
  id: string;
  title: string;
  description: string;
  expectedOutcome: string;
  successCriteria: string;
  timeLimit: string; // seconds, empty = none
  conditionScript: string;
  hint: string;
}

const emptyTask = (): TaskDraft => ({ id: makeId("task"), title: "", description: "", expectedOutcome: "", successCriteria: "", timeLimit: "", conditionScript: "", hint: "" });

export function TestCreateView({ onCreate, onCancel }: { onCreate: (test: UsabilityTest) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [prototypeId, setPrototypeId] = useState(PROTOTYPES[0].id);
  const [scenario, setScenario] = useState("");
  const [objective, setObjective] = useState("");
  const [moderator, setModerator] = useState("");
  const [participantTarget, setParticipantTarget] = useState(6);
  const [expectedDurationMin, setExpectedDurationMin] = useState(15);
  const [type, setType] = useState<TestType>("task_based");
  const [tasks, setTasks] = useState<TaskDraft[]>([emptyTask()]);
  const [participantFields, setParticipantFields] = useState<ParticipantFieldConfig>(DEFAULT_PARTICIPANT_FIELDS);
  const [simulating, setSimulating] = useState(false);

  const targetCatalog = useMemo(() => getTargetCatalog(prototypeId), [prototypeId]);

  const setTask = (id: string, patch: Partial<TaskDraft>) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  const moveTask = (index: number, delta: number) =>
    setTasks((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const validTasks = tasks.filter((task) => task.title.trim());
  const valid = name.trim() && scenario.trim() && objective.trim() && moderator.trim() && validTasks.length > 0;

  const build = (status: UsabilityTest["status"]): UsabilityTest => ({
    id: makeId("test"),
    name: name.trim(),
    prototypeId,
    scenario: scenario.trim(),
    objective: objective.trim(),
    moderator: moderator.trim(),
    participantTarget,
    expectedDurationMin,
    type,
    status,
    tasks: validTasks.map<TestTask>((task) => ({
      id: task.id,
      title: task.title.trim(),
      description: task.description.trim(),
      expectedOutcome: task.expectedOutcome.trim(),
      successCriteria: task.successCriteria.trim(),
      timeLimitSec: task.timeLimit ? Math.max(10, Number(task.timeLimit)) : undefined,
      conditionScript: task.conditionScript.trim() || undefined,
      hint: task.hint.trim() || undefined,
    })),
    createdAt: new Date().toISOString(),
    participantFields,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onCreate(build("active"));
  };

  return (
    <>
      <header className="qcx-page-head">
        <div>
          <h1>Create Usability Test</h1>
          <p>Define the study, then build the tasks participants will attempt.</p>
        </div>
        <button className="qcx-button ghost" onClick={onCancel}><Icon icon="arrow_back" size={17} />Back to Studio</button>
      </header>

      <form className="qcx-form qcx-card uts-create-card" onSubmit={handleSubmit}>
        <h2 className="uts-form-section">Test Details</h2>
        <div className="qcx-form-grid">
          <label className="span-2">
            <span>Test Name *</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Check-in Flow Baseline" required />
          </label>
          <label>
            <span>Prototype *</span>
            <select value={prototypeId} onChange={(event) => setPrototypeId(event.target.value)}>
              {PROTOTYPES.map((prototype) => (
                <option key={prototype.id} value={prototype.id}>{prototype.name}{prototype.available ? "" : " (draft)"}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Test Type *</span>
            <select value={type} onChange={(event) => setType(event.target.value as TestType)}>
              {(Object.keys(TEST_TYPE_LABELS) as TestType[]).map((key) => (
                <option key={key} value={key}>{TEST_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            <span>Scenario *</span>
            <input value={scenario} onChange={(event) => setScenario(event.target.value)} placeholder="e.g. Business traveler checking in for TK1979 to London" required />
          </label>
          <label className="span-2">
            <span>Objective *</span>
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={2} placeholder="What should this study answer?" required />
          </label>
          <label>
            <span>Moderator Name *</span>
            <input value={moderator} onChange={(event) => setModerator(event.target.value)} placeholder="e.g. Sina Yaşar" required />
          </label>
          <label>
            <span>Participant Count</span>
            <input type="number" min={1} max={50} value={participantTarget} onChange={(event) => setParticipantTarget(Math.max(1, Math.min(50, Number(event.target.value) || 1)))} />
          </label>
          <label>
            <span>Expected Duration (minutes)</span>
            <input type="number" min={5} max={120} value={expectedDurationMin} onChange={(event) => setExpectedDurationMin(Math.max(5, Math.min(120, Number(event.target.value) || 5)))} />
          </label>
        </div>

        <h2 className="uts-form-section">Remote Participant Information</h2>
        <p className="uts-form-hint">Choose which optional details to collect from remote participants before they begin. All fields remain optional for the participant even when enabled here.</p>
        <div className="uts-field-toggle-grid">
          {PARTICIPANT_FIELD_OPTIONS.map((field) => (
            <label key={field.key} className="uts-field-toggle">
              <input
                type="checkbox"
                checked={participantFields[field.key]}
                onChange={(event) => setParticipantFields((current) => ({ ...current, [field.key]: event.target.checked }))}
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>

        <h2 className="uts-form-section">Task Builder</h2>
        <div className="uts-task-builder">
          {tasks.map((task, index) => (
            <fieldset className="uts-task-editor" key={task.id}>
              <legend>Task {index + 1}</legend>
              <div className="uts-task-editor-tools">
                <button type="button" className="qcx-icon-button" aria-label="Move task up" disabled={index === 0} onClick={() => moveTask(index, -1)}><Icon icon="arrow_upward" size={16} /></button>
                <button type="button" className="qcx-icon-button" aria-label="Move task down" disabled={index === tasks.length - 1} onClick={() => moveTask(index, 1)}><Icon icon="arrow_downward" size={16} /></button>
                <button type="button" className="qcx-icon-button" aria-label="Remove task" disabled={tasks.length === 1} onClick={() => setTasks((current) => current.filter((candidate) => candidate.id !== task.id))}><Icon icon="delete" size={16} /></button>
              </div>
              <div className="qcx-form-grid">
                <label className="span-2">
                  <span>Title *</span>
                  <input value={task.title} onChange={(event) => setTask(task.id, { title: event.target.value })} placeholder="e.g. Check in one passenger travelling to London" />
                </label>
                <label className="span-2">
                  <span>Description</span>
                  <textarea value={task.description} onChange={(event) => setTask(task.id, { description: event.target.value })} rows={2} placeholder="What exactly should the participant do?" />
                </label>
                <label>
                  <span>Expected Outcome</span>
                  <input value={task.expectedOutcome} onChange={(event) => setTask(task.id, { expectedOutcome: event.target.value })} placeholder="e.g. Passenger shows as checked-in" />
                </label>
                <label>
                  <span>Success Criteria</span>
                  <input value={task.successCriteria} onChange={(event) => setTask(task.id, { successCriteria: event.target.value })} placeholder="e.g. Completed unaided in under 90s" />
                </label>
                <label>
                  <span>Time Limit (seconds, optional)</span>
                  <input type="number" min={10} value={task.timeLimit} onChange={(event) => setTask(task.id, { timeLimit: event.target.value })} placeholder="No limit" />
                </label>
                <label>
                  <span>Hint (optional)</span>
                  <input value={task.hint} onChange={(event) => setTask(task.id, { hint: event.target.value })} placeholder="Shown when the participant asks for help" />
                </label>
              </div>
              <ConditionBuilder
                script={task.conditionScript}
                onChange={(script) => setTask(task.id, { conditionScript: script })}
                catalog={targetCatalog}
              />
            </fieldset>
          ))}
          <button type="button" className="qcx-button ghost" onClick={() => setTasks((current) => [...current, emptyTask()])}>
            <Icon icon="add" size={17} />Add Task
          </button>
        </div>

        <footer className="qcx-form-actions uts-create-actions">
          <button
            type="button"
            className="qcx-button ghost"
            disabled={prototypeId !== "passenger-checkin" || !tasks.some((task) => task.conditionScript.trim())}
            title={prototypeId !== "passenger-checkin" ? "Simulation is available for the Passenger Check-in prototype" : undefined}
            onClick={() => setSimulating(true)}
          >
            <Icon icon="play_circle" size={17} />Simulate Tasks
          </button>
          <button type="button" className="qcx-button ghost" disabled={!name.trim()} onClick={() => onCreate(build("draft"))}>
            <Icon icon="save" size={17} />Save as Draft
          </button>
          <RippleButton type="submit" className="qcx-button primary" disabled={!valid}>
            <Icon icon="rocket_launch" size={17} fill />Create Test
          </RippleButton>
        </footer>
      </form>

      {simulating ? (
        <TaskSimulator
          tasks={tasks.map<TestTask>((task) => ({
            id: task.id,
            title: task.title.trim(),
            description: task.description.trim(),
            expectedOutcome: task.expectedOutcome.trim(),
            successCriteria: task.successCriteria.trim(),
            conditionScript: task.conditionScript.trim() || undefined,
            hint: task.hint.trim() || undefined,
          }))}
          onClose={() => setSimulating(false)}
        />
      ) : null}
    </>
  );
}
