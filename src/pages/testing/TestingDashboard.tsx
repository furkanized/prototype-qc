import { useMemo } from "react";
import { Icon } from "../../components/Icon";
import { computeAnalytics, formatClock, prototypeName } from "../../services/testingService";
import type { TestSession, UsabilityTest } from "../../types/testing";
import { TEST_TYPE_LABELS } from "../../types/testing";
import { StarRating, TestStatusBadge } from "./shared";

export function TestingDashboard({
  tests,
  sessions,
  onCreate,
  onOpen,
  onGoLive,
  onDelete,
}: {
  tests: UsabilityTest[];
  sessions: TestSession[];
  onCreate: () => void;
  onOpen: (test: UsabilityTest) => void;
  onGoLive: (test: UsabilityTest) => void;
  onDelete: (test: UsabilityTest) => void;
}) {
  const stats = useMemo(() => {
    const allResults = sessions.flatMap((session) => session.taskResults);
    const completedSessions = sessions.filter((session) => session.completed);
    return {
      active: tests.filter((test) => test.status === "active").length,
      draft: tests.filter((test) => test.status === "draft").length,
      completed: tests.filter((test) => test.status === "completed").length,
      participants: sessions.length,
      successRate: allResults.length ? Math.round((allResults.filter((result) => result.success).length / allResults.length) * 100) : 0,
      avgTime: sessions.length ? Math.round(sessions.reduce((sum, session) => sum + session.durationSec, 0) / sessions.length) : 0,
      taskCompletion: allResults.length ? Math.round((allResults.filter((result) => result.success).length / allResults.length) * 100) : 0,
      dropOff: sessions.length ? Math.round(((sessions.length - completedSessions.length) / sessions.length) * 100) : 0,
    };
  }, [tests, sessions]);

  const latestFeedback = useMemo(
    () =>
      sessions
        .filter((session) => session.feedback)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 3),
    [sessions],
  );

  const heroStats = [
    { icon: "play_circle", label: "Active Tests", value: String(stats.active), tone: "good" },
    { icon: "edit_note", label: "Draft Tests", value: String(stats.draft) },
    { icon: "task_alt", label: "Completed Tests", value: String(stats.completed) },
    { icon: "groups", label: "Participants", value: String(stats.participants) },
    { icon: "military_tech", label: "Success Rate", value: `${stats.successRate}%`, tone: stats.successRate >= 70 ? "good" : undefined },
    { icon: "timer", label: "Avg Completion Time", value: formatClock(stats.avgTime) },
    { icon: "checklist", label: "Task Completion Rate", value: `${stats.taskCompletion}%` },
    { icon: "trending_down", label: "Drop-off Rate", value: `${stats.dropOff}%` },
  ];

  return (
    <>
      <header className="qcx-page-head">
        <div>
          <h1>User Testing Studio</h1>
          <p>Plan, run and analyse usability tests on QC Experience prototypes.</p>
        </div>
        <button className="qcx-button primary" onClick={onCreate}><Icon icon="add" size={18} />New Test</button>
      </header>

      <section className="qcx-hero-stats uts-stats" aria-label="Testing overview">
        {heroStats.map((stat) => (
          <div className="qcx-stat" key={stat.label}>
            <span className={`qcx-stat-icon ${stat.tone ?? ""}`}><Icon icon={stat.icon} size={18} fill /></span>
            <div>
              <small>{stat.label}</small>
              <strong>{stat.value}</strong>
            </div>
          </div>
        ))}
      </section>

      <section aria-label="Usability tests">
        <div className="qcx-section-head">
          <h2>Usability Tests</h2>
          <span>{tests.length} total</span>
        </div>
        {tests.length === 0 ? (
          <div className="qcx-empty">
            <Icon icon="science" size={28} />
            <strong>No tests yet</strong>
            <p>Create your first usability test to start collecting insight.</p>
          </div>
        ) : (
          <div className="uts-test-list">
            {tests.map((test, index) => {
              const testSessions = sessions.filter((session) => session.testId === test.id);
              const analytics = computeAnalytics(test, testSessions);
              return (
                <article className="qcx-card uts-test-card" key={test.id} style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}>
                  <div className="qcx-card-head">
                    <span className="qcx-card-icon custom"><Icon icon="science" size={20} fill /></span>
                    <TestStatusBadge status={test.status} />
                  </div>
                  <h3>{test.name}</h3>
                  <p>{test.objective}</p>
                  <div className="qcx-card-meta">
                    <span><Icon icon="widgets" size={14} />{prototypeName(test.prototypeId)}</span>
                    <span><Icon icon="category" size={14} />{TEST_TYPE_LABELS[test.type]}</span>
                    <span><Icon icon="person" size={14} />{test.moderator}</span>
                    <span><Icon icon="groups" size={14} />{testSessions.length}/{test.participantTarget} participants</span>
                    <span><Icon icon="checklist" size={14} />{test.tasks.length} tasks</span>
                    {analytics.sessionCount > 0 ? <span><Icon icon="military_tech" size={14} />{analytics.successRate}% success</span> : null}
                  </div>
                  <div className="qcx-card-actions">
                    <button className="qcx-button primary" onClick={() => onOpen(test)}><Icon icon="query_stats" size={17} />Results</button>
                    {test.status !== "completed" && test.tasks.length > 0 ? (
                      <button className="qcx-button ghost" onClick={() => onGoLive(test)}><Icon icon="sensors" size={17} />Run Session</button>
                    ) : null}
                    <button className="qcx-icon-button" aria-label={`Delete ${test.name}`} title="Delete test" onClick={() => onDelete(test)}><Icon icon="delete" size={18} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Latest feedback">
        <div className="qcx-section-head">
          <h2>Latest Feedback</h2>
          <span>{latestFeedback.length} recent</span>
        </div>
        {latestFeedback.length === 0 ? (
          <div className="qcx-empty">
            <Icon icon="reviews" size={28} />
            <strong>No feedback yet</strong>
            <p>Feedback appears here after participants complete a session.</p>
          </div>
        ) : (
          <div className="uts-feedback-row">
            {latestFeedback.map((session) => (
              <article className="qcx-card uts-feedback-card" key={session.id}>
                <div className="uts-feedback-head">
                  <span className="qcx-avatar uts-avatar-sm">{session.participant.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                  <div>
                    <strong>{session.participant}</strong>
                    <small>{tests.find((test) => test.id === session.testId)?.name ?? "Test"} · {new Date(session.startedAt).toLocaleDateString()}</small>
                  </div>
                  <StarRating value={session.feedback?.overall ?? 0} />
                </div>
                <p>“{session.feedback?.workedWell}”</p>
                <p className="uts-feedback-improve"><Icon icon="lightbulb" size={14} /> {session.feedback?.improve}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
