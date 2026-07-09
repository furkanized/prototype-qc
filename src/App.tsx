import { useCallback, useEffect, useState } from "react";
import type { ActivityEntry, PageId, Scenario } from "./types";
import { IntroExperience } from "./experience/IntroExperience";
import { PrototypeHost } from "./experience/PrototypeHost";
import { AppShell } from "./layouts/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { ScenarioCreatorPage } from "./pages/ScenarioCreatorPage";
import { FreeModePage } from "./pages/FreeModePage";
import { LibraryPage } from "./pages/LibraryPage";
import { ActivityPage } from "./pages/ActivityPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ToastProvider, useToasts } from "./hooks/useToasts";
import { useSettings } from "./hooks/useSettings";
import { createScenario, deleteScenario, getAllScenarios, type ScenarioDraft } from "./services/scenarioService";
import { getActivity, logActivity } from "./services/activityService";

type Stage =
  | { kind: "intro" }
  | { kind: "shell" }
  | { kind: "prototype"; scenario: Scenario | null; freeMode: boolean; initialScreen?: string };

function AppInner() {
  const { settings, updateSettings } = useSettings();
  const { pushToast } = useToasts();
  const [stage, setStage] = useState<Stage>(() => (settings.skipIntro ? { kind: "shell" } : { kind: "intro" }));
  const [page, setPage] = useState<PageId>("dashboard");
  const [scenarios, setScenarios] = useState<Scenario[]>(() => getAllScenarios());
  const [activity, setActivity] = useState<ActivityEntry[]>(() => getActivity());
  const [lastScenario, setLastScenario] = useState<Scenario | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // The prototype expects a fixed-width canvas; the platform is responsive.
  useEffect(() => {
    const inPrototype = stage.kind === "prototype";
    document.documentElement.classList.toggle("qcx-mode", !inPrototype);
    document.documentElement.classList.toggle("qcx-reduced-motion", settings.reducedMotion);
  }, [stage, settings.reducedMotion]);

  const goToStage = useCallback((next: Stage) => {
    setTransitioning(true);
    window.setTimeout(() => {
      setStage(next);
      setTransitioning(false);
    }, 240);
  }, []);

  const launchScenario = useCallback((scenario: Scenario) => {
    setLastScenario(scenario);
    setActivity(logActivity("play_arrow", `Launched ${scenario.title}`, scenario.flightNumber ? `${scenario.flightNumber} · ${scenario.departure} → ${scenario.arrival}` : "Passenger Check-in prototype"));
    goToStage({ kind: "prototype", scenario, freeMode: false });
  }, [goToStage]);

  const enterFreeMode = useCallback((initialScreen?: string) => {
    setActivity(logActivity("explore", "Entered Free Mode", "Passenger Check-in playground"));
    goToStage({ kind: "prototype", scenario: null, freeMode: true, initialScreen });
  }, [goToStage]);

  const exitPrototype = useCallback(() => {
    goToStage({ kind: "shell" });
  }, [goToStage]);

  const handleCreate = useCallback((draft: ScenarioDraft) => {
    const scenario = createScenario(draft);
    setScenarios(getAllScenarios());
    setActivity(logActivity("add_circle", `Created scenario ${scenario.title}`, `${scenario.flightNumber} · ${scenario.departure} → ${scenario.arrival}`));
    pushToast({ icon: "check_circle", title: "Scenario created", message: `“${scenario.title}” is now on the dashboard.`, tone: "success" });
  }, [pushToast]);

  const handleDelete = useCallback((scenario: Scenario) => {
    deleteScenario(scenario.id);
    setScenarios(getAllScenarios());
    setActivity(logActivity("delete", `Deleted scenario ${scenario.title}`, "Custom scenario removed"));
    pushToast({ icon: "delete", title: "Scenario deleted", message: `“${scenario.title}” was removed.`, tone: "info" });
  }, [pushToast]);

  const pages: Record<PageId, React.ReactNode> = {
    dashboard: <DashboardPage scenarios={scenarios} settings={settings} onLaunch={launchScenario} onDelete={handleDelete} onCreate={() => setPage("creator")} />,
    scenarios: <ScenariosPage scenarios={scenarios} onLaunch={launchScenario} onDelete={handleDelete} />,
    creator: <ScenarioCreatorPage onCreate={handleCreate} />,
    freemode: <FreeModePage onEnter={enterFreeMode} />,
    library: <LibraryPage onLaunch={() => launchScenario(scenarios.find((scenario) => scenario.builtin) ?? scenarios[0])} />,
    activity: <ActivityPage activity={activity} />,
    settings: <SettingsPage settings={settings} onUpdate={updateSettings} />,
  };

  return (
    <div className={`qcx-root ${transitioning ? "stage-leaving" : ""}`}>
      {stage.kind === "intro" ? (
        <IntroExperience soundEnabled={settings.soundEnabled} onDone={() => goToStage({ kind: "shell" })} />
      ) : stage.kind === "prototype" ? (
        <PrototypeHost scenario={stage.scenario} freeMode={stage.freeMode} initialScreen={stage.initialScreen} onExit={exitPrototype} />
      ) : (
        <AppShell
          page={page}
          onNavigate={setPage}
          scenarios={scenarios}
          settings={settings}
          activeScenario={lastScenario}
          onLaunchScenario={launchScenario}
          onLaunchScreen={(command) => enterFreeMode(command)}
        >
          {pages[page]}
        </AppShell>
      )}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
