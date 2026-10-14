import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createDailyQuestionQueue } from "../src/services/daily-question-queue-engine.js";

const REVIEW_FAMILY = "average_total_count";
const PLANNED_FAMILY = "multi_step_total_quantity";

function answerEvent({ familyId, hintsOpened = 0, isCorrect, timestamp }) {
  return {
    eventType: "answer_submitted",
    timestamp,
    payload: {
      questionFamilyId: familyId,
      hintsOpened,
      isCorrect,
      scoringSource: "server_authoritative",
    },
  };
}

function queue({ behaviorEvents, buckets }) {
  return createDailyQuestionQueue({
    allocation: { buckets },
    behaviorEvents,
    date: "2026-07-20",
    dailyMinutes: 8,
    plannedFamilyId: PLANNED_FAMILY,
    families: shanghaiMathItemFamilies,
    targetGrade: "G5",
  });
}

const resolvedAfterWrong = [
  answerEvent({ familyId: REVIEW_FAMILY, isCorrect: false, timestamp: "2026-07-18T09:00:00.000Z" }),
  answerEvent({ familyId: REVIEW_FAMILY, isCorrect: true, timestamp: "2026-07-18T09:05:00.000Z" }),
];
const retryAfterResolved = queue({
  behaviorEvents: resolvedAfterWrong,
  buckets: { wrong_retry: 1, correct_review: 0, new_stage_questions: 0, challenge_extension: 0 },
});
assert.equal(retryAfterResolved.items.every((item) => item.familyId === PLANNED_FAMILY), true);
assert.equal(retryAfterResolved.items.every((item) => item.source === "planned_foundation_fallback"), true);

const wrongAfterIndependent = [
  answerEvent({ familyId: REVIEW_FAMILY, isCorrect: true, timestamp: "2026-07-18T09:00:00.000Z" }),
  answerEvent({ familyId: REVIEW_FAMILY, isCorrect: false, timestamp: "2026-07-18T09:05:00.000Z" }),
];
const retryAfterNewWrong = queue({
  behaviorEvents: wrongAfterIndependent,
  buckets: { wrong_retry: 1, correct_review: 0, new_stage_questions: 0, challenge_extension: 0 },
});
assert.equal(retryAfterNewWrong.items.every((item) => item.familyId === REVIEW_FAMILY), true);
assert.equal(retryAfterNewWrong.items.every((item) => item.source === "unresolved_wrong_evidence"), true);

const hintSupportedOnly = [
  answerEvent({ familyId: REVIEW_FAMILY, hintsOpened: 2, isCorrect: true, timestamp: "2026-07-18T09:00:00.000Z" }),
];
const retryAfterHintSupport = queue({
  behaviorEvents: hintSupportedOnly,
  buckets: { wrong_retry: 1, correct_review: 0, new_stage_questions: 0, challenge_extension: 0 },
});
assert.equal(retryAfterHintSupport.items.every((item) => item.familyId === REVIEW_FAMILY), true);
assert.equal(retryAfterHintSupport.items.every((item) => item.source === "hint_supported_evidence"), true);

const reviewFromIndependent = queue({
  behaviorEvents: resolvedAfterWrong,
  buckets: { wrong_retry: 0, correct_review: 1, new_stage_questions: 0, challenge_extension: 0 },
});
assert.equal(reviewFromIndependent.items.every((item) => item.familyId === REVIEW_FAMILY), true);
assert.equal(reviewFromIndependent.items.every((item) => item.source === "independent_correct_evidence"), true);

const guidedFinalCheckQueue = createDailyQuestionQueue({
  allocation: {
    buckets: { wrong_retry: 0, correct_review: 1, new_stage_questions: 0, challenge_extension: 0 },
    topPriority: { id: "retain_brief_final_check" },
    matchingPolicy: { guidedFinalCheckFocus: "brief_final_check", originalReplayPriority: "protected" },
  },
  behaviorEvents: resolvedAfterWrong,
  date: "2026-07-20",
  dailyMinutes: 8,
  plannedFamilyId: PLANNED_FAMILY,
  families: shanghaiMathItemFamilies,
  targetGrade: "G5",
});
assert.equal(guidedFinalCheckQueue.matchingPolicy.primaryFocus, "retain_brief_final_check");
assert.equal(guidedFinalCheckQueue.supportPolicy.finalCheckFocus, "brief_final_check");
assert.equal(guidedFinalCheckQueue.items.every((item) => item.supportPolicy.finalCheckFocus === "brief_final_check"), true);

console.log("daily-question-queue-evidence-contract: passed");
