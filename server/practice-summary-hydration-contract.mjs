import assert from "node:assert/strict";
import { createPracticeRuntime } from "../src/modules/practice-runtime.js";

function answerEvent({
  eventId,
  isCorrect,
  practiceRunId = "run-today",
  scoringSource = "server_authoritative",
  sessionId = practiceRunId,
  timestamp,
  variantLevel = "original",
  hintsOpened = 0,
  guidedStepsOpened = 0,
}) {
  return {
    eventId,
    studentId: "student-001",
    subjectId: "math-linear-equations",
    sessionId,
    eventType: "answer_submitted",
    timestamp,
    targetId: `question-${eventId}`,
    payload: {
      isCorrect,
      hintsOpened,
      guidedStepsOpened,
      questionPrompt: `题目 ${eventId}`,
      variantLevel,
      stageLabel: variantLevel === "original" ? "原题" : "换一个数字",
      practiceRunId,
      deliveryId: `delivery-${eventId}`,
      scoringSource,
      answer: 999,
    },
  };
}

const runtime = createPracticeRuntime({
  baseQuestionId: "base-question",
  getDefaultTargetId: () => "base-question",
  getPage: () => "practice",
  seedEvents: [],
  studentId: "student-001",
  subjectId: "math-linear-equations",
});

const summary = runtime.restoreCompletedItemsFromEvents(
  [
    answerEvent({
      eventId: "trusted-wrong",
      isCorrect: false,
      timestamp: "2026-08-04T09:00:00.000Z",
    }),
    answerEvent({
      eventId: "trusted-hinted-correct",
      isCorrect: true,
      hintsOpened: 2,
      variantLevel: "change_one_number",
      timestamp: "2026-08-04T09:01:00.000Z",
    }),
    answerEvent({
      eventId: "trusted-optional-correct",
      isCorrect: true,
      timestamp: "2026-08-04T09:02:00.000Z",
    }),
    answerEvent({
      eventId: "untrusted-browser-claim",
      isCorrect: true,
      scoringSource: "browser_claimed",
      timestamp: "2026-08-04T09:03:00.000Z",
    }),
    answerEvent({
      eventId: "another-run",
      isCorrect: true,
      practiceRunId: "run-other-day",
      timestamp: "2026-08-04T09:04:00.000Z",
    }),
  ],
  { practiceRunId: "run-today", requireServerScored: true },
);

assert.equal(summary.total, 3);
assert.equal(summary.correctCount, 2);
assert.equal(summary.wrongCount, 1);
assert.deepEqual(
  summary.correctItems.map((item) => item.eventId),
  ["trusted-hinted-correct", "trusted-optional-correct"],
);
assert.equal(summary.wrongItems[0].answerText, "已记录，可选择原题重做。");
assert.equal(summary.correctItems[0].answerText, "借助帮助完成；之后会安排一次独立重做。");
assert.equal(summary.wrongItems[0].questionSnapshot, null);
assert.equal("answer" in summary.wrongItems[0], false);
assert.equal(JSON.stringify(summary).includes("999"), false);

const rebuilt = runtime.restoreCompletedItemsFromEvents(
  [
    answerEvent({
      eventId: "trusted-wrong",
      isCorrect: false,
      timestamp: "2026-08-04T09:00:00.000Z",
    }),
    answerEvent({
      eventId: "trusted-hinted-correct",
      isCorrect: true,
      hintsOpened: 2,
      variantLevel: "change_one_number",
      timestamp: "2026-08-04T09:01:00.000Z",
    }),
    answerEvent({
      eventId: "trusted-optional-correct",
      isCorrect: true,
      timestamp: "2026-08-04T09:02:00.000Z",
    }),
  ],
  { practiceRunId: "run-today", requireServerScored: true },
);

assert.equal(rebuilt.total, 3);

const serverSummary = runtime.restoreCompletedItemsFromSummaryItems([
  {
    id: "summary-correct",
    questionId: "summary-question-correct",
    prompt: "摘要题目一",
    stageLabel: "原题",
    isCorrect: true,
    hintsOpened: 0,
    guidedStepsOpened: 1,
  },
  {
    id: "summary-wrong",
    questionId: "summary-question-wrong",
    prompt: "摘要题目二",
    stageLabel: "换一个数字",
    isCorrect: false,
    hintsOpened: 1,
  },
]);

assert.equal(serverSummary.total, 2);
assert.equal(serverSummary.correctCount, 1);
assert.equal(serverSummary.wrongCount, 1);
assert.equal(serverSummary.correctItems[0].answerText, "借助帮助完成；之后会安排一次独立重做。");
assert.equal(serverSummary.wrongItems[0].answerText, "已记录，可选择原题重做。");
assert.equal("answer" in serverSummary.wrongItems[0], false);

console.log("practice-summary-hydration-contract: passed");
