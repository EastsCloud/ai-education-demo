import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import {
  createMathSolutionStrategies,
  MATH_SOLUTION_STRATEGY_VERSION,
  validateMathSolutionStrategies,
} from "../src/services/math-solution-strategy-engine.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { getSupportedMathItemModelVariants } from "../src/services/math-item-model-specification.js";

let checked = 0;
for (const family of shanghaiMathItemFamilies) {
  for (const instructionalGrade of family.gradeBands) {
    for (const variantLevel of getSupportedMathItemModelVariants(family)) {
      const candidate = validateMathQuestionCandidate(
        generateMathQuestionCandidate({ family, instructionalGrade, seed: 7, variantLevel }),
      );
      const strategyCheck = validateMathSolutionStrategies({ candidate });
      assert.equal(candidate.qualityStatus, "system_validated", `${family.id}/${instructionalGrade}/${variantLevel}`);
      assert.equal(strategyCheck.valid, true, `${family.id}/${instructionalGrade}/${variantLevel}`);
      assert.equal(candidate.metadataTags.itemTags.solutionTags.strategyTemplateVersion, MATH_SOLUTION_STRATEGY_VERSION);
      assert.equal(candidate.solutionStrategies.length, 3);
      assert.equal(new Set(candidate.solutionStrategies.map((strategy) => strategy.id)).size, 3);
      assert.equal(candidate.solutionStrategies.every((strategy) => strategy.steps.length >= 3), true);
      assert.ok(candidate.validatorTrace.includes("solution_strategies_template_verified"));
      checked += 1;
    }
  }
}

const fractionFamily = shanghaiMathItemFamilies.find((family) => family.id === "fraction_part_whole");
const geometryFamily = shanghaiMathItemFamilies.find((family) => family.id === "perimeter_area_rectangle");
assert.ok(fractionFamily);
assert.ok(geometryFamily);
assert.equal(createMathSolutionStrategies({ family: fractionFamily, generated: { steps: [] } })[1].id, "part_whole_strip");
assert.equal(createMathSolutionStrategies({ family: geometryFamily, generated: { steps: [] } })[1].id, "labeled_diagram");

const candidate = validateMathQuestionCandidate(
  generateMathQuestionCandidate({ family: fractionFamily, instructionalGrade: "G4", seed: 7 }),
);
const alteredStrategies = structuredClone(candidate);
alteredStrategies.solutionStrategies[0].steps[1] = "不受验证的文字";
assert.ok(validateMathQuestionCandidate(alteredStrategies).validatorTrace.includes("solution_strategies_not_template_bound"));

console.log(`math-solution-strategy-contract: passed (${checked} family-grade-variant candidates)`);
