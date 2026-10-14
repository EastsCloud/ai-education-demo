import assert from "node:assert/strict";
import { selectCurrentBehaviorEvidence } from "../src/services/behavior-evidence-window.js";

function answer(index, { sessionId = "current-session" } = {}) {
  return {
    eventId: `answer-${index}`,
    eventType: "answer_submitted",
    sessionId,
    targetId: `question-${index}`,
    timestamp: `2026-08-01T10:${String(index).padStart(2, "0")}:00.000Z`,
    payload: {
      isCorrect: index % 2 === 0,
      practiceRunId: sessionId === "old-session" ? "old-run" : "current-run",
    },
  };
}

const eventWindow = selectCurrentBehaviorEvidence({
  behaviorEvents: [
    { eventId: "old-hint", eventType: "hint_opened", sessionId: "old-session", targetId: "question-1", timestamp: "2026-08-01T09:59:00.000Z", payload: { hintLevel: 1 } },
    ...Array.from({ length: 4 }, (_, index) => answer(index + 1, { sessionId: "old-session" })),
    { eventId: "old-current-action", eventType: "question_started", sessionId: "current-session", targetId: "question-4", timestamp: "2026-08-01T10:04:30.000Z", payload: {} },
    { eventId: "linked-hint", eventType: "hint_opened", sessionId: "current-session", targetId: "question-5", timestamp: "2026-08-01T10:04:45.000Z", payload: { hintLevel: 1 } },
    ...Array.from({ length: 36 }, (_, index) => answer(index + 5)),
    { eventId: "current-summary", eventType: "practice_summary_options_offered", sessionId: "client-runtime-session", targetId: "daily-run-1", timestamp: "2026-08-01T10:41:00.000Z", payload: { practiceRunId: "current-run" } },
    { eventId: "unrelated-action", eventType: "practice_detail_opened", sessionId: "other-session", targetId: "other-question", timestamp: "2026-08-01T10:42:00.000Z", payload: {} },
  ],
});

assert.equal(eventWindow.metadata.source, "recent_scored_answer_window");
assert.equal(eventWindow.metadata.answerLimit, 36);
assert.equal(eventWindow.metadata.selectedAnswerCount, 36);
assert.equal(eventWindow.metadata.totalAnswerCount, 40);
assert.deepEqual(
  eventWindow.events.filter((event) => event.eventType === "answer_submitted").map((event) => event.eventId),
  Array.from({ length: 36 }, (_, index) => `answer-${index + 5}`),
);
assert.ok(eventWindow.events.some((event) => event.eventId === "linked-hint"));
assert.ok(eventWindow.events.some((event) => event.eventId === "current-summary"));
assert.equal(eventWindow.events.some((event) => event.eventId === "old-hint"), false);
assert.equal(eventWindow.events.some((event) => event.eventId === "old-current-action"), false);
assert.equal(eventWindow.events.some((event) => event.eventId === "unrelated-action"), false);

const fallback = selectCurrentBehaviorEvidence({
  behaviorEvents: [
    { eventId: "activity-1", eventType: "question_started", timestamp: "2026-08-01T08:00:00.000Z", payload: {} },
    { eventId: "activity-2", eventType: "practice_detail_opened", timestamp: "2026-08-01T08:01:00.000Z", payload: {} },
  ],
  maxActivityEventsWithoutAnswers: 1,
});
assert.equal(fallback.metadata.source, "recent_activity_fallback");
assert.equal(fallback.metadata.selectedAnswerCount, 0);
assert.deepEqual(fallback.events.map((event) => event.eventId), ["activity-2"]);

const unordered = selectCurrentBehaviorEvidence({
  behaviorEvents: [answer(3), answer(1), answer(4), answer(2)],
  maxAnswerCount: 2,
});
assert.deepEqual(
  unordered.events.filter((event) => event.eventType === "answer_submitted").map((event) => event.eventId),
  ["answer-3", "answer-4"],
);

console.log("behavior-evidence-window-contract: passed");
