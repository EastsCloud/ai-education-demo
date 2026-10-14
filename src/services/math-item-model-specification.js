import { shanghaiMathItemFamilies } from "../data/shanghai-math-taxonomy.js";

export const MATH_ITEM_MODEL_VERSION = "math_bounded_item_model_v13";

export const MATH_ITEM_MODEL_VARIANTS = [
  "original",
  "change_one_number",
  "change_two_numbers",
  "relationship_reframe",
  "question_order_variant",
  "context_change",
  "step_added_variant",
  "two_steps_added_variant",
  "reverse_question",
  "multi_step_extension",
];

// These families declare a valid inverse relationship in the curriculum logic.
// A reverse form is intentionally unavailable everywhere else until it has its own
// bounded generation and semantic-validation path.
export const REVERSE_QUESTION_SUPPORTED_FAMILY_IDS = new Set([
  "compare_more_less",
  "part_whole_add_subtract",
  "equal_groups_multiply_divide",
  "money_price_total",
  "perimeter_area_rectangle",
  "fraction_part_whole",
  "average_total_count",
  "ratio_rate_unit",
  "measurement_conversion",
  "time_elapsed_simple",
  "volume_rectangular_prism",
  "distance_speed_time",
  "square_perimeter_intro",
  "decimal_money_measure",
  "decimal_multiply_unit_price",
  "triangle_area_application",
  "multiplication_division_inverse",
  "operation_structure_distributive",
  "ratio_total_split",
  "trapezoid_area_application",
  "proportion_scale_application",
  "addition_subtraction_regrouping",
  "data_range_comparison",
  "geometry_angle_reasoning",
  "percent_change",
  "fraction_add_same_denominator",
  "fraction_subtract_same_denominator",
  "decimal_divide_equal_share",
  "fraction_equivalent_compare",
  "coordinate_movement",
  "number_composition_place_value",
  "unknown_part_add_subtract",
  "data_table_chart",
  "multi_step_total_quantity",
  "probability_event_decimal",
  "division_remainder_grouping",
  "integer_operation_order",
  "linear_equation_word_problem",
  "circle_area_application",
  "decimal_rounding_estimation",
  "circle_circumference_application",
]);

// This is deliberately separate from support-layer S1/S2. These families have
// a verified second mathematical relationship and an authored real-world context.
export const MULTI_STEP_EXTENSION_SUPPORTED_FAMILY_IDS = new Set([
  "compare_more_less",
  "part_whole_add_subtract",
  "equal_groups_multiply_divide",
  "money_price_total",
  "perimeter_area_rectangle",
  "fraction_part_whole",
  "average_total_count",
  "ratio_rate_unit",
  "measurement_conversion",
  "time_elapsed_simple",
  "volume_rectangular_prism",
  "distance_speed_time",
  "square_perimeter_intro",
  "decimal_money_measure",
  "decimal_multiply_unit_price",
  "triangle_area_application",
  "multiplication_division_inverse",
  "operation_structure_distributive",
  "ratio_total_split",
  "trapezoid_area_application",
  "proportion_scale_application",
  "addition_subtraction_regrouping",
  "data_range_comparison",
  "geometry_angle_reasoning",
  "percent_change",
  "fraction_add_same_denominator",
  "fraction_subtract_same_denominator",
  "decimal_divide_equal_share",
  "fraction_equivalent_compare",
  "coordinate_movement",
  "number_composition_place_value",
  "unknown_part_add_subtract",
  "data_table_chart",
  "multi_step_total_quantity",
  "probability_event_decimal",
  "division_remainder_grouping",
  "integer_operation_order",
  "linear_equation_word_problem",
  "circle_area_application",
  "decimal_rounding_estimation",
  "circle_circumference_application",
]);

export const MATH_ITEM_MODEL_SUPPORT_PHASES = ["read_translate", "relationship", "calculation", "check"];

const FAMILY_CORE_RELATIONS = Object.freeze({
  compare_more_less: "target quantity equals the compared base quantity plus the stated difference",
  part_whole_add_subtract: "whole equals the sum of its parts",
  equal_groups_multiply_divide: "total equals equal group size multiplied by group count",
  measurement_conversion: "equivalent measures are connected by a fixed unit conversion relationship",
  time_elapsed_simple: "elapsed time equals end time minus start time in a common unit",
  money_price_total: "total price equals unit price multiplied by quantity, or the sum of stated prices",
  operation_structure_distributive: "a common multiplier can distribute across summed parts",
  perimeter_area_rectangle: "rectangle area equals length multiplied by width",
  fraction_part_whole: "a fractional part equals the whole divided into equal denominator parts",
  decimal_money_measure: "decimal quantities combine or compare in aligned place values",
  multi_step_total_quantity: "combine component quantities before applying the stated group relationship",
  average_total_count: "total equals average multiplied by count",
  ratio_rate_unit: "a ratio preserves the same unit relationship between corresponding quantities",
  geometry_angle_reasoning: "related angles combine to a fixed whole angle",
  volume_rectangular_prism: "rectangular-prism volume equals length multiplied by width multiplied by height",
  distance_speed_time: "distance equals speed multiplied by time",
  probability_event_decimal: "probability equals favorable outcomes divided by all equally likely outcomes",
  coordinate_movement: "a coordinate changes by the stated signed horizontal or vertical shift",
  percent_change: "a percentage amount equals the base quantity multiplied by the percent rate",
  linear_equation_word_problem: "an unknown is determined by a balanced one-variable linear relationship",
  data_table_chart: "the requested value follows from the stated table or chart comparison relationship",
  number_composition_place_value: "a two-digit number equals tens multiplied by ten plus ones",
  unknown_part_add_subtract: "an unknown part equals the whole minus the known part",
  fraction_add_same_denominator: "same-denominator fractions combine by adding equal-sized parts",
  decimal_multiply_unit_price: "decimal total price equals decimal unit price multiplied by quantity",
  ratio_total_split: "each ratio share equals total divided by total parts then multiplied by that share's parts",
  circle_area_application: "circle area equals pi multiplied by radius squared, scaled by the number of circles",
  square_perimeter_intro: "square perimeter equals four times one side length",
  division_remainder_grouping: "required groups equal the ceiling of total items divided by group capacity",
  fraction_subtract_same_denominator: "same-denominator fractional difference is the difference in equal-sized parts",
  decimal_divide_equal_share: "equal-share unit amount equals decimal total divided by quantity",
  data_range_comparison: "data range equals maximum value minus minimum value",
  triangle_area_application: "triangle area equals base multiplied by height divided by two",
  addition_subtraction_regrouping: "the result follows from place-value addition or subtraction with regrouping when needed",
  multiplication_division_inverse: "multiplication and division reverse the same equal-groups relationship",
  integer_operation_order: "evaluate grouped multiplication before combining the remaining additive quantity",
  fraction_equivalent_compare: "compare fractions through equivalent equal-sized parts before finding their difference",
  decimal_rounding_estimation: "the next decimal place determines whether the retained place stays or increases by one",
  circle_circumference_application: "circle circumference equals two multiplied by pi multiplied by radius, scaled by circle count",
  trapezoid_area_application: "trapezoid area equals the sum of bases multiplied by height divided by two",
  proportion_scale_application: "actual distance equals map distance multiplied by scale, then converted to the requested unit",
});

function matchingArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function numericEqual(left, right) {
  const first = Number(left);
  const second = Number(right);
  return Number.isFinite(first) && Number.isFinite(second) && Math.abs(first - second) <= 1e-9;
}

function limitsFromBoundary(boundary = {}) {
  return {
    seedMin: Number(boundary.seedMin),
    seedMax: Number(boundary.seedMax),
    answerMin: Number(boundary.answerMin),
    answerMax: Number(boundary.answerMax),
  };
}

function findFamily(familyId) {
  return shanghaiMathItemFamilies.find((family) => family.id === familyId) || null;
}

export function getSupportedMathItemModelVariants(familyOrId) {
  const familyId = typeof familyOrId === "string" ? familyOrId : familyOrId?.id;
  return MATH_ITEM_MODEL_VARIANTS.filter((variantLevel) => {
    if (variantLevel === "reverse_question") return REVERSE_QUESTION_SUPPORTED_FAMILY_IDS.has(familyId);
    if (variantLevel === "multi_step_extension") return MULTI_STEP_EXTENSION_SUPPORTED_FAMILY_IDS.has(familyId);
    return true;
  });
}

export function getMathCoreRelation(familyId) {
  return FAMILY_CORE_RELATIONS[familyId] || null;
}

export function createMathItemModelSpecification({ family, generationBoundary }) {
  if (!family?.id) return null;
  return {
    version: MATH_ITEM_MODEL_VERSION,
    logicUnitId: family.id,
    coreRelation: getMathCoreRelation(family.id),
    variableSlots: [...(family.variableSlots || [])],
    variantBoundaries: [...(family.variantBoundaries || [])],
    supportedVariantLevels: getSupportedMathItemModelVariants(family),
    generationLimits: limitsFromBoundary(generationBoundary),
    stepExtensionBoundary: {
      minStepCount: 4,
      maxStepCount: 7,
      requiredPhases: [...MATH_ITEM_MODEL_SUPPORT_PHASES],
    },
  };
}

export function validateMathItemModelSpecification({ candidate }) {
  const errors = [];
  const logicModel = candidate?.metadataTags?.logicModel;
  const family = findFamily(candidate?.familyId);
  const generationBoundary = candidate?.metadataTags?.generationBoundary;
  const solutionStepCount = Array.isArray(candidate?.solutionSteps) ? candidate.solutionSteps.length : 0;

  if (!logicModel || typeof logicModel !== "object") return { valid: false, errors: ["bounded_model_missing"] };
  if (!family) return { valid: false, errors: ["bounded_model_unknown_family"] };
  if (logicModel.version !== MATH_ITEM_MODEL_VERSION) errors.push("bounded_model_version_mismatch");
  if (logicModel.logicUnitId !== family.id) errors.push("bounded_model_logic_unit_mismatch");
  if (logicModel.coreRelation !== getMathCoreRelation(family.id)) errors.push("bounded_model_core_relation_mismatch");
  if (!matchingArray(logicModel.variableSlots, family.variableSlots)) errors.push("bounded_model_variable_slots_mismatch");
  if (!matchingArray(logicModel.variantBoundaries, family.variantBoundaries)) errors.push("bounded_model_variant_boundaries_mismatch");
  if (!matchingArray(logicModel.supportedVariantLevels, getSupportedMathItemModelVariants(family))) {
    errors.push("bounded_model_supported_variants_mismatch");
  }
  if (!logicModel.supportedVariantLevels?.includes(candidate?.metadataTags?.variantLevel)) {
    errors.push("bounded_model_variant_level_not_supported");
  }

  const expectedLimits = limitsFromBoundary(generationBoundary);
  for (const field of Object.keys(expectedLimits)) {
    if (!numericEqual(logicModel.generationLimits?.[field], expectedLimits[field])) {
      errors.push(`bounded_model_generation_limit_mismatch:${field}`);
    }
  }

  const stepBoundary = logicModel.stepExtensionBoundary;
  if (
    !stepBoundary ||
    !Number.isInteger(stepBoundary.minStepCount) ||
    !Number.isInteger(stepBoundary.maxStepCount) ||
    stepBoundary.minStepCount < 4 ||
    stepBoundary.maxStepCount < stepBoundary.minStepCount ||
    !matchingArray(stepBoundary.requiredPhases, MATH_ITEM_MODEL_SUPPORT_PHASES)
  ) {
    errors.push("bounded_model_step_boundary_invalid");
  } else if (solutionStepCount < stepBoundary.minStepCount || solutionStepCount > stepBoundary.maxStepCount) {
    errors.push("bounded_model_step_count_outside_boundary");
  }

  return { valid: errors.length === 0, errors };
}
