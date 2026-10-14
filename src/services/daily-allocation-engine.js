import { hasIndependentChallengeTransferReadiness } from "./challenge-evidence-policy.js?v=challenge-evidence-2";

const DEFAULT_BUCKETS = {
  wrong_retry: 0.4,
  correct_review: 0.25,
  new_stage_questions: 0.25,
  challenge_extension: 0.1,
};

const BUCKET_LIMITS = {
  wrong_retry: [0.2, 0.6],
  correct_review: [0.05, 0.3],
  new_stage_questions: [0.15, 0.45],
  challenge_extension: [0, 0.2],
};

const MAX_DAILY_BUCKET_MOVEMENT = 0.1;
const LOW_EVIDENCE_ANSWER_COUNT = 6;
const HIGH_EVIDENCE_ANSWER_COUNT = 18;
const MIN_GUIDED_FINAL_CHECKS = 2;
const LOW_GUIDED_FINAL_CONFIRMATION_RATE = 0.55;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function optionalRate(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, 0, 1) : null;
}

function normalize(buckets) {
  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0) || 1;
  return Object.fromEntries(
    Object.entries(buckets).map(([key, value]) => [key, Number((value / total).toFixed(2))]),
  );
}

function boundedBucketValues(buckets) {
  return Object.fromEntries(
    Object.entries(buckets).map(([id, value]) => {
      const [min, max] = BUCKET_LIMITS[id] || [0, 1];
      return [id, clamp(value, min, max)];
    }),
  );
}

function smoothAgainstPrevious(buckets, previousAllocation) {
  const previousBuckets = previousAllocation?.buckets;
  if (!previousBuckets) return buckets;

  return Object.fromEntries(
    Object.entries(buckets).map(([id, value]) => {
      const previous = Number(previousBuckets[id]);
      if (!Number.isFinite(previous)) return [id, value];
      return [id, previous + clamp(value - previous, -MAX_DAILY_BUCKET_MOVEMENT, MAX_DAILY_BUCKET_MOVEMENT)];
    }),
  );
}

function getBehaviorInputs(summary = {}) {
  const answerCount = Number(summary.answerCount);
  const controlledVariantStabilityRate = Number(summary.controlledVariantStabilityRate);
  const legacyVariantTransferRate = Number(summary.variantTransferRate);
  const formTransferRate = Number(summary.formTransferRate);
  const independentControlledVariantStabilityRate = optionalRate(summary.independentControlledVariantStabilityRate);
  const independentChallengeSuccessRate = optionalRate(summary.independentChallengeSuccessRate);
  const independentChallengeTransferSuccessRate = optionalRate(summary.independentChallengeTransferSuccessRate);
  const evidenceConfidence = ["low", "medium", "high"].includes(summary.evidenceConfidence)
    ? summary.evidenceConfidence
    : null;
  const guidedFinalCheckCount = Math.max(0, Math.floor(Number(summary.guidedFinalCheckCount) || 0));
  const guidedFinalConfirmationRate = Number(summary.guidedFinalConfirmationRate);
  return {
    wrongRate: Number(summary.wrongRate ?? 0.25),
    retrySuccessRate: Number(summary.retrySuccessRate ?? 0.6),
    correctReproductionRate: Number(summary.correctReproductionRate ?? 0.7),
    repeatedCorrectThenWrongRate: Number(summary.repeatedCorrectThenWrongRate ?? 0),
    hintFreeCorrectRate: Number(summary.hintFreeCorrectRate ?? 0.6),
    hintDepthAverage: Number(summary.hintDepthAverage ?? 1),
    fastGuessRate: Number(summary.fastGuessRate ?? 0),
    slowAccurateRate: Number(summary.slowAccurateRate ?? 0),
    controlledVariantStabilityRate: Number.isFinite(controlledVariantStabilityRate)
      ? controlledVariantStabilityRate
      : Number.isFinite(legacyVariantTransferRate)
        ? legacyVariantTransferRate
        : 0.5,
    independentControlledVariantEvidenceCount: Math.max(0, Math.floor(Number(summary.independentControlledVariantEvidenceCount) || 0)),
    independentControlledVariantStabilityRate,
    formTransferRate: Number.isFinite(formTransferRate) ? formTransferRate : null,
    formTransferEvidenceCount: Math.max(0, Math.floor(Number(summary.formTransferEvidenceCount) || 0)),
    voluntaryPracticeCount: Number(summary.voluntaryPracticeCount ?? 0),
    challengeSuccessRate: Number(summary.challengeSuccessRate ?? 0.5),
    independentChallengeEvidenceCount: Math.max(0, Math.floor(Number(summary.independentChallengeEvidenceCount) || 0)),
    independentChallengeSuccessRate,
    independentChallengeTransferEvidenceCount: Math.max(
      0,
      Math.floor(Number(summary.independentChallengeTransferEvidenceCount) || 0),
    ),
    independentChallengeTransferSuccessRate,
    fatigueSignal: Number(summary.fatigueSignal ?? 0),
    guidedFinalCheckCount,
    guidedFinalConfirmationRate: Number.isFinite(guidedFinalConfirmationRate)
      ? clamp(guidedFinalConfirmationRate, 0, 1)
      : null,
    answerCount: Number.isFinite(answerCount) && answerCount >= 0 ? answerCount : null,
    evidenceConfidence,
  };
}

function normalizeTaskAllocation(internalAllocation = {}) {
  return {
    wrong_retry: internalAllocation.wrong_retry ?? internalAllocation.wrongRetry,
    correct_review: internalAllocation.correct_review ?? internalAllocation.correctCheck,
    new_stage_questions: internalAllocation.new_stage_questions ?? internalAllocation.currentFocus,
    challenge_extension: internalAllocation.challenge_extension ?? internalAllocation.lightChallenge,
  };
}

function roundInputs(inputs) {
  return Object.fromEntries(
    Object.entries(inputs).map(([key, value]) => [
      key,
      typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(2)) : value,
    ]),
  );
}

function behaviorAdjustmentWeight(inputs) {
  if (!Number.isFinite(inputs.answerCount)) return 1;
  if (inputs.answerCount <= 0) return 0;
  if (inputs.evidenceConfidence === "high" || inputs.answerCount >= HIGH_EVIDENCE_ANSWER_COUNT) return 1;
  if (inputs.evidenceConfidence === "medium" || inputs.answerCount >= LOW_EVIDENCE_ANSWER_COUNT) return 0.7;
  return 0.35;
}

function applyBehaviorDelta(buckets, deltas, weight) {
  Object.entries(deltas).forEach(([bucketId, delta]) => {
    buckets[bucketId] += Number(delta || 0) * weight;
  });
}

function needsGuidedFinalCheckSupport(inputs) {
  return (
    inputs.guidedFinalCheckCount >= MIN_GUIDED_FINAL_CHECKS &&
    inputs.guidedFinalConfirmationRate !== null &&
    inputs.guidedFinalConfirmationRate < LOW_GUIDED_FINAL_CONFIRMATION_RATE
  );
}

function createTopPriority({ inputs, evidenceWeight }) {
  if (inputs.wrongRate > 0.35 || inputs.retrySuccessRate < 0.55) {
    return {
      id: "stabilize_original_retry",
      label: "先把当前题型做稳",
      rationale: "下一次会先保留原题重做，再逐步加入新的变化。",
      source: "server_scored_retry_evidence",
    };
  }

  if (inputs.repeatedCorrectThenWrongRate > 0.25) {
    return {
      id: "confirm_reproduction",
      label: "先做一次轻复现",
      rationale: "下一次会换一个小情境确认思路，再继续推进。",
      source: "linked_reproduction_evidence",
    };
  }

  if (evidenceWeight > 0 && needsGuidedFinalCheckSupport(inputs)) {
    return {
      id: "retain_brief_final_check",
      label: "下一次保留一个简短核对点",
      rationale: "完成列式后会先回看数量关系和计算，再继续下一题。",
      source: "guided_final_check_state",
    };
  }

  if (inputs.correctReproductionRate > 0.85 && inputs.wrongRate < 0.25) {
    return {
      id: "continue_steady_progress",
      label: "继续当前学习节奏",
      rationale: "复现顺畅，下一次会在当前路径上逐步增加新题和变化。",
      source: "independent_reproduction_evidence",
    };
  }

  return {
    id: "follow_confirmed_learning_path",
    label: "沿着当前学习路径继续练习",
    rationale: "下一次会保留必要复现，并继续当前知识点的推进。",
    source: "confirmed_learning_path",
  };
}

function normalizeSupportPolicy(profile = {}) {
  const source = profile?.supportPlan || profile || {};
  return {
    challengePacing: String(source.challengePacing || "steady"),
    feedbackStyle: String(source.feedbackStyle || "balanced_specific"),
    guidedStructureObserved: Boolean(source.guidedStructureObserved),
    hintDepthTarget: Number(source.hintDepthTarget || source.supportMode?.hintDepthTarget || 1.5),
    taskChunking: String(source.taskChunking || "standard_short_chunks"),
  };
}

export function createDailyAllocation({ behaviorSummary, generatedTodayTask, previousAllocation, supportProfile } = {}) {
  const buckets = {
    ...DEFAULT_BUCKETS,
    ...Object.fromEntries(
      Object.entries(normalizeTaskAllocation(generatedTodayTask?.internalAllocation)).filter(([, value]) => Number.isFinite(value)),
    ),
  };
  const inputs = getBehaviorInputs(behaviorSummary);
  const supportPolicy = normalizeSupportPolicy(supportProfile);
  const evidenceWeight = behaviorAdjustmentWeight(inputs);
  const independentChallengeReady = hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount: inputs.voluntaryPracticeCount,
    independentChallengeTransferEvidenceCount: inputs.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: inputs.independentChallengeTransferSuccessRate,
    fatigueSignal: inputs.fatigueSignal,
    independentCorrectRate: inputs.hintFreeCorrectRate,
  });
  const adjustments = [];

  if (inputs.wrongRate > 0.35 || inputs.retrySuccessRate < 0.55) {
    applyBehaviorDelta(
      buckets,
      { wrong_retry: 0.1, new_stage_questions: -0.05, challenge_extension: -0.05 },
      evidenceWeight,
    );
    adjustments.push("更多原题重做，先稳定基础");
  }

  if (inputs.hintDepthAverage > 2 || inputs.hintFreeCorrectRate < 0.55) {
    applyBehaviorDelta(buckets, { wrong_retry: 0.05, challenge_extension: -0.05 }, evidenceWeight);
    adjustments.push("减少挑战，保留足够的无提示练习");
  }

  if (needsGuidedFinalCheckSupport(inputs)) {
    // A guided final check is support-interaction evidence, not a scored answer.
    // Keep a small check/review focus without treating it as a wrong response.
    applyBehaviorDelta(buckets, { correct_review: 0.03, challenge_extension: -0.03 }, evidenceWeight);
    adjustments.push("分步核对需要支持，保留简短复现与自检");
  }

  if (inputs.correctReproductionRate > 0.85) {
    applyBehaviorDelta(
      buckets,
      { correct_review: -0.1, new_stage_questions: 0.05, challenge_extension: 0.05 },
      evidenceWeight,
    );
    adjustments.push("复现表现良好，适度增加推进与挑战");
  } else if (inputs.correctReproductionRate < 0.55) {
    applyBehaviorDelta(buckets, { correct_review: 0.07, new_stage_questions: -0.07 }, evidenceWeight);
    adjustments.push("增加做对题的抽样复现");
  }

  if (inputs.repeatedCorrectThenWrongRate > 0.25) {
    applyBehaviorDelta(
      buckets,
      { correct_review: 0.05, wrong_retry: 0.05, new_stage_questions: -0.05, challenge_extension: -0.05 },
      evidenceWeight,
    );
    adjustments.push("先确认复现能力，再继续加速");
  }

  if (
    inputs.independentControlledVariantEvidenceCount >= 2 &&
    inputs.independentControlledVariantStabilityRate !== null &&
    inputs.independentControlledVariantStabilityRate >= 0.75 &&
    inputs.wrongRate < 0.2 &&
    inputs.hintFreeCorrectRate > 0.7
  ) {
    applyBehaviorDelta(buckets, { challenge_extension: 0.05, correct_review: -0.05 }, evidenceWeight);
    adjustments.push("变式推进顺畅，保留少量高阶挑战");
  }

  if (inputs.fastGuessRate > 0.2) {
    applyBehaviorDelta(
      buckets,
      { wrong_retry: 0.05, correct_review: 0.05, new_stage_questions: -0.05, challenge_extension: -0.05 },
      evidenceWeight,
    );
    adjustments.push("增加复现与核对，降低推进速度");
  }

  if (
    inputs.slowAccurateRate > 0.35 &&
    inputs.wrongRate < 0.25 &&
    inputs.hintFreeCorrectRate > 0.65 &&
    inputs.fatigueSignal < 0.35
  ) {
    applyBehaviorDelta(buckets, { correct_review: -0.03, new_stage_questions: 0.03 }, evidenceWeight);
    adjustments.push("独立准确优先于速度，保持稳步推进");
  }

  if (inputs.fatigueSignal > 0.6) {
    applyBehaviorDelta(
      buckets,
      { challenge_extension: -0.1, new_stage_questions: -0.05, correct_review: 0.05, wrong_retry: 0.05 },
      evidenceWeight,
    );
    adjustments.push("检测到疲劳信号，降低当日认知负荷");
  }

  if (independentChallengeReady) {
    applyBehaviorDelta(
      buckets,
      { new_stage_questions: 0.05, challenge_extension: 0.05, correct_review: -0.05, wrong_retry: -0.05 },
      evidenceWeight,
    );
    adjustments.push("主动加练中的无提示变式完成稳定，允许小幅加速");
  }

  if (supportPolicy.challengePacing === "stabilize") {
    buckets.correct_review += 0.03;
    buckets.challenge_extension -= 0.03;
    adjustments.push("支持策略保留更多复现，再推进变化");
  }

  if (
    supportPolicy.challengePacing === "explore_when_stable" &&
    independentChallengeReady &&
    inputs.wrongRate < 0.25 &&
    inputs.fatigueSignal < 0.35
  ) {
    buckets.challenge_extension += 0.03;
    buckets.correct_review -= 0.03;
    adjustments.push("稳定时保留少量探索题");
  }

  const bounded = boundedBucketValues(buckets);
  const smoothed = smoothAgainstPrevious(normalize(bounded), previousAllocation);
  const finalBuckets = normalize(boundedBucketValues(smoothed));
  const topPriority = createTopPriority({ inputs, evidenceWeight });

  return {
    source: "static_curve_behavior_rule_engine",
    buckets: finalBuckets,
    behaviorInputs: roundInputs(inputs),
    behaviorEvidence: {
      answerCount: inputs.answerCount,
      confidence: inputs.evidenceConfidence || "legacy_or_unreported",
      adjustmentWeight: Number(evidenceWeight.toFixed(2)),
    },
    supportPolicy,
    topPriority,
    matchingPolicy: {
      id: "bounded_behavior_matching_v3",
      primaryFocus: topPriority.id,
      originalReplayPriority: "protected",
      guidedFinalCheckFocus: needsGuidedFinalCheckSupport(inputs) ? "brief_final_check" : "standard",
      challengeAccelerationEvidence: "independent_verified_transfer_only",
      evidenceScope: "next_practice_only",
    },
    adjustments,
    smoothing: {
      applied: Boolean(previousAllocation?.buckets),
      maximumDailyBucketMovement: MAX_DAILY_BUCKET_MOVEMENT,
    },
    guardrail:
      "Daily allocation changes next practice only. Hint-supported completion can retain support but cannot increase challenge allocation; acceleration requires independent verified transfer evidence. Guided final-check states are support interaction evidence, never answer scores. None of these signals can update the dynamic learning curve, which only changes after a formal test.",
  };
}
