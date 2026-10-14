import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createSameFamilyHarderVariantSequence } from "../src/services/challenge-variant-policy.js";

const supportedFamily = shanghaiMathItemFamilies.find((family) => family.id === "part_whole_add_subtract");
const clockTimeFamily = shanghaiMathItemFamilies.find((family) => family.id === "time_elapsed_simple");

assert.ok(supportedFamily);
assert.ok(clockTimeFamily);

assert.deepEqual(createSameFamilyHarderVariantSequence({ family: supportedFamily, count: 6 }), [
  "step_added_variant",
  "two_steps_added_variant",
  "reverse_question",
  "multi_step_extension",
  "multi_step_extension",
  "multi_step_extension",
]);

assert.deepEqual(createSameFamilyHarderVariantSequence({ family: clockTimeFamily, count: 4 }), [
  "step_added_variant",
  "two_steps_added_variant",
  "reverse_question",
  "multi_step_extension",
]);

console.log("challenge-variant-policy-contract: passed");
