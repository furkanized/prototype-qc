import type { PrototypeModule } from "../types";

// Central registry of prototype modules. New prototypes (Boarding, Bag Drop,
// Transfer, Lounge, Security...) register here without touching the dashboard.
export const PROTOTYPES: PrototypeModule[] = [
  {
    id: "passenger-checkin",
    name: "Passenger Check-in",
    description: "Agent-facing DCS check-in workspace: flight board, passenger list, flight info and seat map.",
    icon: "airplane_ticket",
    status: "ready",
    version: "v2.4.0",
    estimatedDemoTime: "6–8 min",
    available: true,
    screens: [
      { id: "flight-board", name: "Flight Board", description: "Flight list sidebar with date navigation and search.", icon: "flight", command: "flight-board" },
      { id: "overview", name: "Flight Overview", description: "Selected flight summary, status control and route selector.", icon: "dashboard", command: "overview" },
      { id: "flight-info", name: "Flight Info Expanded", description: "Full flight information panel with tabs, KPIs and baggage.", icon: "expand_content", command: "flight-info" },
      { id: "passenger-list", name: "Passenger List", description: "Passenger table with selection, quick actions and check-in.", icon: "groups", command: "passenger-list" },
      { id: "seat-map", name: "Seat Map Focus", description: "Cabin seat map with special-service markers.", icon: "airline_seat_recline_normal", command: "seat-map" },
      { id: "compact", name: "Compact Workspace", description: "Collapsed sidebars — maximum room for the passenger table.", icon: "fit_screen", command: "compact" },
    ],
  },
  {
    id: "boarding",
    name: "Boarding",
    description: "Gate boarding flow with group calls, standby handling and APIS verification.",
    icon: "door_sliding",
    status: "draft",
    version: "v0.3.1",
    estimatedDemoTime: "4 min",
    available: false,
    screens: [],
  },
  {
    id: "bag-drop",
    name: "Bag Drop",
    description: "Self-service and agent-assisted bag drop with tag printing and overweight handling.",
    icon: "luggage",
    status: "draft",
    version: "v0.1.0",
    estimatedDemoTime: "3 min",
    available: false,
    screens: [],
  },
  {
    id: "transfer-desk",
    name: "Transfer Desk",
    description: "Connection rebooking and short-connection recovery for transfer passengers.",
    icon: "connecting_airports",
    status: "archived",
    version: "v0.2.0",
    estimatedDemoTime: "5 min",
    available: false,
    screens: [],
  },
  {
    id: "lounge-access",
    name: "Lounge Access",
    description: "Lounge entry validation with tier benefits and guest policies.",
    icon: "chair",
    status: "draft",
    version: "v0.1.2",
    estimatedDemoTime: "2 min",
    available: false,
    screens: [],
  },
];

export function getPrototype(id: string) {
  return PROTOTYPES.find((prototype) => prototype.id === id);
}

export const CHECKIN_PROTOTYPE = PROTOTYPES[0];

// Headless bridge into the running prototype: Free Mode dispatches commands,
// the prototype maps them onto its existing state. No prototype UI changes.
export function sendPrototypeCommand(command: string) {
  window.dispatchEvent(new CustomEvent("qcx-command", { detail: { command } }));
}
