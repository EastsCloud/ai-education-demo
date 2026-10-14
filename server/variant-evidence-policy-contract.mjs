import assert from "node:assert/strict";
import { createDynamicLearningCurve } from "../src/services/dynamic-learning-curve-engine.js";
import { summarizeLearningEvidence } from "../src/services/learning-evidence-engine.js";
import { analyzeLearningBehavior } from "../src/services/behavior-analysis-engine.js";
import { createStageAssessmentSession, scoreStageAssessment } from "../src/services/stage-assessment-engine.js";

function question(id, answer, variantLevel) {
  return {
    id,
    answer,
    qualityStatus: "system_validated",
    metadataTags: {
      familyId: "part_whole_add_subtract",
      variantLevel,
      gradeBands: ["G2"],
      atlasNodeIds: ["part_whole"],
      abilityTags: ["compute_stably"],
    },
  };
}

function answerEvent(id, variantLevel, isCorrect) {
  return {
    eventId: `evidence-${id}`,
    eventType: "answer_submitted",
    sessionId: "variant-evidence-contract",
    targetId: `question-${id}`,
    timestamp: `2026-08-03T10:${String(id).padStart(2, "0")}:00.000Z`,
    payload: {
      abilityTags: ["compute_stably"],
      elapsedSeconds: 30,
      hintsOpened: 0,
      isCorrect,
      variantLevel,
    },
  };
}

const session = createStageAssessmentSession({
  studentId: "student-001",
  subjectId: "math",
  questions: [
    question("original", 10, "original"),
    question("one-number", 11, "change_one_number"),
    question("two-number", 12, "change_two_numbers"),
    question("new-context", 13, "context_change"),
    question("same-relation", 14, "original"),
  ],
  minimumQuestions: 4,
});

const result = scoreStageAssessment({
  session,
  responses: [
    { questionId: "original", answer: 10 },
    { questionId: "one-number", answer: 11 },
    { questionId: "two-number", answer: 12 },
    { questionId: "new-context", answer: 0 },
    { questionId: "same-relation", answer: 14 },
  ],
});

assert.equal(result.accuracy, 0.8);
assert.equal(result.controlledVariantItemCount, 2);
assert.equal(result.controlledVariantAccuracy, 1);
assert.equal(result.transferItemCount, 1);
assert.equal(result.transferAccuracy, 0);
assert.equal(result.masteryScore, 0.74);

const dynamicCurve = createDynamicLearningCurve({
  staticCurve: {
    id: "variant-evidence-static-curve",
    progressCurve: [0.4, 0.5, 0.6, 0.7, 0.8],
    targetProgress: 1,
    currentPoint: { week: 1, progressTowardTarget: 0.4, remainingGap: 0.6 },
  },
  stageResult: result,
});
assert.equal(dynamicCurve.canUpdate, true);
assert.equal(dynamicCurve.updateEvidence.controlledVariantAccuracy, 1);
assert.equal(dynamicCurve.updateEvidence.transferAccuracy, 0);

const behavior = analyzeLearningBehavior([
  answerEvent(1, "change_one_number", true),
  answerEvent(2, "change_two_numbers", true),
  answerEvent(3, "context_change", false),
]);
assert.equal(behavior.allocationInputs.controlledVariantStabilityRate, 1);
assert.equal(behavior.allocationInputs.formTransferRate, 0);
assert.equal(behavior.allocationInputs.formTransferEvidenceCount, 1);

const learningEvidence = summarizeLearningEvidence([
  answerEvent(1, "change_one_number", true),
  answerEvent(2, "context_change", false),
]);
const transferDimension = learningEvidence.dimensions.find((dimension) => dimension.id === "transfer");
assert.equal(transferDimension?.attempts, 1);
assert.equal(transferDimension?.observedScore, 0);

console.log("variant-evidence-policy-contract: passed");
