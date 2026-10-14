import { summarizeQuestionFeatureEvidence } from "./question-feature-evidence-engine.js?v=question-feature-evidence-2";
import { summarizeGuidedResponseEvidence } from "./guided-response-evidence-engine.js";
import {
  isControlledNumberVariant,
  isReadingFormTransferVariant,
} from "./variant-evidence-policy.js";
import {
  hasIndependentChallengeTransferReadiness,
  summarizeIndependentChallengeEvidence,
} from "./challenge-evidence-policy.js?v=challenge-evidence-2";
import { createIndependentAnswerPredicate, summarizeRetryEvidence } from "./retry-evidence-engine.js?v=retry-evidence-2";

const MIN_SAMPLE_FOR_SIGNAL = 6;
const RAPID_WRONG_SECONDS = 12;
const SLOW_ACCURATE_SECONDS = 45;
const PROGRESSION_VARIANTS = ["original", "change_one_number", "change_two_numbers"];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function orderedAnswers(events) {
  return events
    .filter((event) => event.eventType === "answer_submitted" && typeof event.payload?.isCorrect === "boolean")
    .slice()
    .sort((left, right) => Date.parse(left.timestamp || 0) - Date.parse(right.timestamp || 0));
}

function isIndependentCorrect(answer, isIndependentAnswer) {
  return Boolean(answer.payload?.isCorrect) && isIndependentAnswer(answer);
}

function progressionUnitKey(answer) {
  const payload = answer.payload || {};
  if (payload.queueItemId) return `queue:${payload.queueItemId}`;
  if (payload.practiceRunId && Number.isInteger(Number(payload.progressionUnitIndex))) {
    return `run:${payload.practiceRunId}:unit:${Number(payload.progressionUnitIndex)}`;
  }
  return null;
}

function reproductionSignals(answers, isIndependentAnswer) {
  const units = new Map();
  answers.forEach((answer) => {
    const variantLevel = answer.payload?.variantLevel || "original";
    const unitKey = progressionUnitKey(answer);
    if (!unitKey || !PROGRESSION_VARIANTS.includes(variantLevel)) return;
    const attempts = units.get(unitKey) || [];
    attempts.push(answer);
    units.set(unitKey, attempts);
  });

  let reproduced = 0;
  let reproducedCorrect = 0;
  let correctThenWrong = 0;
  let recoveredAfterSlip = 0;

  units.forEach((attempts) => {
    const byVariant = new Map(PROGRESSION_VARIANTS.map((variant) => [variant, []]));
    attempts.forEach((answer) => byVariant.get(answer.payload?.variantLevel || "original")?.push(answer));
    const originalAttempts = byVariant.get("original") || [];
    if (!originalAttempts.some((answer) => isIndependentCorrect(answer, isIndependentAnswer))) return;

    const laterStages = PROGRESSION_VARIANTS.slice(1)
      .map((variant) => byVariant.get(variant) || [])
      .filter((stageAttempts) => stageAttempts.length > 0);
    if (!laterStages.length) return;

    reproduced += 1;
    const laterStagesPassed = laterStages.every((stageAttempts) =>
      stageAttempts.some((answer) => isIndependentCorrect(answer, isIndependentAnswer)),
    );
    const recoveredStage = laterStages.some(
      (stageAttempts) =>
        stageAttempts.some((answer) => !answer.payload?.isCorrect) &&
        stageAttempts.some((answer) => isIndependentCorrect(answer, isIndependentAnswer)),
    );
    if (laterStagesPassed) reproducedCorrect += 1;
    else correctThenWrong += 1;
    if (recoveredStage) recoveredAfterSlip += 1;
  });

  return {
    reproductionCount: reproduced,
    correctReproductionRate: reproduced ? reproducedCorrect / reproduced : null,
    repeatedCorrectThenWrongRate: reproduced ? correctThenWrong / reproduced : 0,
    recoveredReproductionRate: reproduced ? recoveredAfterSlip / reproduced : 0,
  };
}

function correctReviewReproductionSignals(answers, isIndependentAnswer) {
  const reviews = new Map();
  answers.forEach((answer) => {
    const payload = answer.payload || {};
    const sourceDeliveryId = String(payload.correctReviewSourceDeliveryId || "").trim();
    if (!sourceDeliveryId) return;
    const unitKey = progressionUnitKey(answer) || `delivery:${payload.deliveryId || answer.targetId || answer.eventId}`;
    const key = `${sourceDeliveryId}|${unitKey}`;
    const attempts = reviews.get(key) || [];
    attempts.push(answer);
    reviews.set(key, attempts);
  });

  let reproduced = 0;
  let reproducedCorrect = 0;
  let correctThenWrong = 0;
  let recoveredAfterSlip = 0;

  reviews.forEach((attempts) => {
    const contextAttempts = attempts.filter((answer) => answer.payload?.variantLevel === "context_change");
    if (!contextAttempts.length) return;
    const independentlyResolved = contextAttempts.some((answer) => isIndependentCorrect(answer, isIndependentAnswer));
    const independentWrong = contextAttempts.some(
      (answer) => answer.payload?.isCorrect === false && isIndependentAnswer(answer),
    );
    // A hint-assisted response stays provisional until a no-hint retry exists.
    if (!independentlyResolved && !independentWrong) return;

    reproduced += 1;
    if (independentlyResolved) reproducedCorrect += 1;
    else correctThenWrong += 1;
    if (independentWrong && independentlyResolved) recoveredAfterSlip += 1;
  });

  return {
    reproductionCount: reproduced,
    correctReproductionRate: reproduced ? reproducedCorrect / reproduced : null,
    repeatedCorrectThenWrongRate: reproduced ? correctThenWrong / reproduced : 0,
    recoveredReproductionRate: reproduced ? recoveredAfterSlip / reproduced : 0,
  };
}

function combineReproductionSignals(...signals) {
  const sourceSignals = signals.filter((signal) => Number(signal?.reproductionCount || 0) > 0);
  const reproductionCount = sourceSignals.reduce((total, signal) => total + Number(signal.reproductionCount || 0), 0);
  if (!reproductionCount) {
    return {
      reproductionCount: 0,
      correctReproductionRate: null,
      repeatedCorrectThenWrongRate: 0,
      recoveredReproductionRate: 0,
    };
  }

  return {
    reproductionCount,
    correctReproductionRate:
      sourceSignals.reduce(
        (total, signal) => total + Number(signal.correctReproductionRate || 0) * Number(signal.reproductionCount || 0),
        0,
      ) / reproductionCount,
    repeatedCorrectThenWrongRate:
      sourceSignals.reduce(
        (total, signal) => total + Number(signal.repeatedCorrectThenWrongRate || 0) * Number(signal.reproductionCount || 0),
        0,
      ) / reproductionCount,
    recoveredReproductionRate:
      sourceSignals.reduce(
        (total, signal) => total + Number(signal.recoveredReproductionRate || 0) * Number(signal.reproductionCount || 0),
        0,
      ) / reproductionCount,
  };
}

function fatigueSignal(answers) {
  const sessions = new Map();
  answers.forEach((answer) => {
    const sessionId = answer.sessionId;
    if (!sessionId) return;
    const group = sessions.get(sessionId) || [];
    group.push(answer);
    sessions.set(sessionId, group);
  });

  const sessionSignals = [...sessions.values()]
    .filter((items) => items.length >= 4)
    .map((items) => {
      const midpoint = Math.ceil(items.length / 2);
      const first = items.slice(0, midpoint);
      const second = items.slice(midpoint);
      const averageTime = (values) => average(values.map((item) => Number(item.payload?.elapsedSeconds)).filter(Number.isFinite));
      const errorRate = (values) => values.filter((item) => !item.payload?.isCorrect).length / values.length;
      const firstTime = averageTime(first);
      const secondTime = averageTime(second);
      const firstError = errorRate(first);
      const secondError = errorRate(second);
      return clamp((secondTime > firstTime * 1.5 ? 0.5 : 0) + (secondError > firstError + 0.2 ? 0.5 : 0));
    });

  return sessionSignals.length ? average(sessionSignals) : 0;
}

function signalConfidence(answerCount) {
  if (answerCount >= 18) return "high";
  if (answerCount >= MIN_SAMPLE_FOR_SIGNAL) return "medium";
  return "low";
}

export function analyzeLearningBehavior(events = []) {
  const answers = orderedAnswers(events);
  const isIndependentAnswer = createIndependentAnswerPredicate(events);
  const timedAnswers = answers.filter((answer) => Number.isFinite(Number(answer.payload?.elapsedSeconds)));
  const correct = answers.filter((answer) => answer.payload?.isCorrect);
  const independentCorrect = correct.filter(isIndependentAnswer);
  const hinted = answers.filter((answer) => !isIndependentAnswer(answer));
  const hintLevels = events
    .filter((event) => event.eventType === "hint_opened")
    .map((event) => Number(event.payload?.hintLevel || 0))
    .filter((level) => level > 0);
  const rapidWrong = timedAnswers.filter(
    (answer) => !answer.payload?.isCorrect && Number(answer.payload?.elapsedSeconds) <= RAPID_WRONG_SECONDS,
  );
  const controlledNumberVariants = answers.filter((answer) => isControlledNumberVariant(answer.payload?.variantLevel));
  const independentControlledNumberVariants = controlledNumberVariants.filter(isIndependentAnswer);
  const readingFormTransferItems = answers.filter((answer) => isReadingFormTransferVariant(answer.payload?.variantLevel));
  const voluntaryRequests = events
    .filter((event) => ["same_type_more_requested", "harder_extra_practice_requested", "atlas_related_practice_requested"].includes(event.eventType))
    .reduce(
      (total, event) =>
        total + (event.eventType === "atlas_related_practice_requested" ? 1 : Number(event.payload?.requestedCount || 0)),
      0,
    );
  const challengeEvidence = summarizeIndependentChallengeEvidence(answers, { isIndependentAnswer });
  const revisionObservedAnswers = answers.filter((answer) => Number.isFinite(Number(answer.payload?.answerRevisionCount)));
  const revisedAnswers = revisionObservedAnswers.filter((answer) => Number(answer.payload?.answerRevisionCount) > 0);
  const strategyExplorationCount = events.filter((event) => event.eventType === "solution_strategy_opened").length;
  const guidedResponseEvidence = summarizeGuidedResponseEvidence(events);
  const unitReproduction = reproductionSignals(answers, isIndependentAnswer);
  const correctReviewReproduction = correctReviewReproductionSignals(answers, isIndependentAnswer);
  const reproduction = combineReproductionSignals(unitReproduction, correctReviewReproduction);
  const retryEvidence = summarizeRetryEvidence({ events, answers });
  const retryRate = retryEvidence.retryCount ? retryEvidence.retrySuccessCount / retryEvidence.retryCount : null;
  const confidence = signalConfidence(answers.length);
  const questionFeatureEvidence = summarizeQuestionFeatureEvidence(events);
  const wrongRate = answers.length ? 1 - correct.length / answers.length : 0.25;
  const hintFreeCorrectRate = answers.length ? independentCorrect.length / answers.length : 0.6;
  const fastGuessRate = timedAnswers.length ? rapidWrong.length / timedAnswers.length : 0;
  const slowAccurateRate =
    timedAnswers.length >= MIN_SAMPLE_FOR_SIGNAL
      ? timedAnswers.filter(
          (answer) => answer.payload?.isCorrect && Number(answer.payload?.elapsedSeconds) >= SLOW_ACCURATE_SECONDS,
        ).length / timedAnswers.length
      : 0;
  const currentHints = answers.length ? hinted.length / answers.length : 0;
  const allocationInputs = {
    wrongRate,
    retrySuccessRate: retryRate ?? 0.6,
    correctReproductionRate: reproduction.correctReproductionRate ?? 0.7,
    repeatedCorrectThenWrongRate: reproduction.repeatedCorrectThenWrongRate,
    recoveredReproductionRate: reproduction.recoveredReproductionRate,
    correctReviewCount: correctReviewReproduction.reproductionCount,
    correctReviewSuccessRate: correctReviewReproduction.correctReproductionRate,
    hintFreeCorrectRate,
    hintDepthAverage: average(hintLevels),
    fastGuessRate,
    slowAccurateRate,
    controlledVariantStabilityRate: controlledNumberVariants.length
      ? controlledNumberVariants.filter((answer) => answer.payload?.isCorrect).length / controlledNumberVariants.length
      : 0.5,
    independentControlledVariantEvidenceCount: independentControlledNumberVariants.length,
    independentControlledVariantStabilityRate: independentControlledNumberVariants.length
      ? independentControlledNumberVariants.filter((answer) => answer.payload?.isCorrect).length / independentControlledNumberVariants.length
      : null,
    formTransferRate: readingFormTransferItems.length
      ? readingFormTransferItems.filter((answer) => answer.payload?.isCorrect).length / readingFormTransferItems.length
      : null,
    formTransferEvidenceCount: readingFormTransferItems.length,
    // Keep the previous field for older local prototype callers. It now has the
    // controlled-number meaning rather than mixing two different kinds of evidence.
    variantTransferRate: controlledNumberVariants.length
      ? controlledNumberVariants.filter((answer) => answer.payload?.isCorrect).length / controlledNumberVariants.length
      : 0.5,
    voluntaryPracticeCount: voluntaryRequests,
    challengeSuccessRate: challengeEvidence.challengeSuccessRate ?? 0.5,
    independentChallengeEvidenceCount: challengeEvidence.independentChallengeEvidenceCount,
    independentChallengeSuccessRate: challengeEvidence.independentChallengeSuccessRate,
    independentChallengeTransferEvidenceCount: challengeEvidence.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: challengeEvidence.independentChallengeTransferSuccessRate,
    fatigueSignal: fatigueSignal(answers),
    guidedFinalCheckCount: guidedResponseEvidence.guidedFinalCheckCount,
    guidedFinalConfirmationRate: guidedResponseEvidence.guidedFinalConfirmationRate,
  };
  const independentChallengeReady = hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount: allocationInputs.voluntaryPracticeCount,
    independentChallengeTransferEvidenceCount: allocationInputs.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: allocationInputs.independentChallengeTransferSuccessRate,
    fatigueSignal: allocationInputs.fatigueSignal,
    independentCorrectRate: allocationInputs.hintFreeCorrectRate,
  });

  const observations = [];
  if (confidence !== "low" && allocationInputs.fastGuessRate > 0.2) observations.push("快速错误较多，先加强复现与核对。");
  if (confidence !== "low" && allocationInputs.repeatedCorrectThenWrongRate > 0.25) observations.push("已答对的结构再次变化时还不稳定，需要保留复现题。");
  if (confidence !== "low" && allocationInputs.hintDepthAverage > 2) observations.push("提示层级较深，下一次先放慢新题推进。");
  if (confidence !== "low" && allocationInputs.fatigueSignal > 0.6) observations.push("后段作答出现疲劳信号，优先缩短单次负荷。");
  if (
    confidence !== "low" &&
    allocationInputs.slowAccurateRate > 0.35 &&
    allocationInputs.hintFreeCorrectRate > 0.65 &&
    allocationInputs.wrongRate < 0.25
  ) {
    observations.push("独立准确表现稳定，节奏较慢时也不需要额外加压。");
  }
  if (confidence !== "low" && independentChallengeReady) {
    observations.push("主动加练中的无提示变式完成稳定，可以小幅增加迁移题。");
  }
  if (questionFeatureEvidence.focusFeatureIds.length) {
    observations.push("某些已验证的题目结构特征出现较集中的错误，下一次在当前水平内增加针对性复现。");
  }

  return {
    source: "behavior_evidence_rule_engine",
    confidence,
    answerCount: answers.length,
    allocationInputs: Object.fromEntries(
      Object.entries(allocationInputs).map(([key, value]) => [
        key,
        typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(2)) : value,
      ]),
    ),
    questionFeatureEvidence,
    reportMetrics: {
      totalStudySessions: new Set(answers.map((answer) => answer.sessionId).filter(Boolean)).size,
      correctRate: answers.length ? correct.length / answers.length : 0,
      hintUseRate: currentHints,
      independentCorrectRate: hintFreeCorrectRate,
      retrySuccessRate: retryRate,
      fastGuessRate,
      reproductionCount: reproduction.reproductionCount,
      reproductionSuccessRate: reproduction.correctReproductionRate,
      recoveredReproductionRate: reproduction.recoveredReproductionRate,
      correctReviewCount: correctReviewReproduction.reproductionCount,
      correctReviewSuccessRate: correctReviewReproduction.correctReproductionRate,
      averageAnswerSeconds: average(timedAnswers.map((answer) => Number(answer.payload?.elapsedSeconds))),
      slowAccurateRate,
      answerRevisionEvidenceCount: revisionObservedAnswers.length,
      answerRevisionItemCount: revisedAnswers.length,
      answerRevisionRate: revisionObservedAnswers.length ? revisedAnswers.length / revisionObservedAnswers.length : null,
      averageAnswerRevisionCount: revisionObservedAnswers.length
        ? average(revisionObservedAnswers.map((answer) => Number(answer.payload?.answerRevisionCount || 0)))
        : null,
      challengeAnswerCount: challengeEvidence.challengeAnswerCount,
      independentChallengeEvidenceCount: challengeEvidence.independentChallengeEvidenceCount,
      independentChallengeTransferEvidenceCount: challengeEvidence.independentChallengeTransferEvidenceCount,
      independentChallengeTransferSuccessRate: challengeEvidence.independentChallengeTransferSuccessRate,
      strategyExplorationCount,
      ...guidedResponseEvidence,
    },
    observations,
    guardrail:
      "Behavior signals use linked original, one-number, and two-number progression evidence plus private correct-review context evidence rather than broad same-family guesses. Repeated structural-feature signals can guide within-level seed selection but never retain raw values, change a formal level judgment, or update a curve. Hint-supported challenge completion remains support evidence, while challenge acceleration requires independent verified reverse or multi-step transfer evidence. Answer-revision counts are privacy-bounded context only and do not yet change allocation. Signals are confidence-bounded inputs for next-practice allocation and adult support, not student-facing labels, and cannot update the dynamic curve without a formal test.",
  };
}
