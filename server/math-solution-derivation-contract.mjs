import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { MATH_SOLUTION_DERIVATION_VERSION, MATH_SOLUTION_PHASES } from "../src/services/math-solution-derivation.js";

function familyById(id) {
  const family = shanghaiMathItemFamilies.find((item) => item.id === id);
  assert.ok(family, `expected item family ${id}`);
  return family;
}

for (const { id, grade, seed } of [
  { id: "part_whole_add_subtract", grade: "G1", seed: 7 },
  { id: "linear_equation_word_problem", grade: "G6", seed: 11 },
  { id: "decimal_rounding_estimation", grade: "G6", seed: 0 },
]) {
  const candidate = generateMathQuestionCandidate({
    family: familyById(id),
    instructionalGrade: grade,
    seed,
    variantLevel: "original",
  });
  const validated = validateMathQuestionCandidate(candidate);
  assert.equal(validated.qualityStatus, "system_validated");
  assert.equal(validated.solutionDerivation.version, MATH_SOLUTION_DERIVATION_VERSION);
  assert.deepEqual(validated.solutionDerivation.supportPhases, MATH_SOLUTION_PHASES);
  assert.equal(validated.solutionDerivation.stepBindings.length, validated.solutionSteps.length);
  assert.equal(validated.solutionDerivation.evaluator.matchesStoredAnswer, true);
  assert.ok(validated.validatorTrace.includes("solution_derivation_verified"));
  assert.ok(validated.validatorTrace.includes("support_evidence_bindings_verified"));
}

const candidate = generateMathQuestionCandidate({
  family: familyById("part_whole_add_subtract"),
  instructionalGrade: "G1",
  seed: 7,
  variantLevel: "original",
});

const alteredRule = structuredClone(candidate);
alteredRule.solutionDerivation.answerRule = "1 + 1";
assert.ok(validateMathQuestionCandidate(alteredRule).validatorTrace.includes("solution_derivation_answer_rule_mismatch"));

const alteredBinding = structuredClone(candidate);
alteredBinding.solutionDerivation.stepBindings[2].source = "context_template";
assert.ok(validateMathQuestionCandidate(alteredBinding).validatorTrace.includes("solution_derivation_step_binding_invalid:2"));

const alteredEvaluation = structuredClone(candidate);
alteredEvaluation.solutionDerivation.evaluator.computedAnswer += 1;
assert.ok(validateMathQuestionCandidate(alteredEvaluation).validatorTrace.includes("solution_derivation_evaluator_result_mismatch"));

const alteredSupportBinding = structuredClone(candidate);
alteredSupportBinding.supportStructure.hintBindings[2].source = "context_template";
assert.ok(validateMathQuestionCandidate(alteredSupportBinding).validatorTrace.includes("support_evidence_bindings_invalid"));

console.log("math-solution-derivation-contract: passed");
