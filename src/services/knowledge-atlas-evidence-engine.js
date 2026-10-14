import {
  isControlledNumberVariant,
  isReadingFormTransferVariant,
} from "./variant-evidence-policy.js";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";
import { createMathAnswerInput, mathAnswerValuesMatch } from "./math-answer-input.js?v=math-answer-input-fraction-1";

const PIECE_RULES = {
  read_target: {
    abilityTags: ["read_context"],
    requiredIndependent: 2,
  },
  extract_conditions: {
    abilityTags: ["extract_conditions", "resist_distractor"],
    requiredIndependent: 2,
  },
  quantity_difference: {
    abilityTags: ["select_operation_or_model", "build_equation_or_relation"],
    atlasNodeIds: ["quantity_total_difference", "more_less", "part_whole"],
    requiredIndependent: 2,
  },
  set_unknown: {
    abilityTags: ["identify_unknown"],
    requiredIndependent: 2,
  },
  build_equation: {
    abilityTags: ["translate_to_math_language", "build_equation_or_relation"],
    requiredIndependent: 2,
  },
  check_answer: {
    abilityTags: ["explain_or_check_answer"],
    requiredIndependent: 2,
  },
  one_number_variant: {
    variantLevels: ["change_one_number"],
    requiredIndependent: 1,
    isControlledVariantStep: true,
  },
  two_number_variant: {
    variantLevels: ["change_two_numbers"],
    requiredIndependent: 1,
    isControlledVariantStep: true,
  },
  step_added_variant: {
    variantLevels: ["step_added_variant"],
    requiredIndependent: 1,
    isControlledVariantStep: true,
  },
  two_steps_added_variant: {
    variantLevels: ["two_steps_added_variant"],
    requiredIndependent: 1,
    isControlledVariantStep: true,
  },
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function latest(items) {
  return [...items].sort((left, right) => String(right.timestamp || "").localeCompare(String(left.timestamp || "")))[0] || null;
}

function compactPrompt(value) {
  const prompt = String(value || "").trim();
  if (!prompt) return "这道题";
  return prompt.length > 38 ? `${prompt.slice(0, 38)}...` : prompt;
}

function normalizePracticeEvidence(events = []) {
  const isIndependentAnswer = createIndependentAnswerPredicate(events);
  return events
    .filter((event) => event?.eventType === "answer_submitted" && typeof event.payload?.isCorrect === "boolean")
    .map((event, index) => ({
      id: event.eventId || `practice-${event.timestamp || "undated"}-${index}`,
      source: "practice",
      timestamp: event.timestamp || "",
      isCorrect: Boolean(event.payload.isCorrect),
      hintsOpened: Math.max(0, Number(event.payload.hintsOpened || 0)),
      helpUsed: !isIndependentAnswer(event),
      abilityTags: asArray(event.payload.abilityTags),
      atlasNodeIds: asArray(event.payload.atlasNodeIds),
      variantLevel: event.payload.variantLevel || "original",
      stageLabel: event.payload.stageLabel || "练习",
      prompt: event.payload.questionPrompt || "",
      questionId: event.targetId || event.payload.questionId || "",
      answer: event.payload.answer ?? null,
      correctAnswer: event.payload.correctAnswer ?? null,
    }));
}

function reviewFocus(abilityTags = []) {
  const tags = new Set(abilityTags);
  const labels = [];
  if (tags.has("read_context") || tags.has("extract_conditions") || tags.has("resist_distractor")) labels.push("读题与条件");
  if (tags.has("identify_unknown")) labels.push("设未知数");
  if (tags.has("translate_to_math_language") || tags.has("build_equation_or_relation")) labels.push("关系建模");
  if (tags.has("compute_stably") || tags.has("handle_units")) labels.push("计算与单位");
  if (tags.has("explain_or_check_answer")) labels.push("检查答案");
  return labels.length ? labels.slice(0, 2) : ["回到题意"];
}

function timestampValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildWrongQuestionSet(evidence = []) {
  const latestWrongByQuestion = new Map();
  evidence
    .filter(
      (item) =>
        item.source === "practice" &&
        !item.isCorrect &&
        item.questionId &&
        (item.atlasNodeIds.length > 0 || item.abilityTags.length > 0),
    )
    .forEach((item) => {
      const current = latestWrongByQuestion.get(item.questionId);
      if (!current || timestampValue(item.timestamp) >= timestampValue(current.timestamp)) {
        latestWrongByQuestion.set(item.questionId, item);
      }
    });

  return [...latestWrongByQuestion.values()]
    .map((wrong) => {
      const retryCompleted = evidence.some(
        (item) =>
          item.source === "practice" &&
          item.questionId === wrong.questionId &&
          item.isCorrect &&
          !item.helpUsed &&
          timestampValue(item.timestamp) >= timestampValue(wrong.timestamp),
      );
      const retryState = retryCompleted ? "resolved" : "needs_original_retry";
      return {
        id: `wrong-item-${wrong.questionId}`,
        questionId: wrong.questionId,
        prompt: compactPrompt(wrong.prompt),
        fullPrompt: wrong.prompt || "题目内容已存档",
        ...(wrong.answer !== null && wrong.answer !== undefined ? { studentAnswer: wrong.answer } : {}),
        ...(wrong.correctAnswer !== null && wrong.correctAnswer !== undefined ? { correctAnswer: wrong.correctAnswer } : {}),
        reviewFocus: reviewFocus(wrong.abilityTags),
        retryState,
        retryLabel: retryCompleted ? "已重做成功" : "等待原题重做",
        nextAction: retryCompleted ? "已完成回看，后续会在合适时机安排变式。" : "先回到原题，不看提示再试一次。",
        updatedAt: wrong.timestamp,
      };
    })
    .sort((left, right) => timestampValue(right.updatedAt) - timestampValue(left.updatedAt));
}

function normalizeAssessmentEvidence({ assessmentResponses = [], abilityQuestions = [] } = {}) {
  const questions = new Map(abilityQuestions.map((question) => [question.id, question]));
  return assessmentResponses
    .filter(
      (response) =>
        response?.step === "ability_test" && /^(?:numeric|clock_time|fraction)_answer(?:_marked_uncertain)?$/.test(String(response.responseType || "")),
    )
    .flatMap((response) => {
      const question = questions.get(response.questionId);
      const tags = question?.metadataTags || response.questionMetadata?.tags || null;
      const expectedAnswer = question?.answer ?? response.questionMetadata?.correctAnswer;
      const answerInput = question?.answerInput || createMathAnswerInput({ kind: response.questionMetadata?.answerInputKind });
      const isCorrect =
        typeof response.isCorrect === "boolean"
          ? response.isCorrect
          : expectedAnswer !== null && expectedAnswer !== undefined
            ? mathAnswerValuesMatch({ answerInput, actual: response.answer, expected: expectedAnswer })
            : null;
      if (!tags || typeof isCorrect !== "boolean") return [];

      return [
        {
          id: `assessment-${response.questionId}`,
          source: "initial_assessment",
          timestamp: response.storedAt || "",
          isCorrect,
          hintsOpened: 0,
          helpUsed: false,
          abilityTags: asArray(tags.abilityTags),
          atlasNodeIds: asArray(tags.atlasNodeIds),
          variantLevel: tags.variantLevel || "original",
          stageLabel: "初始测试",
          prompt: question?.prompt || response.questionMetadata?.prompt || "",
        },
      ];
    });
}

function matchesRule(evidence, rule) {
  const matchesTag = asArray(rule.abilityTags).some((tag) => evidence.abilityTags.includes(tag));
  const matchesNode = asArray(rule.atlasNodeIds).some((nodeId) => evidence.atlasNodeIds.includes(nodeId));
  const matchesVariant = asArray(rule.variantLevels).includes(evidence.variantLevel);
  return matchesTag || matchesNode || matchesVariant;
}

function summarizePieceEvidence(evidence = [], rule = {}) {
  const attempts = evidence.length;
  const correct = evidence.filter((item) => item.isCorrect);
  const independentCorrect = correct.filter((item) => !item.helpUsed);
  const hintedCorrect = correct.filter((item) => item.helpUsed);
  const wrong = evidence.filter((item) => !item.isCorrect);
  const weightedCorrect = independentCorrect.length + hintedCorrect.length * 0.62;
  const requiredIndependent = Math.max(1, Number(rule.requiredIndependent) || 2);
  const independentProgress = independentCorrect.length / requiredIndependent;
  const hintedProgress = hintedCorrect.length / requiredIndependent;
  const hasRecovered = wrong.length > 0 && independentCorrect.length > 0;
  const progress =
    attempts === 0
      ? 0
      : rule.isControlledVariantStep
        ? clamp(0.16 + independentProgress * 0.84 + hintedProgress * 0.34)
        : clamp(0.1 + independentProgress * 0.78 + hintedProgress * 0.34 + (hasRecovered ? 0.06 : 0));

  return {
    attempts,
    correct: correct.length,
    wrong: wrong.length,
    independentCorrect: independentCorrect.length,
    hintedCorrect: hintedCorrect.length,
    weightedCorrect: Number(weightedCorrect.toFixed(2)),
    progress: Number(progress.toFixed(2)),
    completed: independentCorrect.length >= requiredIndependent && progress >= 0.84,
  };
}

function defaultStatus(baseStatus, previousPiece) {
  if (baseStatus === "locked" && !(previousPiece?.progress > 0.2 || previousPiece?.status === "completed")) return "locked";
  return "unlocked";
}

function exampleText(item, type) {
  if (!item) {
    const fallback = {
      wrong: "完成真实作答后，这里会留下需要回看的题。",
      correct: "完成真实作答后，这里会留下你的独立完成记录。",
      breakthrough: "完成变式后，这里会留下你把关系走稳的记录。",
    };
    return fallback[type];
  }

  const source = item.stageLabel || (item.source === "initial_assessment" ? "初始测试" : "练习");
  if (type === "wrong") return `${source}：${compactPrompt(item.prompt)}。先回到原题，把关系找清楚。`;
  if (type === "breakthrough") return `${source}：${compactPrompt(item.prompt)}。变化后仍然能把关系走通。`;
  return `${source}：${compactPrompt(item.prompt)}。${item.helpUsed ? "提示或分步引导后完成。" : "独立完成。"}`;
}

function buildTimeline({ evidence, pieces }) {
  if (!evidence.length) {
    return ["从第一道题开始，地图会留下你一步一步走过的知识路径。"];
  }

  const lines = [`已收集 ${evidence.length} 次与知识点有关的作答。`];
  const current = pieces.filter((piece) => piece.status === "current");
  const completed = pieces.filter((piece) => piece.status === "completed");
  const controlledNumberVariation = evidence.filter(
    (item) => item.isCorrect && isControlledNumberVariant(item.variantLevel),
  );
  const readingFormTransfer = evidence.filter(
    (item) => item.isCorrect && isReadingFormTransferVariant(item.variantLevel),
  );

  // Keep the newest learning evidence visible rather than letting generic map
  // progress consume the short student-facing timeline.
  if (readingFormTransfer.length) lines.push("已经开始把同一个关系带到不同表达的题目里。");
  else if (controlledNumberVariation.length) lines.push("数字变化后，仍然能把同一个关系走通。");
  if (completed.length) lines.push(`已点亮 ${completed.map((piece) => piece.title).slice(0, 2).join("、")}。`);
  else if (current.length) lines.push(`正在继续练 ${current.map((piece) => piece.title).slice(0, 2).join("、")}。`);
  return lines.slice(0, 3);
}

export function buildKnowledgePuzzleMap({
  baseMap,
  behaviorEvents = [],
  assessmentResponses = [],
  abilityQuestions = [],
} = {}) {
  const practiceEvidence = normalizePracticeEvidence(behaviorEvents);
  const assessmentEvidence = normalizeAssessmentEvidence({ assessmentResponses, abilityQuestions });
  const evidence = [...assessmentEvidence, ...practiceEvidence];
  const draftPieces = (baseMap?.pieces || []).map((piece) => {
    const rule = PIECE_RULES[piece.id] || { atlasNodeIds: [piece.id], requiredIndependent: 2 };
    const matches = evidence.filter((item) => matchesRule(item, rule));
    const summary = summarizePieceEvidence(matches, rule);
    return {
      ...piece,
      ...summary,
      baseStatus: piece.status,
      evidenceSourceCount: new Set(matches.map((item) => item.source)).size,
    };
  });
  const pieces = draftPieces.map(({ baseStatus, ...piece }, index) => ({
    ...piece,
    status: piece.completed
      ? "completed"
      : piece.attempts
        ? "current"
        : defaultStatus(baseStatus, draftPieces[index - 1]),
  }));

  const completionRate = pieces.length ? pieces.reduce((sum, piece) => sum + piece.progress, 0) / pieces.length : 0;
  const wrongEvidence = latest(evidence.filter((item) => !item.isCorrect));
  const correctEvidence = latest(evidence.filter((item) => item.isCorrect && !item.helpUsed));
  const readingFormTransferEvidence = latest(
    evidence.filter(
      (item) => item.isCorrect && !item.helpUsed && isReadingFormTransferVariant(item.variantLevel),
    ),
  );
  const controlledNumberVariationEvidence = latest(
    evidence.filter(
      (item) => item.isCorrect && !item.helpUsed && isControlledNumberVariant(item.variantLevel),
    ),
  );
  const completedCount = pieces.filter((piece) => piece.status === "completed").length;
  const activeCount = pieces.filter((piece) => piece.status === "current").length;
  const wrongQuestionSet = buildWrongQuestionSet(evidence);

  return {
    ...baseMap,
    completionRate: Number(completionRate.toFixed(2)),
    pieces,
    evidence: {
      source: "initial_assessment_and_tagged_practice",
      assessmentAnswerCount: assessmentEvidence.length,
      practiceAnswerCount: practiceEvidence.length,
      answerCount: evidence.length,
      completedCount,
      activeCount,
      wrongQuestionCount: wrongQuestionSet.length,
      guardrail: "知识地图会记录练习证据；只有正式测试才能更新动态学习曲线。",
    },
    studentSummary:
      evidence.length === 0
        ? "从一道题开始，地图会慢慢亮起来。"
        : completedCount
          ? `已经点亮 ${completedCount} 个知识区域，继续把正在练的地方走稳。`
          : `已经留下 ${evidence.length} 次作答记录，先把正在练的地方点亮。`,
    timeline: buildTimeline({ evidence, pieces }),
    examples: {
      wrong: exampleText(wrongEvidence, "wrong"),
      correct: exampleText(correctEvidence, "correct"),
      breakthrough: exampleText(readingFormTransferEvidence || controlledNumberVariationEvidence, "breakthrough"),
    },
    wrongQuestionSet,
  };
}
