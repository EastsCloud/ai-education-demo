import assert from "node:assert/strict";
import { analyzeLearningBehavior } from "../src/services/behavior-analysis-engine.js";
import { createDailyAllocation } from "../src/services/daily-allocation-engine.js";

function answer({
  id,
  unitId = null,
  variantLevel = "original",
  correct,
  elapsedSeconds = 55,
  timestamp,
  correctReviewSourceDeliveryId = null,
  hintsOpened = 0,
  extraPracticeMode = null,
}) {
  return {
    eventId: `answer-${id}`,
    eventType: "answer_submitted",
    sessionId: "practice-run-1",
    targetId: `question-${id}`,
    timestamp: timestamp || `2026-07-14T10:${String(id).padStart(2, "0")}:00.000Z`,
    payload: {
      isCorrect: correct,
      hintsOpened,
      elapsedSeconds,
      extraPracticeMode,
      questionFamilyId: "quantity_total_difference",
      variantLevel,
      correctReviewSourceDeliveryId,
      queueItemId: unitId,
      practiceRunId: unitId ? "practice-run-1" : null,
      progressionUnitIndex: unitId ? Number(unitId.slice(-1)) : null,
    },
  };
}

const events = [
  {
    eventId: "strategy-opened-1",
    eventType: "solution_strategy_opened",
    sessionId: "practice-run-1",
    targetId: "question-1",
    timestamp: "2026-07-14T09:59:00.000Z",
    payload: { supportMode: "strategy_and_guided" },
  },
  answer({ id: 1, unitId: "unit-1", correct: true }),
  answer({ id: 2, unitId: "unit-1", variantLevel: "change_one_number", correct: true }),
  answer({ id: 3, unitId: "unit-1", variantLevel: "change_two_numbers", correct: true }),
  answer({ id: 4, unitId: "unit-2", correct: true }),
  answer({ id: 5, unitId: "unit-2", variantLevel: "change_one_number", correct: false, elapsedSeconds: 24 }),
  answer({ id: 6, unitId: "unit-3", correct: true }),
  answer({ id: 7, unitId: "unit-3", variantLevel: "change_one_number", correct: false, elapsedSeconds: 26 }),
  answer({ id: 8, unitId: "unit-3", variantLevel: "change_one_number", correct: true }),
  // Same-family answers without a linked practice unit must not be mistaken for a reproduction failure.
  answer({ id: 9, correct: true }),
  answer({ id: 10, correct: false, elapsedSeconds: 25 }),
  {
    eventId: "guided-step-1",
    eventType: "guided_step_response_recorded",
    sessionId: "practice-run-1",
    targetId: "question-guided-1",
    timestamp: "2026-07-14T10:12:00.000Z",
    payload: {
      deliveryId: "delivery-guided-1",
      guidedStepIndex: 0,
      guidedStepPhase: "read_translate",
      guidedResponseType: "short_reasoning",
      guidedResponseStatus: "recorded",
    },
  },
  {
    eventId: "guided-step-final-retry",
    eventType: "guided_step_response_recorded",
    sessionId: "practice-run-1",
    targetId: "question-guided-1",
    timestamp: "2026-07-14T10:13:00.000Z",
    payload: {
      deliveryId: "delivery-guided-1",
      guidedStepIndex: 3,
      guidedResponseType: "final_answer",
      guidedResponseStatus: "needs_retry",
    },
  },
  {
    eventId: "guided-step-final-confirmed",
    eventType: "guided_step_response_recorded",
    sessionId: "practice-run-1",
    targetId: "question-guided-1",
    timestamp: "2026-07-14T10:14:00.000Z",
    payload: {
      deliveryId: "delivery-guided-1",
      guidedStepIndex: 3,
      guidedResponseType: "final_answer",
      guidedResponseStatus: "confirmed",
    },
  },
];

const behavior = analyzeLearningBehavior(events);
assert.equal(behavior.answerCount, 10);
assert.equal(behavior.reportMetrics.reproductionCount, 3);
assert.equal(Number(behavior.reportMetrics.reproductionSuccessRate.toFixed(2)), 0.67);
assert.equal(Number(behavior.allocationInputs.repeatedCorrectThenWrongRate.toFixed(2)), 0.33);
assert.equal(Number(behavior.reportMetrics.recoveredReproductionRate.toFixed(2)), 0.33);
assert.ok(behavior.reportMetrics.slowAccurateRate > 0.35);
assert.equal(behavior.reportMetrics.strategyExplorationCount, 1);
assert.equal(behavior.reportMetrics.guidedResponseDeliveryCount, 1);
assert.equal(behavior.reportMetrics.guidedFinalRetryAttemptCount, 1);
assert.equal(behavior.reportMetrics.guidedFinalConfirmationRate, 1);
assert.deepEqual(behavior.reportMetrics.guidedReasoningPhaseCounts, { read_translate: 1 });
assert.match(behavior.guardrail, /linked original/);
assert.equal(Number(behavior.allocationInputs.controlledVariantStabilityRate.toFixed(2)), 0.6);
assert.equal(behavior.allocationInputs.formTransferRate, null);

const splitEvidence = analyzeLearningBehavior([
  answer({ id: 21, variantLevel: "change_one_number", correct: true }),
  answer({ id: 22, variantLevel: "change_two_numbers", correct: false }),
  answer({ id: 23, variantLevel: "context_change", correct: true }),
  answer({ id: 24, variantLevel: "relationship_reframe", correct: false }),
]);
assert.equal(splitEvidence.allocationInputs.controlledVariantStabilityRate, 0.5);
assert.equal(splitEvidence.allocationInputs.formTransferRate, 0.5);
assert.equal(splitEvidence.allocationInputs.formTransferEvidenceCount, 2);

const linkedCorrectReviewEvidence = analyzeLearningBehavior([
  answer({
    id: 31,
    unitId: "review-unit-1",
    variantLevel: "context_change",
    correct: true,
    correctReviewSourceDeliveryId: "prior-correct-delivery-1",
  }),
  answer({
    id: 32,
    unitId: "review-unit-2",
    variantLevel: "context_change",
    correct: false,
    correctReviewSourceDeliveryId: "prior-correct-delivery-2",
  }),
]);
assert.equal(linkedCorrectReviewEvidence.reportMetrics.correctReviewCount, 2);
assert.equal(linkedCorrectReviewEvidence.reportMetrics.correctReviewSuccessRate, 0.5);
assert.equal(linkedCorrectReviewEvidence.reportMetrics.reproductionCount, 2);
assert.equal(linkedCorrectReviewEvidence.reportMetrics.reproductionSuccessRate, 0.5);
assert.equal(linkedCorrectReviewEvidence.allocationInputs.repeatedCorrectThenWrongRate, 0.5);

const allocation = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: { ...behavior.allocationInputs, wrongRate: 0.2 },
});
assert.ok(allocation.adjustments.includes("独立准确优先于速度，保持稳步推进"));

const guidedFinalCheckSupport = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: {
    answerCount: 18,
    evidenceConfidence: "high",
    wrongRate: 0.2,
    retrySuccessRate: 0.7,
    correctReproductionRate: 0.7,
    hintFreeCorrectRate: 0.7,
    hintDepthAverage: 1,
    guidedFinalCheckCount: 2,
    guidedFinalConfirmationRate: 0.5,
  },
});
assert.equal(guidedFinalCheckSupport.matchingPolicy.guidedFinalCheckFocus, "brief_final_check");
assert.equal(guidedFinalCheckSupport.topPriority.id, "retain_brief_final_check");
assert.ok(guidedFinalCheckSupport.adjustments.includes("分步核对需要支持，保留简短复现与自检"));
assert.ok(guidedFinalCheckSupport.buckets.correct_review > 0.25);
assert.equal(guidedFinalCheckSupport.buckets.wrong_retry, 0.4);

const sparseWrong = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: {
    answerCount: 1,
    evidenceConfidence: "low",
    wrongRate: 1,
    retrySuccessRate: 0.6,
    correctReproductionRate: 0.7,
    hintFreeCorrectRate: 0.6,
    hintDepthAverage: 1,
  },
});
const establishedWrong = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: {
    answerCount: 18,
    evidenceConfidence: "high",
    wrongRate: 1,
    retrySuccessRate: 0.6,
    correctReproductionRate: 0.7,
    hintFreeCorrectRate: 0.6,
    hintDepthAverage: 1,
  },
});
assert.equal(sparseWrong.behaviorEvidence.adjustmentWeight, 0.35);
assert.equal(establishedWrong.behaviorEvidence.adjustmentWeight, 1);
assert.ok(sparseWrong.buckets.wrong_retry > 0.4 && sparseWrong.buckets.wrong_retry < establishedWrong.buckets.wrong_retry);
assert.equal(establishedWrong.buckets.wrong_retry, 0.5);

const hintedChallengeEvidence = analyzeLearningBehavior([
  ...Array.from({ length: 6 }, (_, index) => answer({ id: 41 + index, correct: true })),
  ...Array.from({ length: 4 }, (_, index) =>
    answer({
      id: 47 + index,
      correct: true,
      hintsOpened: 2,
      extraPracticeMode: "harder",
      variantLevel: "multi_step_extension",
    }),
  ),
  {
    eventId: "hinted-challenge-request",
    eventType: "harder_extra_practice_requested",
    timestamp: "2026-07-14T11:00:00.000Z",
    payload: { requestedCount: 3 },
  },
]);
assert.equal(hintedChallengeEvidence.allocationInputs.challengeSuccessRate, 1);
assert.equal(hintedChallengeEvidence.allocationInputs.independentChallengeTransferEvidenceCount, 0);
assert.equal(hintedChallengeEvidence.allocationInputs.independentChallengeTransferSuccessRate, null);
assert.equal(hintedChallengeEvidence.observations.some((item) => item.includes("无提示变式完成稳定")), false);

const hintedChallengeAllocation = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: {
    ...hintedChallengeEvidence.allocationInputs,
    answerCount: hintedChallengeEvidence.answerCount,
    evidenceConfidence: hintedChallengeEvidence.confidence,
  },
});
assert.equal(hintedChallengeAllocation.adjustments.includes("主动加练中的无提示变式完成稳定，允许小幅加速"), false);

const hintSupportedControlledVariants = analyzeLearningBehavior([
  ...Array.from({ length: 6 }, (_, index) => answer({ id: 71 + index, correct: true })),
  ...Array.from({ length: 2 }, (_, index) =>
    answer({ id: 77 + index, correct: true, hintsOpened: 1, variantLevel: "change_one_number" }),
  ),
]);
assert.equal(hintSupportedControlledVariants.allocationInputs.controlledVariantStabilityRate, 1);
assert.equal(hintSupportedControlledVariants.allocationInputs.independentControlledVariantEvidenceCount, 0);
assert.equal(hintSupportedControlledVariants.allocationInputs.independentControlledVariantStabilityRate, null);
const hintSupportedControlledAllocation = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: {
    ...hintSupportedControlledVariants.allocationInputs,
    answerCount: hintSupportedControlledVariants.answerCount,
    evidenceConfidence: hintSupportedControlledVariants.confidence,
  },
});
assert.equal(hintSupportedControlledAllocation.adjustments.includes("变式推进顺畅，保留少量高阶挑战"), false);

const independentChallengeEvidence = analyzeLearningBehavior([
  ...Array.from({ length: 6 }, (_, index) => answer({ id: 51 + index, correct: true })),
  ...Array.from({ length: 4 }, (_, index) =>
    answer({
      id: 57 + index,
      correct: true,
      extraPracticeMode: "harder",
      variantLevel: index % 2 === 0 ? "reverse_question" : "multi_step_extension",
    }),
  ),
  {
    eventId: "independent-challenge-request",
    eventType: "harder_extra_practice_requested",
    timestamp: "2026-07-14T11:05:00.000Z",
    payload: { requestedCount: 3 },
  },
]);
assert.equal(independentChallengeEvidence.allocationInputs.independentChallengeTransferEvidenceCount, 4);
assert.equal(independentChallengeEvidence.allocationInputs.independentChallengeTransferSuccessRate, 1);
assert.ok(independentChallengeEvidence.observations.some((item) => item.includes("无提示变式完成稳定")));

const independentChallengeAllocation = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: {
    ...independentChallengeEvidence.allocationInputs,
    answerCount: independentChallengeEvidence.answerCount,
    evidenceConfidence: independentChallengeEvidence.confidence,
  },
});
assert.ok(independentChallengeAllocation.adjustments.includes("主动加练中的无提示变式完成稳定，允许小幅加速"));
assert.match(independentChallengeAllocation.guardrail, /Hint-supported completion/);

console.log("behavior-analysis-contract: passed");
