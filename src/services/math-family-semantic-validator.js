import { answerMatchesMathRule } from "./math-answer-rule-evaluator.js";

// A generated item must be both computable and structurally faithful to its tagged math family.
// These canonical forms are intentionally backend-only so future AI output is lowered into a
// verifiable rule before it reaches a student.
export const MATH_FAMILY_SEMANTIC_VALIDATION_VERSION = "math_family_semantics_v13";

export const MATH_FAMILY_SEMANTIC_PROFILES = Object.freeze({
  compare_more_less: { ruleShapes: ["#+#"], reverseQuestionRuleShapes: ["#-#"], multiStepExtensionRuleShapes: ["#+#-#"] },
  part_whole_add_subtract: { ruleShapes: ["#+#"], reverseQuestionRuleShapes: ["#-#"], multiStepExtensionRuleShapes: ["#+#-#"] },
  equal_groups_multiply_divide: { ruleShapes: ["#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#+#"] },
  measurement_conversion: {
    ruleShapes: ["#*#+#"],
    reverseQuestionRuleShapes: ["(#-#)/#"],
    multiStepExtensionRuleShapes: ["#*#+#+#"],
    formulaConstants: [100],
  },
  time_elapsed_simple: {
    ruleShapes: ["#-#"],
    reverseQuestionRuleShapes: ["#-#"],
    multiStepExtensionRuleShapes: ["#+#+#"],
    relationCheck: "elapsed_time",
  },
  money_price_total: { ruleShapes: ["#+#", "#*#"], reverseQuestionRuleShapes: ["#-#", "#/#"], multiStepExtensionRuleShapes: ["#+#-#", "#*#+#"] },
  operation_structure_distributive: {
    ruleShapes: ["#*(#+#)"],
    reverseQuestionRuleShapes: ["#/(#+#)"],
    multiStepExtensionRuleShapes: ["#*(#+#)+#"],
  },
  perimeter_area_rectangle: { ruleShapes: ["#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#-#"] },
  fraction_part_whole: { ruleShapes: ["#/#*#"], reverseQuestionRuleShapes: ["#/#*#"], multiStepExtensionRuleShapes: ["#/#*#-#"] },
  decimal_money_measure: { ruleShapes: ["#+#"], reverseQuestionRuleShapes: ["#-#"], multiStepExtensionRuleShapes: ["#+#-#"] },
  multi_step_total_quantity: {
    ruleShapes: ["(#+#)/#"],
    reverseQuestionRuleShapes: ["#*#-#"],
    multiStepExtensionRuleShapes: ["(#+#+#)/#"],
  },
  average_total_count: { ruleShapes: ["#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#+#"] },
  ratio_rate_unit: { ruleShapes: ["#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#+#"] },
  geometry_angle_reasoning: {
    ruleShapes: ["#-#"],
    reverseQuestionRuleShapes: ["#-#"],
    multiStepExtensionRuleShapes: ["#-#-#"],
    requiredNumbers: [180],
  },
  volume_rectangular_prism: {
    ruleShapes: ["#*#*#"],
    reverseQuestionRuleShapes: ["#/#/#"],
    multiStepExtensionRuleShapes: ["#*#*#+#"],
  },
  distance_speed_time: { ruleShapes: ["#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#+#"] },
  probability_event_decimal: {
    ruleShapes: ["#/#"],
    reverseQuestionRuleShapes: ["#*#"],
    multiStepExtensionRuleShapes: ["(#+#)/(#+#+#)"],
  },
  coordinate_movement: {
    ruleShapes: ["#+#"],
    reverseQuestionRuleShapes: ["#-#"],
    multiStepExtensionRuleShapes: ["#+#+#"],
  },
  percent_change: { ruleShapes: ["#*#%"], reverseQuestionRuleShapes: ["#/#%"], multiStepExtensionRuleShapes: ["#*#%+#"] },
  linear_equation_word_problem: {
    ruleShapes: ["x+#+#x=#"],
    reverseQuestionRuleShapes: ["x+#*(x-#)=#"],
    multiStepExtensionRuleShapes: ["x+#+#x+#=#"],
    evaluatorType: "linear_equation",
  },
  data_table_chart: { ruleShapes: ["#-#"], reverseQuestionRuleShapes: ["#-#"], multiStepExtensionRuleShapes: ["#+#-#"] },
  number_composition_place_value: {
    ruleShapes: ["#*#+#"],
    reverseQuestionRuleShapes: ["(#-#)/#"],
    multiStepExtensionRuleShapes: ["#*#+#-#"],
  },
  unknown_part_add_subtract: {
    ruleShapes: ["#-#"],
    reverseQuestionRuleShapes: ["#-#"],
    multiStepExtensionRuleShapes: ["#-#-#"],
  },
  fraction_add_same_denominator: {
    ruleShapes: ["#/#*(#+#)", "(#+#)/#"],
    reverseQuestionRuleShapes: ["#/(#+#)*#"],
    multiStepExtensionRuleShapes: ["#/#*(#+#)-#"],
  },
  decimal_multiply_unit_price: { ruleShapes: ["#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#+#"] },
  ratio_total_split: {
    ruleShapes: ["#/(#+#)*#"],
    reverseQuestionRuleShapes: ["#/#*(#+#)"],
    multiStepExtensionRuleShapes: ["#/(#+#)*#+#"],
  },
  circle_area_application: {
    ruleShapes: ["#*#*#*#"],
    reverseQuestionRuleShapes: ["#/(#*#*#)"],
    multiStepExtensionRuleShapes: ["#*#*#*#+#"],
    requiredNumbers: [3.14],
  },
  square_perimeter_intro: {
    ruleShapes: ["#*#"],
    reverseQuestionRuleShapes: ["#/#"],
    multiStepExtensionRuleShapes: ["#*#-#"],
    requiredNumbers: [4],
    formulaConstants: [4],
  },
  division_remainder_grouping: {
    ruleShapes: ["ceil(#/#)"],
    reverseQuestionRuleShapes: ["(#-#)/#"],
    multiStepExtensionRuleShapes: ["ceil((#+#)/#)"],
  },
  fraction_subtract_same_denominator: {
    ruleShapes: ["#/#*(#-#)", "(#-#)/#"],
    reverseQuestionRuleShapes: ["#/(#-#)*#"],
    multiStepExtensionRuleShapes: ["#/#*(#-#)-#"],
  },
  decimal_divide_equal_share: {
    ruleShapes: ["#/#"],
    reverseQuestionRuleShapes: ["#/#"],
    multiStepExtensionRuleShapes: ["(#-#)/#"],
  },
  data_range_comparison: { ruleShapes: ["#-#"], reverseQuestionRuleShapes: ["#+#"], multiStepExtensionRuleShapes: ["#-#+#"] },
  triangle_area_application: {
    ruleShapes: ["#*#/#"],
    reverseQuestionRuleShapes: ["#*#/#"],
    multiStepExtensionRuleShapes: ["#*#/#-#"],
    requiredNumbers: [2],
    formulaConstants: [2],
  },
  addition_subtraction_regrouping: { ruleShapes: ["#-#", "#+#"], reverseQuestionRuleShapes: ["#-#"], multiStepExtensionRuleShapes: ["#+#-#"] },
  multiplication_division_inverse: { ruleShapes: ["#/#", "#*#"], reverseQuestionRuleShapes: ["#/#"], multiStepExtensionRuleShapes: ["#*#+#"] },
  integer_operation_order: {
    ruleShapes: ["#*#+#"],
    reverseQuestionRuleShapes: ["(#-#)/#"],
    multiStepExtensionRuleShapes: ["#*#+#-#"],
  },
  fraction_equivalent_compare: {
    ruleShapes: ["#/#*(#*#-#)"],
    reverseQuestionRuleShapes: ["#/(#*#-#)*#"],
    multiStepExtensionRuleShapes: ["#/#*(#*#-#)+#"],
    formulaConstants: [2],
  },
  decimal_rounding_estimation: {
    ruleShapes: ["round(#,#decimalplace)"],
    reverseQuestionRuleShapes: ["#-#+#/#"],
    multiStepExtensionRuleShapes: ["round(#+#,#decimalplace)"],
    formulaConstants: [0.1, 1, 100],
  },
  circle_circumference_application: {
    ruleShapes: ["#*#*#*#"],
    reverseQuestionRuleShapes: ["#/(#*#*#)"],
    multiStepExtensionRuleShapes: ["#*#*#*#+#"],
    requiredNumbers: [2, 3.14],
    formulaConstants: [2, 3.14],
  },
  trapezoid_area_application: {
    ruleShapes: ["(#+#)*#/#"],
    reverseQuestionRuleShapes: ["#*#/(#+#)"],
    multiStepExtensionRuleShapes: ["(#+#)*#/#+#"],
    requiredNumbers: [2],
    formulaConstants: [2],
  },
  proportion_scale_application: {
    ruleShapes: ["#*#/#"],
    reverseQuestionRuleShapes: ["#*#/#"],
    multiStepExtensionRuleShapes: ["#*#/#+#"],
    formulaConstants: [100000],
  },
});

function numericEqual(left, right) {
  const first = Number(left);
  const second = Number(right);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return false;
  const tolerance = Math.max(1e-9, Math.abs(first) * 1e-9, Math.abs(second) * 1e-9);
  return Math.abs(first - second) <= tolerance;
}

function extractNumbers(value) {
  return [...String(value || "").matchAll(/(?:\d+(?:\.\d+)?|\.\d+)/g)].map((match) => Number(match[0]));
}

function ruleShape(answerRule) {
  return String(answerRule || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(?:\d+(?:\.\d+)?|\.\d+)/g, "#");
}

function allowedRuleShapes({ candidate, profile }) {
  if (candidate?.metadataTags?.variantLevel === "reverse_question") {
    return profile.reverseQuestionRuleShapes || [];
  }
  if (candidate?.metadataTags?.variantLevel === "multi_step_extension") {
    return profile.multiStepExtensionRuleShapes || [];
  }
  return profile.ruleShapes || [];
}

function includesNumericValue(values, expected) {
  return values.some((value) => numericEqual(value, expected));
}

function validateNumericGrounding({ candidate, profile }) {
  const errors = [];
  const ruleNumbers = extractNumbers(candidate?.answerRule);
  const promptNumbers = extractNumbers(candidate?.prompt);
  const formulaConstants = profile.formulaConstants || [];

  if (!ruleNumbers.length) return ["semantic_rule_numbers_missing"];
  const unmatchedNumbers = ruleNumbers.filter(
    (value) => !includesNumericValue(promptNumbers, value) && !includesNumericValue(formulaConstants, value),
  );
  if (unmatchedNumbers.length) errors.push("semantic_rule_numbers_not_grounded");
  if (!ruleNumbers.some((value) => includesNumericValue(promptNumbers, value))) {
    errors.push("semantic_rule_has_no_prompt_anchor");
  }
  return errors;
}

function parseClockValues(prompt) {
  return [...String(prompt || "").matchAll(/\b(\d{1,2}):(\d{2})\b/g)]
    .map((match) => ({ hour: Number(match[1]), minute: Number(match[2]) }))
    .filter(({ hour, minute }) => hour >= 0 && hour <= 23 && minute >= 0 && minute < 60);
}

function durationMinutes(value, unit) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 1) return null;
  if (unit === "小时") return amount * 60;
  if (unit === "分钟") return amount;
  return null;
}

function parseStatedDurations(prompt) {
  return [...String(prompt || "").matchAll(/(?:进行了|先阅读|先创作|再整理)\s*(\d+)\s*(小时|分钟)/g)]
    .map((match) => durationMinutes(match[1], match[2]))
    .filter((value) => Number.isFinite(value));
}

function numbersMatch(ruleNumbers, expectedNumbers) {
  return (
    ruleNumbers.length === expectedNumbers.length &&
    ruleNumbers.every((value, index) => numericEqual(value, expectedNumbers[index]))
  );
}

function clockAnswerFormatErrors(candidate) {
  return candidate?.answerInput?.kind === "clock_time" ? [] : ["semantic_time_clock_answer_format_required"];
}

function validateElapsedTimeRelation(candidate) {
  const clocks = parseClockValues(candidate?.prompt);
  const ruleNumbers = extractNumbers(candidate?.answerRule);
  const errors = [];
  const variantLevel = candidate?.metadataTags?.variantLevel || "original";

  if (variantLevel === "reverse_question") {
    const [end] = clocks;
    const [duration] = parseStatedDurations(candidate?.prompt);
    if (!end || !Number.isFinite(duration) || ruleNumbers.length !== 2) return ["semantic_time_relation_incomplete"];
    const endMinutes = end.hour * 60 + end.minute;
    const expectedAnswer = endMinutes - duration;
    errors.push(...clockAnswerFormatErrors(candidate));
    if (!numbersMatch(ruleNumbers, [endMinutes, duration])) errors.push("semantic_time_rule_not_bound_to_clock_values");
    if (!numericEqual(candidate?.answer, expectedAnswer)) errors.push("semantic_time_answer_not_bound_to_clock_values");
    return errors;
  }

  if (variantLevel === "multi_step_extension") {
    const [start] = clocks;
    const durations = parseStatedDurations(candidate?.prompt);
    if (!start || durations.length !== 2 || ruleNumbers.length !== 3) return ["semantic_time_relation_incomplete"];
    const startMinutes = start.hour * 60 + start.minute;
    const expectedAnswer = startMinutes + durations[0] + durations[1];
    errors.push(...clockAnswerFormatErrors(candidate));
    if (!numbersMatch(ruleNumbers, [startMinutes, ...durations])) errors.push("semantic_time_rule_not_bound_to_clock_values");
    if (!numericEqual(candidate?.answer, expectedAnswer)) errors.push("semantic_time_answer_not_bound_to_clock_values");
    return errors;
  }

  if (clocks.length < 2 || ruleNumbers.length !== 2) return ["semantic_time_relation_incomplete"];
  const [start, end] = clocks;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const expectsHours = /多少小时/.test(String(candidate?.prompt || ""));
  const expectedAnswer = expectsHours ? (endMinutes - startMinutes) / 60 : endMinutes - startMinutes;
  const ruleMatchesMinutes = numericEqual(ruleNumbers[0], endMinutes) && numericEqual(ruleNumbers[1], startMinutes);
  const ruleMatchesWholeHours =
    start.minute === 0 &&
    end.minute === 0 &&
    numericEqual(ruleNumbers[0], end.hour) &&
    numericEqual(ruleNumbers[1], start.hour);

  if (candidate?.answerInput?.kind !== "numeric") errors.push("semantic_time_duration_answer_format_required");
  if (!ruleMatchesMinutes && !ruleMatchesWholeHours) errors.push("semantic_time_rule_not_bound_to_clock_values");
  if (!numericEqual(candidate?.answer, expectedAnswer)) errors.push("semantic_time_answer_not_bound_to_clock_values");
  return errors;
}

export function getMathFamilySemanticRuleShape(answerRule) {
  return ruleShape(answerRule);
}

export function validateMathFamilySemantics({ candidate }) {
  const errors = [];
  const familyId = candidate?.familyId;
  const profile = MATH_FAMILY_SEMANTIC_PROFILES[familyId];
  if (!profile) return { valid: false, errors: ["semantic_family_profile_missing"] };

  const normalizedRuleShape = ruleShape(candidate?.answerRule);
  if (!allowedRuleShapes({ candidate, profile }).includes(normalizedRuleShape)) {
    errors.push("semantic_rule_shape_mismatch");
  }

  const ruleCheck = answerMatchesMathRule({
    answer: candidate?.answer,
    answerRule: candidate?.answerRule,
  });
  if (!ruleCheck.valid || !ruleCheck.matches) {
    errors.push("semantic_rule_not_computable");
  } else if (profile.evaluatorType && ruleCheck.type !== profile.evaluatorType) {
    errors.push("semantic_rule_evaluator_type_mismatch");
  }

  const ruleNumbers = extractNumbers(candidate?.answerRule);
  (profile.requiredNumbers || []).forEach((requiredNumber) => {
    if (!includesNumericValue(ruleNumbers, requiredNumber)) errors.push(`semantic_required_number_missing:${requiredNumber}`);
  });

  if (profile.relationCheck === "elapsed_time") {
    errors.push(...validateElapsedTimeRelation(candidate));
  } else {
    errors.push(...validateNumericGrounding({ candidate, profile }));
  }

  return {
    valid: errors.length === 0,
    errors,
    ruleShape: normalizedRuleShape,
    version: MATH_FAMILY_SEMANTIC_VALIDATION_VERSION,
  };
}
