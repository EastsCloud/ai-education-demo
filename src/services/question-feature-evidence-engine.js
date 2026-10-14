import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const MIN_FEATURE_EXPOSURES = 5;
const MIN_FEATURE_ERRORS = 3;
const MIN_RELATIVE_WRONG_RATE = 0.25;
const MAX_FEATURE_KEYS_PER_ANSWER = 24;
const MAX_FOCUS_FEATURES = 2;

function boundedFeatureKey(value) {
  const key = String(value || "").trim();
  return /^[a-z_]+:[a-z0-9_]+$/.test(key) ? key.slice(0, 96) : null;
}

function answerEvents(events = []) {
  return events.filter((event) => event?.eventType === "answer_submitted" && typeof event.payload?.isCorrect === "boolean");
}

function featureKeys(answer) {
  return [
    ...new Set(
      (Array.isArray(answer?.payload?.questionFeatureKeys) ? answer.payload.questionFeatureKeys : [])
        .map(boundedFeatureKey)
        .filter(Boolean),
    ),
  ].slice(0, MAX_FEATURE_KEYS_PER_ANSWER);
}

function confidenceForExposure(exposureCount) {
  if (exposureCount >= 10) return "high";
  if (exposureCount >= 6) return "medium";
  return "low";
}

function rounded(value) {
  return Number(Number(value || 0).toFixed(2));
}

// The result intentionally contains only bounded structural keys, never raw
// question values or a claim about the learner. It is a matching input only.
export function summarizeQuestionFeatureEvidence(events = []) {
  const answers = answerEvents(events);
  const isIndependentAnswer = createIndependentAnswerPredicate(events);
  const overallWrongRate = answers.length ? answers.filter((answer) => !answer.payload.isCorrect).length / answers.length : 0;
  const byFeature = new Map();

  answers.forEach((answer) => {
    featureKeys(answer).forEach((featureId) => {
      const entry = byFeature.get(featureId) || { featureId, exposureCount: 0, wrongCount: 0, independentWrongCount: 0 };
      entry.exposureCount += 1;
      if (!answer.payload.isCorrect) {
        entry.wrongCount += 1;
        if (isIndependentAnswer(answer)) entry.independentWrongCount += 1;
      }
      byFeature.set(featureId, entry);
    });
  });

  const signals = [...byFeature.values()]
    .map((entry) => {
      const wrongRate = entry.exposureCount ? entry.wrongCount / entry.exposureCount : 0;
      const relativeWrongRate = wrongRate - overallWrongRate;
      const confidence = confidenceForExposure(entry.exposureCount);
      const isReinforcementSignal =
        entry.exposureCount >= MIN_FEATURE_EXPOSURES &&
        entry.wrongCount >= MIN_FEATURE_ERRORS &&
        relativeWrongRate >= MIN_RELATIVE_WRONG_RATE;
      return {
        ...entry,
        wrongRate: rounded(wrongRate),
        relativeWrongRate: rounded(relativeWrongRate),
        confidence,
        action: isReinforcementSignal ? "reinforce_within_current_level" : "observe_only",
      };
    })
    .filter((entry) => entry.action === "reinforce_within_current_level")
    .sort(
      (left, right) =>
        right.relativeWrongRate - left.relativeWrongRate ||
        right.exposureCount - left.exposureCount ||
        left.featureId.localeCompare(right.featureId),
    );

  const focusFeatureIds = signals
    .filter((signal) => signal.confidence === "medium" || signal.confidence === "high")
    .slice(0, MAX_FOCUS_FEATURES)
    .map((signal) => signal.featureId);

  return {
    source: "question_feature_evidence_v1",
    answerCount: answers.length,
    observedFeatureCount: byFeature.size,
    overallWrongRate: rounded(overallWrongRate),
    signals: signals.slice(0, 5),
    focusFeatureIds,
    guardrail:
      "Feature evidence uses repeated, bounded structural tags only. It is not a diagnosis, does not retain raw numeric values, stays inside the current instructional level, and cannot change a learning curve.",
  };
}
