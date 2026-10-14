import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { estimateFamilyMastery } from "../src/services/family-mastery-estimator.js";
import { createDailyQuestionQueue } from "../src/services/daily-question-queue-engine.js";

function answer({ familyId, isCorrect, hintsOpened = 0, index, scoringSource = "server_authoritative", variantLevel = "original" }) {
  return {
    eventType: "answer_submitted",
    timestamp: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    payload: { familyId, questionFamilyId: familyId, isCorrect, hintsOpened, scoringSource, variantLevel },
  };
}

const steadyFamily = "average_total_count";
const fragileFamily = "multi_step_total_quantity";
const weakFamily = "ratio_total_split";

const steady = estimateFamilyMastery({
  familyId: steadyFamily,
  behaviorEvents: Array.from({ length: 7 }, (_, index) => answer({ familyId: steadyFamily, isCorrect: true, index })),
});
assert.equal(steady.confidence, "medium");
assert.ok(steady.masteryEstimate > 0.75);
assert.equal(steady.recommendation, "ready_for_variation");

const hinted = estimateFamilyMastery({
  familyId: fragileFamily,
  behaviorEvents: Array.from({ length: 7 }, (_, index) =>
    answer({ familyId: fragileFamily, isCorrect: true, hintsOpened: 2, index }),
  ),
});
assert.equal(hinted.confidence, "medium");
assert.ok(hinted.masteryEstimate < steady.masteryEstimate);
assert.equal(hinted.recommendation, "consolidate");

const weak = estimateFamilyMastery({
  familyId: weakFamily,
  behaviorEvents: Array.from({ length: 6 }, (_, index) => answer({ familyId: weakFamily, isCorrect: false, index })),
});
assert.ok(weak.masteryEstimate < 0.42);
assert.equal(weak.recommendation, "stabilize");

const ignoredBrowserClaim = estimateFamilyMastery({
  familyId: weakFamily,
  behaviorEvents: [answer({ familyId: weakFamily, isCorrect: true, index: 1, scoringSource: "browser_claim" })],
});
assert.equal(ignoredBrowserClaim.answerCount, 0);
assert.equal(ignoredBrowserClaim.masteryEstimate, 0.5);

const eligibleFamilies = shanghaiMathItemFamilies.filter((family) => family.gradeBands.includes("G5"));
const queue = createDailyQuestionQueue({
  allocation: { buckets: { wrong_retry: 0, correct_review: 1, new_stage_questions: 0, challenge_extension: 0 } },
  behaviorEvents: [
    ...Array.from({ length: 7 }, (_, index) => answer({ familyId: steadyFamily, isCorrect: true, index })),
    answer({ familyId: fragileFamily, isCorrect: true, index: 8 }),
  ],
  date: "2026-08-10",
  dailyMinutes: 8,
  plannedFamilyId: steadyFamily,
  families: eligibleFamilies,
  targetGrade: "G5",
});
assert.equal(queue.items.every((item) => item.familyId === fragileFamily), true);
assert.ok(queue.familyMastery.families.some((item) => item.familyId === steadyFamily));
assert.equal(JSON.stringify(queue.familyMastery).includes("answerDraftValue"), false);

console.log("family-mastery-estimator-contract: passed");
