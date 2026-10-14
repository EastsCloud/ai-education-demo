import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import {
  MATH_FAMILY_SEMANTIC_PROFILES,
  validateMathFamilySemantics,
} from "../src/services/math-family-semantic-validator.js";
import { generateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { getSupportedMathItemModelVariants } from "../src/services/math-item-model-specification.js";

assert.equal(
  Object.keys(MATH_FAMILY_SEMANTIC_PROFILES).length,
  shanghaiMathItemFamilies.length,
  "every current math family needs a semantic validation profile",
);

let validatedCount = 0;
for (const family of shanghaiMathItemFamilies) {
  for (const grade of family.gradeBands) {
    for (const variantLevel of getSupportedMathItemModelVariants(family)) {
      const candidate = generateMathQuestionCandidate({
        family,
        instructionalGrade: grade,
        seed: 7,
        variantLevel,
      });
      const semantic = validateMathFamilySemantics({ candidate });
      assert.equal(semantic.valid, true, `${family.id}/${grade}/${variantLevel}: ${semantic.errors.join(",")}`);
      validatedCount += 1;
    }
  }
}

const rectangleFamily = shanghaiMathItemFamilies.find((family) => family.id === "perimeter_area_rectangle");
const rectangle = generateMathQuestionCandidate({ family: rectangleFamily, seed: 7 });
const wrongRectangleRelation = validateMathFamilySemantics({
  candidate: { ...rectangle, answer: 21, answerRule: "14 + 7" },
});
assert.ok(wrongRectangleRelation.errors.includes("semantic_rule_shape_mismatch"));

const disconnectedNumbers = validateMathFamilySemantics({
  candidate: { ...rectangle, answer: 887112, answerRule: "999 * 888" },
});
assert.ok(disconnectedNumbers.errors.includes("semantic_rule_numbers_not_grounded"));

const timeFamily = shanghaiMathItemFamilies.find((family) => family.id === "time_elapsed_simple");
const time = generateMathQuestionCandidate({ family: timeFamily, instructionalGrade: "G3", seed: 7 });
const wrongClockBinding = validateMathFamilySemantics({
  candidate: { ...time, answer: 45, answerRule: "720 - 675" },
});
assert.ok(wrongClockBinding.errors.includes("semantic_time_rule_not_bound_to_clock_values"));

const circleFamily = shanghaiMathItemFamilies.find((family) => family.id === "circle_area_application");
const circle = generateMathQuestionCandidate({ family: circleFamily, seed: 1 });
const missingPi = validateMathFamilySemantics({
  candidate: { ...circle, answer: 27, answerRule: "3 * 3 * 3 * 1" },
});
assert.ok(missingPi.errors.includes("semantic_required_number_missing:3.14"));

console.log(`math-family-semantic-validation-contract: passed (${validatedCount} family-grade-variant candidates)`);
