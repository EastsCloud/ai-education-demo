import {
  isControlledNumberVariant,
  isReadingFormTransferVariant,
} from "./variant-evidence-policy.js";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const PRIOR_ALPHA = 1.5;
const PRIOR_BETA = 1.5;
const MAX_RECENT_FAMILY_ANSWERS = 36;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function trustedAnswerEvents(events = [], familyId = null) {
  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event?.eventType === "answer_submitted" && typeof event?.payload?.isCorrect === "boolean")
    .filter(({ event }) => !familyId || event.payload?.questionFamilyId === familyId)
    .filter(({ event }) => !event.payload?.scoringSource || event.payload.scoringSource === "server_authoritative")
    .sort((left, right) => {
      const leftTime = Date.parse(left.event?.timestamp || "") || left.index;
      const rightTime = Date.parse(right.event?.timestamp || "") || right.index;
      return leftTime - rightTime || left.index - right.index;
    })
    .slice(-MAX_RECENT_FAMILY_ANSWERS)
    .map(({ event }) => event);
}

function evidenceWeight(event, index, total) {
  const recencyWeight = total <= 1 ? 1 : 0.6 + (index / (total - 1)) * 0.4;
  const variant = event?.payload?.variantLevel || "original";
  const variantWeight = isReadingFormTransferVariant(variant) ? 1.18 : isControlledNumberVariant(variant) ? 1.1 : 1;
  const challengeWeight = event?.payload?.extraPracticeMode === "harder" ? 1.05 : 1;
  return recencyWeight * variantWeight * challengeWeight;
}

function confidenceBand(effectiveEvidence) {
  if (effectiveEvidence >= 8) return "high";
  if (effectiveEvidence >= 3) return "medium";
  return "low";
}

function recommendation({ events, masteryEstimate, confidence, independentCorrectCount }) {
  const latest = events.at(-1);
  if (latest && !latest.payload?.isCorrect) return "stabilize";
  if (masteryEstimate < 0.42) return "stabilize";
  if (confidence !== "low" && masteryEstimate >= 0.76 && independentCorrectCount >= 3) return "ready_for_variation";
  if (confidence === "low") return "collect_more_evidence";
  return "consolidate";
}

// This is a bounded Bayesian-style evidence estimate for matching only. It is
// intentionally not a score, diagnosis, formal-attainment decision, or curve input.
export function estimateFamilyMastery({ behaviorEvents = [], familyId } = {}) {
  const events = trustedAnswerEvents(behaviorEvents, familyId);
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  let alpha = PRIOR_ALPHA;
  let beta = PRIOR_BETA;
  let independentCorrectCount = 0;
  let hintedCorrectCount = 0;
  let wrongCount = 0;

  events.forEach((event, index) => {
    const weight = evidenceWeight(event, index, events.length);
    const isCorrect = Boolean(event.payload?.isCorrect);
    const hintDepth = Math.max(0, Number(event.payload?.hintsOpened || 0));
    const independent = isIndependentAnswer(event);
    if (isCorrect && independent) {
      alpha += weight;
      independentCorrectCount += 1;
      return;
    }
    if (isCorrect) {
      alpha += weight * 0.55;
      beta += weight * 0.45;
      hintedCorrectCount += 1;
      return;
    }
    beta += weight * (!independent || hintDepth > 0 ? 0.85 : 1);
    wrongCount += 1;
  });

  const effectiveEvidence = Math.max(0, alpha + beta - PRIOR_ALPHA - PRIOR_BETA);
  const masteryEstimate = clamp(alpha / Math.max(alpha + beta, 1), 0, 1);
  const confidence = confidenceBand(effectiveEvidence);

  return {
    familyId: familyId || null,
    version: "family_mastery_evidence_v1",
    source: "trusted_server_scored_family_answers",
    answerCount: events.length,
    effectiveEvidence: round(effectiveEvidence, 2),
    masteryEstimate: round(masteryEstimate, 3),
    confidence,
    independentCorrectCount,
    hintedCorrectCount,
    wrongCount,
    recommendation: recommendation({ events, masteryEstimate, confidence, independentCorrectCount }),
    guardrail:
      "This private estimate adjusts only next-practice matching. It never changes a recorded answer, labels a student, confirms a level, or updates a learning curve.",
  };
}

export function summarizeFamilyMasteryEvidence({ behaviorEvents = [], familyIds = [] } = {}) {
  const families = [...new Set((familyIds || []).filter(Boolean))].map((familyId) =>
    estimateFamilyMastery({ behaviorEvents, familyId }),
  );
  return {
    version: "family_mastery_evidence_v1",
    source: "trusted_server_scored_family_answers",
    families,
    guardrail:
      "Family evidence is a private, confidence-bounded next-practice input. Formal tests remain the only source for dynamic-curve changes.",
  };
}
