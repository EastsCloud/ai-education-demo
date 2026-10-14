import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createDailyQuestionQueue } from "../src/services/daily-question-queue-engine.js";
import { summarizeQuestionFeatureEvidence } from "../src/services/question-feature-evidence-engine.js";

function answer({ id, correct, featureKeys }) {
  return {
    eventId: `feature-answer-${id}`,
    eventType: "answer_submitted",
    timestamp: `2026-08-01T10:${String(id).padStart(2, "0")}:00.000Z`,
    payload: {
      isCorrect: correct,
      hintsOpened: 0,
      questionFeatureKeys: featureKeys,
    },
  };
}

const sparse = summarizeQuestionFeatureEvidence(
  Array.from({ length: 4 }, (_, index) =>
    answer({ id: index + 1, correct: false, featureKeys: ["number:contains_zero"] }),
  ),
);
assert.deepEqual(sparse.focusFeatureIds, []);

const repeatedPattern = [
  ...Array.from({ length: 6 }, (_, index) =>
    answer({
      id: index + 1,
      correct: index >= 4,
      featureKeys: ["number:contains_zero", "domain:quantity_relationship"],
    }),
  ),
  ...Array.from({ length: 6 }, (_, index) =>
    answer({
      id: index + 7,
      correct: true,
      featureKeys: ["domain:measurement_and_units"],
    }),
  ),
];
const evidence = summarizeQuestionFeatureEvidence(repeatedPattern);
assert.ok(evidence.focusFeatureIds.includes("number:contains_zero"));
assert.ok(evidence.focusFeatureIds.includes("domain:quantity_relationship"));
assert.equal(evidence.signals.every((signal) => signal.action === "reinforce_within_current_level"), true);
assert.equal(evidence.signals.every((signal) => !Object.hasOwn(signal, "rawValue")), true);

const family = shanghaiMathItemFamilies.find((item) => item.id === "part_whole_add_subtract");
assert.ok(family);
const queue = createDailyQuestionQueue({
  allocation: {
    buckets: { wrong_retry: 0, correct_review: 0, new_stage_questions: 1, challenge_extension: 0 },
  },
  behaviorEvents: [],
  featureEvidenceEvents: repeatedPattern,
  date: "2026-08-01",
  dailyMinutes: 8,
  plannedFamilyId: family.id,
  families: shanghaiMathItemFamilies,
  targetGrade: "G1",
});
assert.ok(queue.featureEvidence.focusFeatureIds.includes("number:contains_zero"));
assert.equal(queue.items.every((item) => item.instructionalGrade === "G1"), true);
assert.equal(queue.items.every((item) => item.featureFocus?.source === "recent_question_feature_evidence"), true);
assert.equal(queue.items.every((item) => item.featureFocus?.matchedFeatureIds.includes("domain:quantity_relationship")), true);
assert.ok(queue.guardrails.some((guardrail) => /Feature-focused seed selection/.test(guardrail)));

console.log("question-feature-evidence-contract: passed");
