import { isReadingFormTransferVariant } from "./variant-evidence-policy.js?v=variant-evidence-policy-1";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const TAG_TO_DIMENSION = {
  read_context: "reading",
  extract_conditions: "reading",
  resist_distractor: "reading",
  identify_unknown: "equation_building",
  translate_to_math_language: "equation_building",
  select_operation_or_model: "equation_building",
  build_equation_or_relation: "equation_building",
  compute_stably: "calculation",
  handle_units: "calculation",
  draw_or_use_visual_model: "concept",
  explain_or_check_answer: "concept",
  transfer_variant: "transfer",
};

const DIMENSION_LABELS = {
  concept: "概念理解",
  reading: "读题与信息提取",
  equation_building: "关系建模",
  calculation: "计算稳定性",
  transfer: "变式迁移",
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function scoreAttempt(payload, isIndependentAnswer) {
  if (!payload?.isCorrect) return 0;
  if (!isIndependentAnswer) return 0.72;
  return 1;
}

function collectDimensions(tags = [], variantLevel) {
  const dimensions = new Set(tags.map((tag) => TAG_TO_DIMENSION[tag]).filter(Boolean));
  if (isReadingFormTransferVariant(variantLevel)) dimensions.add("transfer");
  return [...dimensions];
}

export function summarizeLearningEvidence(events = []) {
  const isIndependentAnswer = createIndependentAnswerPredicate(events);
  const answerEvents = events.filter(
    (event) => event.eventType === "answer_submitted" && Array.isArray(event.payload?.abilityTags),
  );
  const byDimension = new Map();
  const byAtlasNode = new Map();

  answerEvents.forEach((event) => {
    const payload = event.payload;
    const independent = isIndependentAnswer(event);
    const score = scoreAttempt(payload, independent);
    const weight = payload.variantLevel && payload.variantLevel !== "original" ? 1.2 : 1;

    collectDimensions(payload.abilityTags, payload.variantLevel).forEach((dimensionId) => {
      const current = byDimension.get(dimensionId) || {
        totalScore: 0,
        totalWeight: 0,
        attempts: 0,
        independentCorrect: 0,
        hintedCorrect: 0,
      };
      current.totalScore += score * weight;
      current.totalWeight += weight;
      current.attempts += 1;
      if (payload.isCorrect && independent) current.independentCorrect += 1;
      if (payload.isCorrect && !independent) current.hintedCorrect += 1;
      byDimension.set(dimensionId, current);
    });

    (payload.atlasNodeIds || []).forEach((atlasNodeId) => {
      const current = byAtlasNode.get(atlasNodeId) || { attempts: 0, correct: 0, variantAttempts: 0 };
      current.attempts += 1;
      if (payload.isCorrect) current.correct += 1;
      if (payload.variantLevel && payload.variantLevel !== "original") current.variantAttempts += 1;
      byAtlasNode.set(atlasNodeId, current);
    });
  });

  const dimensions = [...byDimension.entries()]
    .map(([id, value]) => ({
      id,
      label: DIMENSION_LABELS[id] || id,
      observedScore: value.totalWeight ? Number((value.totalScore / value.totalWeight).toFixed(2)) : 0,
      attempts: value.attempts,
      independentCorrect: value.independentCorrect,
      hintedCorrect: value.hintedCorrect,
    }))
    .sort((a, b) => a.observedScore - b.observedScore);

  const atlasEvidence = [...byAtlasNode.entries()].map(([atlasNodeId, value]) => ({
    atlasNodeId,
    attempts: value.attempts,
    correctRate: value.attempts ? Number((value.correct / value.attempts).toFixed(2)) : 0,
    variantAttempts: value.variantAttempts,
  }));

  return {
    source: "tagged_practice_behavior",
    answerEventCount: answerEvents.length,
    dimensions,
    atlasEvidence,
    guardrail:
      "Practice evidence refines question allocation and reports. It does not update the dynamic learning curve without a formal test.",
  };
}
