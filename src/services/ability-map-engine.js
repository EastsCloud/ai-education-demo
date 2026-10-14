import { isReadingFormTransferVariant } from "./variant-evidence-policy.js?v=variant-evidence-policy-1";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const dimensionNameMap = {
  concept: "方程概念",
  reading: "读题与信息提取",
  equation_building: "等量关系与列式",
  calculation: "计算稳定性",
  transfer: "变式迁移",
  hint_dependency: "提示依赖",
};

export const abilityTagToDimension = Object.freeze({
  read_context: "reading",
  extract_conditions: "reading",
  identify_unknown: "reading",
  translate_to_math_language: "equation_building",
  select_operation_or_model: "concept",
  build_equation_or_relation: "equation_building",
  compute_stably: "calculation",
  handle_units: "calculation",
  draw_or_use_visual_model: "concept",
  explain_or_check_answer: "transfer",
  transfer_variant: "transfer",
  resist_distractor: "reading",
});

export function mapAbilityTagsToDimensions(tags = []) {
  return [...new Set((tags || []).map((tag) => abilityTagToDimension[tag]).filter(Boolean))];
}

function levelFromScore(score) {
  if (score >= 0.78) return "稳定";
  if (score >= 0.64) return "接近掌握";
  if (score >= 0.52) return "不稳定";
  return "需要补弱";
}

function evidenceText(dimensionId, score) {
  const level = levelFromScore(score);
  const texts = {
    concept: {
      high: "知道可以设未知数，并能解释简单等量关系。",
      low: "知道可以设 x，但遇到多条件题时容易漏关系。",
    },
    reading: {
      high: "能先识别题目目标，再提取条件。",
      low: "长题干中容易先处理数字，忽略最终问题。",
    },
    equation_building: {
      high: "能把文字条件转成方程或关系式。",
      low: "总量、差值、数量同时出现时列式不稳定。",
    },
    calculation: {
      high: "计算过程稳定，错误较少来自运算本身。",
      low: "计算正确率影响解题完成度。",
    },
    transfer: {
      high: "换数字和换表达后仍能保持题型结构。",
      low: "换条件或换题干表达后正确率下降。",
    },
    hint_dependency: {
      high: "轻提示后能继续推进，适合先试再提示。",
      low: "需要较深提示或分步引导才能完成。",
    },
  };
  return score >= 0.64 ? texts[dimensionId]?.high || level : texts[dimensionId]?.low || level;
}

function aggregateEvidence(evidenceItems) {
  const grouped = new Map();

  evidenceItems.forEach((item) => {
    item.dimensionScores.forEach((score) => {
      const current = grouped.get(score.dimensionId) || { total: 0, weight: 0, count: 0 };
      current.total += score.value * (score.weight || 1);
      current.weight += score.weight || 1;
      current.count += 1;
      grouped.set(score.dimensionId, current);
    });
  });

  return [...grouped.entries()].map(([dimensionId, value]) => {
    const score = value.weight ? value.total / value.weight : 0;
    return {
      id: dimensionId,
      name: dimensionNameMap[dimensionId] || dimensionId,
      score: Number(score.toFixed(2)),
      level: levelFromScore(score),
      evidence: evidenceText(dimensionId, score),
      evidenceCount: value.count,
    };
  });
}

export function generateAbilityMapFromEvidence({
  assessment,
  evidenceItems,
  studentId,
  subjectId,
}) {
  const dimensions = aggregateEvidence(evidenceItems);
  const overallLevel = Number(
    (dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / Math.max(1, dimensions.length)).toFixed(2),
  );
  const keyDimensions = ["reading", "equation_building", "transfer"];
  const targetReadiness = Number(
    (
      dimensions
        .filter((dimension) => keyDimensions.includes(dimension.id))
        .reduce((sum, dimension) => sum + dimension.score, 0) / keyDimensions.length
    ).toFixed(2),
  );
  const strengths = dimensions
    .filter((dimension) => dimension.score >= 0.64)
    .sort((a, b) => b.score - a.score)
    .map((dimension) => dimension.name);
  const weakPoints = dimensions
    .filter((dimension) => dimension.score < 0.6)
    .sort((a, b) => a.score - b.score)
    .map((dimension) => dimension.name);

  return {
    studentId,
    subjectId,
    generatedFrom: assessment.assessmentId,
    generatedAt: new Date().toISOString(),
    generationSource: "assessment_evidence_engine",
    overallLevel,
    targetReadiness,
    dimensions,
    strengths: strengths.length ? strengths : ["轻提示后能继续推进"],
    weakPoints: weakPoints.length ? weakPoints : ["继续观察变式迁移"],
    watchList: [
      "读题阶段是否先看目标",
      "换条件后是否仍能列出关系",
      "提示深度是否逐步下降",
    ],
  };
}

function numericAnswer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveAssessmentTags(response, questionsById) {
  const question = questionsById.get(response.questionId);
  return (
    response.questionMetadata?.tags?.abilityTags ||
    response.questionMetadata?.abilityTags ||
    question?.metadataTags?.abilityTags ||
    []
  );
}

function resolveAssessmentCorrectness(response, questionsById) {
  if (typeof response.isCorrect === "boolean") return response.isCorrect;
  const question = questionsById.get(response.questionId);
  const expectedAnswer = response.questionMetadata?.correctAnswer ?? question?.answer;
  const answer = numericAnswer(response.answer);
  const expected = numericAnswer(expectedAnswer);
  return answer !== null && expected !== null ? answer === expected : null;
}

function resolveAssessmentVariantLevel(response, questionsById) {
  const question = questionsById.get(response.questionId);
  return (
    response.questionMetadata?.tags?.variantLevel ||
    response.questionMetadata?.variantLevel ||
    question?.metadataTags?.variantLevel ||
    "original"
  );
}

function createAssessmentEvidence({ assessmentResponses, abilityQuestions }) {
  const questionsById = new Map((abilityQuestions || []).map((question) => [question.id, question]));
  return (assessmentResponses || [])
    .filter((response) => response?.step === "ability_test")
    .flatMap((response) => {
      const dimensionIds = new Set(mapAbilityTagsToDimensions(resolveAssessmentTags(response, questionsById)));
      if (isReadingFormTransferVariant(resolveAssessmentVariantLevel(response, questionsById))) {
        dimensionIds.add("transfer");
      }
      if (!dimensionIds.size) return [];
      const isCorrect = resolveAssessmentCorrectness(response, questionsById);
      if (isCorrect === null) return [];
      const isUncertain = Boolean(response.isUncertain);
      const evidenceValue = isUncertain ? (isCorrect ? 0.72 : 0.24) : isCorrect ? 0.86 : 0.28;
      const evidenceWeight = isUncertain ? 0.68 : 0.9;
      return [
        {
          questionId: response.questionId,
          source: "initial_ability_test",
          answeredCorrectly: isCorrect,
          observedAt: response.storedAt || response.updatedAt || null,
          dimensionScores: [...dimensionIds].map((dimensionId) => ({
            dimensionId,
            value: evidenceValue,
            weight: evidenceWeight,
          })),
        },
      ];
    });
}

function createPracticeEvidence(behaviorEvents = []) {
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  return behaviorEvents
    .filter((event) => event?.eventType === "answer_submitted" && event.payload?.answer !== null)
    .flatMap((event) => {
      const payload = event.payload || {};
      const isCorrect = Boolean(payload.isCorrect);
      const hintDepth = Math.max(0, Number(payload.hintsOpened) || 0);
      const independent = isIndependentAnswer(event);
      const dimensionIds = mapAbilityTagsToDimensions(payload.abilityTags || []);
      const variantLevel = payload.variantLevel || "original";
      const independentValue = isCorrect ? 0.82 : 0.3;
      const supportedValue = isCorrect ? Math.max(0.52, 0.68 - hintDepth * 0.05) : 0.22;
      const questionValue = independent ? independentValue : supportedValue;
      const questionWeight = independent ? 0.18 : 0.14;
      const dimensionScores = dimensionIds.map((dimensionId) => ({
        dimensionId,
        value: questionValue,
        weight: questionWeight,
      }));

      if (isReadingFormTransferVariant(variantLevel)) {
        dimensionScores.push({
          dimensionId: "transfer",
          value: independent ? independentValue : supportedValue,
          weight: 0.2,
        });
      }

      dimensionScores.push({
        dimensionId: "hint_dependency",
        value: independent ? (isCorrect ? 0.84 : 0.5) : isCorrect ? 0.64 : 0.28,
        weight: 0.1,
      });

      return [
        {
          questionId: event.targetId || event.eventId,
          source: "practice_behavior",
          answeredCorrectly: isCorrect,
          observedAt: event.timestamp || null,
          dimensionScores,
        },
      ];
    });
}

export function buildAbilityMapFromRuntimeEvidence({
  assessment = { assessmentId: "runtime-ability-evidence" },
  assessmentResponses = [],
  abilityQuestions = [],
  behaviorEvents = [],
  initialEvidence = [],
  studentId,
  subjectId,
}) {
  const initialAssessmentEvidence = createAssessmentEvidence({ assessmentResponses, abilityQuestions });
  const practiceEvidence = createPracticeEvidence(behaviorEvents);
  const baselineEvidence = [...(initialEvidence || []), ...initialAssessmentEvidence];
  const evidenceItems = [...baselineEvidence, ...practiceEvidence];
  const baselineMap = generateAbilityMapFromEvidence({
    assessment,
    evidenceItems: baselineEvidence,
    studentId,
    subjectId,
  });
  const map = generateAbilityMapFromEvidence({ assessment, evidenceItems, studentId, subjectId });
  const baselineByDimension = new Map(baselineMap.dimensions.map((dimension) => [dimension.id, dimension]));
  const practiceEvidenceCountByDimension = new Map();
  practiceEvidence.forEach((item) => {
    item.dimensionScores.forEach((score) => {
      practiceEvidenceCountByDimension.set(
        score.dimensionId,
        (practiceEvidenceCountByDimension.get(score.dimensionId) || 0) + 1,
      );
    });
  });
  const dimensionTrend = map.dimensions.map((dimension) => {
    const baseline = baselineByDimension.get(dimension.id);
    const previousScore = baseline?.score;
    const change = typeof previousScore === "number" ? Number((dimension.score - previousScore).toFixed(2)) : null;
    return {
      dimensionId: dimension.id,
      name: dimension.name,
      previousScore: typeof previousScore === "number" ? previousScore : null,
      currentScore: dimension.score,
      change,
      practiceEvidenceCount: practiceEvidenceCountByDimension.get(dimension.id) || 0,
      status: change === null ? "first_evidence" : change > 0.005 ? "improving" : change < -0.005 ? "needs_attention" : "steady",
    };
  });

  return {
    ...map,
    generationSource: "initial_assessment_and_practice_evidence",
    evidenceSummary: {
      seededBaselineCount: (initialEvidence || []).length,
      initialAssessmentCount: initialAssessmentEvidence.length,
      practiceAnswerCount: practiceEvidence.length,
      totalEvidenceCount: evidenceItems.length,
      confidence: Number(Math.min(0.92, 0.3 + evidenceItems.length * 0.045).toFixed(2)),
    },
    dimensionTrend,
    guardrail:
      "This map is a working evidence view. Daily practice can refine it, but only a verified formal test may update the dynamic learning curve.",
  };
}
