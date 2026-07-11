export type ScenarioStatus = "ready" | "draft" | "archived";

// A guided step inside a scenario. When conditionScript is set, the Smart
// Task engine tracks completion automatically while the scenario runs.
export interface ScenarioTask {
  id: string;
  title: string;
  instruction?: string;
  conditionScript?: string;
  hint?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: ScenarioStatus;
  builtin: boolean;
  passengerName?: string;
  flightNumber?: string;
  departure?: string;
  arrival?: string;
  date?: string;
  passengerCount?: number;
  cabinClass?: string;
  notes?: string;
  updatedAt: string;
  prototypeId: string;
  tasks?: ScenarioTask[];
}

export interface PrototypeScreen {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string;
}

export interface PrototypeModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: ScenarioStatus;
  version: string;
  screens: PrototypeScreen[];
  estimatedDemoTime: string;
  available: boolean;
}

export interface ActivityEntry {
  id: string;
  icon: string;
  label: string;
  detail: string;
  at: string;
}

export interface Settings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  designerName: string;
  skipIntro: boolean;
}

export type PageId =
  | "dashboard"
  | "scenarios"
  | "creator"
  | "freemode"
  | "library"
  | "testing"
  | "activity"
  | "settings";

export interface Toast {
  id: number;
  icon: string;
  title: string;
  message?: string;
  tone: "success" | "info" | "danger";
}
