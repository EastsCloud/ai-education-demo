import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import {
  MATH_APPLICATION_CONTEXT_VERSION,
  validateMathApplicationContext,
} from "../src/services/math-application-context-validator.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { getSupportedMathItemModelVariants } from "../src/services/math-item-model-specification.js";

let validatedCount = 0;
for (const family of shanghaiMathItemFamilies) {
  for (const instructionalGrade of family.gradeBands) {
    for (const variantLevel of getSupportedMathItemModelVariants(family)) {
      const candidate = generateMathQuestionCandidate({ family, instructionalGrade, seed: 7, variantLevel });
      const validation = validateMathApplicationContext({ candidate });
      assert.equal(validation.valid, true, `${family.id}/${instructionalGrade}/${variantLevel}: ${validation.errors.join(",")}`);
      const validated = validateMathQuestionCandidate(candidate);
      assert.equal(validated.qualityStatus, "system_validated");
      assert.equal(validated.metadataTags.applicationContext.version, MATH_APPLICATION_CONTEXT_VERSION);
      assert.ok(validated.validatorTrace.includes("application_context_verified"));
      validatedCount += 1;
    }
  }
}

const family = shanghaiMathItemFamilies.find((item) => item.id === "part_whole_add_subtract");
const validCandidate = generateMathQuestionCandidate({ family, instructionalGrade: "G1", seed: 7 });

const strippedPrompt = validateMathApplicationContext({
  candidate: { ...validCandidate, prompt: "3 + 4 = ?" },
});
assert.ok(strippedPrompt.errors.includes("application_context_scenario_anchor_missing"));
assert.ok(strippedPrompt.errors.includes("application_context_prompt_binding_mismatch"));

const missingGoal = validateMathApplicationContext({
  candidate: {
    ...validCandidate,
    prompt: "班级图书角有 3 本故事书和 4 本科普书。",
  },
});
assert.ok(missingGoal.errors.includes("application_context_question_goal_missing"));

const mismatchedContext = validateMathApplicationContext({
  candidate: {
    ...validCandidate,
    metadataTags: {
      ...validCandidate.metadataTags,
      applicationContext: {
        ...validCandidate.metadataTags.applicationContext,
        contextTemplateId: "wrong-context",
      },
    },
  },
});
assert.ok(mismatchedContext.errors.includes("application_context_template_mismatch"));

console.log(`math-application-context-contract: passed (${validatedCount} family-grade-variant candidates)`);
