// Challenge acceleration needs proof of independent transfer, not just completion after help.
export const ADVANCED_CHALLENGE_VARIANT_LEVELS = Object.freeze(["reverse_question", "multi_step_extension"]);
export const MIN_INDEPENDENT_CHALLENGE_TRANSFER_ATTEMPTS = 2;
export const MIN_INDEPENDENT_CHALLENGE_TRANSFER_SUCCESS_RATE = 0.75;
export const MIN_VOLUNTARY_PRACTICE_REQUESTS_FOR_ACCELERATION = 3;

function rate(matches, total) {
  return total ? matches / total : null;
}

function boundedRate(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : null;
}

function wholeCount(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

export function isAdvancedChallengeVariant(variantLevel) {
  return ADVANCED_CHALLENGE_VARIANT_LEVELS.includes(String(variantLevel || ""));
}

function defaultIndependentAnswer(answer) {
  return Number(answer?.payload?.hintsOpened || 0) === 0 && Number(answer?.payload?.guidedStepsOpened || 0) === 0;
}

export function summarizeIndependentChallengeEvidence(answers = [], { isIndependentAnswer = defaultIndependentAnswer } = {}) {
  const challengeAnswers = answers.filter((answer) => answer?.payload?.extraPracticeMode === "harder");
  const independentChallengeAnswers = challengeAnswers.filter((answer) => isIndependentAnswer(answer));
  const independentTransferAnswers = independentChallengeAnswers.filter((answer) =>
    isAdvancedChallengeVariant(answer.payload?.variantLevel),
  );

  return {
    challengeAnswerCount: challengeAnswers.length,
    challengeSuccessRate: rate(challengeAnswers.filter((answer) => answer.payload?.isCorrect).length, challengeAnswers.length),
    independentChallengeEvidenceCount: independentChallengeAnswers.length,
    independentChallengeSuccessRate: rate(
      independentChallengeAnswers.filter((answer) => answer.payload?.isCorrect).length,
      independentChallengeAnswers.length,
    ),
    independentChallengeTransferEvidenceCount: independentTransferAnswers.length,
    independentChallengeTransferSuccessRate: rate(
      independentTransferAnswers.filter((answer) => answer.payload?.isCorrect).length,
      independentTransferAnswers.length,
    ),
  };
}

export function hasIndependentChallengeTransferReadiness({
  voluntaryPracticeCount,
  independentChallengeTransferEvidenceCount,
  independentChallengeTransferSuccessRate,
  fatigueSignal,
  independentCorrectRate,
} = {}) {
  const transferSuccessRate = boundedRate(independentChallengeTransferSuccessRate);
  const independentAccuracy = boundedRate(independentCorrectRate);
  const fatigue = boundedRate(fatigueSignal) ?? 0;

  return (
    wholeCount(voluntaryPracticeCount) >= MIN_VOLUNTARY_PRACTICE_REQUESTS_FOR_ACCELERATION &&
    wholeCount(independentChallengeTransferEvidenceCount) >= MIN_INDEPENDENT_CHALLENGE_TRANSFER_ATTEMPTS &&
    transferSuccessRate !== null &&
    transferSuccessRate >= MIN_INDEPENDENT_CHALLENGE_TRANSFER_SUCCESS_RATE &&
    independentAccuracy !== null &&
    independentAccuracy >= 0.65 &&
    fatigue < 0.35
  );
}
