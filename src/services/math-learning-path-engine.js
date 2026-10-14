import { shanghaiMathItemFamilies } from "../data/shanghai-math-taxonomy.js?v=math-taxonomy-4";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const GRADE_ORDER = ["G1", "G2", "G3", "G4", "G5", "G6"];

export const LEGACY_MATH_LEARNING_PATH_VERSION = "math-learning-path-v2";
export const PREVIOUS_MATH_LEARNING_PATH_VERSION = "math-learning-path-v3";
export const DEFAULT_MATH_LEARNING_PATH_VERSION = "math-learning-path-v4";

// This is a bounded instructional route, not a claim that one textbook order fits
// every child. The curve supplies the entry point; verified practice keeps or moves it.
// V2 remains available for already-confirmed plans so a catalog expansion does not
// silently change a learner's curve-to-route placement.
export const MATH_CURRICULUM_ROUTE_V2_BY_GRADE = Object.freeze({
  G1: [
    "part_whole_add_subtract",
    "compare_more_less",
    "time_elapsed_simple",
    "money_price_total",
  ],
  G2: [
    "part_whole_add_subtract",
    "compare_more_less",
    "equal_groups_multiply_divide",
    "measurement_conversion",
    "time_elapsed_simple",
    "money_price_total",
    "data_table_chart",
  ],
  G3: [
    "part_whole_add_subtract",
    "compare_more_less",
    "equal_groups_multiply_divide",
    "measurement_conversion",
    "time_elapsed_simple",
    "money_price_total",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "data_table_chart",
  ],
  G4: [
    "equal_groups_multiply_divide",
    "measurement_conversion",
    "operation_structure_distributive",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "decimal_money_measure",
    "geometry_angle_reasoning",
    "average_total_count",
    "data_table_chart",
  ],
  G5: [
    "measurement_conversion",
    "operation_structure_distributive",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "decimal_money_measure",
    "average_total_count",
    "ratio_rate_unit",
    "geometry_angle_reasoning",
    "volume_rectangular_prism",
    "distance_speed_time",
    "probability_event_decimal",
    "percent_change",
    "linear_equation_word_problem",
    "data_table_chart",
  ],
  G6: [
    "decimal_money_measure",
    "average_total_count",
    "ratio_rate_unit",
    "geometry_angle_reasoning",
    "volume_rectangular_prism",
    "distance_speed_time",
    "probability_event_decimal",
    "coordinate_movement",
    "percent_change",
    "linear_equation_word_problem",
    "data_table_chart",
  ],
});

// V3 remains available for plans confirmed before the V4 library expansion. It
// preserves the reviewed sequence that was active at that time.
export const MATH_CURRICULUM_ROUTE_V3_BY_GRADE = Object.freeze({
  G1: [
    "number_composition_place_value",
    "part_whole_add_subtract",
    "unknown_part_add_subtract",
    "compare_more_less",
    "time_elapsed_simple",
    "money_price_total",
  ],
  G2: [
    "number_composition_place_value",
    "part_whole_add_subtract",
    "unknown_part_add_subtract",
    "compare_more_less",
    "equal_groups_multiply_divide",
    "measurement_conversion",
    "time_elapsed_simple",
    "money_price_total",
    "square_perimeter_intro",
    "data_table_chart",
  ],
  G3: [
    "number_composition_place_value",
    "part_whole_add_subtract",
    "unknown_part_add_subtract",
    "compare_more_less",
    "equal_groups_multiply_divide",
    "division_remainder_grouping",
    "measurement_conversion",
    "time_elapsed_simple",
    "money_price_total",
    "multi_step_total_quantity",
    "square_perimeter_intro",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "data_table_chart",
    "data_range_comparison",
  ],
  G4: [
    "equal_groups_multiply_divide",
    "division_remainder_grouping",
    "operation_structure_distributive",
    "measurement_conversion",
    "square_perimeter_intro",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "fraction_add_same_denominator",
    "fraction_subtract_same_denominator",
    "decimal_money_measure",
    "geometry_angle_reasoning",
    "average_total_count",
    "data_table_chart",
    "data_range_comparison",
  ],
  G5: [
    "measurement_conversion",
    "operation_structure_distributive",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "fraction_add_same_denominator",
    "fraction_subtract_same_denominator",
    "decimal_money_measure",
    "decimal_multiply_unit_price",
    "decimal_divide_equal_share",
    "average_total_count",
    "ratio_rate_unit",
    "ratio_total_split",
    "geometry_angle_reasoning",
    "triangle_area_application",
    "volume_rectangular_prism",
    "circle_area_application",
    "distance_speed_time",
    "probability_event_decimal",
    "percent_change",
    "linear_equation_word_problem",
    "data_table_chart",
    "data_range_comparison",
  ],
  G6: [
    "decimal_money_measure",
    "fraction_add_same_denominator",
    "fraction_subtract_same_denominator",
    "decimal_multiply_unit_price",
    "decimal_divide_equal_share",
    "average_total_count",
    "ratio_rate_unit",
    "ratio_total_split",
    "geometry_angle_reasoning",
    "triangle_area_application",
    "volume_rectangular_prism",
    "circle_area_application",
    "distance_speed_time",
    "probability_event_decimal",
    "coordinate_movement",
    "percent_change",
    "linear_equation_word_problem",
    "data_table_chart",
  ],
});

// V4 expands the executable library without mutating confirmed V2/V3 plans.
// New students receive this route; historic plans keep their stored route version.
export const MATH_CURRICULUM_ROUTE_V4_BY_GRADE = Object.freeze({
  G1: [
    "number_composition_place_value",
    "part_whole_add_subtract",
    "addition_subtraction_regrouping",
    "unknown_part_add_subtract",
    "compare_more_less",
    "time_elapsed_simple",
    "money_price_total",
  ],
  G2: [
    "number_composition_place_value",
    "part_whole_add_subtract",
    "addition_subtraction_regrouping",
    "unknown_part_add_subtract",
    "compare_more_less",
    "equal_groups_multiply_divide",
    "multiplication_division_inverse",
    "measurement_conversion",
    "time_elapsed_simple",
    "money_price_total",
    "square_perimeter_intro",
    "data_table_chart",
  ],
  G3: [
    "number_composition_place_value",
    "part_whole_add_subtract",
    "addition_subtraction_regrouping",
    "unknown_part_add_subtract",
    "compare_more_less",
    "equal_groups_multiply_divide",
    "multiplication_division_inverse",
    "division_remainder_grouping",
    "measurement_conversion",
    "time_elapsed_simple",
    "money_price_total",
    "integer_operation_order",
    "multi_step_total_quantity",
    "square_perimeter_intro",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "data_table_chart",
    "data_range_comparison",
  ],
  G4: [
    "equal_groups_multiply_divide",
    "multiplication_division_inverse",
    "division_remainder_grouping",
    "operation_structure_distributive",
    "measurement_conversion",
    "square_perimeter_intro",
    "integer_operation_order",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "fraction_add_same_denominator",
    "fraction_subtract_same_denominator",
    "fraction_equivalent_compare",
    "decimal_money_measure",
    "decimal_rounding_estimation",
    "geometry_angle_reasoning",
    "average_total_count",
    "data_table_chart",
    "data_range_comparison",
  ],
  G5: [
    "measurement_conversion",
    "operation_structure_distributive",
    "integer_operation_order",
    "multi_step_total_quantity",
    "perimeter_area_rectangle",
    "fraction_part_whole",
    "fraction_add_same_denominator",
    "fraction_subtract_same_denominator",
    "fraction_equivalent_compare",
    "decimal_money_measure",
    "decimal_multiply_unit_price",
    "decimal_divide_equal_share",
    "decimal_rounding_estimation",
    "average_total_count",
    "ratio_rate_unit",
    "ratio_total_split",
    "geometry_angle_reasoning",
    "triangle_area_application",
    "trapezoid_area_application",
    "volume_rectangular_prism",
    "circle_circumference_application",
    "circle_area_application",
    "distance_speed_time",
    "probability_event_decimal",
    "percent_change",
    "linear_equation_word_problem",
    "data_table_chart",
    "data_range_comparison",
  ],
  G6: [
    "decimal_money_measure",
    "fraction_add_same_denominator",
    "fraction_subtract_same_denominator",
    "fraction_equivalent_compare",
    "decimal_multiply_unit_price",
    "decimal_divide_equal_share",
    "decimal_rounding_estimation",
    "average_total_count",
    "ratio_rate_unit",
    "ratio_total_split",
    "proportion_scale_application",
    "geometry_angle_reasoning",
    "triangle_area_application",
    "trapezoid_area_application",
    "volume_rectangular_prism",
    "circle_circumference_application",
    "circle_area_application",
    "distance_speed_time",
    "probability_event_decimal",
    "coordinate_movement",
    "percent_change",
    "linear_equation_word_problem",
    "data_table_chart",
  ],
});

export const MATH_CURRICULUM_ROUTE_BY_GRADE = MATH_CURRICULUM_ROUTE_V4_BY_GRADE;

export const REQUIRED_INDEPENDENT_VARIANTS = Object.freeze([
  "original",
  "change_one_number",
  "change_two_numbers",
]);

export const MATH_PATH_MASTERY_POLICY = Object.freeze({
  requiredIndependentVariants: REQUIRED_INDEPENDENT_VARIANTS,
  minimumIndependentCorrect: REQUIRED_INDEPENDENT_VARIANTS.length,
  minimumRequiredUnitCompletions: 1,
  policyVersion: "independent-progression-v1",
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeGrade(value) {
  const grade = String(value || "").trim().toUpperCase();
  return GRADE_ORDER.includes(grade) ? grade : null;
}

function normalizePathVersion(value) {
  return [LEGACY_MATH_LEARNING_PATH_VERSION, PREVIOUS_MATH_LEARNING_PATH_VERSION, DEFAULT_MATH_LEARNING_PATH_VERSION].includes(value)
    ? value
    : DEFAULT_MATH_LEARNING_PATH_VERSION;
}

function routeMapForVersion(pathVersion) {
  if (pathVersion === LEGACY_MATH_LEARNING_PATH_VERSION) return MATH_CURRICULUM_ROUTE_V2_BY_GRADE;
  if (pathVersion === PREVIOUS_MATH_LEARNING_PATH_VERSION) return MATH_CURRICULUM_ROUTE_V3_BY_GRADE;
  return MATH_CURRICULUM_ROUTE_V4_BY_GRADE;
}

export function validateMathCurriculumRoutes({ families = shanghaiMathItemFamilies } = {}) {
  const errors = [];
  const familyById = new Map(families.map((family) => [family.id, family]));
  const routesByVersion = {
    [LEGACY_MATH_LEARNING_PATH_VERSION]: MATH_CURRICULUM_ROUTE_V2_BY_GRADE,
    [PREVIOUS_MATH_LEARNING_PATH_VERSION]: MATH_CURRICULUM_ROUTE_V3_BY_GRADE,
    [DEFAULT_MATH_LEARNING_PATH_VERSION]: MATH_CURRICULUM_ROUTE_V4_BY_GRADE,
  };

  Object.entries(routesByVersion).forEach(([version, routes]) => {
    GRADE_ORDER.forEach((grade) => {
      const routeIds = routes[grade] || [];
      const routeIdSet = new Set(routeIds);
      if (routeIdSet.size !== routeIds.length) errors.push(`${version}:${grade}:duplicate_family_id`);

      routeIds.forEach((familyId) => {
        const family = familyById.get(familyId);
        if (!family) errors.push(`${version}:${grade}:unknown_family:${familyId}`);
        else if (!family.gradeBands?.includes(grade)) errors.push(`${version}:${grade}:family_outside_grade:${familyId}`);
      });

      if (version !== DEFAULT_MATH_LEARNING_PATH_VERSION) return;

      const expectedIds = families.filter((family) => family.gradeBands?.includes(grade)).map((family) => family.id);
      expectedIds.forEach((familyId) => {
        if (!routeIdSet.has(familyId)) errors.push(`${version}:${grade}:missing_eligible_family:${familyId}`);
      });

      routeIds.forEach((familyId, index) => {
        const family = familyById.get(familyId);
        if (!family) return;
        (family.prerequisiteIds || [])
          .filter((prerequisiteId) => routeIdSet.has(prerequisiteId))
          .forEach((prerequisiteId) => {
            if (routeIds.indexOf(prerequisiteId) >= index) {
              errors.push(`${version}:${grade}:prerequisite_after_family:${prerequisiteId}:${familyId}`);
            }
          });
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    versions: Object.keys(routesByVersion),
  };
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function validDate(value) {
  const date = new Date(`${String(value || "").slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventTime(event) {
  return Date.parse(event?.timestamp || "") || 0;
}

function isRequiredPracticeAnswer(event) {
  return (
    event?.eventType === "answer_submitted" &&
    event?.payload?.questionFamilyId &&
    !event?.payload?.extraPracticeMode
  );
}

function fallbackUnitId(event, familyId) {
  const date = String(event?.timestamp || "").slice(0, 10) || "undated";
  return `legacy-required-${event?.sessionId || familyId}-${date}`;
}

function routeForGrade({ families, instructionalGrade, pathVersion }) {
  const grade = normalizeGrade(instructionalGrade);
  const eligibleFamilies = grade
    ? families.filter((family) => family?.gradeBands?.includes(grade))
    : [...families];
  const byId = new Map(eligibleFamilies.map((family) => [family.id, family]));
  const routeIds = routeMapForVersion(pathVersion)[grade] || [];
  const coreRoute = routeIds.map((familyId) => byId.get(familyId)).filter(Boolean);
  const remaining = eligibleFamilies.filter((family) => !routeIds.includes(family.id));
  return {
    coreRoute,
    route: unique([...coreRoute, ...remaining].map((family) => family.id)).map((familyId) => byId.get(familyId)),
  };
}

function curveScheduleProgress({ curve, planStartedAt, practiceDate }) {
  const curveCurrent = clamp(Number(curve?.currentPoint?.progressTowardTarget ?? curve?.startProgress ?? 0), 0, 1);
  const points = curve?.curveType === "dynamic"
    ? curve?.dynamicProgressCurve || curve?.progressCurve || []
    : curve?.progressCurve || [];
  const startedAt = validDate(planStartedAt);
  const date = validDate(practiceDate);
  if (!points.length || !startedAt || !date) {
    return { curveCurrent, scheduledProgress: curveCurrent, planningProgress: curveCurrent, plannedWeekIndex: 0 };
  }
  const elapsedDays = Math.max(0, Math.floor((date.getTime() - startedAt.getTime()) / 86_400_000));
  const plannedWeekIndex = clamp(Math.floor(elapsedDays / 7), 0, points.length - 1);
  const scheduledProgress = clamp(Number(points[plannedWeekIndex] ?? curveCurrent), 0, 1);
  return {
    curveCurrent,
    scheduledProgress,
    planningProgress: Math.max(curveCurrent, scheduledProgress),
    plannedWeekIndex,
  };
}

export function summarizeFamilyIndependentEvidence({ behaviorEvents = [], familyId } = {}) {
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  const requiredAnswers = behaviorEvents
    .filter(isRequiredPracticeAnswer)
    .filter((event) => event.payload?.questionFamilyId === familyId)
    .sort((left, right) => eventTime(left) - eventTime(right));
  const independentCorrect = requiredAnswers.filter((event) => event.payload?.isCorrect && isIndependentAnswer(event));
  const unitEvents = new Map();
  requiredAnswers.forEach((event) => {
    const unitId = event.payload?.queueItemId || fallbackUnitId(event, familyId);
    const events = unitEvents.get(unitId) || [];
    unitEvents.set(unitId, [...events, event]);
  });
  const completedIndependentUnitIds = [...unitEvents.entries()]
    .filter(([, events]) => {
      const independentVariants = new Set(
        events
          .filter((event) => event.payload?.isCorrect && isIndependentAnswer(event))
          .map((event) => event.payload?.variantLevel || "original"),
      );
      return REQUIRED_INDEPENDENT_VARIANTS.every((variant) => independentVariants.has(variant));
    })
    .map(([unitId]) => unitId);
  const latest = requiredAnswers.at(-1) || null;
  const independentVariants = unique(independentCorrect.map((event) => event.payload?.variantLevel || "original"));

  return {
    familyId,
    requiredAttemptCount: requiredAnswers.length,
    requiredCorrectCount: requiredAnswers.filter((event) => event.payload?.isCorrect).length,
    independentCorrectCount: independentCorrect.length,
    independentVariants,
    completedIndependentUnitIds,
    completedIndependentUnitCount: completedIndependentUnitIds.length,
    latestRequiredAnswerIsCorrect: latest ? Boolean(latest.payload?.isCorrect) : null,
    latestRequiredAnsweredAt: latest?.timestamp || null,
  };
}

export function hasVerifiedIndependentProgression(evidence = {}) {
  return (
    Number(evidence.completedIndependentUnitCount || 0) >= MATH_PATH_MASTERY_POLICY.minimumRequiredUnitCompletions &&
    Number(evidence.independentCorrectCount || 0) >= MATH_PATH_MASTERY_POLICY.minimumIndependentCorrect &&
    evidence.latestRequiredAnswerIsCorrect !== false
  );
}

function firstAttemptedUnresolved(routeStatus, maximumIndex) {
  return routeStatus
    .slice(0, maximumIndex + 1)
    .find((status) => status.evidence.requiredAttemptCount > 0 && !status.verified) || null;
}

function unresolvedObservedPrerequisite({ routeStatus, selectedStatus }) {
  const statusById = new Map(routeStatus.map((status) => [status.family.id, status]));
  return (selectedStatus.family.prerequisiteIds || [])
    .map((familyId) => statusById.get(familyId))
    .find((status) => status?.evidence.requiredAttemptCount > 0 && !status.verified) || null;
}

export function createMathLearningPath({
  behaviorEvents = [],
  curve = null,
  families = shanghaiMathItemFamilies,
  instructionalGrade = null,
  pathVersion = DEFAULT_MATH_LEARNING_PATH_VERSION,
  planStartedAt = null,
  practiceDate = null,
} = {}) {
  const grade = normalizeGrade(instructionalGrade) || "G6";
  const resolvedPathVersion = normalizePathVersion(pathVersion);
  const { coreRoute, route } = routeForGrade({
    families,
    instructionalGrade: grade,
    pathVersion: resolvedPathVersion,
  });
  if (!route.length) {
    return {
      id: `math-learning-path-${resolvedPathVersion}-${grade.toLowerCase()}-empty`,
      version: resolvedPathVersion,
      instructionalGrade: grade,
      focusFamilyId: null,
      focusFamilyName: "数学关系",
      selectionReason: "no_eligible_family",
      route: [],
      guardrail: "A daily plan needs an eligible, validated question family before delivery.",
    };
  }

  const schedule = curveScheduleProgress({ curve, planStartedAt, practiceDate });
  // V2/V3 keep their historic routes. V4 is the reviewed expanded route for newly
  // confirmed plans, so catalog growth never shifts a learner silently.
  const planningRoute = coreRoute.length ? coreRoute : route;
  const plannedFamily = planningRoute[
    clamp(Math.round(schedule.planningProgress * (planningRoute.length - 1)), 0, planningRoute.length - 1)
  ];
  const plannedRouteIndex = Math.max(0, route.findIndex((family) => family.id === plannedFamily?.id));
  const routeStatus = route.map((family, index) => {
    const evidence = summarizeFamilyIndependentEvidence({ behaviorEvents, familyId: family.id });
    return { family, index, evidence, verified: hasVerifiedIndependentProgression(evidence) };
  });
  const observedRepair = firstAttemptedUnresolved(routeStatus, plannedRouteIndex);
  let selected = observedRepair || routeStatus[plannedRouteIndex];
  let selectionReason = observedRepair ? "observed_independent_completion_incomplete" : "curve_position_focus";

  if (!observedRepair && selected.verified) {
    const nextUnverified = routeStatus.slice(plannedRouteIndex).find((status) => !status.verified);
    if (nextUnverified) {
      selected = nextUnverified;
      selectionReason = "next_unverified_route_focus";
    } else {
      selected = routeStatus.at(-1);
      selectionReason = "route_maintenance_after_verified_progression";
    }
  }

  const prerequisiteRepair = unresolvedObservedPrerequisite({ routeStatus, selectedStatus: selected });
  if (prerequisiteRepair) {
    selected = prerequisiteRepair;
    selectionReason = "observed_prerequisite_requires_independent_completion";
  }

  return {
    id: `math-learning-path-${resolvedPathVersion}-${grade.toLowerCase()}-${practiceDate || "undated"}`,
    version: resolvedPathVersion,
    instructionalGrade: grade,
    focusFamilyId: selected.family.id,
    focusFamilyName: selected.family.name,
    focusDomain: selected.family.domain,
    selectionReason,
    curveProgress: schedule.planningProgress,
    plannedWeekIndex: schedule.plannedWeekIndex,
    routePosition: {
      selected: selected.index + 1,
      planned: plannedRouteIndex + 1,
      total: route.length,
      coreTotal: coreRoute.length,
    },
    route: routeStatus.map((status) => ({
      familyId: status.family.id,
      familyName: status.family.name,
      domain: status.family.domain,
      routePosition: status.index + 1,
      hasObservedPractice: status.evidence.requiredAttemptCount > 0,
      independentlyProgressed: status.verified,
    })),
    guardrails: [
      "The curve supplies the planned knowledge-point entry. It does not itself prove mastery.",
      "A family advances only after an independent original, one-number, and two-number completion in the required practice path.",
      "Observed unfinished work or an observed prerequisite keeps the next task on reinforcement; optional practice does not move the required route.",
      "Daily route selection never updates the dynamic curve. Only a verified formal test can do that.",
    ],
  };
}
