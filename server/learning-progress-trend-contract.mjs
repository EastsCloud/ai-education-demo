import assert from "node:assert/strict";
import { buildLearningProgressTrend } from "../src/services/learning-progress-trend-engine.js";

function answer({ index, correct, hintsOpened = 0, scoringSource = "server_authoritative" }) {
  return {
    eventType: "answer_submitted",
    timestamp: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    payload: {
      isCorrect: correct,
      hintsOpened,
      scoringSource,
    },
  };
}

const growingPractice = buildLearningProgressTrend({
  answerEvents: [
    ...Array.from({ length: 4 }, (_, index) => answer({ index, correct: false, hintsOpened: 1 })),
    ...Array.from({ length: 4 }, (_, index) => answer({ index: index + 4, correct: true })),
    answer({ index: 9, correct: true, scoringSource: "browser_claimed" }),
  ],
});

assert.equal(growingPractice.availability, "observed");
assert.equal(growingPractice.primarySignal, "practice_behavior");
assert.equal(growingPractice.practice.availability, "observed");
assert.equal(growingPractice.practice.direction, "growing_independence");
assert.equal(growingPractice.practice.trustedAnswerCount, 8);
assert.deepEqual(
  growingPractice.practice.checkpoints.map((checkpoint) => checkpoint.answerCount),
  [4, 4],
);
assert.equal(growingPractice.formal.availability, "collecting");
assert.equal(JSON.stringify(growingPractice).includes("browser_claimed"), false);

const formalTrend = buildLearningProgressTrend({
  stageAssessmentHistory: [
    {
      id: "formal-earlier",
      status: "completed_verified",
      completedAt: "2026-07-01T10:00:00.000Z",
      masteryScore: 0.52,
      questionResults: [{ answer: 9 }],
    },
    {
      id: "formal-later",
      eligibleForCurveUpdate: true,
      completedAt: "2026-08-01T10:00:00.000Z",
      masteryScore: 0.76,
      questionResults: [{ answer: 12 }],
    },
    {
      id: "formal-not-verified",
      status: "completed_needs_review",
      completedAt: "2026-08-02T10:00:00.000Z",
      masteryScore: 1,
    },
  ],
});

assert.equal(formalTrend.availability, "observed");
assert.equal(formalTrend.primarySignal, "verified_formal_test");
assert.equal(formalTrend.formal.availability, "observed");
assert.equal(formalTrend.formal.verifiedTestCount, 2);
assert.equal(formalTrend.formal.direction, "upward");
assert.equal(formalTrend.formal.delta, 0.24);
assert.equal(JSON.stringify(formalTrend).includes("questionResults"), false);
assert.equal(JSON.stringify(formalTrend).includes('"answer":9'), false);

const sparse = buildLearningProgressTrend({
  answerEvents: [answer({ index: 1, correct: true }), answer({ index: 2, correct: true })],
});
assert.equal(sparse.availability, "collecting");
assert.equal(sparse.practice.trustedAnswerCount, 2);

console.log("learning-progress-trend-contract: passed");
