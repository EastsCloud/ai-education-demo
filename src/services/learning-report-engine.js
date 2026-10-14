import { summarizeGuidedResponseEvidence } from "./guided-response-evidence-engine.js";
import { createIndependentAnswerPredicate, summarizeRetryEvidence } from "./retry-evidence-engine.js?v=retry-evidence-2";

const RAPID_WRONG_SECONDS = 12;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(2)) : null;
}

function average(values = []) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function answerEvents(events = []) {
  return events
    .filter((event) => event?.eventType === "answer_submitted" && typeof event.payload?.isCorrect === "boolean")
    .slice()
    .sort((left, right) => toTimestamp(left.timestamp) - toTimestamp(right.timestamp));
}

function sessionKey(event, index) {
  return event.sessionId || `untagged-${String(event.timestamp || "").slice(0, 10) || index}`;
}

function eventPayloadSeconds(events = []) {
  const event = events
    .slice()
    .reverse()
    .find((item) => ["app_session_paused", "app_session_ended"].includes(item?.eventType));
  const seconds = Number(event?.payload?.activeSeconds);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function buildVisitSummaries(events = []) {
  const bySession = new Map();
  events
    .filter((event) => event?.eventType === "app_session_started")
    .forEach((event, index) => {
      const key = sessionKey(event, index);
      const existing = bySession.get(key) || { id: key, events: [] };
      existing.events.push(event);
      bySession.set(key, existing);
    });

  events.forEach((event, index) => {
    const key = sessionKey(event, index);
    const visit = bySession.get(key);
    if (visit && event.eventType !== "app_session_started") visit.events.push(event);
  });

  return [...bySession.values()]
    .map((visit) => {
      const startEvent = visit.events.find((event) => event.eventType === "app_session_started");
      const startedAt = startEvent?.timestamp || startEvent?.payload?.startedAt || null;
      const timestamp = toTimestamp(startedAt);
      const entryHour = Number(startEvent?.payload?.entryHour);
      const activeSeconds = eventPayloadSeconds(visit.events) || 0;
      return {
        id: visit.id,
        startedAt,
        entryHour: Number.isInteger(entryHour) && entryHour >= 0 && entryHour <= 23 ? entryHour : timestamp ? new Date(timestamp).getHours() : null,
        activeSeconds,
        minutes: activeSeconds ? Math.max(1, Math.round(activeSeconds / 60)) : 0,
        completed: visit.events.some((event) => event.eventType === "app_session_ended"),
      };
    })
    .sort((left, right) => toTimestamp(left.startedAt) - toTimestamp(right.startedAt));
}

function typicalEntryHour(visits = []) {
  if (visits.length < 3) return null;
  const counts = new Map();
  visits.forEach((visit) => {
    if (!Number.isInteger(visit.entryHour)) return;
    counts.set(visit.entryHour, (counts.get(visit.entryHour) || 0) + 1);
  });
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0];
  return top && top[1] >= 2 ? top[0] : null;
}

function buildSessionSummary(events, answers) {
  const answerIds = new Set(answers.map((item) => item.eventId));
  const bySession = new Map();

  events.forEach((event, index) => {
    const key = sessionKey(event, index);
    const session = bySession.get(key) || { id: key, events: [], answers: [] };
    session.events.push(event);
    if (answerIds.has(event.eventId)) session.answers.push(event);
    bySession.set(key, session);
  });

  return [...bySession.values()]
    .filter((session) => session.answers.length > 0)
    .map((session) => {
      const answerSeconds = session.answers
        .map((event) => Number(event.payload?.elapsedSeconds))
        .filter((value) => Number.isFinite(value) && value > 0);
      const eventTimes = session.events.map((event) => toTimestamp(event.timestamp)).filter(Boolean);
      const timestampSeconds = eventTimes.length > 1 ? Math.max(0, (Math.max(...eventTimes) - Math.min(...eventTimes)) / 1000) : 0;
      const recordedActiveSeconds = eventPayloadSeconds(session.events);
      const activeSeconds =
        recordedActiveSeconds ?? (answerSeconds.length ? answerSeconds.reduce((sum, value) => sum + value, 0) : timestampSeconds);
      const minutes = Math.max(1, Math.round(activeSeconds / 60));

      return {
        id: session.id,
        answerCount: session.answers.length,
        activeSeconds: Math.round(activeSeconds),
        minutes,
        startedAt: session.events.map((event) => event.timestamp).filter(Boolean).sort()[0] || null,
      };
    })
    .sort((left, right) => toTimestamp(left.startedAt) - toTimestamp(right.startedAt));
}

function recentWindow(events, answers) {
  const latest = Math.max(...events.map((event) => toTimestamp(event.timestamp)), 0);
  if (!latest) return { events: [], answers: [] };
  const start = latest - 6 * 24 * 60 * 60 * 1000;
  return {
    events: events.filter((event) => toTimestamp(event.timestamp) >= start),
    answers: answers.filter((event) => toTimestamp(event.timestamp) >= start),
  };
}

export function buildLearningReport({ behaviorEvents = [] } = {}) {
  const events = behaviorEvents.slice().sort((left, right) => toTimestamp(left.timestamp) - toTimestamp(right.timestamp));
  const answers = answerEvents(events);
  const isIndependentAnswer = createIndependentAnswerPredicate(events);
  const correct = answers.filter((event) => event.payload.isCorrect);
  const noHintAnswers = answers.filter(isIndependentAnswer);
  const noHintCorrect = noHintAnswers.filter((event) => event.payload.isCorrect);
  const hintedAnswers = answers.filter((event) => !isIndependentAnswer(event));
  const hintedCorrect = hintedAnswers.filter((event) => event.payload.isCorrect);
  const variants = answers.filter((event) => event.payload?.variantLevel && event.payload.variantLevel !== "original");
  const variantCorrect = variants.filter((event) => event.payload.isCorrect);
  const timedAnswers = answers.filter((event) => Number.isFinite(Number(event.payload?.elapsedSeconds)) && Number(event.payload.elapsedSeconds) > 0);
  const fastWrong = timedAnswers.filter(
    (event) => !event.payload.isCorrect && Number(event.payload.elapsedSeconds) <= RAPID_WRONG_SECONDS,
  );
  const revisionObservedAnswers = answers.filter((event) => Number.isFinite(Number(event.payload?.answerRevisionCount)));
  const revisedAnswers = revisionObservedAnswers.filter((event) => Number(event.payload?.answerRevisionCount) > 0);
  const sessionSummaries = buildSessionSummary(events, answers);
  const visitSummaries = buildVisitSummaries(events);
  const recent = recentWindow(events, answers);
  const recentSessions = buildSessionSummary(recent.events, recent.answers);
  const retryEvidence = summarizeRetryEvidence({ events, answers });
  const retry = {
    retryCount: retryEvidence.retryCount,
    retrySuccessRate: rate(retryEvidence.retrySuccessCount, retryEvidence.retryCount),
  };
  const voluntaryPracticeCount = events
    .filter((event) => ["same_type_more_requested", "harder_extra_practice_requested", "atlas_related_practice_requested"].includes(event.eventType))
    .reduce(
      (sum, event) =>
        sum + (event.eventType === "atlas_related_practice_requested" ? 1 : Number(event.payload?.requestedCount || 0)),
      0,
    );
  const strategyExplorationCount = events.filter((event) => event?.eventType === "solution_strategy_opened").length;
  const guidedResponseEvidence = summarizeGuidedResponseEvidence(events);
  const sessionMinutes = sessionSummaries.map((session) => session.minutes);
  const recentMinutes = recentSessions.reduce((sum, session) => sum + session.minutes, 0);
  const totalActiveVisitMinutes = visitSummaries.reduce((sum, visit) => sum + visit.minutes, 0);

  return {
    source: "behavior_event_learning_report_v1",
    hasEvidence: answers.length > 0,
    answerCount: answers.length,
    correctRate: rate(correct.length, answers.length),
    noHintAnswerCount: noHintAnswers.length,
    noHintAccuracy: rate(noHintCorrect.length, noHintAnswers.length),
    hintedAnswerCount: hintedAnswers.length,
    hintedAccuracy: rate(hintedCorrect.length, hintedAnswers.length),
    hintUseRate: rate(hintedAnswers.length, answers.length),
    variantAnswerCount: variants.length,
    variantAccuracy: rate(variantCorrect.length, variants.length),
    fastGuessRate: rate(fastWrong.length, timedAnswers.length),
    averageAnswerSeconds: Number(average(timedAnswers.map((event) => Number(event.payload.elapsedSeconds))).toFixed(1)),
    answerRevisionEvidenceCount: revisionObservedAnswers.length,
    answerRevisionItemCount: revisedAnswers.length,
    answerRevisionRate: rate(revisedAnswers.length, revisionObservedAnswers.length),
    averageAnswerRevisionCount: revisionObservedAnswers.length
      ? Number(average(revisionObservedAnswers.map((event) => Number(event.payload?.answerRevisionCount || 0))).toFixed(1))
      : null,
    ...retry,
    voluntaryPracticeCount,
    strategyExplorationCount,
    ...guidedResponseEvidence,
    sessionCount: sessionSummaries.length,
    totalStudyMinutes: sessionMinutes.reduce((sum, value) => sum + value, 0),
    recentStudyMinutes: recentMinutes,
    longestSessionMinutes: sessionMinutes.length ? Math.max(...sessionMinutes) : 0,
    shortestSessionMinutes: sessionMinutes.length ? Math.min(...sessionMinutes) : 0,
    averageSessionMinutes: sessionMinutes.length ? Number(average(sessionMinutes).toFixed(1)) : 0,
    sessionSummaries,
    visitCount: visitSummaries.length,
    completedVisitCount: visitSummaries.filter((visit) => visit.completed).length,
    totalActiveVisitMinutes,
    typicalEntryHour: typicalEntryHour(visitSummaries),
    visitSummaries,
    guardrail:
      "Report metrics describe recorded learning behavior. They support reflection and next-question allocation; only formal tests may update the dynamic curve.",
  };
}
