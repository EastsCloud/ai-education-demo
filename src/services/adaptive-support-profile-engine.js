import { analyzeLearningBehavior } from "./behavior-analysis-engine.js?v=behavior-analysis-6";
import { hasIndependentChallengeTransferReadiness } from "./challenge-evidence-policy.js?v=challenge-evidence-2";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";
import { summarizeSolutionStrategyPreference } from "./solution-strategy-preference-engine.js?v=strategy-preference-1";

const SUPPORT_MODES = {
  independent_retry: {
    id: "independent_retry",
    label: "先独立重试，再给轻提示",
    hintDepthTarget: 1,
  },
  try_then_light_hint: {
    id: "try_then_light_hint",
    label: "先尝试，再给轻提示",
    hintDepthTarget: 1.5,
  },
  guided_when_needed: {
    id: "guided_when_needed",
    label: "必要时进入分步引导",
    hintDepthTarget: 2.2,
  },
  worked_example_then_retry: {
    id: "worked_example_then_retry",
    label: "看示例后回到同类题重试",
    hintDepthTarget: 2.6,
  },
};

const MIN_ANSWER_SAMPLE = 6;
const MIN_ENGAGEMENT_VISITS = 3;
const SHORT_ACTIVE_VISIT_SECONDS = 8 * 60;
const PAUSE_HEAVY_VISIT_COUNT = 2;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function rate(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function rounded(value) {
  return Number(Number(value || 0).toFixed(2));
}

function optionalRounded(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : rounded(value);
}

function answerEvents(events = []) {
  return events.filter((event) => event?.eventType === "answer_submitted" && typeof event.payload?.isCorrect === "boolean");
}

function reviewEventCount(events = []) {
  return events.filter((event) =>
    ["practice_detail_opened", "previous_attempt_opened", "today_atlas_opened", "solution_strategy_opened"].includes(event?.eventType),
  ).length;
}

function recentEngagement(events = []) {
  const visits = events
    .filter((event) => event?.eventType === "app_session_ended")
    .map((event) => ({
      activeSeconds: Number(event?.payload?.activeSeconds),
      pauseCount: Number(event?.payload?.pauseCount),
    }))
    .filter((visit) => Number.isFinite(visit.activeSeconds) && visit.activeSeconds > 0);
  const shortVisits = visits.filter((visit) => visit.activeSeconds <= SHORT_ACTIVE_VISIT_SECONDS);
  const pauseHeavyVisits = visits.filter((visit) => Number.isFinite(visit.pauseCount) && visit.pauseCount >= PAUSE_HEAVY_VISIT_COUNT);

  return {
    completedVisitCount: visits.length,
    shortVisitRate: rate(shortVisits.length, visits.length),
    pauseHeavyVisitRate: rate(pauseHeavyVisits.length, visits.length),
  };
}

function normalizeSupportMode(value) {
  const known = SUPPORT_MODES[value?.id];
  if (known) return { ...known };
  return { ...SUPPORT_MODES.try_then_light_hint };
}

function normalizeInitialActionPolicy(initialProfile = {}) {
  const source =
    initialProfile.initialActionPolicy ||
    initialProfile.actionPolicy ||
    initialProfile.baseline?.initialActionPolicy ||
    initialProfile.supportPlan?.initialActionPolicy ||
    {};
  const direct = initialProfile.supportPlan || initialProfile || {};
  const value = (field) => source[field] ?? direct[field] ?? null;
  return {
    taskChunking:
      value("taskChunking") === "short_recovery_chunks" || value("taskChunking") === "standard_short_chunks"
        ? value("taskChunking")
        : null,
    feedbackStyle: ["balanced_specific", "warm_specific", "reflective_prompt"].includes(value("feedbackStyle"))
      ? value("feedbackStyle")
      : null,
    challengePacing: ["steady", "stabilize", "explore_when_stable"].includes(value("challengePacing"))
      ? value("challengePacing")
      : null,
    guidedStructurePreferred: Boolean(value("guidedStructurePreferred")),
    helpEntryStyle: value("helpEntryStyle") === "private_reassurance" ? "private_reassurance" : "self_then_choose",
    reviewPromptStyle: ["light", "reflective", "optional"].includes(value("reviewPromptStyle"))
      ? value("reviewPromptStyle")
      : "light",
    appliedActions: Array.isArray(source.appliedActions)
      ? source.appliedActions
      : Array.isArray(direct.appliedActions)
        ? direct.appliedActions
        : [],
    version: typeof source.version === "string" ? source.version : typeof direct.version === "string" ? direct.version : null,
  };
}

function confidenceBand(value) {
  if (value >= 0.72) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

function cueFor({ supportMode, taskChunking, guidedStructureObserved, guidedStructurePreferred, helpEntryStyle }) {
  const structuredGuidance = guidedStructureObserved || guidedStructurePreferred;
  if (supportMode.id === "independent_retry") return "先自己想一会儿；需要时再打开第一层提示。";
  if (supportMode.id === "guided_when_needed") {
    return structuredGuidance
      ? "卡住时可以进入分步引导，先整理条件和关系，再继续计算。"
      : "卡住时可以一层一层打开提示，也可以进入分步引导。";
  }
  if (supportMode.id === "worked_example_then_retry") return "先试一遍；需要时看一个小例子，再回到这道题。";
  if (taskChunking === "short_recovery_chunks") return "先走完这一小步，停一下，再继续下一步。";
  if (structuredGuidance) return "需要时可以进入分步引导，先整理条件和关系，再继续计算。";
  if (helpEntryStyle === "private_reassurance") return "先自己试一试；需要时可以自己打开第一层提示。";
  return "先自己试一试；卡住时再打开一层提示。";
}

function safeAdultSummary({ challengePacing, feedbackStyle, supportMode, taskChunking, guidedStructureObserved, strategyPreference }) {
  const pacing =
    challengePacing === "stabilize"
      ? "下一次先稳住复现，再增加变化。"
      : challengePacing === "explore_when_stable"
        ? "稳定时可保留少量探索题。"
        : "保持当前推进节奏。";
  const feedback = feedbackStyle === "warm_specific" ? "反馈先肯定尝试，再指出一个可行动的下一步。" : "反馈保持具体、简短、可行动。";
  const chunking = taskChunking === "short_recovery_chunks" ? "任务按更短的自包含小段组织。" : "任务保持标准短段组织。";
  const guidedStructure = guidedStructureObserved ? "在需要时保留整理条件与规划步骤的分步入口。" : "";
  const strategy = strategyPreference?.dominantStrategyLabel
    ? `学生已在不同题目中主动查看“${strategyPreference.dominantStrategyLabel}”；下次仅把它保留为可选思路的靠前入口。`
    : "";
  return `${supportMode.label}。${chunking}${pacing}${feedback}${guidedStructure}${strategy}`;
}

export function buildAdaptiveSupportProfile({ initialProfile = {}, behaviorEvents = [] } = {}) {
  const seedSupportMode = normalizeSupportMode(initialProfile.supportMode);
  const initialActionPolicy = normalizeInitialActionPolicy(initialProfile);
  const answers = answerEvents(behaviorEvents);
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  const correct = answers.filter((event) => event.payload.isCorrect);
  const independent = answers.filter(isIndependentAnswer);
  const independentCorrect = independent.filter((event) => event.payload.isCorrect);
  const hinted = answers.filter((event) => !isIndependentAnswer(event));
  const behavior = analyzeLearningBehavior(behaviorEvents);
  const strategyPreference = summarizeSolutionStrategyPreference(behaviorEvents);
  const guidedPhaseCounts = behavior.reportMetrics.guidedReasoningPhaseCounts || {};
  const guidedOrganizationResponseCount = Number(guidedPhaseCounts.organize || 0);
  const guidedPlanningResponseCount = Number(guidedPhaseCounts.plan || 0);
  const structuredGuidedResponseCount = guidedOrganizationResponseCount + guidedPlanningResponseCount;
  const reviewCount = reviewEventCount(behaviorEvents);
  const engagement = recentEngagement(behaviorEvents);
  const initialConfidence = clamp(Number(initialProfile.confidence) || 0.2, 0.1, 0.72);
  const behaviorConfidence = clamp(answers.length * 0.035 + reviewCount * 0.015, 0, 0.62);
  const confidence = rounded(clamp(initialConfidence * 0.55 + behaviorConfidence, 0.18, 0.9));
  const evidence = {
    answerCount: answers.length,
    correctRate: rounded(rate(correct.length, answers.length)),
    hintUseRate: rounded(rate(hinted.length, answers.length)),
    independentAccuracy: rounded(rate(independentCorrect.length, independent.length)),
    retrySuccessRate: behavior.reportMetrics.retrySuccessRate === null ? null : rounded(behavior.reportMetrics.retrySuccessRate),
    repeatedCorrectThenWrongRate: rounded(behavior.allocationInputs.repeatedCorrectThenWrongRate),
    recoveredReproductionRate: rounded(behavior.allocationInputs.recoveredReproductionRate),
    fastGuessRate: rounded(behavior.allocationInputs.fastGuessRate),
    slowAccurateRate: rounded(behavior.allocationInputs.slowAccurateRate),
    fatigueSignal: rounded(behavior.allocationInputs.fatigueSignal),
    voluntaryPracticeCount: Number(behavior.allocationInputs.voluntaryPracticeCount || 0),
    challengeSuccessRate: rounded(behavior.allocationInputs.challengeSuccessRate),
    independentChallengeEvidenceCount: Number(behavior.allocationInputs.independentChallengeEvidenceCount || 0),
    independentChallengeSuccessRate: optionalRounded(behavior.allocationInputs.independentChallengeSuccessRate),
    independentChallengeTransferEvidenceCount: Number(behavior.allocationInputs.independentChallengeTransferEvidenceCount || 0),
    independentChallengeTransferSuccessRate: optionalRounded(
      behavior.allocationInputs.independentChallengeTransferSuccessRate,
    ),
    guidedResponseDeliveryCount: Number(behavior.reportMetrics.guidedResponseDeliveryCount || 0),
    guidedOrganizationResponseCount,
    guidedPlanningResponseCount,
    structuredGuidedResponseCount,
    guidedFinalCheckCount: Number(behavior.reportMetrics.guidedFinalCheckCount || 0),
    guidedFinalConfirmationRate:
      behavior.reportMetrics.guidedFinalConfirmationRate === null
        ? null
        : rounded(behavior.reportMetrics.guidedFinalConfirmationRate),
    reviewEventCount: reviewCount,
    strategyPreferenceEvidenceCount: strategyPreference.evidenceCount,
    strategyPreferenceQuestionCount: strategyPreference.distinctQuestionCount,
    completedVisitCount: engagement.completedVisitCount,
    shortVisitRate: rounded(engagement.shortVisitRate),
    pauseHeavyVisitRate: rounded(engagement.pauseHeavyVisitRate),
  };

  let supportMode = seedSupportMode;
  let taskChunking = initialActionPolicy.taskChunking || initialProfile.taskChunking || "standard_short_chunks";
  let feedbackStyle = initialActionPolicy.feedbackStyle || initialProfile.feedbackStyle || "balanced_specific";
  let challengePacing = initialActionPolicy.challengePacing || initialProfile.challengePacing || "steady";
  let guidedStructureObserved = false;
  const refinements = [];
  const independentChallengeReady = hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount: evidence.voluntaryPracticeCount,
    independentChallengeTransferEvidenceCount: evidence.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: evidence.independentChallengeTransferSuccessRate,
    fatigueSignal: evidence.fatigueSignal,
    independentCorrectRate: evidence.independentAccuracy,
  });

  if (answers.length < MIN_ANSWER_SAMPLE) {
    refinements.push({
      id: "collecting_practice_evidence",
      action: "继续沿用初始支持方式，等待更多真实练习证据。",
      confidence: "low",
    });
  } else {
    if (evidence.hintUseRate >= 0.55 && evidence.independentAccuracy < 0.55) {
      supportMode = { ...SUPPORT_MODES.guided_when_needed };
      feedbackStyle = "warm_specific";
      refinements.push({
        id: "more_scaffolded_entry",
        action: "先保留分层提示和分步引导，减少无效卡住。",
        confidence: confidenceBand(confidence),
      });
    } else if (evidence.independentAccuracy >= 0.72 && evidence.hintUseRate <= 0.25) {
      supportMode = { ...SUPPORT_MODES.independent_retry };
      refinements.push({
        id: "protect_independent_try",
        action: "先给独立尝试空间，再提供轻提示。",
        confidence: confidenceBand(confidence),
      });
    }

    if (
      evidence.guidedFinalCheckCount >= 2 &&
      evidence.guidedFinalConfirmationRate !== null &&
      evidence.guidedFinalConfirmationRate < 0.55
    ) {
      supportMode = { ...SUPPORT_MODES.guided_when_needed };
      feedbackStyle = "reflective_prompt";
      refinements.push({
        id: "reinforce_guided_check",
        action: "分步最后的核对还需要支持；下一次在列式后保留一个简短自检问题。",
        confidence: confidenceBand(confidence),
      });
    }

    if (evidence.guidedResponseDeliveryCount >= 2 && evidence.structuredGuidedResponseCount >= 2) {
      guidedStructureObserved = true;
      if (feedbackStyle === "balanced_specific") feedbackStyle = "reflective_prompt";
      refinements.push({
        id: "preserve_structured_guidance",
        action: "已多次主动使用整理和规划步骤；需要时保留这条分步入口。",
        confidence: confidenceBand(confidence),
      });
    }

    if (evidence.fatigueSignal >= 0.6) {
      taskChunking = "short_recovery_chunks";
      feedbackStyle = "warm_specific";
      refinements.push({
        id: "shorter_recovery_chunks",
        action: "下一次任务切成更短的小段，优先保持节奏。",
        confidence: confidenceBand(confidence),
      });
    } else if (
      evidence.completedVisitCount >= MIN_ENGAGEMENT_VISITS &&
      (evidence.shortVisitRate >= 0.67 || evidence.pauseHeavyVisitRate >= 0.67)
    ) {
      taskChunking = "short_recovery_chunks";
      refinements.push({
        id: "shorter_entry_chunks",
        action: "近期学习常以较短或被打断的片段完成；下一次先完成一个小段，再决定是否继续。",
        confidence: confidenceBand(confidence),
      });
    }

    if (evidence.repeatedCorrectThenWrongRate >= 0.25) {
      challengePacing = "stabilize";
      refinements.push({
        id: "stabilize_before_extension",
        action: "增加复现与核对，确认稳定后再提高变化。",
        confidence: confidenceBand(confidence),
      });
    } else if (
      independentChallengeReady
    ) {
      challengePacing = "explore_when_stable";
      refinements.push({
        id: "preserve_exploration_window",
        action: "稳定时保留少量变式和挑战题。",
        confidence: confidenceBand(confidence),
      });
    }

    if (
      evidence.slowAccurateRate >= 0.35 &&
      evidence.independentAccuracy >= 0.7 &&
      evidence.fatigueSignal < 0.35
    ) {
      refinements.push({
        id: "protect_deliberate_pace",
        action: "独立准确优先于速度；保持稳步推进，不因节奏较慢而额外加压。",
        confidence: confidenceBand(confidence),
      });
    }

    if (reviewCount >= 2 && feedbackStyle === "balanced_specific") {
      feedbackStyle = "reflective_prompt";
      refinements.push({
        id: "support_self_review",
        action: "反馈中保留一个简短回看问题，让学生先自己归纳。",
        confidence: confidenceBand(confidence),
      });
    }
  }

  if (strategyPreference.dominantStrategyId) {
    refinements.push({
      id: "preserve_voluntary_solution_strategy",
      action: `已在不同题目中主动查看“${strategyPreference.dominantStrategyLabel}”；下次仍提供全部思路，只把这一种可选入口排在前面。`,
      confidence: "observed",
    });
  }

  const supportPlan = {
    supportMode,
    taskChunking,
    feedbackStyle,
    challengePacing,
    guidedStructureObserved,
    guidedStructurePreferred: initialActionPolicy.guidedStructurePreferred,
    helpEntryStyle: initialActionPolicy.helpEntryStyle,
    reviewPromptStyle: initialActionPolicy.reviewPromptStyle,
    hintDepthTarget: supportMode.hintDepthTarget,
    strategyPreference,
  };

  return {
    id: "adaptive-support-profile-v1",
    version: "adaptive_support_profile_v1",
    source: "onboarding_seed_plus_behavior_evidence",
    responseCount: Number(initialProfile.responseCount || 0),
    baseline: {
      supportMode: seedSupportMode,
      taskChunking: initialActionPolicy.taskChunking || initialProfile.taskChunking || "standard_short_chunks",
      feedbackStyle: initialActionPolicy.feedbackStyle || initialProfile.feedbackStyle || "balanced_specific",
      challengePacing: initialActionPolicy.challengePacing || initialProfile.challengePacing || "steady",
      initialActionPolicy,
      confidence: rounded(initialConfidence),
    },
    initialActionPolicy,
    ...supportPlan,
    supportPlan,
    studentCue: cueFor({
      supportMode,
      taskChunking,
      guidedStructureObserved,
      guidedStructurePreferred: initialActionPolicy.guidedStructurePreferred,
      helpEntryStyle: initialActionPolicy.helpEntryStyle,
    }),
    adultSummary: safeAdultSummary({
      challengePacing,
      feedbackStyle,
      supportMode,
      taskChunking,
      guidedStructureObserved,
      strategyPreference,
    }),
    evidence,
    refinements,
    confidence,
    confidenceBand: confidenceBand(confidence),
    guardrail:
      "This profile changes support presentation and next-practice composition only. It is not a fixed label, does not expose raw signals to students, and cannot update the dynamic learning curve without a formal test.",
  };
}
