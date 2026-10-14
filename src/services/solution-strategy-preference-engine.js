import {
  isKnownMathSolutionStrategyId,
  mathSolutionStrategyLabel,
} from "./math-solution-strategy-engine.js?v=math-solution-strategies-v2";

export const SOLUTION_STRATEGY_PREFERENCE_VERSION = "solution_strategy_preference_v1";

const MIN_DISTINCT_QUESTION_EVIDENCE = 2;
const MAX_PREFERRED_STRATEGIES = 2;

function cleanIdentifier(value) {
  const id = String(value || "").trim();
  return id || null;
}

function timestampValue(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function questionKey(event) {
  const deliveryId = cleanIdentifier(event?.payload?.deliveryId);
  if (deliveryId) return `delivery:${deliveryId}`;

  const targetId = cleanIdentifier(event?.targetId);
  return targetId ? `target:${targetId}` : null;
}

function validStrategyOpening(event) {
  if (event?.eventType !== "solution_strategy_opened") return null;
  const strategyId = cleanIdentifier(event?.payload?.strategyId);
  const linkedQuestion = questionKey(event);
  if (!strategyId || !linkedQuestion || !isKnownMathSolutionStrategyId(strategyId)) return null;
  return {
    strategyId,
    questionKey: linkedQuestion,
    timestamp: timestampValue(event.timestamp),
  };
}

// A viewed method is a preference signal, not an assessment result. Two
// different linked questions are required before optional support is reordered.
export function summarizeSolutionStrategyPreference(behaviorEvents = []) {
  const uniqueOpenings = new Map();
  (Array.isArray(behaviorEvents) ? behaviorEvents : []).forEach((event) => {
    const opening = validStrategyOpening(event);
    if (!opening) return;
    const key = `${opening.strategyId}|${opening.questionKey}`;
    const existing = uniqueOpenings.get(key);
    if (!existing || opening.timestamp > existing.timestamp) uniqueOpenings.set(key, opening);
  });

  const strategyEvidence = new Map();
  const allQuestionKeys = new Set();
  uniqueOpenings.forEach((opening) => {
    allQuestionKeys.add(opening.questionKey);
    const summary = strategyEvidence.get(opening.strategyId) || {
      id: opening.strategyId,
      label: mathSolutionStrategyLabel(opening.strategyId),
      distinctQuestionKeys: new Set(),
      lastOpenedAt: 0,
    };
    summary.distinctQuestionKeys.add(opening.questionKey);
    summary.lastOpenedAt = Math.max(summary.lastOpenedAt, opening.timestamp);
    strategyEvidence.set(opening.strategyId, summary);
  });

  const observedStrategies = [...strategyEvidence.values()]
    .map((summary) => ({
      id: summary.id,
      label: summary.label,
      distinctQuestionCount: summary.distinctQuestionKeys.size,
      lastOpenedAt: summary.lastOpenedAt || null,
    }))
    .sort(
      (left, right) =>
        right.distinctQuestionCount - left.distinctQuestionCount ||
        Number(right.lastOpenedAt || 0) - Number(left.lastOpenedAt || 0) ||
        left.id.localeCompare(right.id),
    );
  const orderedStrategyIds = observedStrategies
    .filter((strategy) => strategy.distinctQuestionCount >= MIN_DISTINCT_QUESTION_EVIDENCE)
    .slice(0, MAX_PREFERRED_STRATEGIES)
    .map((strategy) => strategy.id);
  const dominantStrategyId = orderedStrategyIds[0] || null;

  return {
    version: SOLUTION_STRATEGY_PREFERENCE_VERSION,
    source: "voluntary_solution_strategy_opening",
    evidenceCount: uniqueOpenings.size,
    distinctQuestionCount: allQuestionKeys.size,
    minimumDistinctQuestionEvidence: MIN_DISTINCT_QUESTION_EVIDENCE,
    observedStrategies,
    orderedStrategyIds,
    dominantStrategyId,
    dominantStrategyLabel: dominantStrategyId ? mathSolutionStrategyLabel(dominantStrategyId) : null,
    confidence: dominantStrategyId ? "observed" : "collecting",
    guardrail:
      "Voluntary method openings only order optional solution strategies. They do not change question difficulty, scoring, routing, allocation, level judgment, or the learning curve.",
  };
}

export function orderSolutionStrategies({ strategies = [], preference = null } = {}) {
  const source = Array.isArray(strategies) ? strategies.slice() : [];
  const preferredIds = Array.isArray(preference?.orderedStrategyIds)
    ? preference.orderedStrategyIds.filter((id) => isKnownMathSolutionStrategyId(id))
    : [];
  if (!preferredIds.length) return source;

  const rankById = new Map(preferredIds.map((id, index) => [id, index]));
  return source
    .map((strategy, originalIndex) => ({
      strategy,
      originalIndex,
      rank: rankById.has(strategy?.id) ? rankById.get(strategy.id) : preferredIds.length + originalIndex,
    }))
    .sort((left, right) => left.rank - right.rank || left.originalIndex - right.originalIndex)
    .map(({ strategy }) => strategy);
}
