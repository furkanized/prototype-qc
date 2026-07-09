import { useEffect, useMemo, useRef, useState } from "react";
import type { PageId, Scenario } from "../types";
import { CHECKIN_PROTOTYPE } from "../services/prototypeRegistry";
import { Icon } from "./Icon";
import { Highlight } from "./Highlight";

interface SearchResult {
  group: string;
  icon: string;
  title: string;
  detail: string;
  action: () => void;
}

const SAMPLE_PASSENGERS = ["Ayşe Aydın", "Mehmet Aydın", "Elif Aydın", "Kerem Yılmaz", "Zeynep Demir", "Can Öztürk"];
const DESTINATIONS = [
  { code: "IST", city: "Istanbul" },
  { code: "AMS", city: "Amsterdam" },
  { code: "LHR", city: "London Heathrow" },
  { code: "CDG", city: "Paris" },
  { code: "JFK", city: "New York" },
  { code: "SIN", city: "Singapore" },
  { code: "NRT", city: "Tokyo Narita" },
  { code: "ESB", city: "Ankara" },
];

export function GlobalSearch({
  scenarios,
  onNavigate,
  onLaunchScenario,
  onLaunchScreen,
}: {
  scenarios: Scenario[];
  onNavigate: (page: PageId) => void;
  onLaunchScenario: (scenario: Scenario) => void;
  onLaunchScreen: (screenCommand: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const matches: SearchResult[] = [];

    scenarios
      .filter((scenario) => `${scenario.title} ${scenario.description} ${scenario.flightNumber ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 4)
      .forEach((scenario) => matches.push({
        group: "Scenarios",
        icon: scenario.icon,
        title: scenario.title,
        detail: scenario.flightNumber ? `${scenario.flightNumber} · ${scenario.departure} → ${scenario.arrival}` : scenario.description,
        action: () => onLaunchScenario(scenario),
      }));

    SAMPLE_PASSENGERS.filter((name) => name.toLowerCase().includes(needle)).slice(0, 3).forEach((name) =>
      matches.push({ group: "Passengers", icon: "person", title: name, detail: "Passenger record", action: () => onNavigate("scenarios") }));

    const flights = [...new Set(scenarios.map((scenario) => scenario.flightNumber).filter(Boolean))] as string[];
    flights.filter((code) => code.toLowerCase().includes(needle)).slice(0, 3).forEach((code) =>
      matches.push({ group: "Flights", icon: "flight", title: code, detail: "Scheduled flight", action: () => onNavigate("scenarios") }));

    CHECKIN_PROTOTYPE.screens
      .filter((screen) => `${screen.name} ${screen.description}`.toLowerCase().includes(needle))
      .slice(0, 3)
      .forEach((screen) => matches.push({
        group: "Screens",
        icon: screen.icon,
        title: screen.name,
        detail: "Passenger Check-in screen",
        action: () => onLaunchScreen(screen.command),
      }));

    DESTINATIONS.filter((destination) => `${destination.code} ${destination.city}`.toLowerCase().includes(needle)).slice(0, 3).forEach((destination) =>
      matches.push({ group: "Destinations", icon: "location_on", title: `${destination.code} — ${destination.city}`, detail: "Destination", action: () => onNavigate("library") }));

    return matches;
  }, [query, scenarios, onLaunchScenario, onLaunchScreen, onNavigate]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SearchResult[]>();
    results.forEach((result) => {
      const bucket = grouped.get(result.group) ?? [];
      bucket.push(result);
      grouped.set(result.group, bucket);
    });
    return [...grouped.entries()];
  }, [results]);

  return (
    <div className="qcx-search" ref={rootRef}>
      <Icon icon="search" size={18} className="qcx-search-glyph" />
      <input
        ref={inputRef}
        value={query}
        placeholder="Search scenarios, flights, screens..."
        aria-label="Global search"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      <kbd>⌘K</kbd>
      {open && query.trim() ? (
        <div className="qcx-search-popover">
          {groups.length === 0 ? (
            <div className="qcx-search-empty"><Icon icon="search_off" size={18} /> No results for “{query}”</div>
          ) : (
            groups.map(([group, items]) => (
              <div className="qcx-search-group" key={group}>
                <span className="qcx-search-group-label">{group}</span>
                {items.map((result) => (
                  <button
                    key={`${group}-${result.title}`}
                    className="qcx-search-result"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      result.action();
                    }}
                  >
                    <Icon icon={result.icon} size={17} />
                    <span className="qcx-search-result-title"><Highlight text={result.title} query={query} /></span>
                    <span className="qcx-search-result-detail">{result.detail}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
