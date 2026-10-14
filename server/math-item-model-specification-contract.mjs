import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import {
  MATH_ITEM_MODEL_SUPPORT_PHASES,
  MATH_ITEM_MODEL_VERSION,
  getMathCoreRelation,
  getSupportedMathItemModelVariants,
} from "../src/services/math-item-model-specification.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";

for (const family of shanghaiMathItemFamilies) {
  assert.ok(getMathCoreRelation(family.id), `${family.id} needs a core relation`);
  const candidate = generateMathQuestionCandidate({
    family,
    instructionalGrade: family.gradeBands[0],
    seed: 3,
    variantLevel: "change_one_number",
  });
  const validated = validateMathQuestionCandidate(candidate);
  assert.equal(validated.qualityStatus, "system_validated", family.id);
  assert.equal(validated.metadataTags.logicModel.version, MATH_ITEM_MODEL_VERSION);
  assert.equal(validated.metadataTags.logicModel.logicUnitId, family.id);
  assert.equal(validated.metadataTags.logicModel.coreRelation, getMathCoreRelation(family.id));
  assert.deepEqual(validated.metadataTags.logicModel.variableSlots, family.variableSlots);
  assert.deepEqual(validated.metadataTags.logicModel.supportedVariantLevels, getSupportedMathItemModelVariants(family));
  assert.deepEqual(validated.metadataTags.logicModel.stepExtensionBoundary.requiredPhases, MATH_ITEM_MODEL_SUPPORT_PHASES);
  assert.ok(validated.validatorTrace.includes("bounded_model_verified"));
}

const family = shanghaiMathItemFamilies.find((item) => item.id === "ratio_total_split");
assert.ok(family);
const candidate = generateMathQuestionCandidate({
  family,
  instructionalGrade: "G5",
  seed: 6,
  variantLevel: "original",
});

const alteredRelation = structuredClone(candidate);
alteredRelation.metadataTags.logicModel.coreRelation = "unbounded generated statement";
assert.ok(validateMathQuestionCandidate(alteredRelation).validatorTrace.includes("bounded_model_core_relation_mismatch"));

const alteredLimit = structuredClone(candidate);
alteredLimit.metadataTags.logicModel.generationLimits.answerMax += 1;
assert.ok(
  validateMathQuestionCandidate(alteredLimit).validatorTrace.includes("bounded_model_generation_limit_mismatch:answerMax"),
);

const alteredSlots = structuredClone(candidate);
alteredSlots.metadataTags.logicModel.variableSlots = ["unknown_slot"];
assert.ok(validateMathQuestionCandidate(alteredSlots).validatorTrace.includes("bounded_model_variable_slots_mismatch"));

const questionFirst = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family,
    instructionalGrade: "G5",
    seed: 6,
    variantLevel: "question_order_variant",
  }),
);
assert.equal(questionFirst.qualityStatus, "system_validated");
assert.equal(questionFirst.metadataTags.structuralVariant.effect, "question_before_conditions");
assert.ok(questionFirst.prompt.startsWith("问题："));
assert.equal(questionFirst.metadataTags.itemTags.practiceTags.variantCode, "L4");

const stepAdded = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family,
    instructionalGrade: "G5",
    seed: 6,
    variantLevel: "step_added_variant",
  }),
);
assert.equal(stepAdded.qualityStatus, "system_validated");
assert.ok(stepAdded.solutionSteps.length >= 5);
assert.ok(stepAdded.prompt.includes("先把已知量、要求量和它们的关系整理成一条算式或小表"));
assert.equal(stepAdded.metadataTags.itemTags.practiceTags.variantCode, "S1");
assert.deepEqual(stepAdded.supportStructure.guidedPhases, ["read_translate", "relationship", "organize", "calculation", "check"]);
assert.equal(stepAdded.guidedSteps.length, 5);
assert.deepEqual(stepAdded.guidedSteps.map((step) => step.phase), stepAdded.supportStructure.guidedPhases);

const twoStepsAdded = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family,
    instructionalGrade: "G5",
    seed: 6,
    variantLevel: "two_steps_added_variant",
  }),
);
assert.equal(twoStepsAdded.qualityStatus, "system_validated");
assert.ok(twoStepsAdded.solutionSteps.length >= 6);
assert.ok(twoStepsAdded.prompt.includes("再写出从已知条件到答案的计算顺序"));
assert.equal(twoStepsAdded.metadataTags.structuralVariant.effect, "bounded_two_step_organization_extension");
assert.equal(twoStepsAdded.metadataTags.itemTags.practiceTags.variantCode, "S2");
assert.equal(twoStepsAdded.metadataTags.logicModel.stepExtensionBoundary.maxStepCount, 7);
assert.deepEqual(twoStepsAdded.supportStructure.guidedPhases, ["read_translate", "relationship", "organize", "plan", "calculation", "check"]);
assert.deepEqual(twoStepsAdded.supportStructure.learningPath, ["读题翻译", "找关系", "整理信息", "规划步骤", "计算", "检查"]);
assert.equal(twoStepsAdded.guidedSteps.length, 6);
assert.deepEqual(twoStepsAdded.guidedSteps.map((step) => step.phase), twoStepsAdded.supportStructure.guidedPhases);
assert.equal(twoStepsAdded.guidedSteps.at(-1).responseType, "final_answer");

const alteredStepAddedPrompt = structuredClone(stepAdded);
alteredStepAddedPrompt.prompt = candidate.prompt;
assert.ok(validateMathQuestionCandidate(alteredStepAddedPrompt).validatorTrace.includes("step_added_variant_prompt_invalid"));

const alteredTwoStepAddedPrompt = structuredClone(twoStepsAdded);
alteredTwoStepAddedPrompt.prompt = candidate.prompt;
assert.ok(
  validateMathQuestionCandidate(alteredTwoStepAddedPrompt).validatorTrace.includes("two_steps_added_variant_prompt_invalid"),
);

const relationReframeFamily = shanghaiMathItemFamilies.find((item) => item.id === "compare_more_less");
const relationReframe = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family: relationReframeFamily,
    instructionalGrade: "G1",
    seed: 6,
    variantLevel: "relationship_reframe",
  }),
);
assert.equal(relationReframe.qualityStatus, "system_validated");
assert.ok(relationReframe.prompt.includes("少"));
assert.equal(relationReframe.metadataTags.itemTags.practiceTags.variantCode, "L3");

const reverseFamily = shanghaiMathItemFamilies.find((item) => item.id === "perimeter_area_rectangle");
const reverseQuestion = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family: reverseFamily,
    instructionalGrade: "G4",
    seed: 6,
    variantLevel: "reverse_question",
  }),
);
assert.equal(reverseQuestion.qualityStatus, "system_validated");
assert.equal(reverseQuestion.metadataTags.itemTags.practiceTags.variantCode, "R1");
assert.equal(reverseQuestion.metadataTags.itemTags.practiceTags.repeatRole, "bounded_inverse_transfer");
assert.equal(reverseQuestion.metadataTags.structuralVariant.effect, "bounded_inverse_question");
assert.ok(reverseQuestion.prompt.includes("宽是多少"));
assert.ok(reverseQuestion.metadataTags.logicModel.supportedVariantLevels.includes("reverse_question"));

const multiStepQuestion = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family: reverseFamily,
    instructionalGrade: "G4",
    seed: 6,
    variantLevel: "multi_step_extension",
  }),
);
assert.equal(multiStepQuestion.qualityStatus, "system_validated");
assert.equal(multiStepQuestion.metadataTags.itemTags.practiceTags.variantCode, "M1");
assert.equal(multiStepQuestion.metadataTags.itemTags.practiceTags.repeatRole, "bounded_multi_step_transfer");
assert.equal(multiStepQuestion.metadataTags.structuralVariant.effect, "bounded_multi_step_question");
assert.ok(multiStepQuestion.answerRule.includes("-"));
assert.equal(multiStepQuestion.supportStructure.guidedPhases.length, 4);
assert.ok(multiStepQuestion.metadataTags.logicModel.supportedVariantLevels.includes("multi_step_extension"));

const extendedStructuralFamilies = [
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
];
for (const familyId of extendedStructuralFamilies) {
  const extensionFamily = shanghaiMathItemFamilies.find((item) => item.id === familyId);
  assert.ok(extensionFamily, `missing ${familyId}`);
  for (const variantLevel of ["reverse_question", "multi_step_extension"]) {
    const extendedCandidate = validateMathQuestionCandidate(
      generateMathQuestionCandidate({
        family: extensionFamily,
        instructionalGrade: extensionFamily.gradeBands[0],
        seed: 7,
        variantLevel,
      }),
    );
    assert.equal(extendedCandidate.qualityStatus, "system_validated", `${familyId}/${variantLevel}`);
    assert.equal(extendedCandidate.metadataTags.logicModel.supportedVariantLevels.includes(variantLevel), true);
    assert.equal(extendedCandidate.metadataTags.structuralVariant.applied, true);
    assert.equal(
      extendedCandidate.metadataTags.structuralVariant.effect,
      variantLevel === "reverse_question" ? "bounded_inverse_question" : "bounded_multi_step_question",
    );
  }
}

// Every declared R1/M1 family must stay valid across its complete bounded seed
// space, not just at a representative example seed.
for (const familyId of extendedStructuralFamilies) {
  const extensionFamily = shanghaiMathItemFamilies.find((item) => item.id === familyId);
  for (const instructionalGrade of extensionFamily.gradeBands) {
    for (const variantLevel of ["reverse_question", "multi_step_extension"]) {
      for (let seed = 0; seed <= 20; seed += 1) {
        const boundedCandidate = validateMathQuestionCandidate(
          generateMathQuestionCandidate({ family: extensionFamily, instructionalGrade, seed, variantLevel }),
        );
        assert.equal(boundedCandidate.qualityStatus, "system_validated", `${familyId}/${instructionalGrade}/${variantLevel}/${seed}`);
      }
    }
  }
}

const alteredStructuralVariant = structuredClone(stepAdded);
alteredStructuralVariant.metadataTags.structuralVariant.applied = false;
assert.ok(validateMathQuestionCandidate(alteredStructuralVariant).validatorTrace.includes("structural_variant_not_applied"));

console.log("math-item-model-specification-contract: passed");
