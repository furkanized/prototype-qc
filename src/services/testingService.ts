import type {
  FeedbackAnswers,
  ResearchNote,
  ScreenStat,
  SessionEvent,
  TaskResult,
  TestAnalytics,
  TestSession,
  TestTask,
  UsabilityTest,
} from "../types/testing";
import { TEST_TYPE_LABELS } from "../types/testing";
import { CHECKIN_PROTOTYPE, getPrototype } from "./prototypeRegistry";
import { readStore, writeStore } from "./storage";

const TESTS_KEY = "uts-tests";
const SESSIONS_KEY = "uts-sessions";

export const PROTOTYPE_SCREENS = CHECKIN_PROTOTYPE.screens.map((screen) => screen.name);

export function formatClock(totalSec: number) {
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.floor(totalSec % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function prototypeName(id: string) {
  return getPrototype(id)?.name ?? id;
}

let idCounter = 0;
export function makeId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

/* --------------------------------------------------------------------------
   Seed data — deterministic pseudo-random sessions so the studio feels lived-in
   on first launch. Persisted once, then treated as user data.
   -------------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_PARTICIPANTS = [
  "Deniz K.", "Mert A.", "Selin Y.", "Baran T.", "İpek S.",
  "Umut D.", "Nazlı E.", "Arda Ç.", "Ece B.", "Kaan O.",
];

const SEED_TASKS: Array<Omit<TestTask, "id">> = [
  {
    title: "Check in one passenger travelling to London",
    description: "Find flight TK1979 to LHR on the flight board and check in passenger Ayşe Aydın.",
    expectedOutcome: "Passenger status changes to Checked-in with a seat assigned.",
    successCriteria: "Check-in completed without agent assistance in under 90 seconds.",
    timeLimitSec: 90,
  },
  {
    title: "Change the passenger seat",
    description: "Open the seat map for the checked-in passenger and move them to a window seat.",
    expectedOutcome: "New seat is reflected in the passenger list.",
    successCriteria: "Seat changed with at most one misclick.",
    timeLimitSec: 60,
  },
  {
    title: "Complete the check-in",
    description: "Confirm the check-in and verify the passenger appears as boarded-ready.",
    expectedOutcome: "Confirmation state reached; passenger row shows final status.",
    successCriteria: "Flow finished end-to-end without abandoning.",
  },
];

const FAMILY_SEED_TASKS: Array<Omit<TestTask, "id">> = [
  {
    title: "Find the AYIN family on flight TK2070",
    description: "Select flight TK2070 (IST → AMS) on the flight board, then search the passenger list by surname \"AYIN\".",
    expectedOutcome: "All five AYIN family members appear in the filtered passenger list.",
    successCriteria: "Family found via surname search in under 60 seconds.",
    timeLimitSec: 60,
  },
  {
    title: "Select the whole family for check-in",
    description: "Select all matching AYIN passengers at once and open the multi check-in flow.",
    expectedOutcome: "All 5 passengers are selected and the check-in action reflects a group of 5.",
    successCriteria: "Group selected with at most one misclick.",
    timeLimitSec: 60,
  },
  {
    title: "Complete the family check-in",
    description: "Confirm check-in for the group and verify every family member's status updates together.",
    expectedOutcome: "All 5 AYIN passengers show a checked-in status.",
    successCriteria: "Flow finished end-to-end without abandoning.",
  },
];

function seedTests(): UsabilityTest[] {
  const tasks = (): TestTask[] => SEED_TASKS.map((task, index) => ({ ...task, id: `seed-task-${index + 1}` }));
  const familyTasks = (): TestTask[] => FAMILY_SEED_TASKS.map((task, index) => ({ ...task, id: `seed-family-task-${index + 1}` }));
  return [
    {
      id: "seed-test-1",
      name: "Family Check-in Flow",
      prototypeId: "passenger-checkin",
      scenario: "Family Check-in",
      objective: "Measure how quickly agents complete a multi-passenger check-in for a family travelling together.",
      moderator: "Sina Yaşar",
      participantTarget: 8,
      expectedDurationMin: 15,
      type: "task_based",
      status: "completed",
      tasks: familyTasks(),
      createdAt: "2026-06-18T09:00:00.000Z",
    },
    {
      id: "seed-test-2",
      name: "Seat Map Discoverability",
      prototypeId: "passenger-checkin",
      scenario: "Family Check-in with Seat Change",
      objective: "Validate that the seat map entry point is discoverable from the passenger list.",
      moderator: "Elif Kaya",
      participantTarget: 6,
      expectedDurationMin: 20,
      type: "moderated",
      status: "active",
      tasks: tasks(),
      createdAt: "2026-07-02T13:30:00.000Z",
    },
    {
      id: "seed-test-3",
      name: "First-time Agent Exploration",
      prototypeId: "passenger-checkin",
      scenario: "Free exploration, no script",
      objective: "Observe how new agents orient themselves in the workspace without guidance.",
      moderator: "Sina Yaşar",
      participantTarget: 5,
      expectedDurationMin: 25,
      type: "exploratory",
      status: "active",
      tasks: tasks().slice(0, 2),
      createdAt: "2026-07-06T10:15:00.000Z",
    },
    {
      id: "seed-test-4",
      name: "Boarding Flow Concept",
      prototypeId: "boarding",
      scenario: "Gate boarding with standby list",
      objective: "Early signal on the boarding prototype concept screens.",
      moderator: "Elif Kaya",
      participantTarget: 6,
      expectedDurationMin: 12,
      type: "think_aloud",
      status: "draft",
      tasks: [],
      createdAt: "2026-07-08T16:45:00.000Z",
    },
  ];
}

function generateSession(rng: () => number, test: UsabilityTest, participant: string, startedAt: string): TestSession {
  const events: SessionEvent[] = [];
  const notes: ResearchNote[] = [];
  const taskResults: TaskResult[] = [];
  const screens = PROTOTYPE_SCREENS;
  let clock = 0;
  let screenIndex = 0;
  const completed = rng() > 0.22;
  events.push({ at: 0, kind: "screen", screen: screens[0] });

  const taskCount = completed ? test.tasks.length : Math.max(1, Math.floor(rng() * test.tasks.length));
  for (let index = 0; index < taskCount; index += 1) {
    const task = test.tasks[index];
    const taskStart = clock;
    let misclicks = 0;
    events.push({ at: clock, kind: "task_start", screen: screens[screenIndex], taskId: task.id, label: task.title });
    const steps = 3 + Math.floor(rng() * 4);
    for (let step = 0; step < steps; step += 1) {
      clock += 4 + Math.floor(rng() * 14);
      if (rng() < 0.3) {
        screenIndex = Math.min(screens.length - 1, screenIndex + (rng() < 0.8 ? 1 : -1));
        if (screenIndex < 0) screenIndex = 0;
        events.push({ at: clock, kind: "screen", screen: screens[screenIndex] });
      }
      if (rng() < 0.14) {
        misclicks += 1;
        events.push({ at: clock, kind: "misclick", screen: screens[screenIndex], label: "Missed target" });
      } else {
        events.push({ at: clock, kind: "click", screen: screens[screenIndex] });
      }
    }
    const isLastAndDropped = !completed && index === taskCount - 1;
    const overTime = task.timeLimitSec ? clock - taskStart > task.timeLimitSec : false;
    const success = !isLastAndDropped && (!overTime || rng() > 0.5);
    clock += 2 + Math.floor(rng() * 6);
    events.push({ at: clock, kind: success ? "task_complete" : "task_fail", screen: screens[screenIndex], taskId: task.id, label: task.title });
    taskResults.push({ taskId: task.id, success, timeSec: clock - taskStart, misclicks });
  }

  const noteBank = [
    "Participant searched for baggage information.",
    "Hesitated before selecting seat.",
    "Scanned the flight board top to bottom twice.",
    "Expected the seat map to open from the passenger row.",
    "Verbalised confusion about the status badge colours.",
    "Completed the step confidently without prompting.",
    "Used keyboard navigation instead of the mouse.",
  ];
  const noteCount = 2 + Math.floor(rng() * 3);
  for (let index = 0; index < noteCount; index += 1) {
    const at = Math.floor(rng() * Math.max(1, clock));
    notes.push({ id: makeId("note"), at, text: noteBank[Math.floor(rng() * noteBank.length)] });
  }
  notes.sort((a, b) => a.at - b.at);

  const rate = (base: number) => Math.max(1, Math.min(5, Math.round(base + rng() * 2)));
  const feedback: FeedbackAnswers | undefined = completed
    ? {
        overall: rate(3.4),
        easeOfUse: rate(3.1),
        visualClarity: rate(3.6),
        confidence: rate(3.2),
        satisfaction: rate(3.4),
        confused: rng() < 0.5 ? "The seat map entry point was not obvious from the passenger list." : "Some status colours were hard to tell apart at a glance.",
        workedWell: rng() < 0.5 ? "The flight board search was fast and predictable." : "Check-in confirmation felt clear and reassuring.",
        improve: rng() < 0.5 ? "Add a visible seat-change shortcut on each passenger row." : "Make the primary action stand out more on dense screens.",
      }
    : undefined;

  return {
    id: makeId("session"),
    testId: test.id,
    participant,
    startedAt,
    durationSec: clock,
    completed,
    dropOffScreen: completed ? undefined : PROTOTYPE_SCREENS[screenIndex],
    events,
    notes,
    taskResults,
    feedback,
  };
}

function seedSessions(tests: UsabilityTest[]): TestSession[] {
  const rng = mulberry32(20260710);
  const sessions: TestSession[] = [];
  const plan: Array<{ testId: string; count: number; from: string }> = [
    { testId: "seed-test-1", count: 8, from: "2026-06-20T09:00:00.000Z" },
    { testId: "seed-test-2", count: 4, from: "2026-07-03T10:00:00.000Z" },
    { testId: "seed-test-3", count: 2, from: "2026-07-07T11:00:00.000Z" },
  ];
  plan.forEach((entry) => {
    const test = tests.find((candidate) => candidate.id === entry.testId);
    if (!test || test.tasks.length === 0) return;
    for (let index = 0; index < entry.count; index += 1) {
      const startedAt = new Date(new Date(entry.from).getTime() + index * 5.5e6).toISOString();
      sessions.push(generateSession(rng, test, SEED_PARTICIPANTS[(index + sessions.length) % SEED_PARTICIPANTS.length], startedAt));
    }
  });
  return sessions;
}

/* --------------------------------------------------------------------------
   Store access
   -------------------------------------------------------------------------- */

function ensureSeeded() {
  const existing = readStore<UsabilityTest[] | null>(TESTS_KEY, null);
  if (existing) return;
  const tests = seedTests();
  writeStore(TESTS_KEY, tests);
  writeStore(SESSIONS_KEY, seedSessions(tests));
}

export function getTests(): UsabilityTest[] {
  ensureSeeded();
  return readStore<UsabilityTest[]>(TESTS_KEY, []);
}

export function saveTest(test: UsabilityTest) {
  const tests = getTests().filter((candidate) => candidate.id !== test.id);
  writeStore(TESTS_KEY, [test, ...tests]);
}

export function deleteTest(testId: string) {
  writeStore(TESTS_KEY, getTests().filter((test) => test.id !== testId));
  writeStore(SESSIONS_KEY, getSessions().filter((session) => session.testId !== testId));
}

export function getSessions(testId?: string): TestSession[] {
  ensureSeeded();
  const sessions = readStore<TestSession[]>(SESSIONS_KEY, []);
  return testId ? sessions.filter((session) => session.testId === testId) : sessions;
}

export function saveSession(session: TestSession) {
  const sessions = getSessions().filter((candidate) => candidate.id !== session.id);
  writeStore(SESSIONS_KEY, [...sessions, session]);
}

/* --------------------------------------------------------------------------
   Analytics
   -------------------------------------------------------------------------- */

export function computeAnalytics(test: UsabilityTest, sessions: TestSession[]): TestAnalytics {
  const sessionCount = sessions.length;
  const completedCount = sessions.filter((session) => session.completed).length;

  const allResults = sessions.flatMap((session) => session.taskResults);
  const successRate = allResults.length ? Math.round((allResults.filter((result) => result.success).length / allResults.length) * 100) : 0;
  const completionRate = sessionCount ? Math.round((completedCount / sessionCount) * 100) : 0;

  const avgDurationSec = sessionCount ? Math.round(sessions.reduce((sum, session) => sum + session.durationSec, 0) / sessionCount) : 0;
  const avgClicks = sessionCount
    ? Math.round(sessions.reduce((sum, session) => sum + session.events.filter((event) => event.kind === "click" || event.kind === "misclick").length, 0) / sessionCount)
    : 0;
  const avgErrors = sessionCount
    ? Math.round((sessions.reduce((sum, session) => sum + session.events.filter((event) => event.kind === "misclick").length, 0) / sessionCount) * 10) / 10
    : 0;

  const rated = sessions.filter((session) => session.feedback);
  const avgSatisfaction = rated.length
    ? Math.round((rated.reduce((sum, session) => sum + (session.feedback?.satisfaction ?? 0), 0) / rated.length) * 10) / 10
    : 0;

  const screenMap = new Map<string, ScreenStat>();
  const stat = (screen: string) => {
    const existing = screenMap.get(screen);
    if (existing) return existing;
    const created: ScreenStat = { screen, visits: 0, totalTimeSec: 0, clicks: 0, misclicks: 0, abandons: 0 };
    screenMap.set(screen, created);
    return created;
  };
  sessions.forEach((session) => {
    const screenEvents = session.events.filter((event) => event.kind === "screen");
    screenEvents.forEach((event, index) => {
      const entry = stat(event.screen);
      entry.visits += 1;
      const next = screenEvents[index + 1];
      entry.totalTimeSec += (next ? next.at : session.durationSec) - event.at;
    });
    session.events.forEach((event) => {
      if (event.kind === "click") stat(event.screen).clicks += 1;
      if (event.kind === "misclick") {
        stat(event.screen).clicks += 1;
        stat(event.screen).misclicks += 1;
      }
    });
    if (!session.completed && session.dropOffScreen) stat(session.dropOffScreen).abandons += 1;
  });
  const screenStats = [...screenMap.values()].sort((a, b) => b.totalTimeSec - a.totalTimeSec);

  const totalClicks = sessions.reduce((sum, session) => sum + session.events.filter((event) => event.kind === "click" || event.kind === "misclick").length, 0);
  const totalMisclicks = sessions.reduce((sum, session) => sum + session.events.filter((event) => event.kind === "misclick").length, 0);
  const misclickRate = totalClicks ? Math.round((totalMisclicks / totalClicks) * 100) : 0;
  // Navigation efficiency: how much of the screen-hopping was non-redundant.
  const navStats = sessions.map((session) => {
    const screens = session.events.filter((event) => event.kind === "screen");
    return screens.length ? new Set(screens.map((event) => event.screen)).size / screens.length : 1;
  });
  const navigationEfficiency = navStats.length ? Math.round((navStats.reduce((sum, value) => sum + value, 0) / navStats.length) * 100) : 0;
  const totalVisits = screenStats.reduce((sum, entry) => sum + entry.visits, 0);
  const avgTimePerScreenSec = totalVisits ? Math.round(screenStats.reduce((sum, entry) => sum + entry.totalTimeSec, 0) / totalVisits) : 0;

  const taskStats = test.tasks.map((task) => {
    const results = allResults.filter((result) => result.taskId === task.id);
    return {
      taskId: task.id,
      attempts: results.length,
      successes: results.filter((result) => result.success).length,
      avgTimeSec: results.length ? Math.round(results.reduce((sum, result) => sum + result.timeSec, 0) / results.length) : 0,
      avgMisclicks: results.length ? Math.round((results.reduce((sum, result) => sum + result.misclicks, 0) / results.length) * 10) / 10 : 0,
    };
  });
  const attempted = taskStats.filter((entry) => entry.attempts > 0);
  const hardest = attempted.length
    ? [...attempted].sort((a, b) => a.successes / a.attempts - b.successes / b.attempts || b.avgMisclicks - a.avgMisclicks)[0]
    : undefined;
  const abandoned = screenStats.filter((entry) => entry.abandons > 0).sort((a, b) => b.abandons - a.abandons)[0];

  return {
    sessionCount,
    completedCount,
    successRate,
    completionRate,
    dropOffRate: sessionCount ? 100 - completionRate : 0,
    avgDurationSec,
    avgClicks,
    avgErrors,
    avgSatisfaction,
    misclickRate,
    navigationEfficiency,
    avgTimePerScreenSec,
    screenStats,
    hardestTaskId: hardest?.taskId,
    mostAbandonedScreen: abandoned?.screen,
    taskStats,
  };
}

/* --------------------------------------------------------------------------
   Export — CSV download and print-window PDF report
   -------------------------------------------------------------------------- */

function csvEscape(value: string | number | boolean | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportCsv(test: UsabilityTest, sessions: TestSession[], analytics: TestAnalytics) {
  const lines: string[] = [];
  lines.push("TEST SUMMARY");
  lines.push(["Test", "Prototype", "Type", "Status", "Moderator", "Scenario", "Objective"].join(","));
  lines.push([test.name, prototypeName(test.prototypeId), TEST_TYPE_LABELS[test.type], test.status, test.moderator, test.scenario, test.objective].map(csvEscape).join(","));
  lines.push("");
  lines.push("METRICS");
  lines.push(["Participants", "Success Rate %", "Completion Rate %", "Drop-off %", "Avg Duration (s)", "Avg Clicks", "Avg Errors", "Misclick Rate %", "Navigation Efficiency %", "Avg Time / Screen (s)", "Avg Satisfaction"].join(","));
  lines.push([analytics.sessionCount, analytics.successRate, analytics.completionRate, analytics.dropOffRate, analytics.avgDurationSec, analytics.avgClicks, analytics.avgErrors, analytics.misclickRate, analytics.navigationEfficiency, analytics.avgTimePerScreenSec, analytics.avgSatisfaction].join(","));
  lines.push("");
  lines.push("TASK RESULTS");
  lines.push(["Task", "Attempts", "Successes", "Success %", "Avg Time (s)", "Avg Misclicks"].join(","));
  analytics.taskStats.forEach((entry) => {
    const task = test.tasks.find((candidate) => candidate.id === entry.taskId);
    lines.push([csvEscape(task?.title ?? entry.taskId), entry.attempts, entry.successes, entry.attempts ? Math.round((entry.successes / entry.attempts) * 100) : 0, entry.avgTimeSec, entry.avgMisclicks].join(","));
  });
  lines.push("");
  lines.push("SESSIONS");
  lines.push(["Participant", "Remote", "Invite Code", "Started", "Duration (s)", "Idle (s)", "Completed", "Drop-off Screen", "Clicks", "Misclicks", "Overall", "Ease", "Clarity", "Confidence", "Task Difficulty"].join(","));
  sessions.forEach((session) => {
    lines.push([
      csvEscape(session.participant),
      session.remote ? "Yes" : "No",
      csvEscape(session.inviteCode ?? ""),
      session.startedAt,
      session.durationSec,
      session.idleSec ?? 0,
      session.completed,
      csvEscape(session.dropOffScreen ?? ""),
      session.events.filter((event) => event.kind === "click" || event.kind === "misclick").length,
      session.events.filter((event) => event.kind === "misclick").length,
      session.feedback?.overall ?? "",
      session.feedback?.easeOfUse ?? "",
      session.feedback?.visualClarity ?? "",
      session.feedback?.confidence ?? "",
      session.feedback?.taskDifficulty ?? "",
    ].join(","));
  });
  lines.push("");
  lines.push("PARTICIPANT INFORMATION");
  lines.push(["Participant", "Name", "Email", "Age Range", "Device Type", "Browser", "OS", "Experience Level"].join(","));
  sessions.filter((session) => session.participantInfo).forEach((session) => {
    const info = session.participantInfo!;
    lines.push([csvEscape(session.participant), csvEscape(info.name), csvEscape(info.email), csvEscape(info.ageRange), csvEscape(info.deviceType), csvEscape(info.browser), csvEscape(info.os), csvEscape(info.experienceLevel)].join(","));
  });
  lines.push("");
  lines.push("RESEARCH NOTES");
  lines.push(["Participant", "Timestamp", "Note"].join(","));
  sessions.forEach((session) => {
    session.notes.forEach((note) => lines.push([csvEscape(session.participant), formatClock(note.at), csvEscape(note.text)].join(",")));
  });
  lines.push("");
  lines.push("SESSION TIMELINE");
  lines.push(["Participant", "Elapsed", "Event", "Detail"].join(","));
  sessions.forEach((session) => {
    session.events
      .filter((event) => ["session_start", "session_end", "screen", "task_start", "task_complete", "task_fail", "back", "idle"].includes(event.kind))
      .forEach((event) => lines.push([csvEscape(session.participant), formatClock(event.at), event.kind, csvEscape(event.label ?? event.screen)].join(",")));
  });

  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${test.name.replace(/\s+/g, "-").toLowerCase()}-report.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportPdf(test: UsabilityTest, sessions: TestSession[], analytics: TestAnalytics) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) return false;
  const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const taskRows = analytics.taskStats
    .map((entry) => {
      const task = test.tasks.find((candidate) => candidate.id === entry.taskId);
      const rate = entry.attempts ? Math.round((entry.successes / entry.attempts) * 100) : 0;
      return `<tr><td>${escapeHtml(task?.title ?? entry.taskId)}</td><td>${entry.attempts}</td><td>${entry.successes}</td><td>${rate}%</td><td>${formatClock(entry.avgTimeSec)}</td><td>${entry.avgMisclicks}</td></tr>`;
    })
    .join("");
  const sessionRows = sessions
    .map(
      (session) =>
        `<tr><td>${escapeHtml(session.participant)}${session.remote ? ' <span style="color:#8b95a8;font-size:10px">(remote' + (session.inviteCode ? " · " + escapeHtml(session.inviteCode) : "") + ")</span>" : ""}</td><td>${new Date(session.startedAt).toLocaleString()}</td><td>${formatClock(session.durationSec)}</td><td>${session.completed ? "Completed" : `Dropped (${escapeHtml(session.dropOffScreen ?? "—")})`}</td><td>${session.feedback ? `${session.feedback.overall}/5` : "—"}</td></tr>`,
    )
    .join("");
  const TIMELINE_KINDS = new Set(["session_start", "session_end", "screen", "task_start", "task_complete", "task_fail", "back", "idle"]);
  const timelineBlocks = sessions
    .map((session) => {
      const rows = session.events
        .filter((event) => TIMELINE_KINDS.has(event.kind))
        .map((event) => {
          const clock = new Date(new Date(session.startedAt).getTime() + event.at * 1000).toLocaleTimeString([], { hour12: false });
          return `<tr><td>${clock}</td><td>+${formatClock(event.at)}</td><td>${escapeHtml(event.kind.replace(/_/g, " "))}</td><td>${escapeHtml(event.label ?? event.screen)}</td></tr>`;
        })
        .join("");
      return `<h4>${escapeHtml(session.participant)}</h4><table><thead><tr><th>Clock</th><th>Elapsed</th><th>Event</th><th>Detail</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>No events recorded.</td></tr>"}</tbody></table>`;
    })
    .join("");
  const noteRows = sessions
    .flatMap((session) => session.notes.map((note) => ({ participant: session.participant, note })))
    .map((entry) => `<tr><td>${formatClock(entry.note.at)}</td><td>${escapeHtml(entry.participant)}</td><td>${escapeHtml(entry.note.text)}</td></tr>`)
    .join("");
  const feedbackBlocks = sessions
    .filter((session) => session.feedback)
    .map((session) => {
      const feedback = session.feedback as FeedbackAnswers;
      return `<div class="fb"><h4>${escapeHtml(session.participant)} — Overall ${feedback.overall}/5${feedback.taskDifficulty ? ` · Task Difficulty ${feedback.taskDifficulty}/5` : ""}</h4>
        <p><strong>Confused:</strong> ${escapeHtml(feedback.confused)}</p>
        <p><strong>Worked well:</strong> ${escapeHtml(feedback.workedWell)}</p>
        <p><strong>Improve:</strong> ${escapeHtml(feedback.improve)}</p></div>`;
    })
    .join("");

  printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(test.name)} — Usability Report</title>
  <style>
    body { font-family: "Helvetica Neue", Arial, sans-serif; color: #202634; margin: 40px; }
    h1 { font-size: 24px; margin: 0; } h2 { font-size: 15px; margin: 28px 0 10px; border-bottom: 2px solid #d0021b; padding-bottom: 6px; }
    .meta { color: #51596a; font-size: 12px; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    th, td { text-align: left; padding: 7px 9px; border-bottom: 1px solid #e5e9f0; }
    th { background: #f7f9fc; font-weight: 600; }
    .kpis { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
    .kpi { border: 1px solid #e5e9f0; border-radius: 8px; padding: 10px 14px; min-width: 120px; }
    .kpi small { display: block; color: #8b95a8; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi strong { font-size: 18px; }
    .fb { border: 1px solid #e5e9f0; border-radius: 8px; padding: 10px 14px; margin-top: 8px; font-size: 12px; }
    .fb h4 { margin: 0 0 6px; font-size: 12.5px; } .fb p { margin: 3px 0; }
    h4 { font-size: 12.5px; margin: 16px 0 4px; color: #202634; }
    @media print { body { margin: 16px; } }
  </style></head><body>
  <h1>${escapeHtml(test.name)}</h1>
  <p class="meta">QC Experience · User Testing Studio · ${escapeHtml(prototypeName(test.prototypeId))} · ${TEST_TYPE_LABELS[test.type]} · Moderator: ${escapeHtml(test.moderator)} · Generated ${new Date().toLocaleString()}</p>
  <h2>Executive Summary</h2>
  <p style="font-size:13px"><strong>Scenario:</strong> ${escapeHtml(test.scenario)}<br/><strong>Objective:</strong> ${escapeHtml(test.objective)}</p>
  <p style="font-size:13px">${analytics.sessionCount} participant${analytics.sessionCount === 1 ? "" : "s"} completed this study with a ${analytics.successRate}% task success rate and ${analytics.completionRate}% full completion rate. ${analytics.mostAbandonedScreen ? `The most abandoned screen was <strong>${escapeHtml(analytics.mostAbandonedScreen)}</strong>. ` : ""}${analytics.hardestTaskId ? `The most difficult task was <strong>${escapeHtml(test.tasks.find((t) => t.id === analytics.hardestTaskId)?.title ?? "")}</strong>.` : ""}</p>
  <h2>Participant Metrics</h2>
  <div class="kpis">
    <div class="kpi"><small>Participants</small><strong>${analytics.sessionCount}</strong></div>
    <div class="kpi"><small>Success Rate</small><strong>${analytics.successRate}%</strong></div>
    <div class="kpi"><small>Completion</small><strong>${analytics.completionRate}%</strong></div>
    <div class="kpi"><small>Drop-off</small><strong>${analytics.dropOffRate}%</strong></div>
    <div class="kpi"><small>Avg Duration</small><strong>${formatClock(analytics.avgDurationSec)}</strong></div>
    <div class="kpi"><small>Avg Clicks</small><strong>${analytics.avgClicks}</strong></div>
    <div class="kpi"><small>Avg Errors</small><strong>${analytics.avgErrors}</strong></div>
    <div class="kpi"><small>Misclick Rate</small><strong>${analytics.misclickRate}%</strong></div>
    <div class="kpi"><small>Nav. Efficiency</small><strong>${analytics.navigationEfficiency}%</strong></div>
    <div class="kpi"><small>Avg Time / Screen</small><strong>${formatClock(analytics.avgTimePerScreenSec)}</strong></div>
    <div class="kpi"><small>Satisfaction</small><strong>${analytics.avgSatisfaction}/5</strong></div>
  </div>
  <h2>Task Performance</h2>
  <table><thead><tr><th>Task</th><th>Attempts</th><th>Successes</th><th>Success</th><th>Avg Time</th><th>Avg Misclicks</th></tr></thead><tbody>${taskRows || "<tr><td colspan='6'>No task data yet.</td></tr>"}</tbody></table>
  <h2>Analytics — Sessions</h2>
  <table><thead><tr><th>Participant</th><th>Started</th><th>Duration</th><th>Outcome</th><th>Rating</th></tr></thead><tbody>${sessionRows || "<tr><td colspan='5'>No sessions yet.</td></tr>"}</tbody></table>
  <h2>Feedback</h2>
  ${feedbackBlocks || "<p style='font-size:12px'>No feedback collected yet.</p>"}
  <h2>Research Notes</h2>
  <table><thead><tr><th>Time</th><th>Participant</th><th>Observation</th></tr></thead><tbody>${noteRows || "<tr><td colspan='3'>No notes recorded.</td></tr>"}</tbody></table>
  <h2>Session Timeline</h2>
  ${timelineBlocks || "<p style='font-size:12px'>No sessions recorded yet.</p>"}
  </body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 350);
  return true;
}
