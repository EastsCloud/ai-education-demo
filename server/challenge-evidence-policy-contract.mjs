import assert from "node:assert/strict";
import {
  hasIndependentChallengeTransferReadiness,
  summarizeIndependentChallengeEvidence,
} from "../src/services/challenge-evidence-policy.js";

function answer({ variantLevel, correct, hintsOpened = 0 }) {
  return {
    eventType: "answer_submitted",
    payload: {
      extraPracticeMode: "harder",
      variantLevel,
      isCorrect: correct,
      hintsOpened,
    },
  };
}

const hintedOnly = summarizeIndependentChallengeEvidence([
  answer({ variantLevel: "multi_step_extension", correct: true, hintsOpened: 2 }),
  answer({ variantLevel: "reverse_question", correct: true, hintsOpened: 1 }),
]);
assert.equal(hintedOnly.challengeSuccessRate, 1);
assert.equal(hintedOnly.independentChallengeEvidenceCount, 0);
assert.equal(hintedOnly.independentChallengeTransferEvidenceCount, 0);
assert.equal(hintedOnly.independentChallengeTransferSuccessRate, null);
assert.equal(
  hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount: 4,
    independentChallengeTransferEvidenceCount: hintedOnly.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: hintedOnly.independentChallengeTransferSuccessRate,
    independentCorrectRate: 0.9,
    fatigueSignal: 0.1,
  }),
  false,
);

const independentTransfer = summarizeIndependentChallengeEvidence([
  answer({ variantLevel: "step_added_variant", correct: true }),
  answer({ variantLevel: "reverse_question", correct: true }),
  answer({ variantLevel: "multi_step_extension", correct: true }),
  answer({ variantLevel: "reverse_question", correct: true }),
  answer({ variantLevel: "multi_step_extension", correct: false }),
]);
assert.equal(independentTransfer.independentChallengeEvidenceCount, 5);
assert.equal(independentTransfer.independentChallengeTransferEvidenceCount, 4);
assert.equal(independentTransfer.independentChallengeTransferSuccessRate, 0.75);
assert.equal(
  hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount: 3,
    independentChallengeTransferEvidenceCount: independentTransfer.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: independentTransfer.independentChallengeTransferSuccessRate,
    independentCorrectRate: 0.8,
    fatigueSignal: 0.1,
  }),
  true,
);
assert.equal(
  hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount: 3,
    independentChallengeTransferEvidenceCount: independentTransfer.independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate: independentTransfer.independentChallengeTransferSuccessRate,
    independentCorrectRate: 0.8,
    fatigueSignal: 0.6,
  }),
  false,
);

console.log("challenge-evidence-policy-contract: passed");
