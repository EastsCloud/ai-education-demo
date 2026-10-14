const DEFAULT_MAX_ANSWER_COUNT = 36;
const DEFAULT_MAX_ACTIVITY_EVENTS_WITHOUT_ANSWERS = 80;

function positiveWholeNumber(value, fallback) {
  const normalized = Math.floor(Number(value));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

function isScoredAnswer(event) {
  return event?.eventType === "answer_submitted" && typeof event?.payload?.isCorrect === "boolean";
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function sortChronologically(events = []) {
  return events
    .map((event, sourceIndex) => ({
      event,
      sourceIndex,
      timestamp: toTimestamp(event?.timestamp),
    }))
    .sort((left, right) => {
      const leftTime = left.timestamp ?? 0;
      const rightTime = right.timestamp ?? 0;
      return leftTime - rightTime || left.sourceIndex - right.sourceIndex;
    })
    .map((entry, chronologicalIndex) => ({ ...entry, chronologicalIndex }));
}

function targetKey(event) {
  const targetId = String(event?.targetId || event?.payload?.targetId || "").trim();
  return targetId || null;
}

function sessionKey(event) {
  const sessionId = String(event?.sessionId || event?.payload?.sessionId || "").trim();
  return sessionId || null;
}

function practiceRunKey(event) {
  const practiceRunId = String(event?.practiceRunId || event?.payload?.practiceRunId || "").trim();
  return practiceRunId || null;
}

function metadata({ source, answerLimit, selectedAnswers, allAnswers, events }) {
  return {
    id: "behavior-evidence-window-v1",
    source,
    answerLimit,
    selectedAnswerCount: selectedAnswers.length,
    totalAnswerCount: allAnswers.length,
    activityEventCount: Math.max(0, events.length - selectedAnswers.length),
    eventCount: events.length,
    startedAt: events[0]?.timestamp || null,
    endedAt: events.at(-1)?.timestamp || null,
  };
}

/**
 * Keeps current matching responsive without throwing away the evidence that
 * other services need for reports, exact retries, and curriculum progression.
 */
export function selectCurrentBehaviorEvidence({
  behaviorEvents = [],
  maxAnswerCount = DEFAULT_MAX_ANSWER_COUNT,
  maxActivityEventsWithoutAnswers = DEFAULT_MAX_ACTIVITY_EVENTS_WITHOUT_ANSWERS,
} = {}) {
  const answerLimit = positiveWholeNumber(maxAnswerCount, DEFAULT_MAX_ANSWER_COUNT);
  const fallbackLimit = positiveWholeNumber(
    maxActivityEventsWithoutAnswers,
    DEFAULT_MAX_ACTIVITY_EVENTS_WITHOUT_ANSWERS,
  );
  const chronological = sortChronologically(Array.isArray(behaviorEvents) ? behaviorEvents : []);
  const allAnswers = chronological.filter(({ event }) => isScoredAnswer(event));

  if (!allAnswers.length) {
    const selected = chronological.slice(-fallbackLimit);
    const events = selected.map(({ event }) => event);
    return {
      events,
      metadata: metadata({
        source: "recent_activity_fallback",
        answerLimit,
        selectedAnswers: [],
        allAnswers,
        events,
      }),
    };
  }

  const selectedAnswers = allAnswers.slice(-answerLimit);
  const selectedSourceIndexes = new Set(selectedAnswers.map(({ sourceIndex }) => sourceIndex));
  const selectedTargets = new Set(selectedAnswers.map(({ event }) => targetKey(event)).filter(Boolean));
  const selectedSessions = new Set(selectedAnswers.map(({ event }) => sessionKey(event)).filter(Boolean));
  const selectedPracticeRuns = new Set(selectedAnswers.map(({ event }) => practiceRunKey(event)).filter(Boolean));
  const firstSelectedChronologicalIndex = selectedAnswers[0].chronologicalIndex;

  const events = chronological
    .filter(({ event, sourceIndex, chronologicalIndex }) => {
      if (selectedSourceIndexes.has(sourceIndex)) return true;
      if (isScoredAnswer(event)) return false;

      // A question-linked action can precede its answer; broader session actions
      // enter only after the selected answer window begins.
      if (selectedTargets.has(targetKey(event))) return true;
      if (selectedPracticeRuns.has(practiceRunKey(event))) return true;
      return chronologicalIndex >= firstSelectedChronologicalIndex && selectedSessions.has(sessionKey(event));
    })
    .map(({ event }) => event);

  return {
    events,
    metadata: metadata({
      source: allAnswers.length > answerLimit ? "recent_scored_answer_window" : "all_scored_answer_evidence",
      answerLimit,
      selectedAnswers: selectedAnswers.map(({ event }) => event),
      allAnswers: allAnswers.map(({ event }) => event),
      events,
    }),
  };
}
