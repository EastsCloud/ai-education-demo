import { getSupportedMathItemModelVariants } from "./math-item-model-specification.js?v=math-item-model-v13";

function normalizedCount(value) {
  return Math.max(1, Math.min(8, Math.floor(Number(value) || 1)));
}

// Required practice never uses this policy. It belongs only to a voluntary
// same-family challenge after today's protected sequence is complete.
export function createSameFamilyHarderVariantSequence({ family, count }) {
  const supportedVariants = getSupportedMathItemModelVariants(family);
  const supportsReverseQuestion = supportedVariants.includes("reverse_question");
  const supportsMultiStepExtension = supportedVariants.includes("multi_step_extension");
  return Array.from({ length: normalizedCount(count) }, (_, index) => {
    if (index === 0) return "step_added_variant";
    if (index === 1) return "two_steps_added_variant";
    if (index === 2 && supportsReverseQuestion) return "reverse_question";
    if (index >= 3 && supportsMultiStepExtension) return "multi_step_extension";
    return supportsReverseQuestion ? "reverse_question" : "two_steps_added_variant";
  });
}
