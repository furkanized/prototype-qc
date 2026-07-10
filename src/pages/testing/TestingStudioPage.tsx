import { useCallback, useState } from "react";
import { useToasts } from "../../hooks/useToasts";
import { deleteTest, getSessions, getTests, saveSession, saveTest } from "../../services/testingService";
import type { TestSession, UsabilityTest } from "../../types/testing";
import { LiveObservationView } from "./LiveObservationView";
import { TestCreateView } from "./TestCreateView";
import { TestDetailView } from "./TestDetailView";
import { TestingDashboard } from "./TestingDashboard";

type StudioView =
  | { kind: "dashboard" }
  | { kind: "create" }
  | { kind: "live"; testId: string }
  | { kind: "detail"; testId: string };

export function TestingStudioPage() {
  const { pushToast } = useToasts();
  const [tests, setTests] = useState<UsabilityTest[]>(() => getTests());
  const [sessions, setSessions] = useState<TestSession[]>(() => getSessions());
  const [view, setView] = useState<StudioView>({ kind: "dashboard" });

  const refresh = useCallback(() => {
    setTests(getTests());
    setSessions(getSessions());
  }, []);

  const handleCreate = useCallback((test: UsabilityTest) => {
    saveTest(test);
    refresh();
    pushToast({
      icon: test.status === "draft" ? "save" : "rocket_launch",
      title: test.status === "draft" ? "Draft saved" : "Test created",
      message: `“${test.name}” ${test.status === "draft" ? "is saved as a draft." : "is now active and ready for sessions."}`,
      tone: "success",
    });
    setView({ kind: "dashboard" });
  }, [pushToast, refresh]);

  const handleDelete = useCallback((test: UsabilityTest) => {
    deleteTest(test.id);
    refresh();
    pushToast({ icon: "delete", title: "Test deleted", message: `“${test.name}” and its sessions were removed.`, tone: "info" });
    setView({ kind: "dashboard" });
  }, [pushToast, refresh]);

  const handleSessionFinished = useCallback((session: TestSession) => {
    saveSession(session);
    const test = getTests().find((candidate) => candidate.id === session.testId);
    if (test && test.status === "draft") saveTest({ ...test, status: "active" });
    refresh();
    pushToast({
      icon: session.completed ? "check_circle" : "stop_circle",
      title: session.completed ? "Session saved" : "Session ended early",
      message: `${session.participant}'s session was recorded${session.feedback ? " with feedback" : ""}.`,
      tone: session.completed ? "success" : "info",
    });
    setView({ kind: "detail", testId: session.testId });
  }, [pushToast, refresh]);

  const handleSessionImported = useCallback((session: TestSession) => {
    saveSession(session);
    refresh();
    pushToast({ icon: "download_done", title: "Session imported", message: `${session.participant}'s remote session was added to the results.`, tone: "success" });
  }, [pushToast, refresh]);

  const activeTest = view.kind === "live" || view.kind === "detail" ? tests.find((test) => test.id === view.testId) : undefined;

  return (
    <div className="qcx-page-inner uts-studio">
      {view.kind === "create" ? (
        <TestCreateView onCreate={handleCreate} onCancel={() => setView({ kind: "dashboard" })} />
      ) : view.kind === "live" && activeTest ? (
        <LiveObservationView test={activeTest} onFinish={handleSessionFinished} onCancel={() => setView({ kind: "dashboard" })} />
      ) : view.kind === "detail" && activeTest ? (
        <TestDetailView
          test={activeTest}
          sessions={sessions.filter((session) => session.testId === activeTest.id)}
          onBack={() => setView({ kind: "dashboard" })}
          onGoLive={() => setView({ kind: "live", testId: activeTest.id })}
          onImport={handleSessionImported}
        />
      ) : (
        <TestingDashboard
          tests={tests}
          sessions={sessions}
          onCreate={() => setView({ kind: "create" })}
          onOpen={(test) => setView({ kind: "detail", testId: test.id })}
          onGoLive={(test) => setView({ kind: "live", testId: test.id })}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
