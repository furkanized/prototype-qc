export type TestType = "moderated" | "unmoderated" | "think_aloud" | "task_based" | "exploratory";

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  moderated: "Moderated",
  unmoderated: "Unmoderated",
  think_aloud: "Think Aloud",
  task_based: "Task Based",
  exploratory: "Exploratory",
};

export type TestStatus = "draft" | "active" | "completed";

export interface TestTask {
  id: string;
  title: string;
  description: string;
  expectedOutcome: string;
  successCriteria: string;
  timeLimitSec?: number;
}

// Which optional participant-information fields the remote intake form shows.
export type ParticipantFieldKey = "name" | "email" | "ageRange" | "deviceType" | "browser" | "os" | "experienceLevel";

export type ParticipantFieldConfig = Record<ParticipantFieldKey, boolean>;

export interface ParticipantInfo {
  name?: string;
  email?: string;
  ageRange?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  experienceLevel?: string;
}

export interface UsabilityTest {
  id: string;
  name: string;
  prototypeId: string;
  scenario: string;
  objective: string;
  moderator: string;
  participantTarget: number;
  expectedDurationMin: number;
  type: TestType;
  status: TestStatus;
  tasks: TestTask[];
  createdAt: string;
  participantFields?: ParticipantFieldConfig;
}

// A shareable remote-testing link (/test/<code>). One invite = one participant
// session slot; researchers copy, regenerate, disable or duplicate them.
export interface TestInvite {
  id: string;
  code: string;
  testId: string;
  participantId: string;
  createdAt: string;
  expiresAt: string;
  disabled: boolean;
  usedBySessionId?: string;
}

// Realtime presence snapshot broadcast by a running participant session and
// consumed by the studio's live dashboard (BroadcastChannel, backend-ready).
export interface LiveParticipantStatus {
  sessionId: string;
  testId: string;
  inviteCode: string;
  participant: string;
  stage: string;
  screen: string;
  taskIndex: number;
  taskCount: number;
  completedTasks: number;
  elapsed: number;
  lastEventAt: number;
  lastEventLabel: string;
  sentAt: number; // epoch ms, for connection-status detection
}

export type SessionEventKind =
  | "session_start"
  | "session_end"
  | "screen"
  | "click"
  | "misclick"
  | "hover"
  | "scroll"
  | "input"
  | "idle"
  | "back"
  | "task_start"
  | "task_complete"
  | "task_fail";

// Structured interaction event. x/y are viewport coordinates (with vw/vh for
// normalisation) so future click/scroll/attention heatmaps can be rendered
// from the same stored data.
export interface SessionEvent {
  at: number; // seconds from session start
  kind: SessionEventKind;
  screen: string;
  label?: string;
  taskId?: string;
  x?: number;
  y?: number;
  vw?: number;
  vh?: number;
  scrollY?: number;
  value?: string;
}

export interface ResearchNote {
  id: string;
  at: number; // seconds from session start
  text: string;
}

export interface FeedbackAnswers {
  overall: number;
  easeOfUse: number;
  visualClarity: number;
  confidence: number;
  satisfaction: number;
  taskDifficulty?: number;
  confused: string;
  workedWell: string;
  improve: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  timeSec: number;
  misclicks: number;
}

export interface TestSession {
  id: string;
  testId: string;
  participant: string;
  startedAt: string;
  durationSec: number;
  completed: boolean;
  dropOffScreen?: string;
  events: SessionEvent[];
  notes: ResearchNote[];
  taskResults: TaskResult[];
  feedback?: FeedbackAnswers;
  remote?: boolean;
  inviteCode?: string;
  participantInfo?: ParticipantInfo;
  idleSec?: number;
}

export interface ScreenStat {
  screen: string;
  visits: number;
  totalTimeSec: number;
  clicks: number;
  misclicks: number;
  abandons: number;
}

export interface TestAnalytics {
  sessionCount: number;
  completedCount: number;
  successRate: number; // 0-100, task-level
  completionRate: number; // 0-100, session-level
  dropOffRate: number; // 0-100
  avgDurationSec: number;
  avgClicks: number;
  avgErrors: number;
  avgSatisfaction: number; // 0-5
  misclickRate: number; // 0-100, misclicks per click
  navigationEfficiency: number; // 0-100, unique screens vs transitions
  avgTimePerScreenSec: number;
  screenStats: ScreenStat[];
  hardestTaskId?: string;
  mostAbandonedScreen?: string;
  taskStats: Array<{ taskId: string; attempts: number; successes: number; avgTimeSec: number; avgMisclicks: number }>;
}
