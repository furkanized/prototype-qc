import type { Scenario } from "../types";
import { readStore, writeStore } from "./storage";

const CUSTOM_KEY = "scenarios";

const BUILTIN_BASE: Array<Omit<Scenario, "updatedAt" | "builtin" | "prototypeId">> = [
  { id: "passenger-checkin", title: "Passenger Check-in", description: "Standard single-passenger check-in from search to boarding pass.", icon: "airplane_ticket", status: "ready", passengerName: "Ayşe Aydın", flightNumber: "TK1951", departure: "IST", arrival: "AMS", passengerCount: 1, cabinClass: "Economy" },
  { id: "family-checkin", title: "Family Check-in", description: "Multi-passenger check-in for the Aydın family with seat pooling.", icon: "family_restroom", status: "ready", passengerName: "Aydın Family", flightNumber: "TK1951", departure: "IST", arrival: "AMS", passengerCount: 4, cabinClass: "Economy" },
  { id: "flight-delay", title: "Flight Delay", description: "Delayed departure — status change, passenger notification and rebooking options.", icon: "schedule", status: "ready", flightNumber: "TK1979", departure: "IST", arrival: "LHR", passengerCount: 2, cabinClass: "Economy" },
  { id: "lost-baggage", title: "Lost Baggage", description: "Baggage irregularity flow with alert states in the passenger list.", icon: "luggage", status: "draft", flightNumber: "TK1830", departure: "IST", arrival: "CDG", passengerCount: 1, cabinClass: "Economy" },
  { id: "transfer-passenger", title: "Transfer Passenger", description: "Short connection at IST — inbound leg tracking and priority handling.", icon: "connecting_airports", status: "ready", flightNumber: "TK0001", departure: "JFK", arrival: "IST", passengerCount: 1, cabinClass: "Business" },
  { id: "vip-passenger", title: "VIP Passenger", description: "Elite Plus member with lounge access, priority tags and special services.", icon: "workspace_premium", status: "ready", passengerName: "Kerem Yılmaz", flightNumber: "TK0003", departure: "IST", arrival: "SIN", passengerCount: 1, cabinClass: "Business" },
  { id: "domestic-flight", title: "Domestic Flight", description: "IST–ESB domestic flow — no APIS, fast document handling.", icon: "flight_takeoff", status: "ready", flightNumber: "TK2124", departure: "IST", arrival: "ESB", passengerCount: 1, cabinClass: "Economy" },
  { id: "international-flight", title: "International Flight", description: "Long-haul international check-in with full APIS and visa verification.", icon: "public", status: "ready", flightNumber: "TK0077", departure: "IST", arrival: "NRT", passengerCount: 2, cabinClass: "Economy" },
  { id: "special-assistance", title: "Special Assistance", description: "WCHR passenger with escort coordination and seat-map special markers.", icon: "accessible", status: "draft", flightNumber: "TK1951", departure: "IST", arrival: "AMS", passengerCount: 1, cabinClass: "Economy" },
];

export const BUILTIN_SCENARIOS: Scenario[] = BUILTIN_BASE.map((scenario) => ({
  ...scenario,
  builtin: true,
  prototypeId: "passenger-checkin",
  updatedAt: "2026-07-06T10:00:00.000Z",
}));

export function getCustomScenarios(): Scenario[] {
  return readStore<Scenario[]>(CUSTOM_KEY, []);
}

export function getAllScenarios(): Scenario[] {
  return [...getCustomScenarios(), ...BUILTIN_SCENARIOS];
}

export interface ScenarioDraft {
  title: string;
  passengerName: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  date: string;
  passengerCount: number;
  cabinClass: string;
  notes: string;
}

export function createScenario(draft: ScenarioDraft): Scenario {
  const scenario: Scenario = {
    id: `custom-${Date.now().toString(36)}`,
    title: draft.title,
    description: draft.notes.trim() || `${draft.departure} → ${draft.arrival} · ${draft.flightNumber} · ${draft.passengerCount} pax, ${draft.cabinClass}`,
    icon: "draw",
    status: "ready",
    builtin: false,
    prototypeId: "passenger-checkin",
    passengerName: draft.passengerName,
    flightNumber: draft.flightNumber,
    departure: draft.departure,
    arrival: draft.arrival,
    date: draft.date,
    passengerCount: draft.passengerCount,
    cabinClass: draft.cabinClass,
    notes: draft.notes,
    updatedAt: new Date().toISOString(),
  };
  writeStore(CUSTOM_KEY, [scenario, ...getCustomScenarios()]);
  return scenario;
}

export function deleteScenario(id: string) {
  writeStore(CUSTOM_KEY, getCustomScenarios().filter((scenario) => scenario.id !== id));
}
