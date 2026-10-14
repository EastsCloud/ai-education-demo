import { getMathQuestionFamilyGraphBinding, mathKnowledgeGraph } from "../data/math-knowledge-graph.js?v=math-graph-4";
import { answerMatchesMathRule } from "./math-answer-rule-evaluator.js";
import {
  createMathAnswerInput,
  formatMathAnswerValue,
  validateMathAnswerInput,
} from "./math-answer-input.js?v=math-answer-input-fraction-1";
import { createMathApplicationContext, validateMathApplicationContext } from "./math-application-context-validator.js";
import { validateMathFamilySemantics } from "./math-family-semantic-validator.js?v=math-family-semantics-v13";
import {
  createMathItemModelSpecification,
  getSupportedMathItemModelVariants,
  validateMathItemModelSpecification,
} from "./math-item-model-specification.js?v=math-item-model-v13";
import { createMathSolutionDerivation, validateMathSolutionDerivation } from "./math-solution-derivation.js?v=math-solution-derivation-6";
import {
  createMathSolutionStrategies,
  MATH_SOLUTION_STRATEGY_VERSION,
  validateMathSolutionStrategies,
} from "./math-solution-strategy-engine.js?v=math-solution-strategies-v1";

function chooseContext(templates, seed, values) {
  const index = Math.abs(seed) % templates.length;
  const template = templates[index];
  return {
    contextTemplateId: template.id,
    prompt: template.render(values),
  };
}

function formatClock(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

const FAMILY_GENERATION_BOUNDARIES = {
  compare_more_less: { seedMin: 0, seedMax: 20, answerMin: 35, answerMax: 95 },
  part_whole_add_subtract: { seedMin: 0, seedMax: 20, answerMin: 35, answerMax: 95 },
  equal_groups_multiply_divide: { seedMin: 0, seedMax: 20, answerMin: 24, answerMax: 182 },
  measurement_conversion: { seedMin: 0, seedMax: 12, answerMin: 345, answerMax: 1698 },
  time_elapsed_simple: { seedMin: 0, seedMax: 20, answerMin: 1, answerMax: 120 },
  money_price_total: { seedMin: 0, seedMax: 20, answerMin: 7, answerMax: 100 },
  operation_structure_distributive: { seedMin: 0, seedMax: 20, answerMin: 96, answerMax: 900 },
  perimeter_area_rectangle: { seedMin: 0, seedMax: 12, answerMin: 32, answerMax: 374 },
  fraction_part_whole: { seedMin: 0, seedMax: 12, answerMin: 10, answerMax: 68 },
  decimal_money_measure: { seedMin: 0, seedMax: 20, answerMin: 8, answerMax: 100 },
  multi_step_total_quantity: { seedMin: 0, seedMax: 20, answerMin: 6, answerMax: 30 },
  average_total_count: { seedMin: 0, seedMax: 20, answerMin: 48, answerMax: 170 },
  ratio_rate_unit: { seedMin: 0, seedMax: 20, answerMin: 15, answerMax: 150 },
  geometry_angle_reasoning: { seedMin: 0, seedMax: 20, answerMin: 20, answerMax: 170 },
  volume_rectangular_prism: { seedMin: 0, seedMax: 20, answerMin: 24, answerMax: 2400 },
  distance_speed_time: { seedMin: 0, seedMax: 20, answerMin: 24, answerMax: 1500 },
  probability_event_decimal: { seedMin: 0, seedMax: 20, answerMin: 0.1, answerMax: 0.9 },
  coordinate_movement: { seedMin: 0, seedMax: 20, answerMin: 1, answerMax: 35 },
  percent_change: { seedMin: 0, seedMax: 20, answerMin: 170, answerMax: 558 },
  linear_equation_word_problem: { seedMin: 0, seedMax: 20, answerMin: 3, answerMax: 24 },
  data_table_chart: { seedMin: 0, seedMax: 20, answerMin: 6, answerMax: 8 },
  number_composition_place_value: { seedMin: 0, seedMax: 20, answerMin: 20, answerMax: 99 },
  unknown_part_add_subtract: { seedMin: 0, seedMax: 20, answerMin: 4, answerMax: 10 },
  fraction_add_same_denominator: { seedMin: 0, seedMax: 20, answerMin: 12, answerMax: 130 },
  decimal_multiply_unit_price: { seedMin: 0, seedMax: 20, answerMin: 7.5, answerMax: 80 },
  ratio_total_split: { seedMin: 0, seedMax: 20, answerMin: 9, answerMax: 100 },
  circle_area_application: { seedMin: 0, seedMax: 20, answerMin: 12.56, answerMax: 160 },
  square_perimeter_intro: { seedMin: 0, seedMax: 20, answerMin: 16, answerMax: 104 },
  division_remainder_grouping: { seedMin: 0, seedMax: 20, answerMin: 4, answerMax: 9 },
  fraction_subtract_same_denominator: { seedMin: 0, seedMax: 20, answerMin: 12, answerMax: 100 },
  decimal_divide_equal_share: { seedMin: 0, seedMax: 20, answerMin: 3.5, answerMax: 7.5 },
  data_range_comparison: { seedMin: 0, seedMax: 20, answerMin: 12, answerMax: 34 },
  triangle_area_application: { seedMin: 0, seedMax: 20, answerMin: 9, answerMax: 81 },
  addition_subtraction_regrouping: { seedMin: 0, seedMax: 20, answerMin: 4, answerMax: 88 },
  multiplication_division_inverse: { seedMin: 0, seedMax: 20, answerMin: 3, answerMax: 72 },
  integer_operation_order: { seedMin: 0, seedMax: 20, answerMin: 18, answerMax: 82 },
  fraction_equivalent_compare: { seedMin: 0, seedMax: 20, answerMin: 6, answerMax: 54 },
  decimal_rounding_estimation: { seedMin: 0, seedMax: 20, answerMin: 2.2, answerMax: 9.9 },
  circle_circumference_application: { seedMin: 0, seedMax: 20, answerMin: 12.56, answerMax: 100.48 },
  trapezoid_area_application: { seedMin: 0, seedMax: 20, answerMin: 18, answerMax: 133 },
  proportion_scale_application: { seedMin: 0, seedMax: 20, answerMin: 2, answerMax: 36 },
};

const FRACTION_RESPONSE_BOUNDARY = { answerMin: 0, answerMax: 1 };

const GRADE_ORDER = ["G1", "G2", "G3", "G4", "G5", "G6"];

const VARIANT_CHANGE_COUNTS = {
  original: 0,
  change_one_number: 1,
  change_two_numbers: 2,
  relationship_reframe: 0,
  question_order_variant: 0,
  context_change: 0,
  step_added_variant: 0,
  two_steps_added_variant: 0,
  reverse_question: 0,
  multi_step_extension: 0,
};

const VARIANT_CODES = {
  original: "L0",
  change_one_number: "L1",
  change_two_numbers: "L2",
  relationship_reframe: "L3",
  question_order_variant: "L4",
  context_change: "L5",
  step_added_variant: "S1",
  two_steps_added_variant: "S2",
  reverse_question: "R1",
  multi_step_extension: "M1",
};

const REVERSE_QUESTION_ANSWER_BOUNDARIES = {
  compare_more_less: { answerMin: 28, answerMax: 48 },
  part_whole_add_subtract: { answerMin: 19, answerMax: 39 },
  equal_groups_multiply_divide: { answerMin: 6, answerMax: 6 },
  money_price_total: { answerMin: 4, answerMax: 24 },
  perimeter_area_rectangle: { answerMin: 4, answerMax: 16 },
  fraction_part_whole: { answerMin: 24, answerMax: 96 },
  average_total_count: { answerMin: 12, answerMax: 32 },
  ratio_rate_unit: { answerMin: 3, answerMax: 23 },
  measurement_conversion: { answerMin: 3, answerMax: 15 },
  time_elapsed_simple: { answerMin: 480, answerMax: 900 },
  volume_rectangular_prism: { answerMin: 2, answerMax: 4 },
  distance_speed_time: { answerMin: 2, answerMax: 4 },
  square_perimeter_intro: { answerMin: 4, answerMax: 24 },
  decimal_money_measure: { answerMin: 2.4, answerMax: 3.2 },
  decimal_multiply_unit_price: { answerMin: 2.5, answerMax: 10.5 },
  triangle_area_application: { answerMin: 3, answerMax: 8 },
  multiplication_division_inverse: { answerMin: 3, answerMax: 7 },
  operation_structure_distributive: { answerMin: 12, answerMax: 32 },
  ratio_total_split: { answerMin: 15, answerMax: 115 },
  trapezoid_area_application: { answerMin: 3, answerMax: 7 },
  proportion_scale_application: { answerMin: 2, answerMax: 8 },
  addition_subtraction_regrouping: { answerMin: 17, answerMax: 29 },
  data_range_comparison: { answerMin: 20, answerMax: 40 },
  geometry_angle_reasoning: { answerMin: 40, answerMax: 120 },
  percent_change: { answerMin: 200, answerMax: 600 },
  fraction_add_same_denominator: { answerMin: 24, answerMax: 144 },
  fraction_subtract_same_denominator: { answerMin: 36, answerMax: 156 },
  decimal_divide_equal_share: { answerMin: 2, answerMax: 5 },
  fraction_equivalent_compare: { answerMin: 48, answerMax: 208 },
  coordinate_movement: { answerMin: 2, answerMax: 7 },
  number_composition_place_value: { answerMin: 2, answerMax: 8 },
  unknown_part_add_subtract: { answerMin: 8, answerMax: 28 },
  data_table_chart: { answerMin: 18, answerMax: 38 },
  multi_step_total_quantity: { answerMin: 8, answerMax: 20 },
  probability_event_decimal: { answerMin: 2, answerMax: 8 },
  division_remainder_grouping: { answerMin: 4, answerMax: 7 },
  integer_operation_order: { answerMin: 4, answerMax: 9 },
  linear_equation_word_problem: { answerMin: 10, answerMax: 30 },
  circle_area_application: { answerMin: 2, answerMax: 4 },
  decimal_rounding_estimation: { answerMin: 2.15, answerMax: 8.79 },
  circle_circumference_application: { answerMin: 2, answerMax: 4 },
};

const MULTI_STEP_EXTENSION_ANSWER_BOUNDARIES = {
  compare_more_less: { answerMin: 32, answerMax: 72 },
  part_whole_add_subtract: { answerMin: 33, answerMax: 73 },
  equal_groups_multiply_divide: { answerMin: 26, answerMax: 148 },
  money_price_total: { answerMin: 6, answerMax: 76 },
  perimeter_area_rectangle: { answerMin: 28, answerMax: 666 },
  fraction_part_whole: { answerMin: 14, answerMax: 92 },
  average_total_count: { answerMin: 51, answerMax: 133 },
  ratio_rate_unit: { answerMin: 17, answerMax: 119 },
  measurement_conversion: { answerMin: 349, answerMax: 1597 },
  time_elapsed_simple: { answerMin: 540, answerMax: 960 },
  volume_rectangular_prism: { answerMin: 38, answerMax: 453 },
  distance_speed_time: { answerMin: 28, answerMax: 212 },
  square_perimeter_intro: { answerMin: 15, answerMax: 93 },
  decimal_money_measure: { answerMin: 8.7, answerMax: 19 },
  decimal_multiply_unit_price: { answerMin: 9, answerMax: 62.6 },
  triangle_area_application: { answerMin: 7, answerMax: 60 },
  multiplication_division_inverse: { answerMin: 11, answerMax: 52 },
  operation_structure_distributive: { answerMin: 123, answerMax: 409 },
  ratio_total_split: { answerMin: 11, answerMax: 73 },
  trapezoid_area_application: { answerMin: 21, answerMax: 117 },
  proportion_scale_application: { answerMin: 3, answerMax: 25 },
  addition_subtraction_regrouping: { answerMin: 40, answerMax: 73 },
  data_range_comparison: { answerMin: 15, answerMax: 35 },
  geometry_angle_reasoning: { answerMin: 30, answerMax: 125 },
  percent_change: { answerMin: 175, answerMax: 525 },
  fraction_add_same_denominator: { answerMin: 11, answerMax: 90 },
  fraction_subtract_same_denominator: { answerMin: 16, answerMax: 97 },
  decimal_divide_equal_share: { answerMin: 3.5, answerMax: 6.5 },
  fraction_equivalent_compare: { answerMin: 8, answerMax: 53 },
  coordinate_movement: { answerMin: 7, answerMax: 20 },
  number_composition_place_value: { answerMin: 18, answerMax: 88 },
  unknown_part_add_subtract: { answerMin: 3, answerMax: 6 },
  data_table_chart: { answerMin: 8, answerMax: 10 },
  multi_step_total_quantity: { answerMin: 7, answerMax: 27 },
  probability_event_decimal: { answerMin: 0.2, answerMax: 0.5 },
  division_remainder_grouping: { answerMin: 5, answerMax: 9 },
  integer_operation_order: { answerMin: 17, answerMax: 63 },
  linear_equation_word_problem: { answerMin: 3, answerMax: 23 },
  circle_area_application: { answerMin: 22.56, answerMax: 130.48 },
  decimal_rounding_estimation: { answerMin: 3.4, answerMax: 7.7 },
  circle_circumference_application: { answerMin: 15.56, answerMax: 83.36 },
};

const STEP_ADDED_PROMPT_CUE = "先把已知量、要求量和它们的关系整理成一条算式或小表，再求答案。";
const TWO_STEPS_ADDED_PROMPT_CUE =
  "先把已知量、要求量和它们的关系整理成一条算式或小表，再写出从已知条件到答案的计算顺序，最后求答案。";
const INFORMATION_ORGANIZATION_STEP = "把已知量、要求量和它们的关系先整理成一条清楚的算式或小表。";
const CALCULATION_ORDER_STEP = "写出从已知条件到答案的计算顺序，再完成最后的计算。";

function hasOneControlledChange(variantLevel) {
  return variantLevel === "change_one_number" || variantLevel === "change_two_numbers";
}

function hasTwoControlledChanges(variantLevel) {
  return variantLevel === "change_two_numbers";
}

function hasContextChange(variantLevel) {
  return variantLevel === "context_change";
}

function hasRelationshipReframe(variantLevel) {
  return variantLevel === "relationship_reframe";
}

function hasQuestionOrderVariant(variantLevel) {
  return variantLevel === "question_order_variant";
}

function hasStepAddedVariant(variantLevel) {
  return variantLevel === "step_added_variant";
}

function hasTwoStepsAddedVariant(variantLevel) {
  return variantLevel === "two_steps_added_variant";
}

function hasReverseQuestionVariant(variantLevel) {
  return variantLevel === "reverse_question";
}

function hasMultiStepExtensionVariant(variantLevel) {
  return variantLevel === "multi_step_extension";
}

function variantControl(variantLevel, firstVariable, secondVariable) {
  const changedIndependentVariables =
    [
      "original",
      "relationship_reframe",
      "question_order_variant",
      "context_change",
      "step_added_variant",
      "two_steps_added_variant",
      "reverse_question",
      "multi_step_extension",
    ].includes(
      variantLevel,
    )
      ? []
      : variantLevel === "change_one_number"
        ? [firstVariable]
        : [firstVariable, secondVariable];

  return {
    expectedIndependentChangeCount: VARIANT_CHANGE_COUNTS[variantLevel],
    changedIndependentVariables,
    transformation: hasContextChange(variantLevel)
      ? "same_structure_new_context"
      : hasRelationshipReframe(variantLevel)
        ? "relationship_language_reframe"
        : hasQuestionOrderVariant(variantLevel)
          ? "question_before_conditions"
          : hasTwoStepsAddedVariant(variantLevel)
            ? "bounded_two_step_extension"
          : hasStepAddedVariant(variantLevel)
            ? "bounded_step_extension"
            : hasReverseQuestionVariant(variantLevel)
              ? "bounded_inverse_question"
              : hasMultiStepExtensionVariant(variantLevel)
                ? "bounded_multi_step_question"
            : "controlled_number_change",
  };
}

function normalizeSeed(familyId, seed) {
  const boundary = FAMILY_GENERATION_BOUNDARIES[familyId];
  if (!boundary) return Math.max(0, Math.trunc(seed));
  const span = boundary.seedMax - boundary.seedMin + 1;
  const numericSeed = Number.isFinite(Number(seed)) ? Math.trunc(Number(seed)) : 0;
  return boundary.seedMin + ((numericSeed % span) + span) % span;
}

function normalizeInstructionalGrade(family, requestedGrade) {
  const requested = String(requestedGrade || "").toUpperCase();
  if (family?.gradeBands?.includes(requested)) return requested;
  return family?.gradeBands?.at(-1) || "G6";
}

function gradeAwareSeed({ family, normalizedSeed, instructionalGrade }) {
  const boundary = FAMILY_GENERATION_BOUNDARIES[family.id];
  if (!boundary) return normalizedSeed;

  const gradeBands = (family.gradeBands || []).filter((grade) => GRADE_ORDER.includes(grade));
  const gradeIndex = Math.max(0, gradeBands.indexOf(instructionalGrade));
  const progression = (gradeIndex + 1) / Math.max(1, gradeBands.length);
  const gradeSeedMax = boundary.seedMin + Math.max(0, Math.round((boundary.seedMax - boundary.seedMin) * progression));
  const gradeSpan = gradeSeedMax - boundary.seedMin + 1;

  return boundary.seedMin + ((normalizedSeed - boundary.seedMin) % gradeSpan + gradeSpan) % gradeSpan;
}

const DOMAIN_COGNITIVE_DEMANDS = {
  number_and_operation: ["read_context", "select_operation", "compute_clean_integer"],
  quantity_relationship: ["read_context", "identify_relation", "compute_clean_integer"],
  equation_and_algebra_seed: ["read_context", "model_relationship", "solve_and_check"],
  fraction_decimal_percent: ["read_context", "represent_part_whole", "compute_clean_integer"],
  measurement_and_units: ["read_context", "convert_units", "compute_clean_integer"],
  geometry_and_space: ["interpret_visual_model", "select_formula", "compute_and_label_unit"],
  statistics_and_probability: ["read_data", "compare_or_aggregate", "explain_result"],
  comprehensive_application: ["read_context", "model_relationship", "compute_and_check"],
};

const HELP_PHASES = [
  { id: "read_translate", label: "读题翻译", source: "context_template" },
  { id: "relationship", label: "找关系", source: "answer_rule" },
  { id: "calculation", label: "计算", source: "restricted_rule_evaluator" },
  { id: "check", label: "检查", source: "answer_match" },
];

const GUIDED_EXTENSION_PHASES = {
  organize: { id: "organize", label: "整理信息", source: "structured_step" },
  plan: { id: "plan", label: "规划步骤", source: "structured_step" },
};

function readTranslationPrompt(family) {
  if (family.domain === "geometry_and_space") return "先标出图形、已知的边或角，以及题目要求的量。";
  if (family.domain === "statistics_and_probability") return "先读清数据、总数或比较对象，再说出题目要求什么。";
  if (family.domain === "measurement_and_units") return "先找出数量和单位，把题目要求的单位单独圈出来。";
  return "先找出已知量、未知量和单位，用“已知什么，要求什么”说一遍。";
}

function relationshipPrompt(family) {
  if (family.domain === "geometry_and_space") return "不要急着算，先用图形关系或公式把已知量和未知量连起来。";
  if (family.domain === "statistics_and_probability") return "不要急着算，先确认是比较、合计、平均还是有利结果与总结果的关系。";
  if (family.domain === "measurement_and_units") return "先确认数量之间的单位关系，再决定怎样换算或计算。";
  return "不要急着算，先找总量、部分、相等、对应或倍数关系。";
}

function guidedPhasesForVariant(variantLevel) {
  const extensionPhases = hasTwoStepsAddedVariant(variantLevel)
    ? [GUIDED_EXTENSION_PHASES.organize, GUIDED_EXTENSION_PHASES.plan]
    : hasStepAddedVariant(variantLevel)
      ? [GUIDED_EXTENSION_PHASES.organize]
      : [];
  return [...HELP_PHASES.slice(0, 2), ...extensionPhases, ...HELP_PHASES.slice(2)];
}

function createSupportEvidenceBinding(phase, index, indexField) {
  return {
    [indexField]: index + 1,
    phase: phase.id,
    source: phase.source,
    dependsOn: index === 0 ? [] : [index],
  };
}

function hasExpectedSupportEvidenceBinding(binding, phase, index, indexField) {
  const expected = createSupportEvidenceBinding(phase, index, indexField);
  return (
    binding?.[indexField] === expected[indexField] &&
    binding?.phase === expected.phase &&
    binding?.source === expected.source &&
    Array.isArray(binding?.dependsOn) &&
    binding.dependsOn.length === expected.dependsOn.length &&
    binding.dependsOn.every((value, dependencyIndex) => value === expected.dependsOn[dependencyIndex])
  );
}

function phasesMatch(actualPhases, expectedPhases, field) {
  return (
    Array.isArray(actualPhases) &&
    actualPhases.length === expectedPhases.length &&
    expectedPhases.every((phase, index) => actualPhases[index] === phase[field])
  );
}

function createSupportStructure({ variantLevel }) {
  const guidedPhases = guidedPhasesForVariant(variantLevel);
  return {
    learningPath: guidedPhases.map((phase) => phase.label),
    hintPhases: HELP_PHASES.map((phase) => phase.id),
    guidedPhases: guidedPhases.map((phase) => phase.id),
    hintBindings: HELP_PHASES.map((phase, index) => createSupportEvidenceBinding(phase, index, "level")),
    guidedBindings: guidedPhases.map((phase, index) => createSupportEvidenceBinding(phase, index, "stepIndex")),
  };
}

function createHintLayers({ family, generated }) {
  const hints = generated.hints || [];
  return [
    readTranslationPrompt(family),
    `${relationshipPrompt(family)} ${hints[0] || "把题意写成一个清楚的数量关系。"}`,
    hints[1] || "按照刚才找到的关系，写式并一步一步计算。",
    hints.at(-1) || "算完后把结果放回题目检查单位和关系。",
  ];
}

function createGuidedSteps({ family, generated, variantLevel, answerInput = createMathAnswerInput() }) {
  const steps = generated.steps || [];
  const readingStep = steps[0] || "读清题目里的已知量和问题";
  const relationshipStep = steps[1] || relationshipPrompt(family);
  const calculationStep = steps[Math.max(2, steps.length - 2)] || "按照数量关系计算";
  const checkStep = steps.at(-1) || "把结果代回题目检查";
  const guidedSteps = [
    {
      stepId: `${family.id}-guided-read-translate`,
      phase: "read_translate",
      prompt: `读题翻译：${readingStep}`,
      expected: readTranslationPrompt(family),
      responseType: "short_reasoning",
    },
    {
      stepId: `${family.id}-guided-relationship`,
      phase: "relationship",
      prompt: `找关系：${relationshipStep}`,
      expected: relationshipPrompt(family),
      responseType: "short_reasoning",
    },
  ];

  if (hasStepAddedVariant(variantLevel) || hasTwoStepsAddedVariant(variantLevel)) {
    guidedSteps.push({
      stepId: `${family.id}-guided-organize`,
      phase: "organize",
      prompt: `整理信息：${INFORMATION_ORGANIZATION_STEP}`,
      expected: INFORMATION_ORGANIZATION_STEP,
      responseType: "short_reasoning",
    });
  }

  if (hasTwoStepsAddedVariant(variantLevel)) {
    guidedSteps.push({
      stepId: `${family.id}-guided-plan`,
      phase: "plan",
      prompt: `规划步骤：${CALCULATION_ORDER_STEP}`,
      expected: CALCULATION_ORDER_STEP,
      responseType: "short_reasoning",
    });
  }

  guidedSteps.push(
    {
      stepId: `${family.id}-guided-calculation`,
      phase: "calculation",
      prompt: `计算：${calculationStep}`,
      expected: "根据刚才的关系写式并计算。",
      responseType: "short_reasoning",
    },
    {
      stepId: `${family.id}-guided-check`,
      phase: "check",
      prompt: `检查：${checkStep}`,
      expected: `把答案 ${formatMathAnswerValue({ answerInput, value: generated.answer })} 代回题目，确认单位和关系。`,
      responseType: "final_answer",
      answerInput,
    },
  );
  return guidedSteps;
}

function questionFirstPrompt(prompt) {
  const text = String(prompt || "").trim();
  const finalSentenceIndex = Math.max(text.lastIndexOf("。"), text.lastIndexOf("，"));
  if (finalSentenceIndex > 0 && finalSentenceIndex < text.length - 1) {
    const conditions = text.slice(0, finalSentenceIndex).trim();
    const question = text.slice(finalSentenceIndex + 1).trim();
    if (question) return `问题：${question} 条件：${conditions}。`;
  }
  return `问题：请根据下列条件求题目所问的量。条件：${text}`;
}

function applyStructuralVariant({ generated, variantLevel }) {
  const steps = [...(generated.steps || [])];
  const structuralVariant = {
    id: variantLevel,
    applied: false,
    answerInvariant: !(hasReverseQuestionVariant(variantLevel) || hasMultiStepExtensionVariant(variantLevel)),
  };

  if (hasReverseQuestionVariant(variantLevel)) {
    return {
      ...generated,
      structuralVariant: {
        ...structuralVariant,
        applied: Boolean(generated.reverseQuestionApplied),
        effect: generated.reverseQuestionApplied ? "bounded_inverse_question" : "reverse_question_not_available",
      },
    };
  }

  if (hasMultiStepExtensionVariant(variantLevel)) {
    return {
      ...generated,
      structuralVariant: {
        ...structuralVariant,
        applied: Boolean(generated.multiStepExtensionApplied),
        effect: generated.multiStepExtensionApplied ? "bounded_multi_step_question" : "multi_step_extension_not_available",
      },
    };
  }

  if (hasRelationshipReframe(variantLevel)) {
    return {
      ...generated,
      prompt: generated.relationshipReframed
        ? generated.prompt
        : `${generated.prompt} 先在心里说清题目中的数量关系，再写出答案。`,
      structuralVariant: {
        ...structuralVariant,
        applied: true,
        effect: generated.relationshipReframed ? "relation_wording_reversed" : "relation_focus_prompt",
      },
    };
  }

  if (hasQuestionOrderVariant(variantLevel)) {
    return {
      ...generated,
      prompt: questionFirstPrompt(generated.prompt),
      structuralVariant: {
        ...structuralVariant,
        applied: true,
        effect: "question_before_conditions",
      },
    };
  }

  if (hasStepAddedVariant(variantLevel) || hasTwoStepsAddedVariant(variantLevel)) {
    const insertionIndex = Math.min(2, steps.length);
    const addedSteps = hasTwoStepsAddedVariant(variantLevel)
      ? [INFORMATION_ORGANIZATION_STEP, CALCULATION_ORDER_STEP]
      : [INFORMATION_ORGANIZATION_STEP];
    const extendedSteps =
      steps.length + addedSteps.length <= 7
        ? [
            ...steps.slice(0, insertionIndex),
            ...addedSteps,
            ...steps.slice(insertionIndex),
          ]
        : steps;
    return {
      ...generated,
      prompt: `${generated.prompt} ${hasTwoStepsAddedVariant(variantLevel) ? TWO_STEPS_ADDED_PROMPT_CUE : STEP_ADDED_PROMPT_CUE}`,
      steps: extendedSteps,
      structuralVariant: {
        ...structuralVariant,
        applied: extendedSteps.length > steps.length,
        effect: hasTwoStepsAddedVariant(variantLevel)
          ? "bounded_two_step_organization_extension"
          : "bounded_intermediate_organization_step",
      },
    };
  }

  return {
    ...generated,
    structuralVariant: {
      ...structuralVariant,
      effect:
        variantLevel === "context_change"
          ? "same_structure_new_context"
          : variantLevel === "change_one_number" || variantLevel === "change_two_numbers"
            ? "controlled_number_change"
            : "canonical_form",
    },
  };
}

const HIGHER_REASONING_FAMILIES = new Set([
  "perimeter_area_rectangle",
  "ratio_rate_unit",
  "operation_structure_distributive",
  "multi_step_total_quantity",
  "geometry_angle_reasoning",
  "volume_rectangular_prism",
  "distance_speed_time",
  "probability_event_decimal",
  "coordinate_movement",
  "percent_change",
  "linear_equation_word_problem",
  "fraction_add_same_denominator",
  "decimal_multiply_unit_price",
  "ratio_total_split",
  "circle_area_application",
  "division_remainder_grouping",
  "fraction_subtract_same_denominator",
  "decimal_divide_equal_share",
  "data_range_comparison",
  "triangle_area_application",
  "integer_operation_order",
  "fraction_equivalent_compare",
  "decimal_rounding_estimation",
  "circle_circumference_application",
  "trapezoid_area_application",
  "proportion_scale_application",
]);

function numberLiterals(value) {
  return (String(value || "").match(/-?\d+(?:\.\d+)?/g) || [])
    .map((token) => Number(token))
    .filter((number) => Number.isFinite(number));
}

function uniqueKeys(values) {
  return [...new Set(values.filter(Boolean))];
}

function operationFeatureKeys(answerRule) {
  const rule = String(answerRule || "");
  return [
    rule.includes("+") ? "operation:addition" : null,
    rule.includes("-") ? "operation:subtraction" : null,
    rule.includes("*") ? "operation:multiplication" : null,
    rule.includes("/") ? "operation:division" : null,
  ].filter(Boolean);
}

function numericFeatureKeys(generated) {
  const values = numberLiterals(generated?.answerRule);
  const usableValues = values.length ? values : numberLiterals(generated?.answer);
  const digitText = usableValues.map((value) => String(Math.abs(value)).replace(/\D/g, "")).join("");
  const maxMagnitude = Math.max(0, ...usableValues.map((value) => Math.abs(value)));
  const decimal = usableValues.some((value) => !Number.isInteger(value));
  const keys = [
    decimal ? "number:decimal_value" : null,
    usableValues.some((value) => value === 0 || String(Math.abs(value)).includes("0")) ? "number:contains_zero" : null,
    maxMagnitude >= 1000 ? "number:four_digit_or_more" : null,
    maxMagnitude >= 100 && maxMagnitude < 1000 ? "number:three_digit" : null,
    maxMagnitude >= 10 && maxMagnitude < 100 ? "number:two_digit" : null,
    maxMagnitude > 0 && maxMagnitude < 10 ? "number:single_digit" : null,
  ];

  for (let digit = 0; digit <= 9; digit += 1) {
    if (digitText.includes(String(digit))) keys.push(`number:digit_${digit}`);
  }
  return uniqueKeys(keys);
}

function structuralFeatureKeys(family, generated) {
  const abilityTags = new Set(family.abilityTags || []);
  const domainKey = `domain:${family.domain}`;
  const representation =
    family.domain === "geometry_and_space"
      ? "representation:spatial"
      : family.domain === "statistics_and_probability"
        ? "representation:data"
        : family.domain === "fraction_decimal_percent"
          ? "representation:part_whole"
          : null;
  return uniqueKeys([
    `family:${family.id}`,
    domainKey,
    abilityTags.has("handle_units") ? "reasoning:unit_handling" : null,
    abilityTags.has("draw_or_use_visual_model") ? "representation:visual_model" : null,
    abilityTags.has("translate_to_math_language") ? "reasoning:math_translation" : null,
    abilityTags.has("build_equation_or_relation") ? "reasoning:relationship_model" : null,
    abilityTags.has("compute_stably") ? "reasoning:calculation" : null,
    (generated?.steps || []).length >= 4 ? "load:multi_step" : null,
    representation,
  ]);
}

function createQuestionFeatureSignature({ family, generated, variantLevel }) {
  const structuralKeys = structuralFeatureKeys(family, generated);
  const operationKeys = operationFeatureKeys(generated?.answerRule);
  const numericKeys = numericFeatureKeys(generated);
  return {
    version: "math_feature_signature_v1",
    matchingKeys: uniqueKeys([
      ...structuralKeys,
      ...operationKeys,
      ...numericKeys,
      `variant:${variantLevel}`,
    ]),
    structuralKeys,
    operationKeys,
    numericKeys,
  };
}

function createItemTags({
  aiVersion,
  family,
  generated,
  applicationContext,
  normalizedSeed,
  seed,
  instructionalGrade,
  variantLevel,
  solutionStrategies,
  answerInput,
}) {
  const graphBinding = getMathQuestionFamilyGraphBinding(family.id);
  const gradeBands = family.gradeBands.map((grade) => `CN_SH_${grade}`);
  const highestGrade = family.gradeBands.at(-1) || "G1";
  const difficultyLevel = HIGHER_REASONING_FAMILIES.has(family.id)
    ? "L2_foundational_reasoning"
    : "L1_contextual_foundation";
  const estimatedAssessmentSeconds = HIGHER_REASONING_FAMILIES.has(family.id) ? 100 : 70;
  const estimatedPracticeSeconds = HIGHER_REASONING_FAMILIES.has(family.id) ? 150 : 105;
  const variantCode = VARIANT_CODES[variantLevel] || "L0";

  return {
    systemLevelTags: {
      educationSystems: ["CN_Shanghai", "CN_National"],
      gradeBands,
      instructionalGrade: `CN_SH_${instructionalGrade}`,
      curriculumStandards: [`CN.Shanghai.Primary.${highestGrade}.${family.domain}`],
      targetLevel: `${highestGrade.toLowerCase()}_core`,
      readinessLevel: `primary_${family.domain}_entry`,
    },
    difficultyTags: {
      difficultyLevel,
      instructionalGrade,
      cognitiveDemand: DOMAIN_COGNITIVE_DEMANDS[family.domain] || ["read_context", "model_relationship", "compute"],
      dokLevel: HIGHER_REASONING_FAMILIES.has(family.id) ? 2 : 1,
      estimatedTimeSeconds: { assessment: estimatedAssessmentSeconds, practice: estimatedPracticeSeconds },
    },
    knowledgeTags: {
      knowledgeClusterId: family.domain,
      knowledgePointIds: [family.id, ...family.atlasNodeIds],
      prerequisiteIds: family.prerequisiteIds,
      knowledgeGraphNodeIds: [graphBinding?.familyNodeId, ...(graphBinding?.conceptNodeIds || [])].filter(Boolean),
    },
    knowledgeGraphTags: {
      graphId: mathKnowledgeGraph.id,
      familyNodeId: graphBinding?.familyNodeId || null,
      conceptNodeIds: graphBinding?.conceptNodeIds || [],
      prerequisiteNodeIds: graphBinding?.prerequisiteNodeIds || [],
    },
    atlasTags: {
      atlasEntryIds: family.atlasNodeIds.map((id) => `atlas-${id}`),
      commonMisconceptionIds: [`${family.id}_relation_error`, `${family.id}_operation_or_unit_error`],
    },
    abilityTags: {
      abilityDimensions: family.abilityTags,
      evidenceTargets: family.abilityTags.map((tag) => `can_${tag}`),
    },
    practiceTags: {
      runtimeModes: ["initial_assessment", "practice", "stage_test", "review"],
      supportAllowedByMode: {
        initial_assessment: false,
        practice: true,
        stage_test: false,
        review: true,
      },
      variantLevel,
      variantCode,
      repeatRole:
        variantLevel === "original"
          ? "source_or_retry"
          : variantLevel === "reverse_question"
            ? "bounded_inverse_transfer"
          : variantLevel === "multi_step_extension"
            ? "bounded_multi_step_transfer"
          : variantLevel === "two_steps_added_variant"
            ? "bounded_two_step_extension"
            : variantLevel === "step_added_variant"
            ? "bounded_step_extension"
            : "controlled_transfer",
    },
    generationTags: {
      logicUnitId: family.id,
      seedId: `${family.id}-seed-${normalizedSeed}`,
      requestedSeed: seed,
      normalizedSeed,
      instructionalGrade,
      variableProfileId: `${family.id}-${variantLevel}-${normalizedSeed}`,
      validationRuleIds: [
        "answer_in_generation_boundary",
        "bounded_model_verified",
        "answer_rule_evaluated",
        "family_semantics_verified",
        "application_context_verified",
        "solution_derivation_verified",
        "support_evidence_bindings_verified",
        "variant_control_verified",
        "metadata_complete",
      ],
      sourceTrack: aiVersion === "full_ai_ready" ? "ai_candidate_validated" : "bounded_rule_generator",
    },
    solutionTags: {
      strategyIds: solutionStrategies.map((strategy) => strategy.id),
      strategyTemplateVersion: MATH_SOLUTION_STRATEGY_VERSION,
      stepTemplateId: `steps-${family.id}-v1`,
      hintTemplateId: `hints-${family.id}-v1`,
      guidedModeId: `guided-${family.id}-v1`,
      learningPhases: guidedPhasesForVariant(variantLevel).map((phase) => phase.id),
    },
    evidenceTags: {
      scoringRuleId: `score-${family.id}-${answerInput.kind}-v1`,
      observableBehaviors: ["answer_correctness", "response_time", "answer_revision", "hint_depth", "guided_step_use"],
      responseFormat: answerInput.kind,
      questionFeatureSignatureVersion: "math_feature_signature_v1",
    },
    qualityTags: {
      reviewStatus: "draft",
      aiGenerated: aiVersion === "full_ai_ready",
      humanVerified: false,
      version: "2026-07-13",
      contextTemplateId: generated.contextTemplateId,
      applicationFraming: applicationContext?.framing || null,
      applicationContextVersion: applicationContext?.version || null,
      applicationScenarioCueId: applicationContext?.scenarioCue?.id || null,
    },
  };
}

const REQUIRED_ITEM_TAG_GROUPS = [
  "systemLevelTags",
  "difficultyTags",
  "knowledgeTags",
  "knowledgeGraphTags",
  "atlasTags",
  "abilityTags",
  "practiceTags",
  "generationTags",
  "solutionTags",
  "evidenceTags",
  "qualityTags",
];

const FAMILY_GENERATORS = {
  compare_more_less: ({ seed, variantLevel }) => {
    const base = 28 + seed + (hasTwoControlledChanges(variantLevel) ? 2 : 0);
    const difference = 7 + seed + (hasOneControlledChange(variantLevel) ? 3 : 0);
    const answer = base + difference;
    const context = chooseContext(
      hasRelationshipReframe(variantLevel)
        ? [
            { id: "garden-flowers-reframed", render: ({ base, difference }) => `花坛里有 ${base} 朵黄花，黄花比红花少 ${difference} 朵。红花有多少朵？` },
            { id: "sticker-collection-reframed", render: ({ base, difference }) => `小雅有 ${base} 张贴纸，小雅比小林少 ${difference} 张。小林有多少张贴纸？` },
            { id: "library-books-reframed", render: ({ base, difference }) => `班级图书角有 ${base} 本故事书，故事书比科普书少 ${difference} 本。科普书有多少本？` },
          ]
        : [
            { id: "garden-flowers", render: ({ base, difference }) => `花坛里有 ${base} 朵黄花，红花比黄花多 ${difference} 朵。红花有多少朵？` },
            { id: "sticker-collection", render: ({ base, difference }) => `小雅有 ${base} 张贴纸，小林比小雅多 ${difference} 张。小林有多少张贴纸？` },
            { id: "library-books", render: ({ base, difference }) => `班级图书角有 ${base} 本故事书，科普书比故事书多 ${difference} 本。科普书有多少本？` },
          ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { base, difference },
    );
    return {
      ...context,
      answer,
      answerRule: `${base} + ${difference}`,
      variantControl: variantControl(variantLevel, "difference", "base"),
      relationshipReframed: hasRelationshipReframe(variantLevel),
      steps: hasRelationshipReframe(variantLevel)
        ? ["读懂谁比谁少", "找到已知的较少一方", "用加法求较多的一方", "检查单位"]
        : ["读懂谁比谁多", "找到基准数量", "用加法求较多的一方", "检查单位"],
      hints: hasRelationshipReframe(variantLevel)
        ? ["先找已知的黄花、小雅或故事书数量。", "“少”说明要求的另一方要在已知数量上加差值。", `${base} + ${difference} = ${answer}`]
        : ["先找“小雅有多少”。", "“多”通常表示在基准上加差值。", `${base} + ${difference} = ${answer}`],
    };
  },
  part_whole_add_subtract: ({ seed, variantLevel }) => {
    const partA = 16 + seed + (hasTwoControlledChanges(variantLevel) ? 2 : 0);
    const partB = 19 + seed + (hasOneControlledChange(variantLevel) ? 3 : 0);
    const answer = partA + partB;
    const context = chooseContext(
      [
        { id: "class-library", render: ({ partA, partB }) => `图书角有故事书 ${partA} 本，科普书 ${partB} 本。一共有多少本书？` },
        { id: "sports-day", render: ({ partA, partB }) => `运动会上，${partA} 名同学参加跳绳，${partB} 名同学参加跑步。一共有多少名同学参加这两项？` },
        { id: "fruit-basket", render: ({ partA, partB }) => `果篮里有 ${partA} 个苹果和 ${partB} 个梨。果篮里一共有多少个水果？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { partA, partB },
    );
    return {
      ...context,
      answer,
      answerRule: `${partA} + ${partB}`,
      variantControl: variantControl(variantLevel, "part_b", "part_a"),
      steps: ["区分两个部分", "确认题目问整体", "把两个部分相加", "带单位回答"],
      hints: ["题目问“一共”，说明要求整体。", "整体 = 部分一 + 部分二。", `${partA} + ${partB} = ${answer}`],
    };
  },
  equal_groups_multiply_divide: ({ seed, variantLevel }) => {
    const unit = 4 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const groups = 6 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = unit * groups;
    const context = chooseContext(
      [
        { id: "pencil-boxes", render: ({ unit, groups }) => `每盒有 ${unit} 支铅笔，${groups} 盒一共有多少支？` },
        { id: "seat-rows", render: ({ unit, groups }) => `礼堂每排坐 ${unit} 名同学，一共有 ${groups} 排。能坐多少名同学？` },
        { id: "flower-bundles", render: ({ unit, groups }) => `花店把鲜花每 ${unit} 枝扎成一束，扎了 ${groups} 束。一共有多少枝花？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { unit, groups },
    );
    return {
      ...context,
      answer,
      answerRule: `${unit} * ${groups}`,
      variantControl: variantControl(variantLevel, "unit", "groups"),
      steps: ["找到每组数量", "找到组数", "用乘法表示等量组", "检查总数"],
      hints: ["每盒就是每组数量。", "6 盒表示 6 个相同的组。", `${unit} × ${groups} = ${answer}`],
    };
  },
  measurement_conversion: ({ seed, variantLevel }) => {
    const meters = 3 + seed + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const centimeters = 45 + seed * 4 + (hasOneControlledChange(variantLevel) ? 5 : 0);
    const answer = meters * 100 + centimeters;
    const context = chooseContext(
      [
        { id: "ribbon-length", render: ({ meters, centimeters }) => `一根彩带长 ${meters} 米 ${centimeters} 厘米，合起来是多少厘米？` },
        { id: "running-track", render: ({ meters, centimeters }) => `小路长 ${meters} 米 ${centimeters} 厘米，合起来是多少厘米？` },
        { id: "jump-rope", render: ({ meters, centimeters }) => `一根跳绳长 ${meters} 米 ${centimeters} 厘米，合起来是多少厘米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { meters, centimeters },
    );
    return {
      ...context,
      answer,
      answerRule: `${meters} * 100 + ${centimeters}`,
      variantControl: variantControl(variantLevel, "centimeters", "meters"),
      steps: ["读出两个单位", "把米换成厘米", "把同单位数量相加", "检查单位"],
      hints: ["先把所有数量变成同一种单位。", "1 米 = 100 厘米。", `${meters} 米 ${centimeters} 厘米 = ${answer} 厘米。`],
    };
  },
  perimeter_area_rectangle: ({ seed, variantLevel }) => {
    const length = 8 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const width = 4 + seed + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = length * width;
    const context = chooseContext(
      [
        { id: "school-garden", render: ({ length, width }) => `学校花坛是长方形，长 ${length} 米，宽 ${width} 米。这个花坛的面积是多少平方米？` },
        { id: "photo-paper", render: ({ length, width }) => `一张长方形彩纸长 ${length} 厘米，宽 ${width} 厘米。它的面积是多少平方厘米？` },
        { id: "vegetable-plot", render: ({ length, width }) => `一块长方形菜地长 ${length} 米，宽 ${width} 米。菜地面积是多少平方米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { length, width },
    );
    return {
      ...context,
      answer,
      answerRule: `${length} * ${width}`,
      variantControl: variantControl(variantLevel, "length", "width"),
      steps: ["判断图形是长方形", "找到长和宽", "用长乘宽求面积", "带上面积单位"],
      hints: ["面积不是周长，要看铺满多少个单位方格。", "长方形面积 = 长 × 宽。", `${length} × ${width} = ${answer}。`],
    };
  },
  fraction_part_whole: ({ seed, variantLevel }) => {
    const whole = 24 + seed * 6 + (hasOneControlledChange(variantLevel) ? 6 : 0);
    const denominator = 3;
    const numerator = hasTwoControlledChanges(variantLevel) ? 1 : 2;
    const answer = (whole / denominator) * numerator;
    const context = chooseContext(
      [
        { id: "candy-box", render: ({ whole, numerator, denominator }) => `一盒糖有 ${whole} 颗，小安吃了其中的 ${numerator}/${denominator}。小安吃了多少颗？` },
        { id: "book-shelf", render: ({ whole, numerator, denominator }) => `书架上有 ${whole} 本书，小雨读完了其中的 ${numerator}/${denominator}。小雨读完多少本？` },
        { id: "paper-stars", render: ({ whole, numerator, denominator }) => `手工课折了 ${whole} 颗纸星星，其中的 ${numerator}/${denominator} 是蓝色的。蓝色星星有多少颗？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { whole, numerator, denominator },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} / ${denominator} * ${numerator}`,
      variantControl: variantControl(variantLevel, "whole", "numerator"),
      steps: ["确认整体数量", "读懂分数表示几份中的几份", "先求一份", "再求需要的份数"],
      hints: ["分母表示平均分成几份。", "先用整体除以分母求一份。", `${whole} ÷ ${denominator} × ${numerator} = ${answer}。`],
    };
  },
  average_total_count: ({ seed, variantLevel }) => {
    const count = 4 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const average = 12 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const answer = average * count;
    const context = chooseContext(
      [
        { id: "math-practice", render: ({ average, count }) => `${count} 次数学小练习平均每次做对 ${average} 题，一共做对多少题？` },
        { id: "reading-pages", render: ({ average, count }) => `${count} 天里，小明平均每天读 ${average} 页书，一共读了多少页？` },
        { id: "tree-planting", render: ({ average, count }) => `植树活动连续 ${count} 天，平均每天种 ${average} 棵树。一共种了多少棵？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { average, count },
    );
    return {
      ...context,
      answer,
      answerRule: `${average} * ${count}`,
      variantControl: variantControl(variantLevel, "average", "count"),
      steps: ["读懂平均数", "找到次数", "用平均数乘次数求总数", "检查是否符合题意"],
      hints: ["平均每次做对的题数相同地看。", "总数 = 平均数 × 个数。", `${average} × ${count} = ${answer}。`],
    };
  },
  ratio_rate_unit: ({ seed, variantLevel }) => {
    const unit = 3 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const ratioA = 2;
    const ratioB = 5 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = ratioB * unit;
    const context = chooseContext(
      [
        { id: "art-club", render: ({ ratioA, ratioB, unit }) => `美术小组男生和女生人数的比是 ${ratioA}:${ratioB}，如果 1 份是 ${unit} 人，女生有多少人？` },
        { id: "juice-mix", render: ({ ratioA, ratioB, unit }) => `果汁中橙汁和苹果汁的份数比是 ${ratioA}:${ratioB}，如果 1 份是 ${unit} 杯，苹果汁有多少杯？` },
        { id: "team-balls", render: ({ ratioA, ratioB, unit }) => `器材室里篮球和足球的数量比是 ${ratioA}:${ratioB}，如果 1 份是 ${unit} 个，足球有多少个？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { ratioA, ratioB, unit },
    );
    return {
      ...context,
      answer,
      answerRule: `${ratioB} * ${unit}`,
      variantControl: variantControl(variantLevel, "unit", "ratio_b"),
      steps: ["读懂比的份数", "确定要求哪一部分", "用对应份数乘每份人数", "检查份数和单位"],
      hints: ["比表示份数关系，不是直接的人数。", "女生对应 5 份。", `${ratioB} × ${unit} = ${answer}。`],
    };
  },
  percent_change: ({ seed, variantLevel }) => {
    const base = 200 + seed * 20 + (hasOneControlledChange(variantLevel) ? 20 : 0);
    const rate = hasTwoControlledChanges(variantLevel) ? 10 : 15;
    const payablePercent = 100 - rate;
    const answer = base * (1 - rate / 100);
    const context = chooseContext(
      [
        { id: "jacket-discount", render: ({ base, payablePercent }) => `一件外套原价 ${base} 元，按原价的 ${payablePercent}% 出售，售价是多少元？` },
        { id: "book-fair", render: ({ base, payablePercent }) => `图书节一本套装原价 ${base} 元，按原价的 ${payablePercent}% 出售，现价是多少元？` },
        { id: "museum-ticket", render: ({ base, payablePercent }) => `科技馆家庭票原价 ${base} 元，优惠到原价的 ${payablePercent}%，现在要付多少元？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { base, rate, payablePercent },
    );
    return {
      ...context,
      answer,
      answerRule: `${base} * ${payablePercent}%`,
      variantControl: variantControl(variantLevel, "base", "discount_rate"),
      steps: ["把折扣翻译成百分数", "确认求折后价格", "用原价乘折扣率", "检查价格是否低于原价"],
      hints: [`原价的 ${payablePercent}% 就是每 100 份取 ${payablePercent} 份。`, `售价 = 原价 × ${payablePercent}%。`, `${base} × ${payablePercent}% = ${answer}`],
    };
  },
  linear_equation_word_problem: ({ seed, variantLevel }) => {
    const pencil = 3 + seed + (variantLevel === "change_one_number" ? 1 : 0);
    const difference = 9;
    const count = hasTwoControlledChanges(variantLevel) ? 4 : 3;
    const total = pencil * count + pencil + difference;
    const context = chooseContext(
      [
        { id: "pen-and-pencil", render: ({ count, total, difference }) => `一支钢笔和 ${count} 支铅笔一共 ${total} 元。钢笔比一支铅笔贵 ${difference} 元。一支铅笔多少钱？` },
        { id: "adult-child-tickets", render: ({ count, total, difference }) => `1 张成人票和 ${count} 张儿童票一共 ${total} 元。成人票比儿童票贵 ${difference} 元。1 张儿童票多少钱？` },
        { id: "notebook-and-eraser", render: ({ count, total, difference }) => `1 本笔记本和 ${count} 块橡皮一共 ${total} 元。笔记本比 1 块橡皮贵 ${difference} 元。1 块橡皮多少钱？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { count, total, difference },
    );
    const labelsByContext = {
      "pen-and-pencil": { unknown: "一支铅笔", related: "钢笔" },
      "adult-child-tickets": { unknown: "一张儿童票", related: "成人票" },
      "notebook-and-eraser": { unknown: "一块橡皮", related: "笔记本" },
    };
    const labels = labelsByContext[context.contextTemplateId] || labelsByContext["pen-and-pencil"];
    return {
      ...context,
      answer: pencil,
      answerRule: `x + ${difference} + ${count}x = ${total}`,
      variantControl: variantControl(variantLevel, "total", "count"),
      steps: [
        "把问题翻译成数学语言",
        `设${labels.unknown}为 x`,
        `用 x + ${difference} 表示${labels.related}`,
        "列出总价相等关系",
        "解方程并检查",
      ],
      hints: [
        "先问：未知数是什么？",
        `${labels.related}的价格可以写成 x + ${difference}。`,
        `方程是 x + ${difference} + ${count}x = ${total}。`,
      ],
    };
  },
  data_table_chart: ({ seed, variantLevel }) => {
    const monday = 18 + seed + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const tuesday = 24 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = tuesday - monday;
    const context = chooseContext(
      [
        { id: "library-table", render: ({ monday, tuesday }) => `阅读统计表：周一借书 ${monday} 本，周二借书 ${tuesday} 本。周二比周一多借多少本？` },
        { id: "recycling-table", render: ({ monday, tuesday }) => `回收统计表：周一收集 ${monday} 个瓶子，周二收集 ${tuesday} 个。周二比周一多收集多少个？` },
        { id: "sports-score-table", render: ({ monday, tuesday }) => `运动积分表：周一得到 ${monday} 分，周二得到 ${tuesday} 分。周二比周一多多少分？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { monday, tuesday },
    );
    return {
      ...context,
      answer,
      answerRule: `${tuesday} - ${monday}`,
      variantControl: variantControl(variantLevel, "tuesday", "monday"),
      steps: ["找到表中对应数据", "确认比较方向", "用较大数减较小数", "回到题目回答"],
      hints: ["先在表里找周一和周二。", "“多多少”通常用差。", `${tuesday} - ${monday} = ${answer}。`],
    };
  },
  time_elapsed_simple: ({ seed, variantLevel, instructionalGrade }) => {
    const wholeHourOnly = instructionalGrade === "G1";
    const startHour = 7 + (seed % 4) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const duration = wholeHourOnly
      ? 1 + ((seed + (hasOneControlledChange(variantLevel) ? 1 : 0)) % 3)
      : 30 + ((seed + (hasOneControlledChange(variantLevel) ? 1 : 0)) % 3) * 15;
    const startMinute = wholeHourOnly ? 0 : seed % 2 ? 15 : 30;
    const endMinutes = startHour * 60 + startMinute + duration * (wholeHourOnly ? 60 : 1);
    const endTime = formatClock(endMinutes);
    const unit = wholeHourOnly ? "小时" : "分钟";
    const context = chooseContext(
      [
        {
          id: "reading-session",
          render: ({ startHour, startMinute, endTime }) =>
            `阅读活动从 ${formatClock(startHour * 60 + startMinute)} 开始，到 ${endTime} 结束。一共进行了多少${unit}？`,
        },
        {
          id: "art-class",
          render: ({ startHour, startMinute, endTime }) =>
            `美术课从 ${formatClock(startHour * 60 + startMinute)} 开始，到 ${endTime} 结束。这节课进行了多少${unit}？`,
        },
        {
          id: "park-visit",
          render: ({ startHour, startMinute, endTime }) =>
            `参观公园从 ${formatClock(startHour * 60 + startMinute)} 出发，到 ${endTime} 结束。活动用了多少${unit}？`,
        },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { startHour, startMinute, endTime },
    );
    return {
      ...context,
      answer: duration,
      answerRule: wholeHourOnly ? `${endMinutes / 60} - ${startHour}` : `${endMinutes} - ${startHour * 60 + startMinute}`,
      variantControl: variantControl(variantLevel, "duration", "start_time"),
      steps: ["读出开始和结束时刻", "确认要求的时间单位", "计算经过的时间", "带上时间单位检查"],
      hints: [
        "先把开始和结束时刻找出来。",
        wholeHourOnly ? "整点到整点，可以用结束小时减开始小时。" : "先看从开始到结束一共经过了多少分钟。",
        `${formatClock(startHour * 60 + startMinute)} 到 ${endTime} 一共是 ${duration}${unit}。`,
      ],
    };
  },
  money_price_total: ({ seed, variantLevel, instructionalGrade }) => {
    const isG1 = instructionalGrade === "G1";
    const firstPrice = 3 + seed + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const secondPrice = 4 + seed + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const quantity = 3 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = isG1 ? firstPrice + secondPrice : secondPrice * quantity;
    const context = chooseContext(
      isG1
        ? [
            { id: "notebook-pencil", render: ({ firstPrice, secondPrice }) => `买一本练习本 ${firstPrice} 元和一支铅笔 ${secondPrice} 元，一共要付多少元？` },
            { id: "fruit-snack", render: ({ firstPrice, secondPrice }) => `买一个苹果 ${firstPrice} 元和一盒酸奶 ${secondPrice} 元，一共要付多少元？` },
            { id: "ticket-sticker", render: ({ firstPrice, secondPrice }) => `买一张活动票 ${firstPrice} 元和一张贴纸 ${secondPrice} 元，一共要付多少元？` },
          ]
        : [
            { id: "pencil-set", render: ({ secondPrice, quantity }) => `每支彩笔 ${secondPrice} 元，买 ${quantity} 支，一共要付多少元？` },
            { id: "plant-pot", render: ({ secondPrice, quantity }) => `每个小花盆 ${secondPrice} 元，买 ${quantity} 个，一共要付多少元？` },
            { id: "museum-card", render: ({ secondPrice, quantity }) => `每张参观卡 ${secondPrice} 元，买 ${quantity} 张，一共要付多少元？` },
          ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { firstPrice, secondPrice, quantity },
    );
    return {
      ...context,
      answer,
      answerRule: isG1 ? `${firstPrice} + ${secondPrice}` : `${secondPrice} * ${quantity}`,
      variantControl: variantControl(variantLevel, "unit_price", "quantity"),
      steps: ["找出价格和数量", "确认求总价", isG1 ? "把两种价格相加" : "用单价乘数量", "检查单位是元"],
      hints: [
        "题目问的是一共要付多少元。",
        isG1 ? "把两件物品的价格相加。" : "相同价格的几件物品，可以用单价乘数量。",
        isG1 ? `${firstPrice} + ${secondPrice} = ${answer}` : `${secondPrice} × ${quantity} = ${answer}`,
      ],
    };
  },
  operation_structure_distributive: ({ seed, variantLevel }) => {
    const groupCount = 12 + seed + (hasTwoControlledChanges(variantLevel) ? 2 : 0);
    const partA = 4 + (seed % 4);
    const partB = 6 + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const answer = groupCount * (partA + partB);
    const context = chooseContext(
      [
        { id: "supply-boxes", render: ({ groupCount, partA, partB }) => `学校准备了 ${groupCount} 个学习包，每个包有 ${partA} 本练习本和 ${partB} 支铅笔。一共准备了多少件学习用品？` },
        { id: "library-shelves", render: ({ groupCount, partA, partB }) => `图书角有 ${groupCount} 层书架，每层放 ${partA} 本故事书和 ${partB} 本科普书。一共有多少本书？` },
        { id: "garden-pots", render: ({ groupCount, partA, partB }) => `花园有 ${groupCount} 排花盆，每排有 ${partA} 盆黄花和 ${partB} 盆红花。一共有多少盆花？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { groupCount, partA, partB },
    );
    return {
      ...context,
      answer,
      answerRule: `${groupCount} * (${partA} + ${partB})`,
      variantControl: variantControl(variantLevel, "group_count", "part_b"),
      steps: ["先看每组里有几部分", "求出每组总数", "用组数乘每组总数", "检查是否每组都算到了"],
      hints: [
        "先不要分别算所有的黄花和红花。先看一排一共有多少。",
        `每组有 ${partA} + ${partB} = ${partA + partB} 件。`,
        `${groupCount} × ${partA + partB} = ${answer}。`,
      ],
    };
  },
  decimal_money_measure: ({ seed, variantLevel }) => {
    const partA = Number((7.5 + seed * 0.5 + (hasTwoControlledChanges(variantLevel) ? 0.5 : 0)).toFixed(1));
    const partB = Number((2.4 + (seed % 5) * 0.2 + (hasOneControlledChange(variantLevel) ? 0.3 : 0)).toFixed(1));
    const answer = Number((partA + partB).toFixed(1));
    const context = chooseContext(
      [
        { id: "art-supplies", render: ({ partA, partB }) => `买一支水彩笔 ${partA} 元和一本素描本 ${partB} 元，一共要付多少元？` },
        { id: "ribbon-length", render: ({ partA, partB }) => `做手工用了 ${partA} 米蓝丝带和 ${partB} 米黄丝带，一共用了多少米丝带？` },
        { id: "fruit-weight", render: ({ partA, partB }) => `果篮里有 ${partA} 千克苹果和 ${partB} 千克梨，一共重多少千克？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { partA, partB },
    );
    return {
      ...context,
      answer,
      answerRule: `${partA} + ${partB}`,
      variantControl: variantControl(variantLevel, "decimal_part_b", "decimal_part_a"),
      steps: ["读出两个小数数量", "对齐相同数位", "把小数相加", "检查小数点和单位"],
      hints: [
        "先确认两个数量的单位相同。",
        "相加时，小数点要对齐。",
        `${partA} + ${partB} = ${answer}。`,
      ],
    };
  },
  multi_step_total_quantity: ({ seed, variantLevel }) => {
    const groupCount = 6 + seed + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const unitAmount = 4 + (seed % 2) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const afternoonAmount = unitAmount * (2 + (seed % 3));
    const total = groupCount * unitAmount;
    const morningAmount = total - afternoonAmount;
    const answer = groupCount;
    const context = chooseContext(
      [
        { id: "library-shelves", render: ({ morningAmount, afternoonAmount, unitAmount }) => `图书角上午收到 ${morningAmount} 本图书，下午又收到 ${afternoonAmount} 本。每个书架放 ${unitAmount} 本，刚好放满多少个书架？` },
        { id: "seedling-trays", render: ({ morningAmount, afternoonAmount, unitAmount }) => `花园上午运来 ${morningAmount} 盆幼苗，下午又运来 ${afternoonAmount} 盆。每个托盘放 ${unitAmount} 盆，刚好需要多少个托盘？` },
        { id: "sports-baskets", render: ({ morningAmount, afternoonAmount, unitAmount }) => `器材室上午收到 ${morningAmount} 个球，下午又收到 ${afternoonAmount} 个。每个篮子放 ${unitAmount} 个，刚好放满多少个篮子？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { morningAmount, afternoonAmount, unitAmount },
    );
    return {
      ...context,
      answer,
      answerRule: `(${morningAmount} + ${afternoonAmount}) / ${unitAmount}`,
      variantControl: variantControl(variantLevel, "afternoon_amount", "unit_amount"),
      steps: ["先求上午和下午的总数", "找出每组放多少", "用总数除以每组数量", "检查是否刚好分完"],
      hints: [
        "题目先给了两个时间段的数量，要先合起来。",
        `总数是 ${morningAmount} + ${afternoonAmount} = ${total}。`,
        `${total} ÷ ${unitAmount} = ${answer}。`,
      ],
    };
  },
  geometry_angle_reasoning: ({ seed, variantLevel }) => {
    const knownAngle = 40 + seed * 4 + (hasOneControlledChange(variantLevel) ? 5 : 0) + (hasTwoControlledChanges(variantLevel) ? 5 : 0);
    const answer = 180 - knownAngle;
    const context = chooseContext(
      [
        { id: "paper-fold", render: ({ knownAngle }) => `折纸时两个相邻角拼成一个平角，共 180°。其中一个角是 ${knownAngle}°，另一个角是多少度？` },
        { id: "wooden-frame", render: ({ knownAngle }) => `木工板上的两个相邻角组成一个平角，共 180°。已知一个角是 ${knownAngle}°，另一个角是多少度？` },
        { id: "road-sign", render: ({ knownAngle }) => `路标上两个相邻角合起来是 180°。其中一个角是 ${knownAngle}°，另一个角是多少度？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { knownAngle },
    );
    return {
      ...context,
      answer,
      answerRule: `180 - ${knownAngle}`,
      variantControl: variantControl(variantLevel, "known_angle", "angle_context"),
      steps: ["确认两个角合起来是平角", "写出平角总度数 180°", "用总度数减已知角", "检查两个角相加是否为 180°"],
      hints: [
        "平角一共是 180°。",
        "未知角 = 180° - 已知角。",
        `180° - ${knownAngle}° = ${answer}°。`,
      ],
    };
  },
  volume_rectangular_prism: ({ seed, variantLevel }) => {
    const length = 6 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const width = 3 + (seed % 4) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const height = 2 + (seed % 3);
    const answer = length * width * height;
    const context = chooseContext(
      [
        { id: "storage-box", render: ({ length, width, height }) => `一个长方体收纳盒长 ${length} 分米，宽 ${width} 分米，高 ${height} 分米。它的体积是多少立方分米？` },
        { id: "fish-tank", render: ({ length, width, height }) => `一个长方体鱼缸长 ${length} 分米，宽 ${width} 分米，高 ${height} 分米。它最多能装多少立方分米的水？` },
        { id: "planting-bed", render: ({ length, width, height }) => `一个长方体种植箱长 ${length} 分米，宽 ${width} 分米，高 ${height} 分米。种植箱的体积是多少立方分米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { length, width, height },
    );
    return {
      ...context,
      answer,
      answerRule: `${length} * ${width} * ${height}`,
      variantControl: variantControl(variantLevel, "length", "width"),
      steps: ["确认图形是长方体", "找出长、宽、高", "用长乘宽乘高", "带上立方单位"],
      hints: [
        "长方体体积要同时用到长、宽、高。",
        "体积 = 长 × 宽 × 高。",
        `${length} × ${width} × ${height} = ${answer}。`,
      ],
    };
  },
  distance_speed_time: ({ seed, variantLevel }) => {
    const speed = 12 + seed * 2 + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const time = 2 + (seed % 3) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = speed * time;
    const context = chooseContext(
      [
        { id: "sightseeing-bus", render: ({ speed, time }) => `一辆观光车平均每小时行驶 ${speed} 千米，行驶了 ${time} 小时。一共行驶了多少千米？` },
        { id: "campus-shuttle", render: ({ speed, time }) => `校园接驳车平均每小时行驶 ${speed} 千米，行驶了 ${time} 小时。一共行驶了多少千米？` },
        { id: "delivery-van", render: ({ speed, time }) => `一辆送书车平均每小时行驶 ${speed} 千米，行驶了 ${time} 小时。一共行驶了多少千米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { speed, time },
    );
    return {
      ...context,
      answer,
      answerRule: `${speed} * ${time}`,
      variantControl: variantControl(variantLevel, "speed", "time"),
      steps: ["找出速度和时间", "确认要求的是路程", "用速度乘时间", "检查路程单位"],
      hints: [
        "速度表示每小时走多少千米。",
        "路程 = 速度 × 时间。",
        `${speed} × ${time} = ${answer} 千米。`,
      ],
    };
  },
  probability_event_decimal: ({ seed, variantLevel }) => {
    const totalCount = hasTwoControlledChanges(variantLevel) ? 20 : 10;
    const ratioStep = 1 + ((seed + (hasOneControlledChange(variantLevel) ? 1 : 0)) % 4);
    const favorableCount = ratioStep * (totalCount / 5);
    const answer = Number((favorableCount / totalCount).toFixed(1));
    const context = chooseContext(
      [
        { id: "color-balls", render: ({ favorableCount, totalCount }) => `盒子里有 ${totalCount} 个大小相同的球，其中 ${favorableCount} 个是红色的。任意摸出 1 个球，摸到红球的可能性用小数表示是多少？` },
        { id: "reading-cards", render: ({ favorableCount, totalCount }) => `一叠卡片有 ${totalCount} 张，其中 ${favorableCount} 张是故事卡。任意抽 1 张，抽到故事卡的可能性用小数表示是多少？` },
        { id: "prize-stickers", render: ({ favorableCount, totalCount }) => `抽奖袋里有 ${totalCount} 张贴纸，其中 ${favorableCount} 张是星星贴纸。任意抽 1 张，抽到星星贴纸的可能性用小数表示是多少？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { favorableCount, totalCount },
    );
    return {
      ...context,
      answer,
      answerRule: `${favorableCount} / ${totalCount}`,
      variantControl: variantControl(variantLevel, "favorable_count", "total_count"),
      steps: ["确认有利结果数量", "确认所有可能结果数量", "用有利数量除以总数量", "把结果写成小数"],
      hints: [
        "任意摸一次时，每个球被摸到的机会相同。",
        "可能性 = 有利结果数量 ÷ 总数量。",
        `${favorableCount} ÷ ${totalCount} = ${answer}。`,
      ],
    };
  },
  coordinate_movement: ({ seed, variantLevel }) => {
    const startX = 2 + (seed % 6) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const startY = 3 + (seed % 5);
    const horizontalShift = 4 + (seed % 7) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const answer = startX + horizontalShift;
    const context = chooseContext(
      [
        { id: "park-map", render: ({ startX, startY, horizontalShift }) => `方格地图上，A 点坐标是 (${startX}, ${startY})。从 A 点向右移动 ${horizontalShift} 格到 B 点，B 点的横坐标是多少？` },
        { id: "robot-route", render: ({ startX, startY, horizontalShift }) => `机器人在坐标 (${startX}, ${startY})，向右移动 ${horizontalShift} 格。它到达位置的横坐标是多少？` },
        { id: "treasure-map", render: ({ startX, startY, horizontalShift }) => `寻宝地图上起点坐标是 (${startX}, ${startY})，向右走 ${horizontalShift} 格。终点的横坐标是多少？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { startX, startY, horizontalShift },
    );
    return {
      ...context,
      answer,
      answerRule: `${startX} + ${horizontalShift}`,
      variantControl: variantControl(variantLevel, "horizontal_shift", "start_x"),
      steps: ["读出起点坐标", "确认向右只改变横坐标", "把横坐标加上移动格数", "检查纵坐标不变"],
      hints: [
        "向右或向左时，先看横坐标。",
        "向右移动表示横坐标增加。",
        `${startX} + ${horizontalShift} = ${answer}。`,
      ],
    };
  },
  number_composition_place_value: ({ seed, variantLevel }) => {
    const tens = 2 + (seed % 7) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const ones = (3 + seed + (hasOneControlledChange(variantLevel) ? 1 : 0)) % 10;
    const answer = tens * 10 + ones;
    const context = chooseContext(
      [
        { id: "book-bundles", render: ({ tens, ones }) => `图书角把故事书每 10 本扎成一捆，有 ${tens} 捆，另外还有 ${ones} 本没有扎。图书角一共有多少本故事书？` },
        { id: "sticker-packs", render: ({ tens, ones }) => `手工课把贴纸每 10 张装成一包，有 ${tens} 包，另外还有 ${ones} 张散贴纸。一共有多少张贴纸？` },
        { id: "seed-bags", render: ({ tens, ones }) => `花园把种子每 10 粒装成一袋，有 ${tens} 袋，另外有 ${ones} 粒。一共有多少粒种子？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { tens, ones },
    );
    return {
      ...context,
      answer,
      answerRule: `${tens} * 10 + ${ones}`,
      variantControl: variantControl(variantLevel, "ones", "tens"),
      steps: ["找出有几捆十", "把每捆换成 10 个", "加上单独剩下的数量", "检查十位和个位"],
      hints: ["一捆表示 10 本、10 张或 10 粒。", "先求所有整捆的数量。", `${tens} × 10 + ${ones} = ${answer}。`],
    };
  },
  unknown_part_add_subtract: ({ seed, variantLevel }) => {
    const knownPart = 8 + seed + (hasTwoControlledChanges(variantLevel) ? 2 : 0);
    const unknownPart = 4 + (seed % 6) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const whole = knownPart + unknownPart;
    const context = chooseContext(
      [
        { id: "class-flowers", render: ({ knownPart, whole }) => `班级一共准备了 ${whole} 朵花，其中已经摆好 ${knownPart} 朵。还要摆多少朵？` },
        { id: "reading-cards", render: ({ knownPart, whole }) => `一套阅读卡一共有 ${whole} 张，小安已经整理了 ${knownPart} 张。还剩多少张没有整理？` },
        { id: "sports-cones", render: ({ knownPart, whole }) => `活动需要 ${whole} 个标志桶，操场上已经放好 ${knownPart} 个。还要放多少个？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { knownPart, whole },
    );
    return {
      ...context,
      answer: unknownPart,
      answerRule: `${whole} - ${knownPart}`,
      variantControl: variantControl(variantLevel, "unknown_part", "known_part"),
      steps: ["确认整体数量", "确认已经完成的部分", "用整体减已知部分", "把结果放回题目检查"],
      hints: ["题目问的是还差多少，也就是未知部分。", "未知部分 = 整体 - 已知部分。", `${whole} - ${knownPart} = ${unknownPart}。`],
    };
  },
  fraction_add_same_denominator: ({ seed, variantLevel }) => {
    const denominator = hasTwoControlledChanges(variantLevel) ? 8 : 6;
    const firstNumerator = 1 + (seed % 2);
    const secondNumerator = 2 + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const totalNumerator = firstNumerator + secondNumerator;
    const answer = totalNumerator / denominator;
    const context = chooseContext(
      [
        { id: "paper-stars", render: ({ firstNumerator, secondNumerator, denominator }) => `手工课准备的纸星星中，第一组用了 ${firstNumerator}/${denominator}，第二组用了 ${secondNumerator}/${denominator}。两组一共用了全部纸星星的几分之几？请用分数填写。` },
        { id: "garden-seeds", render: ({ firstNumerator, secondNumerator, denominator }) => `学校花园的种子中，上午种了 ${firstNumerator}/${denominator}，下午又种了 ${secondNumerator}/${denominator}。全天一共种了全部种子的几分之几？请用分数填写。` },
        { id: "library-labels", render: ({ firstNumerator, secondNumerator, denominator }) => `图书角的新分类标签中，故事区用了 ${firstNumerator}/${denominator}，科普区用了 ${secondNumerator}/${denominator}。两个区域一共用了全部标签的几分之几？请用分数填写。` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { firstNumerator, secondNumerator, denominator },
    );
    return {
      ...context,
      answer,
      answerRule: `(${firstNumerator} + ${secondNumerator}) / ${denominator}`,
      answerInputKind: "fraction",
      variantControl: variantControl(variantLevel, "second_numerator", "denominator"),
      steps: ["确认两次都是同样大小的等分", "把分子相加得到总份数", "分母保持不变", "把结果写成分数并检查"],
      hints: ["分母相同，说明每一份大小一样。", `${firstNumerator}/${denominator} 和 ${secondNumerator}/${denominator} 合起来是 ${totalNumerator}/${denominator}。`, "把结果写成分数后填写。"],
    };
  },
  decimal_multiply_unit_price: ({ seed, variantLevel }) => {
    const unitPrice = Number((2.5 + seed * 0.4 + (hasOneControlledChange(variantLevel) ? 0.5 : 0)).toFixed(1));
    const quantity = 3 + (seed % 4) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = Number((unitPrice * quantity).toFixed(1));
    const context = chooseContext(
      [
        { id: "art-pens", render: ({ unitPrice, quantity }) => `每支水彩笔 ${unitPrice} 元，买 ${quantity} 支，一共要付多少元？` },
        { id: "ribbon-rolls", render: ({ unitPrice, quantity }) => `每卷丝带长 ${unitPrice} 米，准备 ${quantity} 卷，一共有多少米丝带？` },
        { id: "fruit-bags", render: ({ unitPrice, quantity }) => `每袋水果重 ${unitPrice} 千克，买 ${quantity} 袋，一共重多少千克？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { unitPrice, quantity },
    );
    return {
      ...context,
      answer,
      answerRule: `${unitPrice} * ${quantity}`,
      variantControl: variantControl(variantLevel, "unit_price", "quantity"),
      steps: ["找出每一份的数量", "找出有几份", "用单价或单份量乘数量", "检查小数点和单位"],
      hints: ["每支、每卷或每袋表示一份的数量。", "总量 = 每份数量 × 份数。", `${unitPrice} × ${quantity} = ${answer}。`],
    };
  },
  ratio_total_split: ({ seed, variantLevel }) => {
    const ratioA = 2;
    const ratioB = 3 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const unitPart = 3 + seed + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const total = (ratioA + ratioB) * unitPart;
    const answer = ratioB * unitPart;
    const context = chooseContext(
      [
        { id: "club-members", render: ({ ratioA, ratioB, total }) => `社团里男生和女生人数的比是 ${ratioA}:${ratioB}，一共有 ${total} 人。女生有多少人？` },
        { id: "juice-mix-total", render: ({ ratioA, ratioB, total }) => `果汁里橙汁和苹果汁的份数比是 ${ratioA}:${ratioB}，一共调了 ${total} 杯。苹果汁有多少杯？` },
        { id: "sports-balls-total", render: ({ ratioA, ratioB, total }) => `器材室里篮球和足球的数量比是 ${ratioA}:${ratioB}，一共有 ${total} 个球。足球有多少个？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { ratioA, ratioB, total },
    );
    return {
      ...context,
      answer,
      answerRule: `${total} / (${ratioA} + ${ratioB}) * ${ratioB}`,
      variantControl: variantControl(variantLevel, "unit_part", "ratio_b"),
      steps: ["把比看成总份数", "求出每一份是多少", "找到要求部分对应的份数", "用份数乘每份数量检查总量"],
      hints: [`总份数是 ${ratioA} + ${ratioB} = ${ratioA + ratioB} 份。`, `每一份是 ${total} ÷ ${ratioA + ratioB} = ${unitPart}。`, `${ratioB} × ${unitPart} = ${answer}。`],
    };
  },
  circle_area_application: ({ seed, variantLevel }) => {
    const radius = 2 + (seed % 3) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const circleCount = 1 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = Number((3.14 * radius * radius * circleCount).toFixed(2));
    const context = chooseContext(
      [
        { id: "flower-beds", render: ({ radius, circleCount }) => `学校有 ${circleCount} 个同样大的圆形花坛，每个半径是 ${radius} 米。π 取 3.14，这些花坛的总面积是多少平方米？` },
        { id: "round-mats", render: ({ radius, circleCount }) => `活动室铺了 ${circleCount} 张同样大的圆形地垫，每张半径是 ${radius} 米。π 取 3.14，地垫总面积是多少平方米？` },
        { id: "water-pools", render: ({ radius, circleCount }) => `公园里有 ${circleCount} 个同样大的圆形水池，每个半径是 ${radius} 米。π 取 3.14，水池总面积是多少平方米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { radius, circleCount },
    );
    return {
      ...context,
      answer,
      answerRule: `3.14 * ${radius} * ${radius} * ${circleCount}`,
      variantControl: variantControl(variantLevel, "radius", "circle_count"),
      steps: ["确认半径和圆的个数", "先算一个圆的面积", "用圆面积乘个数", "检查单位是平方米"],
      hints: ["圆面积要用半径，不用直径。", `一个圆的面积 = 3.14 × ${radius} × ${radius}。`, `再乘 ${circleCount}，总面积是 ${answer} 平方米。`],
    };
  },
  square_perimeter_intro: ({ seed, variantLevel }) => {
    const sideLength = 4 + seed + (hasOneControlledChange(variantLevel) ? 1 : 0) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = sideLength * 4;
    const context = chooseContext(
      [
        { id: "square-garden", render: ({ sideLength }) => `学校有一个正方形小花园，每条边长 ${sideLength} 米。给小花园围一圈护栏，护栏长多少米？` },
        { id: "square-photo", render: ({ sideLength }) => `一张正方形照片的每条边长 ${sideLength} 厘米。给照片贴一圈边框，边框长多少厘米？` },
        { id: "square-tile", render: ({ sideLength }) => `一块正方形地砖的每条边长 ${sideLength} 分米。它的四周一共长多少分米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { sideLength },
    );
    return {
      ...context,
      answer,
      answerRule: `${sideLength} * 4`,
      variantControl: variantControl(variantLevel, "side_length", "square_context"),
      steps: ["确认图形是正方形", "找出一条边的长度", "正方形有 4 条一样长的边", "用边长乘 4 并带上单位"],
      hints: ["正方形的四条边一样长。", "周长就是四条边加在一起。", `${sideLength} × 4 = ${answer}。`],
    };
  },
  division_remainder_grouping: ({ seed, variantLevel }) => {
    const capacity = 4 + (seed % 4) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const fullGroupsBefore = 3 + (seed % 5) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const remainder = 1 + (seed % Math.max(1, capacity - 1));
    const totalItems = fullGroupsBefore * capacity + remainder;
    const answer = Math.ceil(totalItems / capacity);
    const context = chooseContext(
      [
        { id: "book-boxes", render: ({ totalItems, capacity }) => `图书角有 ${totalItems} 本新书，每个收纳盒最多放 ${capacity} 本。至少需要几个收纳盒才能全部放下？` },
        { id: "seed-packets", render: ({ totalItems, capacity }) => `一共要把 ${totalItems} 粒种子装袋，每袋最多装 ${capacity} 粒。至少要准备几袋？` },
        { id: "team-vans", render: ({ totalItems, capacity }) => `活动有 ${totalItems} 名同学，每辆小车最多坐 ${capacity} 人。至少需要几辆小车？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { totalItems, capacity },
    );
    return {
      ...context,
      answer,
      answerRule: `ceil(${totalItems} / ${capacity})`,
      variantControl: variantControl(variantLevel, "total_items", "capacity"),
      steps: ["找出总数量和每组最多数量", "先看能装满多少组", "确认余下的数量不能不装", "余下的数量还需要一组"],
      hints: ["题目问的是至少需要多少组，余下的也要有地方放。", `${totalItems} ÷ ${capacity} 会有余数。`, `装满 ${fullGroupsBefore} 组后还剩 ${remainder} 个，所以还需要 1 组，共 ${answer} 组。`],
    };
  },
  fraction_subtract_same_denominator: ({ seed, variantLevel }) => {
    const denominator = hasTwoControlledChanges(variantLevel) ? 8 : 6;
    const largerNumerator = 4 + (seed % 2);
    const smallerNumerator = 1 + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const differenceNumerator = largerNumerator - smallerNumerator;
    const answer = differenceNumerator / denominator;
    const context = chooseContext(
      [
        { id: "paper-sheets", render: ({ largerNumerator, smallerNumerator, denominator }) => `手工课准备的彩纸中，上午用了 ${largerNumerator}/${denominator}，下午用了 ${smallerNumerator}/${denominator}。上午比下午多用了全部彩纸的几分之几？请用分数填写。` },
        { id: "garden-seeds-difference", render: ({ largerNumerator, smallerNumerator, denominator }) => `学校花园的种子中，第一块地种了 ${largerNumerator}/${denominator}，第二块地种了 ${smallerNumerator}/${denominator}。第一块地比第二块地多种了全部种子的几分之几？请用分数填写。` },
        { id: "reading-cards-difference", render: ({ largerNumerator, smallerNumerator, denominator }) => `图书角的新阅读卡中，第一组整理了 ${largerNumerator}/${denominator}，第二组整理了 ${smallerNumerator}/${denominator}。第一组比第二组多整理了全部阅读卡的几分之几？请用分数填写。` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { largerNumerator, smallerNumerator, denominator },
    );
    return {
      ...context,
      answer,
      answerRule: `(${largerNumerator} - ${smallerNumerator}) / ${denominator}`,
      answerInputKind: "fraction",
      variantControl: variantControl(variantLevel, "smaller_numerator", "denominator"),
      steps: ["确认两次都是同样大小的等分", "把分子相减得到相差份数", "分母保持不变", "把结果写成分数并检查"],
      hints: ["分母相同，说明每一份大小一样。", `${largerNumerator}/${denominator} 比 ${smallerNumerator}/${denominator} 多 ${differenceNumerator}/${denominator}。`, "把相差的份数写成分数后填写。"],
    };
  },
  decimal_divide_equal_share: ({ seed, variantLevel }) => {
    const quantity = 2 + (seed % 4) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const unitPrice = Number((3.5 + (seed % 7) * 0.5 + (hasOneControlledChange(variantLevel) ? 0.5 : 0)).toFixed(1));
    const totalPrice = Number((unitPrice * quantity).toFixed(1));
    const context = chooseContext(
      [
        { id: "notebook-unit-price", render: ({ quantity, totalPrice }) => `买了 ${quantity} 本同样的练习本，一共付了 ${totalPrice} 元。每本练习本多少元？` },
        { id: "ribbon-unit-length", render: ({ quantity, totalPrice }) => `把 ${totalPrice} 米同样长的丝带平均分成 ${quantity} 段。每段长多少米？` },
        { id: "fruit-unit-weight", render: ({ quantity, totalPrice }) => `有 ${totalPrice} 千克水果，平均装成 ${quantity} 袋。每袋重多少千克？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { quantity, totalPrice },
    );
    return {
      ...context,
      answer: unitPrice,
      answerRule: `${totalPrice} / ${quantity}`,
      variantControl: variantControl(variantLevel, "total_price", "quantity"),
      steps: ["确认总量和平均分的份数", "题目要求每一份的量", "用总量除以份数", "检查小数点和单位"],
      hints: ["同样的物品或平均分，说明每一份相等。", "每一份 = 总量 ÷ 份数。", `${totalPrice} ÷ ${quantity} = ${unitPrice}。`],
    };
  },
  data_range_comparison: ({ seed, variantLevel }) => {
    const minimumValue = 8 + (seed % 5) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const maximumValue = 20 + seed + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const middleValue = minimumValue + Math.floor((maximumValue - minimumValue) / 2);
    const answer = maximumValue - minimumValue;
    const context = chooseContext(
      [
        { id: "reading-pages-table", render: ({ minimumValue, middleValue, maximumValue }) => `阅读小组本周读书页数：小安 ${minimumValue} 页，小林 ${middleValue} 页，小周 ${maximumValue} 页。读得最多的比最少的多多少页？` },
        { id: "seedling-table", render: ({ minimumValue, middleValue, maximumValue }) => `三块试验田的幼苗数量：甲地 ${minimumValue} 株，乙地 ${middleValue} 株，丙地 ${maximumValue} 株。最多的比最少的多多少株？` },
        { id: "steps-table", render: ({ minimumValue, middleValue, maximumValue }) => `三位同学周末步数：小美 ${minimumValue} 千步，小东 ${middleValue} 千步，小杰 ${maximumValue} 千步。最多的比最少的多多少千步？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { minimumValue, middleValue, maximumValue },
    );
    return {
      ...context,
      answer,
      answerRule: `${maximumValue} - ${minimumValue}`,
      variantControl: variantControl(variantLevel, "maximum_value", "minimum_value"),
      steps: ["读清三组数据和单位", "找出最大值和最小值", "用最大值减最小值", "检查结果表示相差多少"],
      hints: ["题目问最多和最少的差，不需要把三项都相加。", `最大值是 ${maximumValue}，最小值是 ${minimumValue}。`, `${maximumValue} - ${minimumValue} = ${answer}。`],
    };
  },
  triangle_area_application: ({ seed, variantLevel }) => {
    const base = 6 + 2 * (seed % 6) + (hasTwoControlledChanges(variantLevel) ? 2 : 0);
    const height = 3 + (seed % 6) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const answer = (base * height) / 2;
    const context = chooseContext(
      [
        { id: "triangle-flag", render: ({ base, height }) => `一面三角形小旗的底是 ${base} 分米，高是 ${height} 分米。它的面积是多少平方分米？` },
        { id: "triangle-garden", render: ({ base, height }) => `一块三角形花圃的底是 ${base} 米，高是 ${height} 米。它的面积是多少平方米？` },
        { id: "triangle-card", render: ({ base, height }) => `一张三角形贺卡的底是 ${base} 厘米，高是 ${height} 厘米。它的面积是多少平方厘米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { base, height },
    );
    return {
      ...context,
      answer,
      answerRule: `${base} * ${height} / 2`,
      variantControl: variantControl(variantLevel, "height", "base"),
      steps: ["确认图形是三角形", "找出底和对应的高", "用底乘高", "结果再除以 2 并带上平方单位"],
      hints: ["三角形面积和同底同高长方形面积有关。", "三角形面积 = 底 × 高 ÷ 2。", `${base} × ${height} ÷ 2 = ${answer}。`],
    };
  },
  addition_subtraction_regrouping: ({ seed, variantLevel }) => {
    const isSubtraction = seed % 2 === 1;
    const firstTens = (isSubtraction ? 3 : 2) + (seed % 3) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const firstOnes = isSubtraction ? 2 + (seed % 3) : 6 + (seed % 4);
    const secondTens = 1 + (seed % 2);
    const secondOnes = 5 + ((seed + (hasOneControlledChange(variantLevel) ? 1 : 0)) % 4);
    const firstAmount = firstTens * 10 + firstOnes;
    const secondAmount = secondTens * 10 + secondOnes;
    const answer = isSubtraction ? firstAmount - secondAmount : firstAmount + secondAmount;
    const context = chooseContext(
      isSubtraction
        ? [
            { id: "regrouping-library-return", render: ({ firstAmount, secondAmount }) => `图书角原来有 ${firstAmount} 本故事书，借走了 ${secondAmount} 本。还剩多少本？` },
            { id: "regrouping-stickers-give", render: ({ firstAmount, secondAmount }) => `小安有 ${firstAmount} 张贴纸，送给同学 ${secondAmount} 张。现在还有多少张？` },
            { id: "regrouping-seeds-plant", render: ({ firstAmount, secondAmount }) => `花坛准备了 ${firstAmount} 粒种子，已经种下 ${secondAmount} 粒。还剩多少粒？` },
          ]
        : [
            { id: "regrouping-books-total", render: ({ firstAmount, secondAmount }) => `班级上午收到 ${firstAmount} 本图书，下午又收到 ${secondAmount} 本。一共收到多少本？` },
            { id: "regrouping-cards-total", render: ({ firstAmount, secondAmount }) => `手工课先发了 ${firstAmount} 张彩卡，后来又发了 ${secondAmount} 张。一共发了多少张？` },
            { id: "regrouping-fruit-total", render: ({ firstAmount, secondAmount }) => `水果篮里有 ${firstAmount} 个苹果，又放进 ${secondAmount} 个梨。现在一共有多少个水果？` },
          ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { firstAmount, secondAmount },
    );
    return {
      ...context,
      answer,
      answerRule: `${firstAmount} ${isSubtraction ? "-" : "+"} ${secondAmount}`,
      variantControl: variantControl(variantLevel, "second_amount", "first_amount"),
      steps: isSubtraction
        ? ["确认原有数量和拿走数量", "个位不够减时先向十位借 1 个十", "按十位和个位完成减法", "把结果和借走数量合起来检查原数"]
        : ["确认两个数量要合起来", "先算个位，超过 10 时向十位进 1", "再算十位并加上进位", "检查总数比两个部分都大"],
      hints: isSubtraction
        ? ["题目问还剩多少，要用原来数量减去拿走数量。", `个位 ${firstOnes} 不够减 ${secondOnes}，可以从十位借 1 个十。`, `${firstAmount} - ${secondAmount} = ${answer}。`]
        : ["题目问一共多少，要把两个数量相加。", `个位 ${firstOnes} 和 ${secondOnes} 相加会进位。`, `${firstAmount} + ${secondAmount} = ${answer}。`],
    };
  },
  multiplication_division_inverse: ({ seed, variantLevel }) => {
    const unitAmount = 3 + (seed % 6) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const groupCount = 3 + (seed % 5) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const total = unitAmount * groupCount;
    const findUnitAmount = seed % 2 === 1;
    const context = chooseContext(
      findUnitAmount
        ? [
            { id: "inverse-pencils", render: ({ total, groupCount }) => `把 ${total} 支铅笔平均装进 ${groupCount} 个笔盒，每个笔盒装多少支？` },
            { id: "inverse-seats", render: ({ total, groupCount }) => `礼堂有 ${total} 个座位，平均排成 ${groupCount} 排，每排有多少个座位？` },
            { id: "inverse-flower-bundles", render: ({ total, groupCount }) => `花店把 ${total} 枝花平均扎成 ${groupCount} 束，每束有多少枝？` },
          ]
        : [
            { id: "inverse-pencils-total", render: ({ unitAmount, groupCount }) => `每个笔盒装 ${unitAmount} 支铅笔，准备了 ${groupCount} 个笔盒。一共装了多少支？` },
            { id: "inverse-seats-total", render: ({ unitAmount, groupCount }) => `礼堂每排有 ${unitAmount} 个座位，一共有 ${groupCount} 排。一共有多少个座位？` },
            { id: "inverse-flower-total", render: ({ unitAmount, groupCount }) => `每束有 ${unitAmount} 枝花，花店扎了 ${groupCount} 束。一共有多少枝花？` },
          ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { unitAmount, groupCount, total },
    );
    return {
      ...context,
      answer: findUnitAmount ? unitAmount : total,
      answerRule: findUnitAmount ? `${total} / ${groupCount}` : `${unitAmount} * ${groupCount}`,
      variantControl: variantControl(variantLevel, "unit_amount", "group_count"),
      steps: findUnitAmount
        ? ["确认总数和平均分成的组数", "题目要求每一组的数量", "用总数除以组数", "用每组数量乘组数检查总数"]
        : ["确认每组数量和组数", "把相同数量的组写成乘法", "用每组数量乘组数", "检查总数是否和所有组对应"],
      hints: findUnitAmount
        ? ["平均分表示每一组一样多。", "每组数量 = 总数 ÷ 组数。", `${total} ÷ ${groupCount} = ${unitAmount}。`]
        : ["每个、每排、每束表示一组的数量。", "总数 = 每组数量 × 组数。", `${unitAmount} × ${groupCount} = ${total}。`],
    };
  },
  integer_operation_order: ({ seed, variantLevel }) => {
    const groupCount = 3 + (seed % 4) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const perGroup = 4 + (seed % 6) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const extraAmount = 6 + (seed % 7);
    const answer = groupCount * perGroup + extraAmount;
    const context = chooseContext(
      [
        { id: "order-reading-cards", render: ({ groupCount, perGroup, extraAmount }) => `阅读角有 ${groupCount} 盒卡片，每盒 ${perGroup} 张，另外还有 ${extraAmount} 张散卡。一共有多少张卡片？` },
        { id: "order-art-materials", render: ({ groupCount, perGroup, extraAmount }) => `美术课准备了 ${groupCount} 包彩纸，每包 ${perGroup} 张，又拿来 ${extraAmount} 张备用。一共有多少张彩纸？` },
        { id: "order-sports-cones", render: ({ groupCount, perGroup, extraAmount }) => `操场上放了 ${groupCount} 组标志桶，每组 ${perGroup} 个，旁边还有 ${extraAmount} 个备用。一共有多少个标志桶？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { groupCount, perGroup, extraAmount },
    );
    return {
      ...context,
      answer,
      answerRule: `${groupCount} * ${perGroup} + ${extraAmount}`,
      variantControl: variantControl(variantLevel, "per_group", "group_count"),
      steps: ["把成组的部分和散的部分分开", "先求所有成组物品的数量", "再加上备用的散物品", "检查每个条件都只使用了一次"],
      hints: ["每盒、每包或每组的数量要先合成总数。", `先算 ${groupCount} × ${perGroup}，再加 ${extraAmount}。`, `${groupCount} × ${perGroup} + ${extraAmount} = ${answer}。`],
    };
  },
  fraction_equivalent_compare: ({ seed, variantLevel }) => {
    const whole = 48 + seed * 8 + (hasTwoControlledChanges(variantLevel) ? 8 : 0);
    const firstNumerator = 2 + (seed % 2);
    const differenceEighths = 1 + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const secondNumerator = firstNumerator * 2 - differenceEighths;
    const answer = (whole / 8) * differenceEighths;
    const context = chooseContext(
      [
        { id: "fraction-compare-stickers", render: ({ whole, firstNumerator, secondNumerator }) => `班级有 ${whole} 张贴纸。第一组用了其中的 ${firstNumerator}/4，第二组用了 ${secondNumerator}/8。第一组比第二组多用了多少张？` },
        { id: "fraction-compare-seeds", render: ({ whole, firstNumerator, secondNumerator }) => `花园有 ${whole} 粒种子。甲地种了其中的 ${firstNumerator}/4，乙地种了 ${secondNumerator}/8。甲地比乙地多种多少粒？` },
        { id: "fraction-compare-cards", render: ({ whole, firstNumerator, secondNumerator }) => `图书角有 ${whole} 张阅读卡。故事区用了 ${firstNumerator}/4，科学区用了 ${secondNumerator}/8。故事区比科学区多用多少张？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { whole, firstNumerator, secondNumerator },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} / 8 * (${firstNumerator} * 2 - ${secondNumerator})`,
      variantControl: variantControl(variantLevel, "second_fraction", "whole"),
      steps: ["把四分之几改写成八分之几", "找出两个分数相差几份八分之一", "求一份八分之一代表多少数量", "用相差的份数乘一份数量并检查"],
      hints: [`${firstNumerator}/4 可以看成 ${firstNumerator * 2}/8。`, `两个分数相差 ${differenceEighths}/8。`, `${whole} ÷ 8 × ${differenceEighths} = ${answer}。`],
    };
  },
  decimal_rounding_estimation: ({ seed, variantLevel }) => {
    const wholePart = 2 + (seed % 8);
    const tenths = 1 + (seed % 7) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const hundredths = 5 + ((seed + (hasOneControlledChange(variantLevel) ? 1 : 0)) % 5);
    const originalValue = Number((wholePart + tenths / 10 + hundredths / 100).toFixed(2));
    const answer = Number((wholePart + (tenths + 1) / 10).toFixed(1));
    const context = chooseContext(
      [
        { id: "rounding-race", render: ({ originalValue }) => `小安跑步用了 ${originalValue} 分钟。精确到十分位大约是多少分钟？` },
        { id: "rounding-ribbon", render: ({ originalValue }) => `一段丝带长 ${originalValue} 米。精确到十分位大约是多少米？` },
        { id: "rounding-water", render: ({ originalValue }) => `水壶里有 ${originalValue} 升水。精确到十分位大约是多少升？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { originalValue },
    );
    return {
      ...context,
      answer,
      answerRule: `round(${originalValue}, 1 decimal place)`,
      variantControl: variantControl(variantLevel, "hundredths", "tenths"),
      steps: ["确认要保留到十分位", "观察十分位后一位，也就是百分位", "百分位是 5 或更大时十分位进 1", "写出保留一位小数的结果并检查单位"],
      hints: ["精确到十分位，要看百分位。", `百分位是 ${hundredths}，所以十分位要进 1。`, `${originalValue} ≈ ${answer}（精确到十分位）。`],
    };
  },
  circle_circumference_application: ({ seed, variantLevel }) => {
    const radius = 2 + (seed % 6) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const circleCount = 1 + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = Number((2 * 3.14 * radius * circleCount).toFixed(2));
    const context = chooseContext(
      [
        { id: "circumference-track", render: ({ radius, circleCount }) => `学校有 ${circleCount} 个同样大的圆形跑道标志圈，每个半径是 ${radius} 米。π 取 3.14，围一圈一共需要多少米彩带？` },
        { id: "circumference-flower-bed", render: ({ radius, circleCount }) => `花园有 ${circleCount} 个同样大的圆形花坛，每个半径是 ${radius} 米。π 取 3.14，给花坛围边一共需要多少米护栏？` },
        { id: "circumference-mat", render: ({ radius, circleCount }) => `活动室有 ${circleCount} 张同样大的圆形地垫，每张半径是 ${radius} 米。π 取 3.14，地垫边缘一共长多少米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { radius, circleCount },
    );
    return {
      ...context,
      answer,
      answerRule: `2 * 3.14 * ${radius} * ${circleCount}`,
      variantControl: variantControl(variantLevel, "radius", "circle_count"),
      steps: ["确认题目问的是围一圈的长度", "找出圆的半径和圆的个数", "先用 2 × π × 半径求一个圆的周长", "再乘圆的个数并带上长度单位"],
      hints: ["围一圈求的是周长，不是面积。", `一个圆的周长 = 2 × 3.14 × ${radius}。`, `再乘 ${circleCount}，一共是 ${answer} 米。`],
    };
  },
  trapezoid_area_application: ({ seed, variantLevel }) => {
    const upperBase = 4 + 2 * (seed % 5) + (hasOneControlledChange(variantLevel) ? 2 : 0);
    const lowerBase = upperBase + 4 + 2 * (seed % 3) + (hasTwoControlledChanges(variantLevel) ? 2 : 0);
    const height = 3 + (seed % 5);
    const answer = ((upperBase + lowerBase) * height) / 2;
    const context = chooseContext(
      [
        { id: "trapezoid-garden", render: ({ upperBase, lowerBase, height }) => `一块梯形花圃的上底是 ${upperBase} 米，下底是 ${lowerBase} 米，高是 ${height} 米。面积是多少平方米？` },
        { id: "trapezoid-flag", render: ({ upperBase, lowerBase, height }) => `一面梯形小旗的上底是 ${upperBase} 分米，下底是 ${lowerBase} 分米，高是 ${height} 分米。面积是多少平方分米？` },
        { id: "trapezoid-card", render: ({ upperBase, lowerBase, height }) => `一张梯形卡片的上底是 ${upperBase} 厘米，下底是 ${lowerBase} 厘米，高是 ${height} 厘米。面积是多少平方厘米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { upperBase, lowerBase, height },
    );
    return {
      ...context,
      answer,
      answerRule: `(${upperBase} + ${lowerBase}) * ${height} / 2`,
      variantControl: variantControl(variantLevel, "upper_base", "lower_base"),
      steps: ["确认图形是梯形，找出上底、下底和高", "先把两条底的长度相加", "把底和的结果乘高，再除以 2", "写出平方单位并检查"],
      hints: ["梯形面积要同时用到上底、下底和高。", "面积 = （上底 + 下底）× 高 ÷ 2。", `（${upperBase} + ${lowerBase}）× ${height} ÷ 2 = ${answer}。`],
    };
  },
  proportion_scale_application: ({ seed, variantLevel }) => {
    const scaleKilometers = 1 + (seed % 3) + (hasOneControlledChange(variantLevel) ? 1 : 0);
    const scaleDenominator = scaleKilometers * 100000;
    const mapLength = 2 + (seed % 7) + (hasTwoControlledChanges(variantLevel) ? 1 : 0);
    const answer = mapLength * scaleKilometers;
    const context = chooseContext(
      [
        { id: "scale-city-map", render: ({ scaleDenominator, mapLength }) => `一张城市地图的比例尺是 1:${scaleDenominator}。地图上学校到图书馆的距离是 ${mapLength} 厘米，实际距离是多少千米？` },
        { id: "scale-park-map", render: ({ scaleDenominator, mapLength }) => `公园导览图的比例尺是 1:${scaleDenominator}。图上入口到湖边的距离是 ${mapLength} 厘米，实际距离是多少千米？` },
        { id: "scale-route-map", render: ({ scaleDenominator, mapLength }) => `路线图的比例尺是 1:${scaleDenominator}。图上两站之间的距离是 ${mapLength} 厘米，实际距离是多少千米？` },
      ],
      seed + (hasContextChange(variantLevel) ? 1 : 0),
      { scaleDenominator, mapLength },
    );
    return {
      ...context,
      answer,
      answerRule: `${mapLength} * ${scaleDenominator} / 100000`,
      variantControl: variantControl(variantLevel, "scale_denominator", "map_length"),
      steps: ["读出比例尺和图上距离", "先判断图上 1 厘米代表的实际距离", "把图上长度按比例放大并换成千米", "检查实际距离的单位是千米"],
      hints: [`比例尺 1:${scaleDenominator} 表示图上 1 厘米代表实际 ${scaleKilometers} 千米。`, `图上有 ${mapLength} 厘米，就有 ${mapLength} 个 ${scaleKilometers} 千米。`, `${mapLength} × ${scaleKilometers} = ${answer} 千米。`],
    };
  },
};

// Inverse forms are authored per curriculum relationship rather than inferred by
// text manipulation. Each one keeps a computable rule, a real-world prompt, and
// a bounded answer range before it can be exposed as a transfer item.
const REVERSE_QUESTION_GENERATORS = {
  compare_more_less: ({ seed }) => {
    const base = 28 + seed;
    const difference = 7 + seed;
    const total = base + difference;
    const context = chooseContext(
      [
        { id: "reverse-garden-flowers", render: ({ total, difference }) => `花坛里有 ${total} 朵红花，红花比黄花多 ${difference} 朵。黄花有多少朵？` },
        { id: "reverse-sticker-collection", render: ({ total, difference }) => `小林有 ${total} 张贴纸，小林比小雅多 ${difference} 张。小雅有多少张？` },
        { id: "reverse-library-books", render: ({ total, difference }) => `班级图书角有 ${total} 本科普书，科普书比故事书多 ${difference} 本。故事书有多少本？` },
      ],
      seed,
      { total, difference },
    );
    return {
      ...context,
      answer: base,
      answerRule: `${total} - ${difference}`,
      reverseQuestionApplied: true,
      steps: ["确认已知的是较多一方", "找出多出来的差", "用较多一方减差", "把结果代回比较关系检查"],
      hints: ["题目已知的是比较多的一方。", "较少一方 = 较多一方 - 差。", `${total} - ${difference} = ${base}。`],
    };
  },
  part_whole_add_subtract: ({ seed }) => {
    const partA = 16 + seed;
    const partB = 19 + seed;
    const whole = partA + partB;
    const context = chooseContext(
      [
        { id: "reverse-class-library", render: ({ whole, partA }) => `图书角一共有 ${whole} 本书，其中故事书有 ${partA} 本。科普书有多少本？` },
        { id: "reverse-sports-day", render: ({ whole, partA }) => `运动会上共有 ${whole} 名同学参加两项活动，其中 ${partA} 名参加跳绳。参加跑步的有多少名？` },
        { id: "reverse-fruit-basket", render: ({ whole, partA }) => `果篮里一共有 ${whole} 个水果，其中苹果有 ${partA} 个。梨有多少个？` },
      ],
      seed,
      { whole, partA },
    );
    return {
      ...context,
      answer: partB,
      answerRule: `${whole} - ${partA}`,
      reverseQuestionApplied: true,
      steps: ["确认整体数量", "确认已知部分", "用整体减已知部分", "把两部分相加检查整体"],
      hints: ["题目问的是还不知道的一个部分。", "未知部分 = 整体 - 已知部分。", `${whole} - ${partA} = ${partB}。`],
    };
  },
  equal_groups_multiply_divide: ({ seed }) => {
    const unit = 4 + seed;
    const groups = 6;
    const total = unit * groups;
    const context = chooseContext(
      [
        { id: "reverse-pencil-boxes", render: ({ total, unit }) => `有 ${total} 支铅笔，每盒装 ${unit} 支。一共可以装几盒？` },
        { id: "reverse-seat-rows", render: ({ total, unit }) => `礼堂有 ${total} 个座位，每排有 ${unit} 个座位。一共有几排？` },
        { id: "reverse-flower-bundles", render: ({ total, unit }) => `花店有 ${total} 枝花，每束扎 ${unit} 枝。一共可以扎几束？` },
      ],
      seed,
      { total, unit },
    );
    return {
      ...context,
      answer: groups,
      answerRule: `${total} / ${unit}`,
      reverseQuestionApplied: true,
      steps: ["确认总数和每组数量", "题目要求组数", "用总数除以每组数量", "用组数乘每组数量检查"],
      hints: ["每盒、每排、每束都是一组的数量。", "组数 = 总数 ÷ 每组数量。", `${total} ÷ ${unit} = ${groups}。`],
    };
  },
  time_elapsed_simple: ({ seed, instructionalGrade }) => {
    const wholeHourOnly = instructionalGrade === "G1";
    const unit = wholeHourOnly ? "小时" : "分钟";
    const duration = wholeHourOnly ? 1 + (seed % 3) : 30 + (seed % 3) * 15;
    const durationMinutes = wholeHourOnly ? duration * 60 : duration;
    const endHour = 11 + (seed % 3);
    const endMinute = wholeHourOnly ? 0 : seed % 2 ? 15 : 30;
    const endMinutes = endHour * 60 + endMinute;
    const startMinutes = endMinutes - durationMinutes;
    const endTime = formatClock(endMinutes);
    const startTime = formatClock(startMinutes);
    const context = chooseContext(
      [
        {
          id: "reverse-time-reading-start",
          render: ({ endTime, duration }) =>
            `阅读活动在 ${endTime} 结束，活动一共进行了 ${duration}${unit}。它是什么时候开始的？请用 HH:MM 表示。`,
        },
        {
          id: "reverse-time-art-start",
          render: ({ endTime, duration }) =>
            `美术课在 ${endTime} 结束，这节课一共进行了 ${duration}${unit}。它是什么时候开始的？请用 HH:MM 表示。`,
        },
        {
          id: "reverse-time-park-start",
          render: ({ endTime, duration }) =>
            `参观公园在 ${endTime} 结束，活动一共进行了 ${duration}${unit}。它是什么时候出发的？请用 HH:MM 表示。`,
        },
      ],
      seed,
      { endTime, duration },
    );
    return {
      ...context,
      answer: startMinutes,
      answerRule: `${endMinutes} - ${durationMinutes}`,
      answerInputKind: "clock_time",
      reverseQuestionApplied: true,
      steps: ["读出结束时刻和经过时间", "把经过时间换成分钟并从结束时刻往前推", "写出开始时刻", "检查开始时刻加经过时间能回到结束时刻"],
      hints: ["题目给的是结束时刻，要倒着找开始时刻。", `先从 ${endTime} 往前推 ${duration}${unit}。`, `开始时刻是 ${startTime}，按 HH:MM 填写。`],
    };
  },
  money_price_total: ({ seed, instructionalGrade }) => {
    const isG1 = instructionalGrade === "G1";
    const firstPrice = 3 + seed;
    const secondPrice = 4 + seed;
    const quantity = 3;
    const total = isG1 ? firstPrice + secondPrice : secondPrice * quantity;
    const context = chooseContext(
      isG1
        ? [
            { id: "reverse-notebook-pencil", render: ({ total, firstPrice }) => `买一本练习本和一支铅笔一共付了 ${total} 元，练习本是 ${firstPrice} 元。铅笔是多少元？` },
            { id: "reverse-fruit-snack", render: ({ total, firstPrice }) => `买一个苹果和一盒酸奶一共付了 ${total} 元，苹果是 ${firstPrice} 元。酸奶是多少元？` },
            { id: "reverse-ticket-sticker", render: ({ total, firstPrice }) => `买一张活动票和一张贴纸一共付了 ${total} 元，活动票是 ${firstPrice} 元。贴纸是多少元？` },
          ]
        : [
            { id: "reverse-pencil-set", render: ({ total, quantity }) => `买 ${quantity} 支彩笔一共付了 ${total} 元。每支彩笔是多少元？` },
            { id: "reverse-plant-pot", render: ({ total, quantity }) => `买 ${quantity} 个小花盆一共付了 ${total} 元。每个小花盆是多少元？` },
            { id: "reverse-museum-card", render: ({ total, quantity }) => `买 ${quantity} 张参观卡一共付了 ${total} 元。每张参观卡是多少元？` },
          ],
      seed,
      { total, firstPrice, quantity },
    );
    return {
      ...context,
      answer: secondPrice,
      answerRule: isG1 ? `${total} - ${firstPrice}` : `${total} / ${quantity}`,
      reverseQuestionApplied: true,
      steps: isG1
        ? ["确认总价和已知价格", "题目要求另一件物品的价格", "用总价减已知价格", "把两件价格相加检查"]
        : ["确认总价和数量", "题目要求每一件的价格", "用总价除以数量", "用单价乘数量检查总价"],
      hints: isG1
        ? ["两件物品的价格合起来是总价。", "另一件价格 = 总价 - 已知价格。", `${total} - ${firstPrice} = ${secondPrice}。`]
        : ["每支、每个、每张表示相同的单价。", "单价 = 总价 ÷ 数量。", `${total} ÷ ${quantity} = ${secondPrice}。`],
    };
  },
  perimeter_area_rectangle: ({ seed }) => {
    const length = 8 + seed;
    const width = 4 + seed;
    const area = length * width;
    const context = chooseContext(
      [
        { id: "reverse-school-garden", render: ({ area, length }) => `学校长方形花坛面积是 ${area} 平方米，长是 ${length} 米。宽是多少米？` },
        { id: "reverse-photo-paper", render: ({ area, length }) => `一张长方形彩纸面积是 ${area} 平方厘米，长是 ${length} 厘米。宽是多少厘米？` },
        { id: "reverse-vegetable-plot", render: ({ area, length }) => `一块长方形菜地面积是 ${area} 平方米，长是 ${length} 米。宽是多少米？` },
      ],
      seed,
      { area, length },
    );
    return {
      ...context,
      answer: width,
      answerRule: `${area} / ${length}`,
      reverseQuestionApplied: true,
      steps: ["确认已知面积和长", "写出面积等于长乘宽", "用面积除以长求宽", "用长乘宽检查面积"],
      hints: ["长方形面积 = 长 × 宽。", "宽 = 面积 ÷ 长。", `${area} ÷ ${length} = ${width}。`],
    };
  },
  fraction_part_whole: ({ seed }) => {
    const whole = 24 + seed * 6;
    const denominator = 3;
    const numerator = 2;
    const part = (whole / denominator) * numerator;
    const context = chooseContext(
      [
        { id: "reverse-candy-box", render: ({ part, numerator, denominator }) => `小安吃了 ${part} 颗糖，占一盒糖的 ${numerator}/${denominator}。这盒糖原来有多少颗？` },
        { id: "reverse-book-shelf", render: ({ part, numerator, denominator }) => `小雨读完了 ${part} 本书，占书架上图书的 ${numerator}/${denominator}。书架上原来有多少本书？` },
        { id: "reverse-paper-stars", render: ({ part, numerator, denominator }) => `蓝色纸星星有 ${part} 颗，占全部纸星星的 ${numerator}/${denominator}。一共折了多少颗纸星星？` },
      ],
      seed,
      { part, numerator, denominator },
    );
    return {
      ...context,
      answer: whole,
      answerRule: `${part} / ${numerator} * ${denominator}`,
      reverseQuestionApplied: true,
      steps: ["读懂已知的是几份的数量", "先求一份的数量", "把一份数乘总份数", "把结果取相应分数检查"],
      hints: [`${numerator}/${denominator} 表示 ${denominator} 份里的 ${numerator} 份。`, `先用 ${part} ÷ ${numerator} 求一份。`, `${part} ÷ ${numerator} × ${denominator} = ${whole}。`],
    };
  },
  average_total_count: ({ seed }) => {
    const count = 4;
    const average = 12 + seed;
    const total = average * count;
    const context = chooseContext(
      [
        { id: "reverse-math-practice", render: ({ total, count }) => `${count} 次数学小练习一共做对 ${total} 题，平均每次做对多少题？` },
        { id: "reverse-reading-pages", render: ({ total, count }) => `${count} 天里，小明一共读了 ${total} 页书，平均每天读多少页？` },
        { id: "reverse-tree-planting", render: ({ total, count }) => `植树活动连续 ${count} 天，一共种了 ${total} 棵树，平均每天种多少棵？` },
      ],
      seed,
      { total, count },
    );
    return {
      ...context,
      answer: average,
      answerRule: `${total} / ${count}`,
      reverseQuestionApplied: true,
      steps: ["确认总数和次数", "题目要求平均数", "用总数除以次数", "用平均数乘次数检查总数"],
      hints: ["平均数表示每一份同样多时的一份数量。", "平均数 = 总数 ÷ 个数。", `${total} ÷ ${count} = ${average}。`],
    };
  },
  ratio_rate_unit: ({ seed }) => {
    const ratioA = 2;
    const ratioB = 5;
    const unit = 3 + seed;
    const target = ratioB * unit;
    const context = chooseContext(
      [
        { id: "reverse-art-club", render: ({ ratioA, ratioB, target }) => `美术小组男生和女生人数的比是 ${ratioA}:${ratioB}，女生有 ${target} 人。1 份是多少人？` },
        { id: "reverse-juice-mix", render: ({ ratioA, ratioB, target }) => `果汁中橙汁和苹果汁的份数比是 ${ratioA}:${ratioB}，苹果汁有 ${target} 杯。1 份是多少杯？` },
        { id: "reverse-team-balls", render: ({ ratioA, ratioB, target }) => `器材室里篮球和足球的数量比是 ${ratioA}:${ratioB}，足球有 ${target} 个。1 份是多少个？` },
      ],
      seed,
      { ratioA, ratioB, target },
    );
    return {
      ...context,
      answer: unit,
      answerRule: `${target} / ${ratioB}`,
      reverseQuestionApplied: true,
      steps: ["读懂要求部分对应的份数", "确认该部分的实际数量", "用实际数量除以对应份数", "用每份数乘份数检查"],
      hints: [`要求部分对应 ${ratioB} 份。`, "1 份 = 对应部分数量 ÷ 对应份数。", `${target} ÷ ${ratioB} = ${unit}。`],
    };
  },
  measurement_conversion: ({ seed }) => {
    const meters = 3 + seed;
    const centimeters = 45 + seed * 4;
    const total = meters * 100 + centimeters;
    const context = chooseContext(
      [
        {
          id: "reverse-ribbon-whole-meters",
          render: ({ total, centimeters }) =>
            `一根彩带一共长 ${total} 厘米，其中末端有 ${centimeters} 厘米没有凑成整米。这根彩带有多少整米？`,
        },
        {
          id: "reverse-rope-whole-meters",
          render: ({ total, centimeters }) =>
            `一根跳绳一共长 ${total} 厘米，其中有 ${centimeters} 厘米是零头部分。跳绳有多少整米？`,
        },
      ],
      seed,
      { total, centimeters },
    );
    return {
      ...context,
      answer: meters,
      answerRule: `(${total} - ${centimeters}) / 100`,
      reverseQuestionApplied: true,
      steps: ["确认总长度和零头长度的单位都是厘米", "先去掉没有凑成整米的部分", "把剩下的厘米数换成米", "把米和零头厘米合起来检查总长度"],
      hints: ["先把零头的厘米数从总厘米数中去掉。", "剩下的是整米部分，要用 100 厘米换成 1 米。", `(${total} - ${centimeters}) ÷ 100 = ${meters}。`],
    };
  },
  volume_rectangular_prism: ({ seed }) => {
    const length = 6 + seed;
    const width = 3 + (seed % 4);
    const height = 2 + (seed % 3);
    const volume = length * width * height;
    const context = chooseContext(
      [
        {
          id: "reverse-storage-box-height",
          render: ({ volume, length, width }) =>
            `一个长方体收纳盒体积是 ${volume} 立方分米，长 ${length} 分米，宽 ${width} 分米。高是多少分米？`,
        },
        {
          id: "reverse-fish-tank-height",
          render: ({ volume, length, width }) =>
            `一个长方体鱼缸能装 ${volume} 立方分米的水，长 ${length} 分米，宽 ${width} 分米。鱼缸高是多少分米？`,
        },
      ],
      seed,
      { volume, length, width },
    );
    return {
      ...context,
      answer: height,
      answerRule: `${volume} / ${length} / ${width}`,
      reverseQuestionApplied: true,
      steps: ["确认已知体积、长和宽", "把长和宽看成一个底面积", "用体积连续除以长和宽求高", "用长乘宽乘高检查体积"],
      hints: ["长方体体积 = 长 × 宽 × 高。", "高 = 体积 ÷ 长 ÷ 宽。", `${volume} ÷ ${length} ÷ ${width} = ${height}。`],
    };
  },
  distance_speed_time: ({ seed }) => {
    const speed = 12 + seed * 2;
    const time = 2 + (seed % 3);
    const distance = speed * time;
    const context = chooseContext(
      [
        {
          id: "reverse-sightseeing-bus-time",
          render: ({ speed, distance }) =>
            `一辆观光车平均每小时行驶 ${speed} 千米，一共行驶了 ${distance} 千米。行驶了多少小时？`,
        },
        {
          id: "reverse-campus-shuttle-time",
          render: ({ speed, distance }) =>
            `校园接驳车平均每小时行驶 ${speed} 千米，行驶了 ${distance} 千米。用了多少小时？`,
        },
      ],
      seed,
      { speed, distance },
    );
    return {
      ...context,
      answer: time,
      answerRule: `${distance} / ${speed}`,
      reverseQuestionApplied: true,
      steps: ["确认已知路程和速度", "题目要求的是时间", "用路程除以速度求时间", "用速度乘时间检查路程"],
      hints: ["速度表示每小时行驶的路程。", "时间 = 路程 ÷ 速度。", `${distance} ÷ ${speed} = ${time}。`],
    };
  },
  decimal_money_measure: ({ seed }) => {
    const partA = Number((7.5 + seed * 0.5).toFixed(1));
    const partB = Number((2.4 + (seed % 5) * 0.2).toFixed(1));
    const total = Number((partA + partB).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "reverse-decimal-art-supplies",
          render: ({ total, partA }) => `一套写生用品一共是 ${total} 元，其中水彩笔是 ${partA} 元。素描本是多少元？`,
        },
        {
          id: "reverse-decimal-ribbon-length",
          render: ({ total, partA }) => `两段彩带一共长 ${total} 米，蓝丝带长 ${partA} 米。黄丝带长多少米？`,
        },
      ],
      seed,
      { total, partA },
    );
    return {
      ...context,
      answer: partB,
      answerRule: `${total} - ${partA}`,
      reverseQuestionApplied: true,
      steps: ["确认总量和已知的一部分", "题目要求另一部分", "用总量减去已知部分", "把两个部分相加检查总量"],
      hints: ["题目给出了合起来的总量。", "未知部分 = 总量 - 已知部分。", `${total} - ${partA} = ${partB}。`],
    };
  },
  decimal_multiply_unit_price: ({ seed }) => {
    const unitPrice = Number((2.5 + seed * 0.4).toFixed(1));
    const quantity = 3 + (seed % 4);
    const total = Number((unitPrice * quantity).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "reverse-decimal-pen-price",
          render: ({ total, quantity }) => `买 ${quantity} 支水彩笔一共付了 ${total} 元。每支水彩笔是多少元？`,
        },
        {
          id: "reverse-decimal-ribbon-unit",
          render: ({ total, quantity }) => `准备 ${quantity} 卷同样长的丝带，一共长 ${total} 米。每卷丝带长多少米？`,
        },
      ],
      seed,
      { total, quantity },
    );
    return {
      ...context,
      answer: unitPrice,
      answerRule: `${total} / ${quantity}`,
      reverseQuestionApplied: true,
      steps: ["确认总价或总量和份数", "题目要求每一份的数量", "用总量除以份数", "用每份数量乘份数检查总量"],
      hints: ["每支、每卷表示同样的一份。", "每份数量 = 总量 ÷ 份数。", `${total} ÷ ${quantity} = ${unitPrice}。`],
    };
  },
  triangle_area_application: ({ seed }) => {
    const base = 6 + 2 * (seed % 6);
    const height = 3 + (seed % 6);
    const area = (base * height) / 2;
    const context = chooseContext(
      [
        {
          id: "reverse-triangle-flag-height",
          render: ({ area, base }) => `一面三角形小旗面积是 ${area} 平方分米，底是 ${base} 分米。高是多少分米？`,
        },
        {
          id: "reverse-triangle-garden-height",
          render: ({ area, base }) => `一块三角形花圃面积是 ${area} 平方米，底是 ${base} 米。高是多少米？`,
        },
      ],
      seed,
      { area, base },
    );
    return {
      ...context,
      answer: height,
      answerRule: `${area} * 2 / ${base}`,
      reverseQuestionApplied: true,
      steps: ["确认已知面积和底", "写出三角形面积关系", "用面积乘 2 再除以底求高", "把底和高代回面积公式检查"],
      hints: ["三角形面积 = 底 × 高 ÷ 2。", "高 = 面积 × 2 ÷ 底。", `${area} × 2 ÷ ${base} = ${height}。`],
    };
  },
  multiplication_division_inverse: ({ seed }) => {
    const unitAmount = 3 + (seed % 6);
    const groupCount = 3 + (seed % 5);
    const total = unitAmount * groupCount;
    const context = chooseContext(
      [
        {
          id: "reverse-inverse-pencil-groups",
          render: ({ total, unitAmount }) => `有 ${total} 支铅笔，每个笔盒装 ${unitAmount} 支。一共可以装几盒？`,
        },
        {
          id: "reverse-inverse-seat-rows",
          render: ({ total, unitAmount }) => `礼堂有 ${total} 个座位，每排有 ${unitAmount} 个座位。一共有几排？`,
        },
      ],
      seed,
      { total, unitAmount },
    );
    return {
      ...context,
      answer: groupCount,
      answerRule: `${total} / ${unitAmount}`,
      reverseQuestionApplied: true,
      steps: ["确认总数和每组数量", "题目要求组数", "用总数除以每组数量", "用组数乘每组数量检查"],
      hints: ["每个笔盒、每排都是一组。", "组数 = 总数 ÷ 每组数量。", `${total} ÷ ${unitAmount} = ${groupCount}。`],
    };
  },
  operation_structure_distributive: ({ seed }) => {
    const groupCount = 12 + seed;
    const partA = 4 + (seed % 4);
    const partB = 6;
    const total = groupCount * (partA + partB);
    const context = chooseContext(
      [
        {
          id: "reverse-structure-learning-packages",
          render: ({ total, partA, partB }) =>
            `学校一共准备了 ${total} 件学习用品，每个学习包有 ${partA} 本练习本和 ${partB} 支铅笔。一共准备了多少个学习包？`,
        },
        {
          id: "reverse-structure-library-shelves",
          render: ({ total, partA, partB }) =>
            `图书角一共有 ${total} 本书，每层放 ${partA} 本故事书和 ${partB} 本科普书。一共有多少层书架？`,
        },
      ],
      seed,
      { total, partA, partB },
    );
    return {
      ...context,
      answer: groupCount,
      answerRule: `${total} / (${partA} + ${partB})`,
      reverseQuestionApplied: true,
      steps: ["先求每一组里一共有多少件", "确认已知总数", "用总数除以每组总数", "用组数乘每组数量检查总数"],
      hints: ["先把每组的两部分合起来。", "组数 = 总数 ÷ 每组总数。", `${total} ÷ (${partA} + ${partB}) = ${groupCount}。`],
    };
  },
  ratio_total_split: ({ seed }) => {
    const ratioA = 2;
    const ratioB = 3;
    const unitPart = 3 + seed;
    const target = ratioB * unitPart;
    const context = chooseContext(
      [
        {
          id: "reverse-ratio-club-total",
          render: ({ ratioA, ratioB, target }) =>
            `社团里男生和女生人数的比是 ${ratioA}:${ratioB}，女生有 ${target} 人。社团一共有多少人？`,
        },
        {
          id: "reverse-ratio-juice-total",
          render: ({ ratioA, ratioB, target }) =>
            `果汁里橙汁和苹果汁的份数比是 ${ratioA}:${ratioB}，苹果汁有 ${target} 杯。一共调了多少杯果汁？`,
        },
      ],
      seed,
      { ratioA, ratioB, target },
    );
    return {
      ...context,
      answer: (ratioA + ratioB) * unitPart,
      answerRule: `${target} / ${ratioB} * (${ratioA} + ${ratioB})`,
      reverseQuestionApplied: true,
      steps: ["确认已知部分对应的份数", "先求每一份是多少", "再求总份数对应的总量", "用总量按比拆分检查已知部分"],
      hints: [`已知的女生或苹果汁对应 ${ratioB} 份。`, "先用已知部分除以对应份数，再乘总份数。", `${target} ÷ ${ratioB} × (${ratioA} + ${ratioB}) = ${(ratioA + ratioB) * unitPart}。`],
    };
  },
  trapezoid_area_application: ({ seed }) => {
    const upperBase = 4 + 2 * (seed % 5);
    const lowerBase = upperBase + 4 + 2 * (seed % 3);
    const height = 3 + (seed % 5);
    const area = ((upperBase + lowerBase) * height) / 2;
    const context = chooseContext(
      [
        {
          id: "reverse-trapezoid-garden-height",
          render: ({ area, upperBase, lowerBase }) =>
            `一块梯形花圃面积是 ${area} 平方米，上底是 ${upperBase} 米，下底是 ${lowerBase} 米。高是多少米？`,
        },
        {
          id: "reverse-trapezoid-flag-height",
          render: ({ area, upperBase, lowerBase }) =>
            `一面梯形小旗面积是 ${area} 平方分米，上底是 ${upperBase} 分米，下底是 ${lowerBase} 分米。高是多少分米？`,
        },
      ],
      seed,
      { area, upperBase, lowerBase },
    );
    return {
      ...context,
      answer: height,
      answerRule: `${area} * 2 / (${upperBase} + ${lowerBase})`,
      reverseQuestionApplied: true,
      steps: ["确认已知面积和两条底", "先把两条底的长度相加", "用面积乘 2 再除以底和求高", "把上底、下底和高代回公式检查"],
      hints: ["梯形面积 = （上底 + 下底）× 高 ÷ 2。", "高 = 面积 × 2 ÷ （上底 + 下底）。", `${area} × 2 ÷ (${upperBase} + ${lowerBase}) = ${height}。`],
    };
  },
  proportion_scale_application: ({ seed }) => {
    const scaleKilometers = 1 + (seed % 3);
    const scaleDenominator = scaleKilometers * 100000;
    const mapLength = 2 + (seed % 7);
    const actualDistance = mapLength * scaleKilometers;
    const context = chooseContext(
      [
        {
          id: "reverse-scale-city-map-length",
          render: ({ scaleDenominator, actualDistance }) =>
            `一张城市地图的比例尺是 1:${scaleDenominator}。学校到图书馆的实际距离是 ${actualDistance} 千米，地图上距离是多少厘米？`,
        },
        {
          id: "reverse-scale-park-map-length",
          render: ({ scaleDenominator, actualDistance }) =>
            `公园导览图的比例尺是 1:${scaleDenominator}。入口到湖边的实际距离是 ${actualDistance} 千米，图上距离是多少厘米？`,
        },
      ],
      seed,
      { scaleDenominator, actualDistance },
    );
    return {
      ...context,
      answer: mapLength,
      answerRule: `${actualDistance} * 100000 / ${scaleDenominator}`,
      reverseQuestionApplied: true,
      steps: ["确认比例尺和实际距离", "把实际千米换成对应的厘米数", "用实际长度除以比例尺分母求图上长度", "把图上长度按比例放大检查实际距离"],
      hints: ["比例尺的分母表示图上 1 厘米对应的实际厘米数。", "图上长度 = 实际长度 × 100000 ÷ 比例尺分母。", `${actualDistance} × 100000 ÷ ${scaleDenominator} = ${mapLength}。`],
    };
  },
  addition_subtraction_regrouping: ({ seed }) => {
    const firstAmount = (2 + (seed % 3)) * 10 + 6 + (seed % 4);
    const secondAmount = (1 + (seed % 2)) * 10 + 7 + (seed % 3);
    const total = firstAmount + secondAmount;
    const context = chooseContext(
      [
        {
          id: "reverse-regrouping-library-part",
          render: ({ total, firstAmount }) => `图书角一共有 ${total} 本书，其中故事书有 ${firstAmount} 本。科普书有多少本？`,
        },
        {
          id: "reverse-regrouping-sticker-part",
          render: ({ total, firstAmount }) => `小安和小林一共有 ${total} 张贴纸，小安有 ${firstAmount} 张。小林有多少张？`,
        },
      ],
      seed,
      { total, firstAmount },
    );
    return {
      ...context,
      answer: secondAmount,
      answerRule: `${total} - ${firstAmount}`,
      reverseQuestionApplied: true,
      steps: ["确认整体数量和已知部分", "题目要求另一部分", "个位不够减时从十位借 1", "把两部分相加检查整体"],
      hints: ["未知部分 = 整体 - 已知部分。", "先从十位借 1 个十，再完成个位减法。", `${total} - ${firstAmount} = ${secondAmount}。`],
    };
  },
  data_range_comparison: ({ seed }) => {
    const minimumValue = 8 + (seed % 5);
    const maximumValue = 20 + seed;
    const range = maximumValue - minimumValue;
    const context = chooseContext(
      [
        {
          id: "reverse-range-reading-maximum",
          render: ({ minimumValue, range }) => `阅读小组里读得最少的是 ${minimumValue} 页，读得最多的比最少的多 ${range} 页。读得最多的是多少页？`,
        },
        {
          id: "reverse-range-seedling-maximum",
          render: ({ minimumValue, range }) => `三块试验田中幼苗最少的是 ${minimumValue} 株，最多的比最少的多 ${range} 株。最多的是多少株？`,
        },
      ],
      seed,
      { minimumValue, range },
    );
    return {
      ...context,
      answer: maximumValue,
      answerRule: `${minimumValue} + ${range}`,
      reverseQuestionApplied: true,
      steps: ["确认最少值和相差数量", "题目要求最多值", "用最少值加上相差数量", "用最多值减最少值检查相差数量"],
      hints: ["题目已知的是最少值和相差多少。", "最多值 = 最少值 + 相差数量。", `${minimumValue} + ${range} = ${maximumValue}。`],
    };
  },
  geometry_angle_reasoning: ({ seed }) => {
    const knownAngle = 40 + seed * 4;
    const otherAngle = 180 - knownAngle;
    const context = chooseContext(
      [
        {
          id: "reverse-angle-paper-fold",
          render: ({ otherAngle }) => `折纸时两个相邻角拼成一个平角，共 180°。其中一个角是 ${otherAngle}°，另一个角是多少度？`,
        },
        {
          id: "reverse-angle-road-sign",
          render: ({ otherAngle }) => `路标上两个相邻角合起来是 180°。已知一个角是 ${otherAngle}°，另一个角是多少度？`,
        },
      ],
      seed,
      { otherAngle },
    );
    return {
      ...context,
      answer: knownAngle,
      answerRule: `180 - ${otherAngle}`,
      reverseQuestionApplied: true,
      steps: ["确认两个角合起来是平角", "写出平角总度数 180°", "用 180° 减已知角", "把两个角相加检查是否为 180°"],
      hints: ["平角一共是 180°。", "另一个角 = 180° - 已知角。", `180° - ${otherAngle}° = ${knownAngle}°。`],
    };
  },
  percent_change: ({ seed }) => {
    const base = 200 + seed * 20;
    const payablePercent = 85;
    const salePrice = base * (payablePercent / 100);
    const context = chooseContext(
      [
        {
          id: "reverse-percent-jacket-base",
          render: ({ salePrice, payablePercent }) => `一件外套按原价的 ${payablePercent}% 出售，现价是 ${salePrice} 元。原价是多少元？`,
        },
        {
          id: "reverse-percent-book-base",
          render: ({ salePrice, payablePercent }) => `图书节套装按原价的 ${payablePercent}% 出售，现价是 ${salePrice} 元。原价是多少元？`,
        },
      ],
      seed,
      { salePrice, payablePercent },
    );
    return {
      ...context,
      answer: base,
      answerRule: `${salePrice} / ${payablePercent}%`,
      reverseQuestionApplied: true,
      steps: ["确认现价对应原价的百分之几", "把百分数写成折扣率", "用现价除以折扣率求原价", "用原价乘折扣率检查现价"],
      hints: [`现价是原价的 ${payablePercent}%。`, "原价 = 现价 ÷ 折扣率。", `${salePrice} ÷ ${payablePercent}% = ${base}。`],
    };
  },
  fraction_add_same_denominator: ({ seed }) => {
    const denominator = 6;
    const whole = 24 + seed * 6;
    const firstNumerator = 1 + (seed % 2);
    const secondNumerator = 2;
    const combinedNumerator = firstNumerator + secondNumerator;
    const combinedAmount = (whole / denominator) * combinedNumerator;
    const context = chooseContext(
      [
        {
          id: "reverse-fraction-add-paper-stars-total",
          render: ({ combinedAmount, firstNumerator, secondNumerator, denominator }) =>
            `手工课两组一共用了 ${combinedAmount} 颗纸星星。第一组用了全部的 ${firstNumerator}/${denominator}，第二组用了全部的 ${secondNumerator}/${denominator}。原来一共有多少颗纸星星？`,
        },
        {
          id: "reverse-fraction-add-garden-seeds-total",
          render: ({ combinedAmount, firstNumerator, secondNumerator, denominator }) =>
            `花园两块地一共种了 ${combinedAmount} 粒种子。第一块地种了全部的 ${firstNumerator}/${denominator}，第二块地种了全部的 ${secondNumerator}/${denominator}。原来一共有多少粒种子？`,
        },
      ],
      seed,
      { combinedAmount, firstNumerator, secondNumerator, denominator },
    );
    return {
      ...context,
      answer: whole,
      answerRule: `${combinedAmount} / (${firstNumerator} + ${secondNumerator}) * ${denominator}`,
      reverseQuestionApplied: true,
      steps: ["确认两组取的都是同样大小的六分之一", "先把两个分子相加，找出已知数量对应几份", "用已知数量除以份数，求出一份的数量", "用一份数量乘 6，检查整体"],
      hints: ["分母相同，说明每一份大小一样。", `${firstNumerator}/${denominator} 和 ${secondNumerator}/${denominator} 合起来是 ${combinedNumerator}/${denominator}。`, `${combinedAmount} ÷ ${combinedNumerator} × ${denominator} = ${whole}。`],
    };
  },
  fraction_subtract_same_denominator: ({ seed }) => {
    const denominator = 6;
    const whole = 36 + seed * 6;
    const largerNumerator = 4 + (seed % 2);
    const smallerNumerator = 1;
    const differenceNumerator = largerNumerator - smallerNumerator;
    const differenceAmount = (whole / denominator) * differenceNumerator;
    const context = chooseContext(
      [
        {
          id: "reverse-fraction-difference-paper-total",
          render: ({ differenceAmount, largerNumerator, smallerNumerator, denominator }) =>
            `手工课第一组用了全部彩纸的 ${largerNumerator}/${denominator}，第二组用了 ${smallerNumerator}/${denominator}。第一组比第二组多用了 ${differenceAmount} 张。原来一共有多少张彩纸？`,
        },
        {
          id: "reverse-fraction-difference-seed-total",
          render: ({ differenceAmount, largerNumerator, smallerNumerator, denominator }) =>
            `花园第一块地种了全部种子的 ${largerNumerator}/${denominator}，第二块地种了 ${smallerNumerator}/${denominator}。第一块地比第二块地多种了 ${differenceAmount} 粒。原来一共有多少粒种子？`,
        },
      ],
      seed,
      { differenceAmount, largerNumerator, smallerNumerator, denominator },
    );
    return {
      ...context,
      answer: whole,
      answerRule: `${differenceAmount} / (${largerNumerator} - ${smallerNumerator}) * ${denominator}`,
      reverseQuestionApplied: true,
      steps: ["确认两次分的都是六等份", "先求两个分数相差几份", "用相差的实际数量除以相差份数，求出一份", "把一份数量乘 6，检查整体"],
      hints: ["同分母的分数可以直接比较分子。", `${largerNumerator}/${denominator} 比 ${smallerNumerator}/${denominator} 多 ${differenceNumerator}/${denominator}。`, `${differenceAmount} ÷ ${differenceNumerator} × ${denominator} = ${whole}。`],
    };
  },
  decimal_divide_equal_share: ({ seed }) => {
    const quantity = 2 + (seed % 4);
    const unitPrice = Number((3.5 + (seed % 7) * 0.5).toFixed(1));
    const totalPrice = Number((unitPrice * quantity).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "reverse-decimal-notebook-quantity",
          render: ({ unitPrice, totalPrice }) => `每本练习本 ${unitPrice} 元，一共付了 ${totalPrice} 元。买了多少本同样的练习本？`,
        },
        {
          id: "reverse-decimal-ribbon-quantity",
          render: ({ unitPrice, totalPrice }) => `每段丝带长 ${unitPrice} 米，一共有 ${totalPrice} 米同样长的丝带。可以分成多少段？`,
        },
      ],
      seed,
      { unitPrice, totalPrice },
    );
    return {
      ...context,
      answer: quantity,
      answerRule: `${totalPrice} / ${unitPrice}`,
      reverseQuestionApplied: true,
      steps: ["确认总价或总量和每一份的数量", "题目要求同样的份数", "用总量除以每一份的量", "用份数乘每份量检查总量"],
      hints: ["每本、每段表示每一份都一样。", "份数 = 总量 ÷ 每份量。", `${totalPrice} ÷ ${unitPrice} = ${quantity}。`],
    };
  },
  fraction_equivalent_compare: ({ seed }) => {
    const whole = 48 + seed * 8;
    const firstNumerator = 2 + (seed % 2);
    const differenceEighths = 1 + (seed % 2);
    const secondNumerator = firstNumerator * 2 - differenceEighths;
    const differenceAmount = (whole / 8) * differenceEighths;
    const context = chooseContext(
      [
        {
          id: "reverse-equivalent-fraction-stickers-total",
          render: ({ firstNumerator, secondNumerator, differenceAmount }) =>
            `班级贴纸中，第一组用了全部的 ${firstNumerator}/4，第二组用了全部的 ${secondNumerator}/8。第一组比第二组多用了 ${differenceAmount} 张。原来一共有多少张贴纸？`,
        },
        {
          id: "reverse-equivalent-fraction-seeds-total",
          render: ({ firstNumerator, secondNumerator, differenceAmount }) =>
            `花园种子中，甲地种了全部的 ${firstNumerator}/4，乙地种了全部的 ${secondNumerator}/8。甲地比乙地多种了 ${differenceAmount} 粒。原来一共有多少粒种子？`,
        },
      ],
      seed,
      { firstNumerator, secondNumerator, differenceAmount },
    );
    return {
      ...context,
      answer: whole,
      answerRule: `${differenceAmount} / (${firstNumerator} * 2 - ${secondNumerator}) * 8`,
      reverseQuestionApplied: true,
      steps: ["把四分之几改写成八分之几", "找出两个分数相差几份八分之一", "用相差数量除以相差份数，求出一份八分之一", "把一份八分之一乘 8，检查整体"],
      hints: [`${firstNumerator}/4 可以改写成 ${firstNumerator * 2}/8。`, `两个分数相差 ${differenceEighths}/8。`, `${differenceAmount} ÷ ${differenceEighths} × 8 = ${whole}。`],
    };
  },
  coordinate_movement: ({ seed }) => {
    const startX = 2 + (seed % 6);
    const startY = 3 + (seed % 5);
    const horizontalShift = 4 + (seed % 7);
    const targetX = startX + horizontalShift;
    const context = chooseContext(
      [
        {
          id: "reverse-coordinate-park-start",
          render: ({ targetX, startY, horizontalShift }) =>
            `方格地图上，B 点坐标是 (${targetX}, ${startY})。A 点向右移动 ${horizontalShift} 格到 B 点，A 点的横坐标是多少？`,
        },
        {
          id: "reverse-coordinate-robot-start",
          render: ({ targetX, startY, horizontalShift }) =>
            `机器人最后在坐标 (${targetX}, ${startY})。它从起点向右移动了 ${horizontalShift} 格，起点的横坐标是多少？`,
        },
      ],
      seed,
      { targetX, startY, horizontalShift },
    );
    return {
      ...context,
      answer: startX,
      answerRule: `${targetX} - ${horizontalShift}`,
      reverseQuestionApplied: true,
      steps: ["读出终点横坐标和向右移动的格数", "确认向右移动只改变横坐标", "用终点横坐标减移动格数", "把结果加上移动格数检查终点"],
      hints: ["终点横坐标 = 起点横坐标 + 向右移动的格数。", "要求起点时，要从终点倒回来。", `${targetX} - ${horizontalShift} = ${startX}。`],
    };
  },
  number_composition_place_value: ({ seed }) => {
    const tens = 2 + (seed % 7);
    const ones = (3 + seed) % 10;
    const number = tens * 10 + ones;
    const context = chooseContext(
      [
        {
          id: "reverse-place-value-book-bundles",
          render: ({ number, ones }) => `图书角一共有 ${number} 本故事书。每 10 本扎成一捆，剩下 ${ones} 本没有扎。扎成了多少整捆？`,
        },
        {
          id: "reverse-place-value-sticker-bundles",
          render: ({ number, ones }) => `手工课有 ${number} 张贴纸。每 10 张装成一包，剩下 ${ones} 张散贴纸。装成了多少整包？`,
        },
      ],
      seed,
      { number, ones },
    );
    return {
      ...context,
      answer: tens,
      answerRule: `(${number} - ${ones}) / 10`,
      reverseQuestionApplied: true,
      steps: ["确认总数由整捆和零散部分组成", "先从总数减去零散部分", "把剩下的数量按每捆 10 个来分", "用整捆数乘 10 再加零散部分检查"],
      hints: ["先去掉没有扎成整捆的部分。", "剩下的数量都是一捆 10 个。", `(${number} - ${ones}) ÷ 10 = ${tens}。`],
    };
  },
  unknown_part_add_subtract: ({ seed }) => {
    const knownPart = 8 + seed;
    const unknownPart = 4 + (seed % 6);
    const whole = knownPart + unknownPart;
    const context = chooseContext(
      [
        {
          id: "reverse-unknown-part-flowers-complete",
          render: ({ whole, unknownPart }) => `班级一共需要摆好 ${whole} 朵花，现在还差 ${unknownPart} 朵。已经摆好多少朵？`,
        },
        {
          id: "reverse-unknown-part-cards-complete",
          render: ({ whole, unknownPart }) => `一套阅读卡一共有 ${whole} 张，现在还剩 ${unknownPart} 张没有整理。已经整理了多少张？`,
        },
      ],
      seed,
      { whole, unknownPart },
    );
    return {
      ...context,
      answer: knownPart,
      answerRule: `${whole} - ${unknownPart}`,
      reverseQuestionApplied: true,
      steps: ["确认整体数量和还没有完成的部分", "题目要求已经完成的部分", "用整体减去剩余部分", "把已完成和剩余部分相加检查整体"],
      hints: ["整体 = 已经完成的部分 + 还剩的部分。", "已经完成的部分 = 整体 - 还剩的部分。", `${whole} - ${unknownPart} = ${knownPart}。`],
    };
  },
  data_table_chart: ({ seed }) => {
    const monday = 18 + seed;
    const tuesday = 24 + seed;
    const difference = tuesday - monday;
    const context = chooseContext(
      [
        {
          id: "reverse-table-library-monday",
          render: ({ tuesday, difference }) => `阅读统计表中，周二借书 ${tuesday} 本，周二比周一多借 ${difference} 本。周一借书多少本？`,
        },
        {
          id: "reverse-table-recycling-monday",
          render: ({ tuesday, difference }) => `回收统计表中，周二收集 ${tuesday} 个瓶子，周二比周一多收集 ${difference} 个。周一收集多少个？`,
        },
      ],
      seed,
      { tuesday, difference },
    );
    return {
      ...context,
      answer: monday,
      answerRule: `${tuesday} - ${difference}`,
      reverseQuestionApplied: true,
      steps: ["找到周二数据和两天的相差数量", "确认周二是较多的数据", "用周二数据减去相差数量", "用周一数据加差额检查周二数据"],
      hints: ["题目已知的是较多的一天。", "周一 = 周二 - 多出的数量。", `${tuesday} - ${difference} = ${monday}。`],
    };
  },
  multi_step_total_quantity: ({ seed }) => {
    const groupCount = 6 + seed;
    const unitAmount = 4 + (seed % 2);
    const afternoonAmount = unitAmount * (2 + (seed % 3));
    const total = groupCount * unitAmount;
    const morningAmount = total - afternoonAmount;
    const context = chooseContext(
      [
        {
          id: "reverse-total-quantity-library-afternoon",
          render: ({ groupCount, unitAmount, morningAmount }) =>
            `图书角的书刚好放满 ${groupCount} 个书架，每个书架放 ${unitAmount} 本。上午已经收到 ${morningAmount} 本，下午又收到多少本？`,
        },
        {
          id: "reverse-total-quantity-seedling-afternoon",
          render: ({ groupCount, unitAmount, morningAmount }) =>
            `花园的幼苗刚好放满 ${groupCount} 个托盘，每个托盘放 ${unitAmount} 盆。上午已经运来 ${morningAmount} 盆，下午又运来多少盆？`,
        },
      ],
      seed,
      { groupCount, unitAmount, morningAmount },
    );
    return {
      ...context,
      answer: afternoonAmount,
      answerRule: `${groupCount} * ${unitAmount} - ${morningAmount}`,
      reverseQuestionApplied: true,
      steps: ["先根据书架或托盘数量求全部数量", "确认上午已经收到的数量", "用全部数量减去上午数量", "把上午和下午数量相加检查总数"],
      hints: ["刚好放满表示总数 = 组数 × 每组数量。", "下午数量 = 总数 - 上午数量。", `${groupCount} × ${unitAmount} - ${morningAmount} = ${afternoonAmount}。`],
    };
  },
  probability_event_decimal: ({ seed }) => {
    const totalCount = 10;
    const favorableCount = 2 * (1 + (seed % 4));
    const probability = Number((favorableCount / totalCount).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "reverse-probability-balls-favorable",
          render: ({ totalCount, probability }) => `盒子里有 ${totalCount} 个大小相同的球。任意摸出 1 个球，摸到红球的可能性是 ${probability}。盒子里有多少个红球？`,
        },
        {
          id: "reverse-probability-cards-favorable",
          render: ({ totalCount, probability }) => `一叠卡片有 ${totalCount} 张。任意抽 1 张，抽到故事卡的可能性是 ${probability}。这叠卡片里有多少张故事卡？`,
        },
      ],
      seed,
      { totalCount, probability },
    );
    return {
      ...context,
      answer: favorableCount,
      answerRule: `${totalCount} * ${probability}`,
      reverseQuestionApplied: true,
      steps: ["确认总结果数和有利结果的可能性", "把可能性看成总数中的一部分", "用总数乘可能性求有利结果数", "用有利结果数除以总数检查可能性"],
      hints: ["可能性 = 有利结果数 ÷ 总结果数。", "反过来，有利结果数 = 总结果数 × 可能性。", `${totalCount} × ${probability} = ${favorableCount}。`],
    };
  },
  division_remainder_grouping: ({ seed }) => {
    const capacity = 4 + (seed % 4);
    const fullGroups = 3 + (seed % 5);
    const remainder = 1 + (seed % Math.max(1, capacity - 1));
    const totalItems = fullGroups * capacity + remainder;
    const context = chooseContext(
      [
        {
          id: "reverse-remainder-book-capacity",
          render: ({ totalItems, fullGroups, remainder }) => `图书角有 ${totalItems} 本新书。装满 ${fullGroups} 个收纳盒后，还剩 ${remainder} 本没有装。每个收纳盒最多放多少本？`,
        },
        {
          id: "reverse-remainder-seed-capacity",
          render: ({ totalItems, fullGroups, remainder }) => `有 ${totalItems} 粒种子。装满 ${fullGroups} 袋后，还剩 ${remainder} 粒没有装。每袋最多装多少粒？`,
        },
      ],
      seed,
      { totalItems, fullGroups, remainder },
    );
    return {
      ...context,
      answer: capacity,
      answerRule: `(${totalItems} - ${remainder}) / ${fullGroups}`,
      reverseQuestionApplied: true,
      steps: ["确认总数由装满的几组和余下部分组成", "先从总数减去余下的数量", "把装满部分平均分给已知的组数", "用每组容量乘组数再加余数检查总数"],
      hints: ["余下的数量不在装满的收纳盒里。", "先去掉余数，剩下的是装满的部分。", `(${totalItems} - ${remainder}) ÷ ${fullGroups} = ${capacity}。`],
    };
  },
  linear_equation_word_problem: ({ seed }) => {
    const adultPrice = 10 + seed;
    const difference = 4 + (seed % 3);
    const childPrice = adultPrice - difference;
    const childCount = 2 + (seed % 3);
    const total = adultPrice + childCount * childPrice;
    const context = chooseContext(
      [
        {
          id: "reverse-equation-adult-ticket",
          render: ({ childCount, difference, total }) =>
            `1 张成人票和 ${childCount} 张儿童票一共 ${total} 元。成人票比儿童票贵 ${difference} 元。成人票多少钱？`,
        },
        {
          id: "reverse-equation-notebook-set",
          render: ({ childCount, difference, total }) =>
            `1 本精装笔记本和 ${childCount} 本普通练习本一共 ${total} 元。精装笔记本比普通练习本贵 ${difference} 元。精装笔记本多少钱？`,
        },
      ],
      seed,
      { childCount, difference, total },
    );
    return {
      ...context,
      answer: adultPrice,
      answerRule: `x + ${childCount} * (x - ${difference}) = ${total}`,
      reverseQuestionApplied: true,
      steps: ["确认现在要求的是较贵的一份价格", "设成人票或精装本的价格为 x", `把另一种价格写成 x - ${difference}`, "根据总价列出一元一次方程", "解方程后代回总价检查"],
      hints: ["未知的是较贵的一份价格，所以设它为 x。", `较便宜的一份就是 x - ${difference}。`, `方程是 x + ${childCount}(x - ${difference}) = ${total}，解得 x = ${adultPrice}。`],
    };
  },
  circle_area_application: ({ seed }) => {
    const radius = 2 + (seed % 3);
    const circleCount = 2 + (seed % 3);
    const totalArea = Number((3.14 * radius * radius * circleCount).toFixed(2));
    const context = chooseContext(
      [
        {
          id: "reverse-circle-area-flower-beds",
          render: ({ radius, totalArea }) =>
            `学校圆形花坛的半径都是 ${radius} 米，花坛总面积是 ${totalArea} 平方米。π 取 3.14，学校有多少个这样的花坛？`,
        },
        {
          id: "reverse-circle-area-mats",
          render: ({ radius, totalArea }) =>
            `活动室每张圆形地垫的半径都是 ${radius} 米，所有地垫总面积是 ${totalArea} 平方米。π 取 3.14，一共有多少张地垫？`,
        },
      ],
      seed,
      { radius, totalArea },
    );
    return {
      ...context,
      answer: circleCount,
      answerRule: `${totalArea} / (3.14 * ${radius} * ${radius})`,
      reverseQuestionApplied: true,
      steps: ["确认已知的是所有圆的总面积", "先用半径求一个圆的面积", "用总面积除以一个圆的面积", "检查个数是合理的整数"],
      hints: ["圆面积 = π × 半径 × 半径。", `一个圆的面积是 3.14 × ${radius} × ${radius}。`, `${totalArea} ÷ (3.14 × ${radius} × ${radius}) = ${circleCount}。`],
    };
  },
  decimal_rounding_estimation: ({ seed }) => {
    const wholePart = 2 + (seed % 7);
    const tenths = 1 + (seed % 7);
    const hundredths = 5 + (seed % 5);
    const originalValue = Number((wholePart + tenths / 10 + hundredths / 100).toFixed(2));
    const roundedValue = Number((wholePart + (tenths + 1) / 10).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "reverse-rounding-ribbon-length",
          render: ({ roundedValue, hundredths }) =>
            `一段丝带的长度精确到十分位约是 ${roundedValue} 米，百分位是 ${hundredths}，并且原数精确到百分位。它原来的长度是多少米？`,
        },
        {
          id: "reverse-rounding-water-measure",
          render: ({ roundedValue, hundredths }) =>
            `水壶里的水量精确到十分位约是 ${roundedValue} 升，百分位是 ${hundredths}，并且原数精确到百分位。原来的水量是多少升？`,
        },
      ],
      seed,
      { roundedValue, hundredths },
    );
    return {
      ...context,
      answer: originalValue,
      answerRule: `${roundedValue} - 0.1 + ${hundredths} / 100`,
      reverseQuestionApplied: true,
      steps: ["确认结果是把百分位进位后的十分位", "先从近似数退回 0.1", "再补上已知的百分位", "把得到的小数四舍五入到十分位检查"],
      hints: ["百分位是 5 或更大，所以十分位已经进了 1。", `先用 ${roundedValue} - 0.1 找到原来的十分位。`, `${roundedValue} - 0.1 + ${hundredths}/100 = ${originalValue}。`],
    };
  },
  circle_circumference_application: ({ seed }) => {
    const radius = 2 + (seed % 3);
    const circleCount = 2 + (seed % 3);
    const totalLength = Number((2 * 3.14 * radius * circleCount).toFixed(2));
    const context = chooseContext(
      [
        {
          id: "reverse-circle-circumference-flower-beds",
          render: ({ radius, totalLength }) =>
            `学校给若干个同样大的圆形花坛围边，一共用了 ${totalLength} 米护栏。每个花坛半径是 ${radius} 米，π 取 3.14。有多少个花坛？`,
        },
        {
          id: "reverse-circle-circumference-mats",
          render: ({ radius, totalLength }) =>
            `活动室给若干张同样大的圆形地垫缝边，一共用了 ${totalLength} 米彩带。每张地垫半径是 ${radius} 米，π 取 3.14。有多少张地垫？`,
        },
      ],
      seed,
      { radius, totalLength },
    );
    return {
      ...context,
      answer: circleCount,
      answerRule: `${totalLength} / (2 * 3.14 * ${radius})`,
      reverseQuestionApplied: true,
      steps: ["确认总长度由若干个同样的圆周长组成", "先用半径求一个圆的周长", "用总长度除以一个圆的周长", "检查得到的是合理的整数个数"],
      hints: ["圆周长 = 2 × π × 半径。", `一个圆的周长是 2 × 3.14 × ${radius}。`, `${totalLength} ÷ (2 × 3.14 × ${radius}) = ${circleCount}。`],
    };
  },
  integer_operation_order: ({ seed }) => {
    const groupCount = 3 + (seed % 4);
    const perGroup = 4 + (seed % 6);
    const extraAmount = 6 + (seed % 7);
    const total = groupCount * perGroup + extraAmount;
    const context = chooseContext(
      [
        {
          id: "reverse-operation-order-cards-per-group",
          render: ({ groupCount, extraAmount, total }) => `阅读角有 ${groupCount} 盒同样多的卡片，另外有 ${extraAmount} 张散卡，一共是 ${total} 张。每盒有多少张卡片？`,
        },
        {
          id: "reverse-operation-order-paper-per-group",
          render: ({ groupCount, extraAmount, total }) => `美术课有 ${groupCount} 包同样多的彩纸，另外有 ${extraAmount} 张备用，一共是 ${total} 张。每包有多少张彩纸？`,
        },
      ],
      seed,
      { groupCount, extraAmount, total },
    );
    return {
      ...context,
      answer: perGroup,
      answerRule: `(${total} - ${extraAmount}) / ${groupCount}`,
      reverseQuestionApplied: true,
      steps: ["确认总数由成组部分和散的部分组成", "先从总数减去散的部分", "把成组部分平均分给同样多的组", "用每组数量乘组数再加散的部分检查总数"],
      hints: ["先把散的部分从总数里去掉。", "剩下的是几组同样多的卡片或彩纸。", `(${total} - ${extraAmount}) ÷ ${groupCount} = ${perGroup}。`],
    };
  },
  square_perimeter_intro: ({ seed }) => {
    const sideLength = 4 + seed;
    const perimeter = sideLength * 4;
    const context = chooseContext(
      [
        {
          id: "reverse-square-garden-side",
          render: ({ perimeter }) => `一个正方形小花园的护栏一共长 ${perimeter} 米。它的每条边长多少米？`,
        },
        {
          id: "reverse-square-photo-side",
          render: ({ perimeter }) => `一张正方形照片的边框一共长 ${perimeter} 厘米。照片的一条边长多少厘米？`,
        },
      ],
      seed,
      { perimeter },
    );
    return {
      ...context,
      answer: sideLength,
      answerRule: `${perimeter} / 4`,
      reverseQuestionApplied: true,
      steps: ["确认图形是正方形", "知道四条边一样长", "用总周长除以 4", "用边长乘 4 检查周长"],
      hints: ["正方形有 4 条一样长的边。", "一条边长 = 周长 ÷ 4。", `${perimeter} ÷ 4 = ${sideLength}。`],
    };
  },
};

// These are real multi-step application forms, not S1/S2 support prompts.
// Each relation adds one authored condition and stays inside a family-specific
// answer rule, semantic shape, and numeric boundary.
const MULTI_STEP_EXTENSION_GENERATORS = {
  compare_more_less: ({ seed }) => {
    const base = 28 + seed;
    const difference = 7 + seed;
    const sent = 3 + (seed % 3);
    const greater = base + difference;
    const answer = greater - sent;
    const context = chooseContext(
      [
        {
          id: "multi-step-sticker-share",
          render: ({ base, difference, sent }) =>
            `小雅有 ${base} 张贴纸，小林比小雅多 ${difference} 张。小林送给同学 ${sent} 张后，还剩多少张贴纸？`,
        },
        {
          id: "multi-step-book-share",
          render: ({ base, difference, sent }) =>
            `图书角有 ${base} 本故事书，科普书比故事书多 ${difference} 本。借出 ${sent} 本科普书后，科普书还剩多少本？`,
        },
      ],
      seed,
      { base, difference, sent },
    );
    return {
      ...context,
      answer,
      answerRule: `${base} + ${difference} - ${sent}`,
      multiStepExtensionApplied: true,
      steps: ["先找较少一方和相差数量", "先求较多一方原来有多少", "再减去送出或借出的数量", "代回两个变化前后关系检查"],
      hints: ["先不要把送出的数量和相差数量混在一起。", "先用较少一方加差，求出较多一方原来的数量。", `(${base} + ${difference}) - ${sent} = ${answer}。`],
    };
  },
  part_whole_add_subtract: ({ seed }) => {
    const partA = 16 + seed;
    const partB = 19 + seed;
    const donated = 2 + (seed % 3);
    const answer = partA + partB - donated;
    const context = chooseContext(
      [
        {
          id: "multi-step-library-loan",
          render: ({ partA, partB, donated }) =>
            `图书角有故事书 ${partA} 本，科普书 ${partB} 本。借出 ${donated} 本书后，图书角还剩多少本书？`,
        },
        {
          id: "multi-step-fruit-share",
          render: ({ partA, partB, donated }) =>
            `果篮里有苹果 ${partA} 个，梨 ${partB} 个。送出 ${donated} 个水果后，果篮里还剩多少个？`,
        },
      ],
      seed,
      { partA, partB, donated },
    );
    return {
      ...context,
      answer,
      answerRule: `${partA} + ${partB} - ${donated}`,
      multiStepExtensionApplied: true,
      steps: ["先找两个部分的数量", "先把两个部分合成整体", "再减去借出或送出的数量", "检查剩余数量没有超过原来的整体"],
      hints: ["题目先要求出原来的整体。", "整体 = 第一个部分 + 第二个部分。", `(${partA} + ${partB}) - ${donated} = ${answer}。`],
    };
  },
  equal_groups_multiply_divide: ({ seed }) => {
    const unit = 4 + seed;
    const groups = 6;
    const extra = 2 + (seed % 3);
    const answer = unit * groups + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-pencil-supply",
          render: ({ unit, groups, extra }) =>
            `每个班领 ${unit} 支铅笔，一共有 ${groups} 个班，另外还有 ${extra} 支备用铅笔。一共准备了多少支铅笔？`,
        },
        {
          id: "multi-step-flower-bundles",
          render: ({ unit, groups, extra }) =>
            `花店每束有 ${unit} 枝鲜花，一共扎了 ${groups} 束，另外放了 ${extra} 枝散装花。一共有多少枝花？`,
        },
      ],
      seed,
      { unit, groups, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${unit} * ${groups} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认每组数量和组数", "先求完整组里的总数", "加上另外的备用数量", "检查每一部分都只算了一次"],
      hints: ["先处理每组一样多的部分。", "完整组总数 = 每组数量 × 组数。", `${unit} × ${groups} + ${extra} = ${answer}。`],
    };
  },
  time_elapsed_simple: ({ seed, instructionalGrade }) => {
    const wholeHourOnly = instructionalGrade === "G1";
    const unit = wholeHourOnly ? "小时" : "分钟";
    const firstDuration = wholeHourOnly ? 1 + (seed % 2) : 15 + (seed % 3) * 15;
    const secondDuration = wholeHourOnly ? 1 + ((seed + 1) % 2) : 20 + (seed % 2) * 15;
    const firstDurationMinutes = wholeHourOnly ? firstDuration * 60 : firstDuration;
    const secondDurationMinutes = wholeHourOnly ? secondDuration * 60 : secondDuration;
    const startHour = wholeHourOnly ? 8 + (seed % 3) : 9 + (seed % 3);
    const startMinute = wholeHourOnly ? 0 : seed % 2 ? 15 : 0;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = startMinutes + firstDurationMinutes + secondDurationMinutes;
    const startTime = formatClock(startMinutes);
    const endTime = formatClock(endMinutes);
    const context = chooseContext(
      [
        {
          id: "multi-step-time-reading-end",
          render: ({ startTime, firstDuration, secondDuration }) =>
            `阅读活动从 ${startTime} 开始，先阅读 ${firstDuration}${unit}，再整理 ${secondDuration}${unit}。全部结束时是几点？请用 HH:MM 表示。`,
        },
        {
          id: "multi-step-time-art-end",
          render: ({ startTime, firstDuration, secondDuration }) =>
            `美术课从 ${startTime} 开始，先创作 ${firstDuration}${unit}，再整理 ${secondDuration}${unit}。全部结束时是几点？请用 HH:MM 表示。`,
        },
      ],
      seed,
      { startTime, firstDuration, secondDuration },
    );
    return {
      ...context,
      answer: endMinutes,
      answerRule: `${startMinutes} + ${firstDurationMinutes} + ${secondDurationMinutes}`,
      answerInputKind: "clock_time",
      multiStepExtensionApplied: true,
      steps: ["读出开始时刻和两个连续活动", "先把两个活动的经过时间合起来", "从开始时刻往后推总时间", "写出结束时刻并检查两个过程都算进去了"],
      hints: ["这是连续发生的两个时间段，要按顺序相加。", `先把 ${firstDuration}${unit} 和 ${secondDuration}${unit} 合起来，再从 ${startTime} 往后推。`, `结束时刻是 ${endTime}，按 HH:MM 填写。`],
    };
  },
  money_price_total: ({ seed, instructionalGrade }) => {
    const isG1 = instructionalGrade === "G1";
    const firstPrice = 3 + seed;
    const secondPrice = 4 + seed;
    const quantity = 3;
    const adjustment = isG1 ? 1 + (seed % 3) : 2 + (seed % 3);
    const answer = isG1 ? firstPrice + secondPrice - adjustment : secondPrice * quantity + adjustment;
    const context = chooseContext(
      isG1
        ? [
            {
              id: "multi-step-notebook-discount",
              render: ({ firstPrice, secondPrice, adjustment }) =>
                `一本练习本 ${firstPrice} 元，一支铅笔 ${secondPrice} 元。一起买减免 ${adjustment} 元，实际要付多少元？`,
            },
            {
              id: "multi-step-snack-discount",
              render: ({ firstPrice, secondPrice, adjustment }) =>
                `一个苹果 ${firstPrice} 元，一盒酸奶 ${secondPrice} 元。一起买减免 ${adjustment} 元，实际要付多少元？`,
            },
          ]
        : [
            {
              id: "multi-step-pencil-fee",
              render: ({ secondPrice, quantity, adjustment }) =>
                `每支彩笔 ${secondPrice} 元，买 ${quantity} 支，另付 ${adjustment} 元包装费。一共要付多少元？`,
            },
            {
              id: "multi-step-card-fee",
              render: ({ secondPrice, quantity, adjustment }) =>
                `每张参观卡 ${secondPrice} 元，买 ${quantity} 张，另付 ${adjustment} 元服务费。一共要付多少元？`,
            },
          ],
      seed,
      { firstPrice, secondPrice, quantity, adjustment },
    );
    return {
      ...context,
      answer,
      answerRule: isG1 ? `${firstPrice} + ${secondPrice} - ${adjustment}` : `${secondPrice} * ${quantity} + ${adjustment}`,
      multiStepExtensionApplied: true,
      steps: isG1
        ? ["确认两件物品的标价", "先求没有减免时的总价", "再减去减免金额", "检查实际付款小于原价"]
        : ["确认单价、数量和额外费用", "先求物品本身的总价", "再加上额外费用", "检查每一笔费用都包含在总价里"],
      hints: isG1
        ? ["先把两件物品的标价合起来。", "合价后再处理减免。", `${firstPrice} + ${secondPrice} - ${adjustment} = ${answer}。`]
        : ["先用单价乘数量。", "包装或服务费是在商品总价之外再加的。", `${secondPrice} × ${quantity} + ${adjustment} = ${answer}。`],
    };
  },
  perimeter_area_rectangle: ({ seed }) => {
    const length = 8 + seed;
    const width = 4 + seed;
    const pathArea = 4 + (seed % 3);
    const answer = length * width - pathArea;
    const context = chooseContext(
      [
        {
          id: "multi-step-garden-path",
          render: ({ length, width, pathArea }) =>
            `学校花坛是长方形，长 ${length} 米，宽 ${width} 米。其中留出 ${pathArea} 平方米做小路，剩下可以种花的面积是多少平方米？`,
        },
        {
          id: "multi-step-paper-cutout",
          render: ({ length, width, pathArea }) =>
            `一张长方形彩纸长 ${length} 厘米，宽 ${width} 厘米。剪掉 ${pathArea} 平方厘米做装饰后，剩下多少平方厘米？`,
        },
      ],
      seed,
      { length, width, pathArea },
    );
    return {
      ...context,
      answer,
      answerRule: `${length} * ${width} - ${pathArea}`,
      multiStepExtensionApplied: true,
      steps: ["确认长方形的长和宽", "先求整个长方形面积", "再减去小路或剪掉的面积", "检查剩余面积小于原面积"],
      hints: ["先把整个长方形看成没有减少的面积。", "长方形面积 = 长 × 宽。", `${length} × ${width} - ${pathArea} = ${answer}。`],
    };
  },
  fraction_part_whole: ({ seed }) => {
    const whole = 24 + seed * 6;
    const denominator = 3;
    const numerator = 2;
    const givenAway = 2 + (seed % 3);
    const fractionAmount = (whole / denominator) * numerator;
    const answer = fractionAmount - givenAway;
    const context = chooseContext(
      [
        {
          id: "multi-step-candy-share",
          render: ({ whole, numerator, denominator, givenAway }) =>
            `一盒糖有 ${whole} 颗，其中的 ${numerator}/${denominator} 是草莓味。送出 ${givenAway} 颗草莓味糖后，还剩多少颗草莓味糖？`,
        },
        {
          id: "multi-step-paper-stars",
          render: ({ whole, numerator, denominator, givenAway }) =>
            `一共折了 ${whole} 颗纸星星，其中的 ${numerator}/${denominator} 是蓝色。送出 ${givenAway} 颗蓝色纸星星后，还剩多少颗蓝色纸星星？`,
        },
      ],
      seed,
      { whole, numerator, denominator, givenAway },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} / ${denominator} * ${numerator} - ${givenAway}`,
      multiStepExtensionApplied: true,
      steps: ["先读懂分数表示的部分", "先求该分数对应的数量", "再减去送出的同类数量", "检查剩余数量没有超过这一部分"],
      hints: [`先用整体除以 ${denominator} 求一份。`, `再求 ${numerator} 份，最后减去送出的数量。`, `${whole} ÷ ${denominator} × ${numerator} - ${givenAway} = ${answer}。`],
    };
  },
  average_total_count: ({ seed }) => {
    const count = 4;
    const average = 12 + seed;
    const extra = 3 + (seed % 3);
    const answer = average * count + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-reading-total",
          render: ({ count, average, extra }) =>
            `前 ${count} 天小明平均每天读 ${average} 页书，第 ${count + 1} 天又读了 ${extra} 页。${count + 1} 天一共读了多少页？`,
        },
        {
          id: "multi-step-practice-total",
          render: ({ count, average, extra }) =>
            `前 ${count} 次数学小练习平均每次做对 ${average} 题，最后一次又做对 ${extra} 题。一共做对多少题？`,
        },
      ],
      seed,
      { count, average, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${average} * ${count} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认平均数对应前几次或前几天", "先用平均数求这部分的总数", "再加上最后一次的数量", "检查总数包含所有次数"],
      hints: ["平均数乘次数可以还原前一段的总数。", "最后一次的数量不在平均数那一段里，要再加上。", `${average} × ${count} + ${extra} = ${answer}。`],
    };
  },
  ratio_rate_unit: ({ seed }) => {
    const ratioA = 2;
    const ratioB = 5;
    const unit = 3 + seed;
    const extra = 2 + (seed % 3);
    const answer = ratioB * unit + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-juice-addition",
          render: ({ ratioA, ratioB, unit, extra }) =>
            `果汁中橙汁和苹果汁的份数比是 ${ratioA}:${ratioB}，每 1 份是 ${unit} 杯。又加入 ${extra} 杯苹果汁后，苹果汁有多少杯？`,
        },
        {
          id: "multi-step-team-addition",
          render: ({ ratioA, ratioB, unit, extra }) =>
            `美术小组男生和女生人数的比是 ${ratioA}:${ratioB}，每 1 份是 ${unit} 人。后来又来了 ${extra} 名女生，女生有多少人？`,
        },
      ],
      seed,
      { ratioA, ratioB, unit, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${ratioB} * ${unit} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认要求部分对应的份数", "先求原来该部分的数量", "再加上后来增加的数量", "检查增加后只改变了该部分"],
      hints: [`要求部分原来对应 ${ratioB} 份。`, "先用份数乘每份数量，再加上新增数量。", `${ratioB} × ${unit} + ${extra} = ${answer}。`],
    };
  },
  measurement_conversion: ({ seed }) => {
    const meters = 3 + seed;
    const centimeters = 45 + seed * 4;
    const extra = 4 + (seed % 3);
    const answer = meters * 100 + centimeters + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-ribbon-extension",
          render: ({ meters, centimeters, extra }) =>
            `一根彩带长 ${meters} 米 ${centimeters} 厘米，又接上 ${extra} 厘米。现在一共长多少厘米？`,
        },
        {
          id: "multi-step-rope-extension",
          render: ({ meters, centimeters, extra }) =>
            `一根跳绳长 ${meters} 米 ${centimeters} 厘米，又加长 ${extra} 厘米。现在一共长多少厘米？`,
        },
      ],
      seed,
      { meters, centimeters, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${meters} * 100 + ${centimeters} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认最后要求用厘米表示", "先把整米换成厘米", "把原来的零头厘米和增加的厘米相加", "检查三个长度使用同一种单位"],
      hints: ["先把米换成厘米，1 米 = 100 厘米。", "原来的长度先写成厘米，再加接上的长度。", `${meters} × 100 + ${centimeters} + ${extra} = ${answer}。`],
    };
  },
  volume_rectangular_prism: ({ seed }) => {
    const length = 6 + seed;
    const width = 3 + (seed % 4);
    const height = 2 + (seed % 3);
    const extra = 2 + (seed % 3);
    const answer = length * width * height + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-storage-soil",
          render: ({ length, width, height, extra }) =>
            `一个长方体种植箱长 ${length} 分米，宽 ${width} 分米，高 ${height} 分米。装满它后，旁边的小花盆还要准备 ${extra} 立方分米土。一共要准备多少立方分米土？`,
        },
        {
          id: "multi-step-fish-tank-water",
          render: ({ length, width, height, extra }) =>
            `一个长方体鱼缸长 ${length} 分米，宽 ${width} 分米，高 ${height} 分米。装满鱼缸后，过滤盒还需要 ${extra} 立方分米水。一共要准备多少立方分米水？`,
        },
      ],
      seed,
      { length, width, height, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${length} * ${width} * ${height} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认长方体的长、宽、高", "先求长方体本身的体积", "再加上小花盆或过滤盒的体积", "检查所有体积单位都是立方分米"],
      hints: ["长方体体积 = 长 × 宽 × 高。", "先求鱼缸或种植箱体积，再加额外需要的体积。", `${length} × ${width} × ${height} + ${extra} = ${answer}。`],
    };
  },
  distance_speed_time: ({ seed }) => {
    const speed = 12 + seed * 2;
    const time = 2 + (seed % 3);
    const extra = 4 + (seed % 5);
    const answer = speed * time + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-sightseeing-bus-route",
          render: ({ speed, time, extra }) =>
            `一辆观光车平均每小时行驶 ${speed} 千米，先行驶了 ${time} 小时，后来又绕行了 ${extra} 千米。一共行驶多少千米？`,
        },
        {
          id: "multi-step-delivery-van-route",
          render: ({ speed, time, extra }) =>
            `一辆送书车平均每小时行驶 ${speed} 千米，行驶了 ${time} 小时后，又开到附近站点多走了 ${extra} 千米。一共行驶多少千米？`,
        },
      ],
      seed,
      { speed, time, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${speed} * ${time} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认速度、时间和额外路程", "先用速度乘时间求第一段路程", "再加上后来多走的路程", "检查最后单位是千米"],
      hints: ["先处理按相同速度行驶的那一段。", "第一段路程 = 速度 × 时间，再加额外路程。", `${speed} × ${time} + ${extra} = ${answer}。`],
    };
  },
  decimal_money_measure: ({ seed }) => {
    const partA = Number((7.5 + seed * 0.5).toFixed(1));
    const partB = Number((2.4 + (seed % 5) * 0.2).toFixed(1));
    const discount = Number((1.2 + (seed % 3) * 0.1).toFixed(1));
    const answer = Number((partA + partB - discount).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "multi-step-decimal-art-supplies",
          render: ({ partA, partB, discount }) =>
            `买一支水彩笔 ${partA} 元和一本素描本 ${partB} 元，店里减免了 ${discount} 元。实际要付多少元？`,
        },
        {
          id: "multi-step-decimal-fruit-weight",
          render: ({ partA, partB, discount }) =>
            `果篮里有 ${partA} 千克苹果和 ${partB} 千克梨，取走 ${discount} 千克送给邻居后，还剩多少千克水果？`,
        },
      ],
      seed,
      { partA, partB, discount },
    );
    return {
      ...context,
      answer,
      answerRule: `${partA} + ${partB} - ${discount}`,
      multiStepExtensionApplied: true,
      steps: ["确认两个小数部分和后来的减少量", "先把两个部分相加", "再减去减免或取走的数量", "检查小数点和单位是否一致"],
      hints: ["先求两个部分原来合起来是多少。", "总量 = 第一个部分 + 第二个部分，再减去减少量。", `${partA} + ${partB} - ${discount} = ${answer}。`],
    };
  },
  decimal_multiply_unit_price: ({ seed }) => {
    const unitPrice = Number((2.5 + seed * 0.4).toFixed(1));
    const quantity = 3 + (seed % 4);
    const serviceFee = Number((1.5 + (seed % 3) * 0.5).toFixed(1));
    const answer = Number((unitPrice * quantity + serviceFee).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "multi-step-decimal-pen-order",
          render: ({ unitPrice, quantity, serviceFee }) =>
            `每支水彩笔 ${unitPrice} 元，买 ${quantity} 支，另收 ${serviceFee} 元服务费。实际要付多少元？`,
        },
        {
          id: "multi-step-decimal-ribbon-order",
          render: ({ unitPrice, quantity, serviceFee }) =>
            `每卷丝带长 ${unitPrice} 米，准备 ${quantity} 卷，又接上 ${serviceFee} 米备用丝带。一共需要多少米丝带？`,
        },
      ],
      seed,
      { unitPrice, quantity, serviceFee },
    );
    return {
      ...context,
      answer,
      answerRule: `${unitPrice} * ${quantity} + ${serviceFee}`,
      multiStepExtensionApplied: true,
      steps: ["确认每一份数量、份数和额外数量", "先用每份数量乘份数", "再加上服务费或备用量", "检查小数点和单位"],
      hints: ["先求同样的几份合起来是多少。", "总量 = 每份数量 × 份数，再加额外数量。", `${unitPrice} × ${quantity} + ${serviceFee} = ${answer}。`],
    };
  },
  triangle_area_application: ({ seed }) => {
    const base = 6 + 2 * (seed % 6);
    const height = 3 + (seed % 6);
    const coveredArea = 2 + (seed % 3);
    const answer = (base * height) / 2 - coveredArea;
    const context = chooseContext(
      [
        {
          id: "multi-step-triangle-garden-path",
          render: ({ base, height, coveredArea }) =>
            `一块三角形花圃的底是 ${base} 米，高是 ${height} 米，其中有 ${coveredArea} 平方米要铺成小路。实际可种花的面积是多少平方米？`,
        },
        {
          id: "multi-step-triangle-flag-cutout",
          render: ({ base, height, coveredArea }) =>
            `一面三角形展旗的底是 ${base} 分米，高是 ${height} 分米，其中剪去 ${coveredArea} 平方分米做标志。剩下的面积是多少平方分米？`,
        },
      ],
      seed,
      { base, height, coveredArea },
    );
    return {
      ...context,
      answer,
      answerRule: `${base} * ${height} / 2 - ${coveredArea}`,
      multiStepExtensionApplied: true,
      steps: ["确认三角形的底、高和要去掉的面积", "先求完整三角形面积", "再减去小路或剪去的部分", "检查结果小于完整三角形面积并带平方单位"],
      hints: ["三角形完整面积 = 底 × 高 ÷ 2。", "先求完整面积，再去掉不能种花或剪去的面积。", `${base} × ${height} ÷ 2 - ${coveredArea} = ${answer}。`],
    };
  },
  multiplication_division_inverse: ({ seed }) => {
    const unitAmount = 3 + (seed % 6);
    const groupCount = 3 + (seed % 5);
    const extraAmount = 2 + (seed % 3);
    const answer = unitAmount * groupCount + extraAmount;
    const context = chooseContext(
      [
        {
          id: "multi-step-inverse-pencil-total",
          render: ({ unitAmount, groupCount, extraAmount }) =>
            `每个笔盒装 ${unitAmount} 支铅笔，准备了 ${groupCount} 个笔盒，另外还有 ${extraAmount} 支散装铅笔。一共有多少支铅笔？`,
        },
        {
          id: "multi-step-inverse-seat-total",
          render: ({ unitAmount, groupCount, extraAmount }) =>
            `礼堂有 ${groupCount} 排座位，每排 ${unitAmount} 个，前面又加了 ${extraAmount} 个临时座位。一共有多少个座位？`,
        },
      ],
      seed,
      { unitAmount, groupCount, extraAmount },
    );
    return {
      ...context,
      answer,
      answerRule: `${unitAmount} * ${groupCount} + ${extraAmount}`,
      multiStepExtensionApplied: true,
      steps: ["确认相同的每组数量、组数和额外数量", "先求所有完整组的数量", "再加上散装或临时增加的数量", "检查总数包含完整组和额外部分"],
      hints: ["先把所有相同的小组算出来。", "完整组总数 = 每组数量 × 组数，再加额外部分。", `${unitAmount} × ${groupCount} + ${extraAmount} = ${answer}。`],
    };
  },
  operation_structure_distributive: ({ seed }) => {
    const groupCount = 12 + seed;
    const partA = 4 + (seed % 4);
    const partB = 6;
    const extra = 3 + (seed % 4);
    const answer = groupCount * (partA + partB) + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-structure-learning-packages",
          render: ({ groupCount, partA, partB, extra }) =>
            `学校准备了 ${groupCount} 个学习包，每个包有 ${partA} 本练习本和 ${partB} 支铅笔，另外还有 ${extra} 件备用学习用品。一共准备了多少件学习用品？`,
        },
        {
          id: "multi-step-structure-library-shelves",
          render: ({ groupCount, partA, partB, extra }) =>
            `图书角有 ${groupCount} 层书架，每层放 ${partA} 本故事书和 ${partB} 本科普书，旁边还有 ${extra} 本新书。一共有多少本书？`,
        },
      ],
      seed,
      { groupCount, partA, partB, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${groupCount} * (${partA} + ${partB}) + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["先确认每组内的两部分", "先求一组共有多少件", "用组数求完整组总数，再加备用部分", "检查总数包含完整组和备用部分"],
      hints: ["先不要把备用部分放进每一组。", "完整组总数 = 组数 × （每组第一部分 + 每组第二部分），再加备用部分。", `${groupCount} × (${partA} + ${partB}) + ${extra} = ${answer}。`],
    };
  },
  ratio_total_split: ({ seed }) => {
    const ratioA = 2;
    const ratioB = 3;
    const unitPart = 3 + seed;
    const total = (ratioA + ratioB) * unitPart;
    const extra = 2 + (seed % 3);
    const answer = ratioB * unitPart + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-ratio-club-join",
          render: ({ ratioA, ratioB, total, extra }) =>
            `社团里男生和女生人数的比是 ${ratioA}:${ratioB}，一共有 ${total} 人。后来又来了 ${extra} 名女生，现在女生有多少人？`,
        },
        {
          id: "multi-step-ratio-juice-addition",
          render: ({ ratioA, ratioB, total, extra }) =>
            `果汁里橙汁和苹果汁的份数比是 ${ratioA}:${ratioB}，一共调了 ${total} 杯。又加入 ${extra} 杯苹果汁后，苹果汁有多少杯？`,
        },
      ],
      seed,
      { ratioA, ratioB, total, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${total} / (${ratioA} + ${ratioB}) * ${ratioB} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["确认总份数和要求部分对应的份数", "先求原来每一份是多少", "求出原来要求部分，再加后来增加的量", "检查增加后只改变了要求部分"],
      hints: [`总份数是 ${ratioA} + ${ratioB} 份，要求部分原来对应 ${ratioB} 份。`, "先按比求原来要求部分的数量，再加上后来增加的量。", `${total} ÷ (${ratioA} + ${ratioB}) × ${ratioB} + ${extra} = ${answer}。`],
    };
  },
  trapezoid_area_application: ({ seed }) => {
    const upperBase = 4 + 2 * (seed % 5);
    const lowerBase = upperBase + 4 + 2 * (seed % 3);
    const height = 3 + (seed % 5);
    const extraArea = 3 + (seed % 4);
    const answer = ((upperBase + lowerBase) * height) / 2 + extraArea;
    const context = chooseContext(
      [
        {
          id: "multi-step-trapezoid-garden-extension",
          render: ({ upperBase, lowerBase, height, extraArea }) =>
            `一块梯形花圃的上底是 ${upperBase} 米，下底是 ${lowerBase} 米，高是 ${height} 米，旁边还要铺 ${extraArea} 平方米小苗区。一共需要准备多少平方米种植区域？`,
        },
        {
          id: "multi-step-trapezoid-flag-extension",
          render: ({ upperBase, lowerBase, height, extraArea }) =>
            `一面梯形展旗的上底是 ${upperBase} 分米，下底是 ${lowerBase} 分米，高是 ${height} 分米，旁边还要加 ${extraArea} 平方分米标志区。总面积是多少平方分米？`,
        },
      ],
      seed,
      { upperBase, lowerBase, height, extraArea },
    );
    return {
      ...context,
      answer,
      answerRule: `(${upperBase} + ${lowerBase}) * ${height} / 2 + ${extraArea}`,
      multiStepExtensionApplied: true,
      steps: ["确认梯形的两条底、高和额外区域", "先求梯形本身的面积", "再加上旁边的额外区域", "检查所有面积都带平方单位"],
      hints: ["先按梯形面积公式求主体面积。", "主体面积 = （上底 + 下底）× 高 ÷ 2，再加额外区域。", `(${upperBase} + ${lowerBase}) × ${height} ÷ 2 + ${extraArea} = ${answer}。`],
    };
  },
  proportion_scale_application: ({ seed }) => {
    const scaleKilometers = 1 + (seed % 3);
    const scaleDenominator = scaleKilometers * 100000;
    const mapLength = 2 + (seed % 7);
    const extraDistance = 1 + (seed % 4);
    const answer = mapLength * scaleKilometers + extraDistance;
    const context = chooseContext(
      [
        {
          id: "multi-step-scale-city-route",
          render: ({ scaleDenominator, mapLength, extraDistance }) =>
            `一张城市地图的比例尺是 1:${scaleDenominator}。地图上学校到图书馆的距离是 ${mapLength} 厘米，之后还要多走 ${extraDistance} 千米到活动中心。一共要走多少千米？`,
        },
        {
          id: "multi-step-scale-park-route",
          render: ({ scaleDenominator, mapLength, extraDistance }) =>
            `公园导览图的比例尺是 1:${scaleDenominator}。图上入口到湖边的距离是 ${mapLength} 厘米，之后还要多走 ${extraDistance} 千米到展览馆。一共要走多少千米？`,
        },
      ],
      seed,
      { scaleDenominator, mapLength, extraDistance },
    );
    return {
      ...context,
      answer,
      answerRule: `${mapLength} * ${scaleDenominator} / 100000 + ${extraDistance}`,
      multiStepExtensionApplied: true,
      steps: ["确认比例尺、图上距离和额外路程", "先把图上距离换成实际千米", "再加上后面多走的路程", "检查两段路程单位都是千米"],
      hints: ["先只处理地图上标出的那一段。", "实际地图路程 = 图上距离 × 比例尺分母 ÷ 100000，再加额外路程。", `${mapLength} × ${scaleDenominator} ÷ 100000 + ${extraDistance} = ${answer}。`],
    };
  },
  addition_subtraction_regrouping: ({ seed }) => {
    const firstAmount = (2 + (seed % 3)) * 10 + 6 + (seed % 4);
    const secondAmount = (1 + (seed % 2)) * 10 + 7 + (seed % 3);
    const lentAmount = 3 + (seed % 3);
    const answer = firstAmount + secondAmount - lentAmount;
    const context = chooseContext(
      [
        {
          id: "multi-step-regrouping-library-loan",
          render: ({ firstAmount, secondAmount, lentAmount }) =>
            `图书角上午收到 ${firstAmount} 本图书，下午又收到 ${secondAmount} 本，后来借出 ${lentAmount} 本。现在还有多少本图书？`,
        },
        {
          id: "multi-step-regrouping-sticker-share",
          render: ({ firstAmount, secondAmount, lentAmount }) =>
            `班级先收集了 ${firstAmount} 张贴纸，又收集了 ${secondAmount} 张，送给低年级 ${lentAmount} 张。还剩多少张贴纸？`,
        },
      ],
      seed,
      { firstAmount, secondAmount, lentAmount },
    );
    return {
      ...context,
      answer,
      answerRule: `${firstAmount} + ${secondAmount} - ${lentAmount}`,
      multiStepExtensionApplied: true,
      steps: ["确认先后两个增加数量和后来减少数量", "先把两个增加数量相加", "再减去借出或送出的数量", "检查结果小于合计数量"],
      hints: ["先求原来合起来有多少。", "总数 = 第一个数量 + 第二个数量，再减去减少部分。", `${firstAmount} + ${secondAmount} - ${lentAmount} = ${answer}。`],
    };
  },
  data_range_comparison: ({ seed }) => {
    const minimumValue = 8 + (seed % 5);
    const maximumValue = 20 + seed;
    const extra = 3 + (seed % 4);
    const answer = maximumValue - minimumValue + extra;
    const context = chooseContext(
      [
        {
          id: "multi-step-range-reading-new-record",
          render: ({ minimumValue, maximumValue, extra }) =>
            `阅读小组里读得最少的是 ${minimumValue} 页，原来最多的是 ${maximumValue} 页。后来有同学比原来最多的多读了 ${extra} 页。新的最多值比最少值多多少页？`,
        },
        {
          id: "multi-step-range-seedling-new-record",
          render: ({ minimumValue, maximumValue, extra }) =>
            `三块试验田中幼苗最少的是 ${minimumValue} 株，原来最多的是 ${maximumValue} 株。后来一块地又比原来最多的多出 ${extra} 株。新的最多值比最少值多多少株？`,
        },
      ],
      seed,
      { minimumValue, maximumValue, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${maximumValue} - ${minimumValue} + ${extra}`,
      multiStepExtensionApplied: true,
      steps: ["找出原来的最大值、最小值和新增差额", "先求原来的极差", "再加上新纪录多出的数量", "检查新的最多值确实比原来更大"],
      hints: ["先比较原来的最多和最少。", "新的极差 = 原来的最多 - 最少，再加上新纪录多出的部分。", `${maximumValue} - ${minimumValue} + ${extra} = ${answer}。`],
    };
  },
  geometry_angle_reasoning: ({ seed }) => {
    const knownAngle = 40 + seed * 4;
    const splitAngle = 15 + 5 * (seed % 4);
    const answer = 180 - knownAngle - splitAngle;
    const context = chooseContext(
      [
        {
          id: "multi-step-angle-paper-fold-split",
          render: ({ knownAngle, splitAngle }) =>
            `折纸时两个相邻角拼成一个平角，共 180°。其中一个角是 ${knownAngle}°，另一个角又分成 ${splitAngle}° 和一个小角。这个小角是多少度？`,
        },
        {
          id: "multi-step-angle-road-sign-split",
          render: ({ knownAngle, splitAngle }) =>
            `路标上两个相邻角合起来是 180°。其中一个角是 ${knownAngle}°，另一个角里已有 ${splitAngle}° 的部分。剩下的角是多少度？`,
        },
      ],
      seed,
      { knownAngle, splitAngle },
    );
    return {
      ...context,
      answer,
      answerRule: `180 - ${knownAngle} - ${splitAngle}`,
      multiStepExtensionApplied: true,
      steps: ["确认所有小角合起来是 180°", "先去掉已知的第一个角", "再去掉另一个角中已知的部分", "把三个角相加检查是否为平角"],
      hints: ["平角的总度数始终是 180°。", "先从 180° 减去第一个已知角，再减去已知的小部分。", `180° - ${knownAngle}° - ${splitAngle}° = ${answer}°。`],
    };
  },
  percent_change: ({ seed }) => {
    const base = 200 + seed * 20;
    const payablePercent = 85;
    const serviceFee = 5 + (seed % 3) * 5;
    const answer = base * (payablePercent / 100) + serviceFee;
    const context = chooseContext(
      [
        {
          id: "multi-step-percent-jacket-fee",
          render: ({ base, payablePercent, serviceFee }) =>
            `一件外套原价 ${base} 元，按原价的 ${payablePercent}% 出售，另收 ${serviceFee} 元服务费。实际要付多少元？`,
        },
        {
          id: "multi-step-percent-book-fee",
          render: ({ base, payablePercent, serviceFee }) =>
            `图书节套装原价 ${base} 元，按原价的 ${payablePercent}% 出售，另收 ${serviceFee} 元包装费。实际要付多少元？`,
        },
      ],
      seed,
      { base, payablePercent, serviceFee },
    );
    return {
      ...context,
      answer,
      answerRule: `${base} * ${payablePercent}% + ${serviceFee}`,
      multiStepExtensionApplied: true,
      steps: ["确认折后价格和额外费用", "先用原价乘折扣率求折后价格", "再加上服务费或包装费", "检查实际支付包含两部分"],
      hints: ["先算折后价格，不要把费用也打折。", "实际支付 = 原价 × 折扣率，再加额外费用。", `${base} × ${payablePercent}% + ${serviceFee} = ${answer}。`],
    };
  },
  fraction_add_same_denominator: ({ seed }) => {
    const denominator = 6;
    const whole = 24 + seed * 6;
    const firstNumerator = 1 + (seed % 2);
    const secondNumerator = 2;
    const returned = 1 + (seed % 3);
    const combinedAmount = (whole / denominator) * (firstNumerator + secondNumerator);
    const answer = combinedAmount - returned;
    const context = chooseContext(
      [
        {
          id: "multi-step-fraction-add-paper-return",
          render: ({ whole, firstNumerator, secondNumerator, denominator, returned }) =>
            `手工课一共准备了 ${whole} 颗纸星星。第一组领用了其中的 ${firstNumerator}/${denominator}，第二组领用了 ${secondNumerator}/${denominator}。活动后两组一共退回 ${returned} 颗没有用到的纸星星，实际用了多少颗？`,
        },
        {
          id: "multi-step-fraction-add-seed-return",
          render: ({ whole, firstNumerator, secondNumerator, denominator, returned }) =>
            `花园一共有 ${whole} 粒种子。第一块地领用了其中的 ${firstNumerator}/${denominator}，第二块地领用了 ${secondNumerator}/${denominator}。后来两块地一共退回 ${returned} 粒没有种下的种子，实际种了多少粒？`,
        },
      ],
      seed,
      { whole, firstNumerator, secondNumerator, denominator, returned },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} / ${denominator} * (${firstNumerator} + ${secondNumerator}) - ${returned}`,
      multiStepExtensionApplied: true,
      steps: ["确认两组领用的都是同样大小的六分之一", "先把两个分子相加，求两组一共领用的份数", "求出领用数量后减去退回的数量", "检查实际使用数量小于领用数量"],
      hints: ["先处理两个同分母分数的合并。", `两组一共领用了 ${firstNumerator + secondNumerator}/${denominator}。`, `${whole} ÷ ${denominator} × (${firstNumerator} + ${secondNumerator}) - ${returned} = ${answer}。`],
    };
  },
  fraction_subtract_same_denominator: ({ seed }) => {
    const denominator = 6;
    const whole = 36 + seed * 6;
    const largerNumerator = 4 + (seed % 2);
    const smallerNumerator = 1;
    const returned = 2 + (seed % 3);
    const answer = (whole / denominator) * (largerNumerator - smallerNumerator) - returned;
    const context = chooseContext(
      [
        {
          id: "multi-step-fraction-difference-paper-return",
          render: ({ whole, largerNumerator, smallerNumerator, denominator, returned }) =>
            `手工课有 ${whole} 张彩纸。第一组先领用了其中的 ${largerNumerator}/${denominator}，第二组领用了 ${smallerNumerator}/${denominator}。第一组后来退回 ${returned} 张没有用到的彩纸。第一组实际比第二组多用了多少张？`,
        },
        {
          id: "multi-step-fraction-difference-seed-return",
          render: ({ whole, largerNumerator, smallerNumerator, denominator, returned }) =>
            `花园有 ${whole} 粒种子。第一块地先领用了其中的 ${largerNumerator}/${denominator}，第二块地领用了 ${smallerNumerator}/${denominator}。第一块地后来退回 ${returned} 粒没有种下的种子。第一块地实际比第二块地多种多少粒？`,
        },
      ],
      seed,
      { whole, largerNumerator, smallerNumerator, denominator, returned },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} / ${denominator} * (${largerNumerator} - ${smallerNumerator}) - ${returned}`,
      multiStepExtensionApplied: true,
      steps: ["确认两组领用的都是六等份中的若干份", "先求第一组比第二组原来多领用多少", "再减去第一组退回的数量", "检查实际差额小于原来的差额"],
      hints: ["先用同分母分数求原来的相差份数。", `${largerNumerator}/${denominator} 比 ${smallerNumerator}/${denominator} 多 ${largerNumerator - smallerNumerator}/${denominator}。`, `${whole} ÷ ${denominator} × (${largerNumerator} - ${smallerNumerator}) - ${returned} = ${answer}。`],
    };
  },
  decimal_divide_equal_share: ({ seed }) => {
    const quantity = 2 + (seed % 4);
    const unitPrice = Number((3.5 + (seed % 7) * 0.5).toFixed(1));
    const serviceFee = Number((1 + (seed % 3) * 0.5).toFixed(1));
    const totalPrice = Number((unitPrice * quantity + serviceFee).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "multi-step-decimal-notebook-fee",
          render: ({ quantity, totalPrice, serviceFee }) =>
            `买了 ${quantity} 本同样的练习本，一共付了 ${totalPrice} 元，其中包括 ${serviceFee} 元包装费。每本练习本多少元？`,
        },
        {
          id: "multi-step-decimal-ribbon-fee",
          render: ({ quantity, totalPrice, serviceFee }) =>
            `买了 ${quantity} 段同样长的丝带，一共是 ${totalPrice} 米，其中有 ${serviceFee} 米是额外留出的样品。每段正式丝带长多少米？`,
        },
      ],
      seed,
      { quantity, totalPrice, serviceFee },
    );
    return {
      ...context,
      answer: unitPrice,
      answerRule: `(${totalPrice} - ${serviceFee}) / ${quantity}`,
      multiStepExtensionApplied: true,
      steps: ["确认总量里有一部分不是平均分的内容", "先从总量中减去包装费或样品量", "把剩余总量平均分成同样的份数", "用每份量乘数量再加额外部分检查总量"],
      hints: ["包装费或样品量不属于每一份。", "先求真正平均分的总量。", `(${totalPrice} - ${serviceFee}) ÷ ${quantity} = ${unitPrice}。`],
    };
  },
  fraction_equivalent_compare: ({ seed }) => {
    const whole = 48 + seed * 8;
    const firstNumerator = 2 + (seed % 2);
    const differenceEighths = 1 + (seed % 2);
    const secondNumerator = firstNumerator * 2 - differenceEighths;
    const extraUsed = 2 + (seed % 3);
    const answer = (whole / 8) * differenceEighths + extraUsed;
    const context = chooseContext(
      [
        {
          id: "multi-step-equivalent-fraction-sticker-extra",
          render: ({ whole, firstNumerator, secondNumerator, extraUsed }) =>
            `班级有 ${whole} 张贴纸。第一组用了其中的 ${firstNumerator}/4，第二组用了 ${secondNumerator}/8。后来第一组又多用了 ${extraUsed} 张。最后第一组比第二组多用了多少张？`,
        },
        {
          id: "multi-step-equivalent-fraction-seed-extra",
          render: ({ whole, firstNumerator, secondNumerator, extraUsed }) =>
            `花园有 ${whole} 粒种子。甲地种了其中的 ${firstNumerator}/4，乙地种了 ${secondNumerator}/8。后来甲地又多种了 ${extraUsed} 粒。最后甲地比乙地多种多少粒？`,
        },
      ],
      seed,
      { whole, firstNumerator, secondNumerator, extraUsed },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} / 8 * (${firstNumerator} * 2 - ${secondNumerator}) + ${extraUsed}`,
      multiStepExtensionApplied: true,
      steps: ["先把四分之几改写成八分之几", "求第一组原来比第二组多的份数", "把份数换成实际数量后加上后来多用的数量", "检查最后差额大于原来的分数差额"],
      hints: [`${firstNumerator}/4 可以改写成 ${firstNumerator * 2}/8。`, `原来的差是 ${differenceEighths}/8。`, `${whole} ÷ 8 × (${firstNumerator} × 2 - ${secondNumerator}) + ${extraUsed} = ${answer}。`],
    };
  },
  coordinate_movement: ({ seed }) => {
    const startX = 2 + (seed % 6);
    const startY = 3 + (seed % 5);
    const horizontalShift = 4 + (seed % 7);
    const extraShift = 1 + (seed % 3);
    const answer = startX + horizontalShift + extraShift;
    const context = chooseContext(
      [
        {
          id: "multi-step-coordinate-park-route",
          render: ({ startX, startY, horizontalShift, extraShift }) =>
            `方格地图上，A 点坐标是 (${startX}, ${startY})。先向右移动 ${horizontalShift} 格，又向右移动 ${extraShift} 格到 B 点，B 点的横坐标是多少？`,
        },
        {
          id: "multi-step-coordinate-robot-route",
          render: ({ startX, startY, horizontalShift, extraShift }) =>
            `机器人在坐标 (${startX}, ${startY})，先向右移动 ${horizontalShift} 格，再向右移动 ${extraShift} 格。它到达位置的横坐标是多少？`,
        },
      ],
      seed,
      { startX, startY, horizontalShift, extraShift },
    );
    return {
      ...context,
      answer,
      answerRule: `${startX} + ${horizontalShift} + ${extraShift}`,
      multiStepExtensionApplied: true,
      steps: ["读出起点横坐标和两次向右移动的格数", "确认两次移动都只让横坐标增加", "先完成第一次移动，再加上第二次移动", "检查纵坐标仍然不变"],
      hints: ["向右移动时，只需要处理横坐标。", "两次向右的格数都要加到起点横坐标上。", `${startX} + ${horizontalShift} + ${extraShift} = ${answer}。`],
    };
  },
  number_composition_place_value: ({ seed }) => {
    const tens = 2 + (seed % 7);
    const ones = (3 + seed) % 10;
    const lent = 1 + (seed % 3);
    const answer = tens * 10 + ones - lent;
    const context = chooseContext(
      [
        {
          id: "multi-step-place-value-book-loan",
          render: ({ tens, ones, lent }) => `图书角有 ${tens} 捆故事书，每捆 10 本，另外还有 ${ones} 本散书。借出 ${lent} 本后，还剩多少本？`,
        },
        {
          id: "multi-step-place-value-sticker-share",
          render: ({ tens, ones, lent }) => `手工课有 ${tens} 包贴纸，每包 10 张，另外还有 ${ones} 张散贴纸。送出 ${lent} 张后，还剩多少张？`,
        },
      ],
      seed,
      { tens, ones, lent },
    );
    return {
      ...context,
      answer,
      answerRule: `${tens} * 10 + ${ones} - ${lent}`,
      multiStepExtensionApplied: true,
      steps: ["先读出整捆数、零散数和借出数", "把整捆数换成十个一组的数量", "加上零散部分后再减去借出数", "检查剩余数量小于原来的总数"],
      hints: ["先把每捆 10 个的部分合起来。", "原来总数 = 整捆数 × 10 + 零散数。", `${tens} × 10 + ${ones} - ${lent} = ${answer}。`],
    };
  },
  unknown_part_add_subtract: ({ seed }) => {
    const knownPart = 8 + seed;
    const unknownPart = 4 + (seed % 6);
    const whole = knownPart + unknownPart;
    const extraCompleted = 1 + (seed % 3);
    const answer = whole - knownPart - extraCompleted;
    const context = chooseContext(
      [
        {
          id: "multi-step-unknown-part-flowers-extra",
          render: ({ whole, knownPart, extraCompleted }) => `班级一共需要摆好 ${whole} 朵花，已经摆好 ${knownPart} 朵。后来又摆好 ${extraCompleted} 朵，还要摆多少朵？`,
        },
        {
          id: "multi-step-unknown-part-cards-extra",
          render: ({ whole, knownPart, extraCompleted }) => `一套阅读卡一共有 ${whole} 张，已经整理了 ${knownPart} 张。后来又整理了 ${extraCompleted} 张，还剩多少张没有整理？`,
        },
      ],
      seed,
      { whole, knownPart, extraCompleted },
    );
    return {
      ...context,
      answer,
      answerRule: `${whole} - ${knownPart} - ${extraCompleted}`,
      multiStepExtensionApplied: true,
      steps: ["确认整体数量和已经完成的两部分", "先从整体减去第一次完成的数量", "再减去后来完成的数量", "检查剩余数量没有小于 0"],
      hints: ["两次完成的数量都要从整体里减去。", "可以先减已完成的第一部分，再减后来完成的部分。", `${whole} - ${knownPart} - ${extraCompleted} = ${answer}。`],
    };
  },
  data_table_chart: ({ seed }) => {
    const monday = 18 + seed;
    const tuesday = 24 + seed;
    const extra = 2 + (seed % 3);
    const answer = tuesday + extra - monday;
    const context = chooseContext(
      [
        {
          id: "multi-step-table-library-wednesday",
          render: ({ monday, tuesday, extra }) => `阅读统计表中，周一借书 ${monday} 本，周二借书 ${tuesday} 本。周三比周二多借 ${extra} 本，周三比周一多借多少本？`,
        },
        {
          id: "multi-step-table-recycling-wednesday",
          render: ({ monday, tuesday, extra }) => `回收统计表中，周一收集 ${monday} 个瓶子，周二收集 ${tuesday} 个。周三比周二多收集 ${extra} 个，周三比周一多收集多少个？`,
        },
      ],
      seed,
      { monday, tuesday, extra },
    );
    return {
      ...context,
      answer,
      answerRule: `${tuesday} + ${extra} - ${monday}`,
      multiStepExtensionApplied: true,
      steps: ["读出周一、周二数据和周三新增数量", "先求周三的数据", "再用周三数据减去周一数据", "检查周三数据大于周二和周一"],
      hints: ["先从周二加上新增数量，得到周三的数据。", "再比较周三和周一。", `${tuesday} + ${extra} - ${monday} = ${answer}。`],
    };
  },
  multi_step_total_quantity: ({ seed }) => {
    const groupCount = 6 + seed;
    const unitAmount = 4 + (seed % 2);
    const afternoonAmount = unitAmount * (2 + (seed % 3));
    const total = groupCount * unitAmount;
    const morningAmount = total - afternoonAmount;
    const addedGroups = 1 + (seed % 2);
    const extraAmount = unitAmount * addedGroups;
    const answer = groupCount + addedGroups;
    const context = chooseContext(
      [
        {
          id: "multi-step-total-quantity-library-new-books",
          render: ({ morningAmount, afternoonAmount, unitAmount, extraAmount }) =>
            `图书角上午收到 ${morningAmount} 本图书，下午又收到 ${afternoonAmount} 本。每个书架放 ${unitAmount} 本。后来又收到 ${extraAmount} 本新书，一共刚好需要多少个书架？`,
        },
        {
          id: "multi-step-total-quantity-seedling-new-trays",
          render: ({ morningAmount, afternoonAmount, unitAmount, extraAmount }) =>
            `花园上午运来 ${morningAmount} 盆幼苗，下午又运来 ${afternoonAmount} 盆。每个托盘放 ${unitAmount} 盆。后来又运来 ${extraAmount} 盆，一共刚好需要多少个托盘？`,
        },
      ],
      seed,
      { morningAmount, afternoonAmount, unitAmount, extraAmount },
    );
    return {
      ...context,
      answer,
      answerRule: `(${morningAmount} + ${afternoonAmount} + ${extraAmount}) / ${unitAmount}`,
      multiStepExtensionApplied: true,
      steps: ["先把上午和下午数量合成原来的总数", "再加上后来收到的数量", "用新的总数除以每组数量", "检查结果能刚好分完"],
      hints: ["三个时间段收到的数量都属于总数。", "先把所有数量相加，再处理每组放多少。", `(${morningAmount} + ${afternoonAmount} + ${extraAmount}) ÷ ${unitAmount} = ${answer}。`],
    };
  },
  probability_event_decimal: ({ seed }) => {
    const totalCount = 10;
    const favorableCount = 2 * (1 + (seed % 4));
    const addedFavorable = 2;
    const addedOther = 8;
    const answer = Number(((favorableCount + addedFavorable) / (totalCount + addedFavorable + addedOther)).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "multi-step-probability-balls-added",
          render: ({ favorableCount, totalCount, addedFavorable, addedOther }) =>
            `盒子里原来有 ${totalCount} 个大小相同的球，其中 ${favorableCount} 个是红球。后来放入 ${addedFavorable} 个红球和 ${addedOther} 个蓝球。现在任意摸出 1 个球，摸到红球的可能性用小数表示是多少？`,
        },
        {
          id: "multi-step-probability-cards-added",
          render: ({ favorableCount, totalCount, addedFavorable, addedOther }) =>
            `一叠卡片原来有 ${totalCount} 张，其中 ${favorableCount} 张是故事卡。后来加入 ${addedFavorable} 张故事卡和 ${addedOther} 张科学卡。现在任意抽 1 张，抽到故事卡的可能性用小数表示是多少？`,
        },
      ],
      seed,
      { favorableCount, totalCount, addedFavorable, addedOther },
    );
    return {
      ...context,
      answer,
      answerRule: `(${favorableCount} + ${addedFavorable}) / (${totalCount} + ${addedFavorable} + ${addedOther})`,
      multiStepExtensionApplied: true,
      steps: ["确认原来和后来增加的有利结果数量", "先求现在的有利结果总数", "再求现在所有可能结果总数", "用有利结果数除以总结果数并写成小数"],
      hints: ["红球或故事卡是有利结果，增加后要一起计算。", "总结果数也要把后来加入的所有内容算进去。", `(${favorableCount} + ${addedFavorable}) ÷ (${totalCount} + ${addedFavorable} + ${addedOther}) = ${answer}。`],
    };
  },
  division_remainder_grouping: ({ seed }) => {
    const capacity = 4 + (seed % 4);
    const fullGroupsBefore = 3 + (seed % 5);
    const remainder = 1 + (seed % Math.max(1, capacity - 1));
    const totalItems = fullGroupsBefore * capacity + remainder;
    const answer = fullGroupsBefore + 2;
    const context = chooseContext(
      [
        {
          id: "multi-step-remainder-books-extra-box",
          render: ({ totalItems, capacity }) => `图书角有 ${totalItems} 本新书，每个收纳盒最多放 ${capacity} 本。后来又来了 ${capacity} 本新书，至少需要几个收纳盒才能全部放下？`,
        },
        {
          id: "multi-step-remainder-seeds-extra-bag",
          render: ({ totalItems, capacity }) => `有 ${totalItems} 粒种子，每袋最多装 ${capacity} 粒。后来又收集了 ${capacity} 粒种子，至少需要几袋才能全部装下？`,
        },
      ],
      seed,
      { totalItems, capacity },
    );
    return {
      ...context,
      answer,
      answerRule: `ceil((${totalItems} + ${capacity}) / ${capacity})`,
      multiStepExtensionApplied: true,
      steps: ["确认原来总数、后来增加数量和每组容量", "先把后来增加的数量加到总数", "按每组最多数量分组", "确认有余数时还要多准备一组"],
      hints: ["后来增加的数量也必须放进去。", "总数增加后，仍然要按每组最多数量来分。", `ceil((${totalItems} + ${capacity}) ÷ ${capacity}) = ${answer}。`],
    };
  },
  linear_equation_word_problem: ({ seed }) => {
    const pencilPrice = 3 + seed;
    const difference = 9;
    const pencilCount = 3 + (seed % 2);
    const serviceFee = 2 + (seed % 4);
    const total = pencilPrice + difference + pencilCount * pencilPrice + serviceFee;
    const context = chooseContext(
      [
        {
          id: "multi-step-equation-pen-and-pencils-fee",
          render: ({ pencilCount, difference, serviceFee, total }) =>
            `买 1 支钢笔和 ${pencilCount} 支铅笔，另付 ${serviceFee} 元包装费，一共 ${total} 元。钢笔比一支铅笔贵 ${difference} 元。一支铅笔多少钱？`,
        },
        {
          id: "multi-step-equation-notebook-and-erasers-fee",
          render: ({ pencilCount, difference, serviceFee, total }) =>
            `买 1 本精装笔记本和 ${pencilCount} 块橡皮，另付 ${serviceFee} 元服务费，一共 ${total} 元。精装笔记本比一块橡皮贵 ${difference} 元。一块橡皮多少钱？`,
        },
      ],
      seed,
      { pencilCount, difference, serviceFee, total },
    );
    return {
      ...context,
      answer: pencilPrice,
      answerRule: `x + ${difference} + ${pencilCount}x + ${serviceFee} = ${total}`,
      multiStepExtensionApplied: true,
      steps: ["确认未知的是一支铅笔或一块橡皮的价格", "设未知单价为 x，并把较贵物品写成 x 加差价", "把同类物品的总价、较贵物品和固定费用放进同一个总价关系", "列出一元一次方程并解出 x", "把价格代回总价检查"],
      hints: ["钢笔或精装笔记本的价格 = x + 差价。", "包装费或服务费是固定的一部分，也要放进总价。", `方程是 x + ${difference} + ${pencilCount}x + ${serviceFee} = ${total}，解得 x = ${pencilPrice}。`],
    };
  },
  circle_area_application: ({ seed }) => {
    const radius = 2 + (seed % 3);
    const circleCount = 1 + (seed % 2);
    const restArea = 10 + seed;
    const answer = Number((3.14 * radius * radius * circleCount + restArea).toFixed(2));
    const context = chooseContext(
      [
        {
          id: "multi-step-circle-area-garden-and-path",
          render: ({ radius, circleCount, restArea }) =>
            `学校有 ${circleCount} 个同样大的圆形花坛，每个半径是 ${radius} 米。旁边铺路的面积是 ${restArea} 平方米。π 取 3.14，花坛和铺路一共占多少平方米？`,
        },
        {
          id: "multi-step-circle-area-mats-and-floor",
          render: ({ radius, circleCount, restArea }) =>
            `活动室有 ${circleCount} 张同样大的圆形地垫，每张半径是 ${radius} 米。其余需要铺的地面面积是 ${restArea} 平方米。π 取 3.14，一共需要铺多少平方米？`,
        },
      ],
      seed,
      { radius, circleCount, restArea },
    );
    return {
      ...context,
      answer,
      answerRule: `3.14 * ${radius} * ${radius} * ${circleCount} + ${restArea}`,
      multiStepExtensionApplied: true,
      steps: ["确认圆形部分和另外给出的面积都要合计", "先用半径求一个圆的面积", "乘圆的个数得到所有圆形部分的面积", "再加上铺路或其余地面的面积并检查单位"],
      hints: ["圆形部分先按圆面积公式计算。", `所有圆形面积 = 3.14 × ${radius} × ${radius} × ${circleCount}。`, `再加 ${restArea}，一共是 ${answer} 平方米。`],
    };
  },
  decimal_rounding_estimation: ({ seed }) => {
    const firstLength = Number((2.15 + seed * 0.2).toFixed(2));
    const secondLength = Number((1.25 + (seed % 4) * 0.1).toFixed(2));
    const totalLength = Number((firstLength + secondLength).toFixed(2));
    const answer = Number((Math.round((totalLength + Number.EPSILON) * 10) / 10).toFixed(1));
    const context = chooseContext(
      [
        {
          id: "multi-step-rounding-ribbon-total",
          render: ({ firstLength, secondLength }) =>
            `手工课把两段丝带接起来，第一段长 ${firstLength} 米，第二段长 ${secondLength} 米。总长度精确到十分位约是多少米？`,
        },
        {
          id: "multi-step-rounding-walk-total",
          render: ({ firstLength, secondLength }) =>
            `小安上午走了 ${firstLength} 千米，下午又走了 ${secondLength} 千米。全天路程精确到十分位约是多少千米？`,
        },
      ],
      seed,
      { firstLength, secondLength },
    );
    return {
      ...context,
      answer,
      answerRule: `round(${firstLength} + ${secondLength}, 1 decimal place)`,
      multiStepExtensionApplied: true,
      steps: ["先把两段长度或两段路程相加", "把和保留到百分位，准备观察百分位", "根据百分位决定十分位是否进 1", "写出精确到十分位的结果并检查单位"],
      hints: ["先不要急着近似，先求完整的总数。", `${firstLength} + ${secondLength} = ${totalLength}。`, `${totalLength} 精确到十分位约是 ${answer}。`],
    };
  },
  circle_circumference_application: ({ seed }) => {
    const radius = 2 + (seed % 5);
    const circleCount = 1 + (seed % 2);
    const extraLength = 3 + (seed % 6);
    const answer = Number((2 * 3.14 * radius * circleCount + extraLength).toFixed(2));
    const context = chooseContext(
      [
        {
          id: "multi-step-circle-circumference-garden-gate",
          render: ({ radius, circleCount, extraLength }) =>
            `学校有 ${circleCount} 个同样大的圆形花坛，每个半径是 ${radius} 米。围边时还要留出一段 ${extraLength} 米的直线入口边。π 取 3.14，一共需要多少米护栏？`,
        },
        {
          id: "multi-step-circle-circumference-track-connection",
          render: ({ radius, circleCount, extraLength }) =>
            `活动区有 ${circleCount} 个同样大的圆形标志圈，每个半径是 ${radius} 米。还要加一段 ${extraLength} 米的连接彩带。π 取 3.14，一共需要多少米彩带？`,
        },
      ],
      seed,
      { radius, circleCount, extraLength },
    );
    return {
      ...context,
      answer,
      answerRule: `2 * 3.14 * ${radius} * ${circleCount} + ${extraLength}`,
      multiStepExtensionApplied: true,
      steps: ["确认圆形部分的边长和直线部分都要合计", "先用半径求一个圆的周长", "乘圆的个数得到所有圆形边的长度", "再加上直线入口或连接部分并检查单位"],
      hints: ["圆形部分求周长，要用 2 × π × 半径。", `所有圆形边长 = 2 × 3.14 × ${radius} × ${circleCount}。`, `再加 ${extraLength}，一共是 ${answer} 米。`],
    };
  },
  integer_operation_order: ({ seed }) => {
    const groupCount = 3 + (seed % 4);
    const perGroup = 4 + (seed % 6);
    const extraAmount = 6 + (seed % 7);
    const removed = 1 + (seed % 3);
    const answer = groupCount * perGroup + extraAmount - removed;
    const context = chooseContext(
      [
        {
          id: "multi-step-operation-order-cards-lent",
          render: ({ groupCount, perGroup, extraAmount, removed }) => `阅读角有 ${groupCount} 盒卡片，每盒 ${perGroup} 张，另外有 ${extraAmount} 张散卡。借出 ${removed} 张后，还剩多少张卡片？`,
        },
        {
          id: "multi-step-operation-order-paper-shared",
          render: ({ groupCount, perGroup, extraAmount, removed }) => `美术课有 ${groupCount} 包彩纸，每包 ${perGroup} 张，另外有 ${extraAmount} 张备用。送出 ${removed} 张后，还剩多少张彩纸？`,
        },
      ],
      seed,
      { groupCount, perGroup, extraAmount, removed },
    );
    return {
      ...context,
      answer,
      answerRule: `${groupCount} * ${perGroup} + ${extraAmount} - ${removed}`,
      multiStepExtensionApplied: true,
      steps: ["先把成组部分和散的部分分开", "先求所有成组物品的数量", "加上散的部分后再减去借出或送出的数量", "检查每个条件只使用一次"],
      hints: ["先完成乘法，再处理加减。", "原来总数 = 组数 × 每组数量 + 散的部分。", `${groupCount} × ${perGroup} + ${extraAmount} - ${removed} = ${answer}。`],
    };
  },
  square_perimeter_intro: ({ seed }) => {
    const sideLength = 4 + seed;
    const entrance = 1 + (seed % 3);
    const answer = sideLength * 4 - entrance;
    const context = chooseContext(
      [
        {
          id: "multi-step-square-garden-gate",
          render: ({ sideLength, entrance }) =>
            `一个正方形小花园每条边长 ${sideLength} 米，围护栏时留出 ${entrance} 米宽的入口。实际需要多少米护栏？`,
        },
        {
          id: "multi-step-square-yard-gate",
          render: ({ sideLength, entrance }) =>
            `一个正方形活动区每条边长 ${sideLength} 米，围绳子时留出 ${entrance} 米宽的入口。实际需要多少米绳子？`,
        },
      ],
      seed,
      { sideLength, entrance },
    );
    return {
      ...context,
      answer,
      answerRule: `${sideLength} * 4 - ${entrance}`,
      multiStepExtensionApplied: true,
      steps: ["确认正方形四条边一样长", "先求没有入口时的总周长", "再减去入口宽度", "检查实际护栏长度小于完整周长"],
      hints: ["先按完整的正方形求周长。", "周长 = 边长 × 4，再去掉入口。", `${sideLength} × 4 - ${entrance} = ${answer}。`],
    };
  },
};

function fallbackGenerator({ family, seed, variantLevel }) {
  const value = 10 + seed;
  return {
    contextTemplateId: "fallback-bounded-context",
    prompt: `${family.name}：已知一个数量是 ${value}，请根据题型关系求目标数量。`,
    answer: value,
    answerRule: "bounded_family_placeholder",
    variantControl: variantControl(variantLevel, "primary_value", "secondary_value"),
    steps: ["读题", "找条件", "确认目标", "按题型关系计算", "检查答案"],
    hints: ["先确认题目问什么。", "再把条件翻译成数学关系。", "最后计算并检查单位。"],
  };
}

export function generateMathQuestionCandidate({
  aiVersion = "semi_ai",
  family,
  seed = 1,
  instructionalGrade = null,
  variantLevel = "original",
}) {
  const generator = FAMILY_GENERATORS[family.id] || fallbackGenerator;
  const reverseGenerator = REVERSE_QUESTION_GENERATORS[family.id] || null;
  const multiStepExtensionGenerator = MULTI_STEP_EXTENSION_GENERATORS[family.id] || null;
  const requestedVariantSupported = getSupportedMathItemModelVariants(family).includes(variantLevel);
  const normalizedSeed = normalizeSeed(family.id, seed);
  const resolvedInstructionalGrade = normalizeInstructionalGrade(family, instructionalGrade);
  const effectiveSeed = gradeAwareSeed({
    family,
    normalizedSeed,
    instructionalGrade: resolvedInstructionalGrade,
  });
  const candidateGenerator =
    hasReverseQuestionVariant(variantLevel) && requestedVariantSupported && reverseGenerator
      ? reverseGenerator
      : hasMultiStepExtensionVariant(variantLevel) && requestedVariantSupported && multiStepExtensionGenerator
        ? multiStepExtensionGenerator
        : generator;
  const generated = applyStructuralVariant({
    generated: candidateGenerator({
      family,
      seed: effectiveSeed,
      instructionalGrade: resolvedInstructionalGrade,
      variantLevel,
    }),
    variantLevel,
  });
  const answerInput = createMathAnswerInput({ kind: generated.answerInputKind || "numeric" });
  const applicationContext = createMathApplicationContext({ family, generated });
  const solutionStrategies = createMathSolutionStrategies({ family, generated });
  const itemTags = createItemTags({
    aiVersion,
    family,
    generated,
    applicationContext,
    normalizedSeed: effectiveSeed,
    seed,
    instructionalGrade: resolvedInstructionalGrade,
    variantLevel,
    solutionStrategies,
    answerInput,
  });
  const generationBoundary = {
    ...(FAMILY_GENERATION_BOUNDARIES[family.id] || {}),
    ...(hasReverseQuestionVariant(variantLevel)
      ? REVERSE_QUESTION_ANSWER_BOUNDARIES[family.id] || {}
      : hasMultiStepExtensionVariant(variantLevel)
      ? MULTI_STEP_EXTENSION_ANSWER_BOUNDARIES[family.id] || {}
        : {}),
    ...(generated.answerInputKind === "fraction" ? FRACTION_RESPONSE_BOUNDARY : {}),
    normalizedSeed,
    effectiveSeed,
    instructionalGrade: resolvedInstructionalGrade,
  };
  const logicModel = createMathItemModelSpecification({ family, generationBoundary });
  const supportStructure = createSupportStructure({ variantLevel });
  const featureSignature = createQuestionFeatureSignature({ family, generated, variantLevel });
  const solutionDerivation = createMathSolutionDerivation({ family, generated, answerInput });

  return {
    id: `${aiVersion}-${family.id}-${variantLevel}-${seed}`,
    sourceMode: aiVersion === "full_ai_ready" ? "ai_candidate_validated" : "bounded_rule_generator",
    familyId: family.id,
    familyName: family.name,
    prompt: generated.prompt,
    answer: generated.answer,
    answerRule: generated.answerRule,
    answerInput,
    metadataTags: {
      gradeBands: family.gradeBands,
      instructionalGrade: resolvedInstructionalGrade,
      domain: family.domain,
      abilityTags: family.abilityTags,
      atlasNodeIds: family.atlasNodeIds,
      variantLevel,
      contextTemplateId: generated.contextTemplateId,
      generationBoundary,
      logicModel,
      variantControl: generated.variantControl || variantControl(variantLevel, "primary_value", "secondary_value"),
      structuralVariant: generated.structuralVariant,
      featureSignature,
      applicationContext,
      itemTags,
    },
    solutionSteps: generated.steps,
    solutionStrategies,
    solutionDerivation,
    supportStructure,
    hintLayers: createHintLayers({ family, generated }),
    guidedSteps: createGuidedSteps({ family, generated, variantLevel, answerInput }),
    validatorTrace: [],
    qualityStatus: "draft",
  };
}

export function validateMathQuestionCandidate(candidate) {
  const errors = [];
  if (!candidate.prompt || candidate.prompt.length < 12) errors.push("prompt_too_short");
  if (!Number.isFinite(candidate.answer)) errors.push("answer_not_numeric");
  const answerInputCheck = validateMathAnswerInput({ answerInput: candidate.answerInput, answer: candidate.answer });
  errors.push(...answerInputCheck.errors);
  if (!candidate.answerRule) errors.push("missing_answer_rule");
  const answerRuleCheck = answerMatchesMathRule({ answer: candidate.answer, answerRule: candidate.answerRule });
  if (!answerRuleCheck.valid) errors.push(`answer_rule_not_evaluable:${answerRuleCheck.error}`);
  if (answerRuleCheck.valid && !answerRuleCheck.matches) errors.push("answer_rule_result_mismatch");
  const familySemanticCheck = validateMathFamilySemantics({ candidate });
  errors.push(...familySemanticCheck.errors);
  const applicationContextCheck = validateMathApplicationContext({ candidate });
  errors.push(...applicationContextCheck.errors);
  const boundedModelCheck = validateMathItemModelSpecification({ candidate });
  errors.push(...boundedModelCheck.errors);
  const solutionDerivationCheck = validateMathSolutionDerivation({ candidate });
  errors.push(...solutionDerivationCheck.errors);
  const solutionStrategyCheck = validateMathSolutionStrategies({ candidate });
  errors.push(...solutionStrategyCheck.errors);
  if (!candidate.metadataTags?.abilityTags?.length) errors.push("missing_ability_tags");
  if (!candidate.metadataTags?.atlasNodeIds?.length) errors.push("missing_atlas_tags");
  if (!candidate.metadataTags?.contextTemplateId) errors.push("missing_context_template");
  if (!candidate.metadataTags?.featureSignature?.matchingKeys?.length) errors.push("missing_question_feature_signature");
  if (candidate.metadataTags?.featureSignature?.version !== "math_feature_signature_v1") {
    errors.push("question_feature_signature_version_mismatch");
  }
  if (!candidate.metadataTags?.instructionalGrade) errors.push("missing_instructional_grade");
  if (
    candidate.metadataTags?.instructionalGrade &&
    !candidate.metadataTags?.gradeBands?.includes(candidate.metadataTags.instructionalGrade)
  ) {
    errors.push("instructional_grade_outside_family_scope");
  }
  const itemTags = candidate.metadataTags?.itemTags;
  REQUIRED_ITEM_TAG_GROUPS.forEach((group) => {
    if (!itemTags?.[group]) errors.push(`missing_item_tag_group:${group}`);
  });
  if (itemTags?.practiceTags?.variantLevel !== candidate.metadataTags?.variantLevel) {
    errors.push("item_tag_variant_level_mismatch");
  }
  if (itemTags?.practiceTags?.variantCode !== VARIANT_CODES[candidate.metadataTags?.variantLevel]) {
    errors.push("item_tag_variant_code_mismatch");
  }
  if (itemTags?.qualityTags?.contextTemplateId !== candidate.metadataTags?.contextTemplateId) {
    errors.push("item_tag_context_template_mismatch");
  }
  if (itemTags?.systemLevelTags?.instructionalGrade !== `CN_SH_${candidate.metadataTags?.instructionalGrade}`) {
    errors.push("item_tag_instructional_grade_mismatch");
  }
  if (itemTags?.evidenceTags?.responseFormat !== candidate.answerInput?.kind) {
    errors.push("item_tag_answer_input_format_mismatch");
  }
  if (itemTags?.evidenceTags?.scoringRuleId !== `score-${candidate.familyId}-${candidate.answerInput?.kind}-v1`) {
    errors.push("item_tag_answer_input_scoring_rule_mismatch");
  }
  if (!itemTags?.knowledgeGraphTags?.familyNodeId || !itemTags.knowledgeGraphTags?.conceptNodeIds?.length) {
    errors.push("missing_knowledge_graph_binding");
  }
  const control = candidate.metadataTags?.variantControl;
  if (!control) {
    errors.push("missing_variant_control");
  } else if (!Object.hasOwn(VARIANT_CHANGE_COUNTS, candidate.metadataTags?.variantLevel)) {
    errors.push("unknown_variant_level");
  } else {
    const expectedChangeCount = VARIANT_CHANGE_COUNTS[candidate.metadataTags.variantLevel];
    if (control.expectedIndependentChangeCount !== expectedChangeCount) errors.push("variant_change_count_mismatch");
    if ((control.changedIndependentVariables || []).length !== expectedChangeCount) errors.push("variant_variables_mismatch");
  }
  const structuralVariant = candidate.metadataTags?.structuralVariant;
  if (!structuralVariant || structuralVariant.id !== candidate.metadataTags?.variantLevel) {
    errors.push("structural_variant_metadata_mismatch");
  } else if (
    [
      "relationship_reframe",
      "question_order_variant",
      "step_added_variant",
      "two_steps_added_variant",
      "reverse_question",
      "multi_step_extension",
    ].includes(
      candidate.metadataTags?.variantLevel,
    ) &&
    structuralVariant.applied !== true
  ) {
    errors.push("structural_variant_not_applied");
  }
  if (
    candidate.metadataTags?.variantLevel === "reverse_question" &&
    structuralVariant?.effect !== "bounded_inverse_question"
  ) {
    errors.push("reverse_question_variant_invalid");
  }
  if (
    candidate.metadataTags?.variantLevel === "multi_step_extension" &&
    structuralVariant?.effect !== "bounded_multi_step_question"
  ) {
    errors.push("multi_step_extension_variant_invalid");
  }
  if (candidate.metadataTags?.variantLevel === "question_order_variant" && !String(candidate.prompt || "").startsWith("问题：")) {
    errors.push("question_order_variant_prompt_invalid");
  }
  if (candidate.metadataTags?.variantLevel === "step_added_variant") {
    if ((candidate.solutionSteps || []).length < 5) errors.push("step_added_variant_not_extended");
    if (!String(candidate.prompt || "").includes(STEP_ADDED_PROMPT_CUE)) {
      errors.push("step_added_variant_prompt_invalid");
    }
  }
  if (candidate.metadataTags?.variantLevel === "two_steps_added_variant") {
    if ((candidate.solutionSteps || []).length < 6) errors.push("two_steps_added_variant_not_extended");
    if (!String(candidate.prompt || "").includes(TWO_STEPS_ADDED_PROMPT_CUE)) {
      errors.push("two_steps_added_variant_prompt_invalid");
    }
  }
  const boundary = candidate.metadataTags?.generationBoundary;
  if (!boundary) errors.push("missing_generation_boundary");
  if (boundary && (candidate.answer < boundary.answerMin || candidate.answer > boundary.answerMax)) {
    errors.push("answer_outside_generation_boundary");
  }
  if ((candidate.solutionSteps || []).length < 3) errors.push("steps_too_shallow");
  if (
    !Array.isArray(candidate.solutionStrategies) ||
    candidate.solutionStrategies.length < 2 ||
    candidate.solutionStrategies.some((strategy) => !strategy?.id || !strategy?.name || !Array.isArray(strategy.steps) || !strategy.steps.length)
  ) {
    errors.push("solution_strategies_incomplete");
  }
  const supportStructure = candidate.supportStructure;
  const expectedHintPhaseDefinitions = HELP_PHASES;
  const expectedGuidedPhaseDefinitions = guidedPhasesForVariant(candidate.metadataTags?.variantLevel);
  if (
    !supportStructure ||
    !phasesMatch(supportStructure.hintPhases, expectedHintPhaseDefinitions, "id") ||
    !phasesMatch(supportStructure.guidedPhases, expectedGuidedPhaseDefinitions, "id") ||
    !phasesMatch(supportStructure.learningPath, expectedGuidedPhaseDefinitions, "label")
  ) {
    errors.push("support_framework_incomplete");
  }
  if (
    !expectedHintPhaseDefinitions.every((phase, index) =>
      hasExpectedSupportEvidenceBinding(supportStructure?.hintBindings?.[index], phase, index, "level"),
    ) ||
    !expectedGuidedPhaseDefinitions.every((phase, index) =>
      hasExpectedSupportEvidenceBinding(supportStructure?.guidedBindings?.[index], phase, index, "stepIndex"),
    )
  ) {
    errors.push("support_evidence_bindings_invalid");
  }
  if ((candidate.hintLayers || []).length < expectedHintPhaseDefinitions.length) errors.push("hint_layers_too_shallow");
  if (
    !expectedHintPhaseDefinitions.every((_, index) => typeof candidate.hintLayers?.[index] === "string" && candidate.hintLayers[index].trim())
  ) {
    errors.push("hint_layer_content_missing");
  }
  if (
    (candidate.guidedSteps || []).length !== expectedGuidedPhaseDefinitions.length ||
    !expectedGuidedPhaseDefinitions.every((phase, index) => candidate.guidedSteps?.[index]?.phase === phase.id) ||
    !expectedGuidedPhaseDefinitions.map((phase) => (phase.id === "check" ? "final_answer" : "short_reasoning")).every(
      (responseType, index) => candidate.guidedSteps?.[index]?.responseType === responseType,
    )
  ) {
    errors.push("guided_steps_framework_incomplete");
  }
  if (JSON.stringify(candidate.guidedSteps?.at(-1)?.answerInput) !== JSON.stringify(candidate.answerInput)) {
    errors.push("guided_final_answer_input_mismatch");
  }

  const qualityStatus = errors.length ? "needs_review" : "system_validated";
  return {
    ...candidate,
    metadataTags: {
      ...candidate.metadataTags,
      itemTags: itemTags
        ? {
            ...itemTags,
            qualityTags: {
              ...itemTags.qualityTags,
              reviewStatus: qualityStatus,
            },
          }
        : itemTags,
    },
    validatorTrace: errors.length
      ? errors
      : [
          "metadata_complete",
          "bounded_model_verified",
          "answer_rule_evaluated",
          "answer_rule_verified",
          "family_semantics_verified",
          "application_context_verified",
          "solution_derivation_verified",
          "solution_strategies_template_verified",
          "steps_verified",
          "hint_layers_verified",
          "help_framework_verified",
          "support_evidence_bindings_verified",
        ],
    qualityStatus,
  };
}

export function createGeneratorComparison({ aiVersionProfiles, families }) {
  return aiVersionProfiles.map((profile, profileIndex) => {
    const candidates = families.map((family, familyIndex) =>
      validateMathQuestionCandidate(
        generateMathQuestionCandidate({
          aiVersion: profile.id,
          family,
          seed: profileIndex + familyIndex + 1,
          instructionalGrade: family.gradeBands.at(-1),
          variantLevel: familyIndex % 2 === 0 ? "change_one_number" : "original",
        }),
      ),
    );

    return {
      aiVersion: profile.id,
      label: profile.name,
      source: profile.questionSource.join(" / "),
      validatedCount: candidates.filter((candidate) => candidate.qualityStatus === "system_validated").length,
      totalCount: candidates.length,
      sample: candidates[0],
    };
  });
}
