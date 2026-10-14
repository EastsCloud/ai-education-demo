import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { validateCorrectReviewBinding } from "../src/services/correct-review-binding-validator.js";

const family = shanghaiMathItemFamilies.find((item) => item.id === "part_whole_add_subtract");
const sourceCandidate = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    aiVersion: "semi_ai",
    family,
    seed: 731,
    instructionalGrade: "G1",
    variantLevel: "original",
  }),
);
const sourceDelivery = {
  id: "prior-correct-delivery",
  studentId: "student-001",
  subjectId: "math-linear-equations",
  mode: "practice",
  generationRequest: {
    familyId: family.id,
    instructionalGrade: "G1",
    seed: 731,
    variantLevel: "original",
  },
  privateCandidate: sourceCandidate,
  attempts: [{ isCorrect: true, hintDepth: 0 }],
};

function request(variantLevel) {
  return {
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode: "practice",
    familyId: family.id,
    instructionalGrade: "G1",
    seed: 731,
    variantLevel,
    correctReviewSourceDeliveryId: sourceDelivery.id,
  };
}

const contextCandidate = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    aiVersion: "semi_ai",
    family,
    seed: 731,
    instructionalGrade: "G1",
    variantLevel: "context_change",
  }),
);
const validContextReview = validateCorrectReviewBinding({
  candidate: contextCandidate,
  request: request("context_change"),
  sourceDelivery,
});
assert.equal(validContextReview.valid, true, validContextReview.errors.join(","));

const changedNumberCandidate = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    aiVersion: "semi_ai",
    family,
    seed: 731,
    instructionalGrade: "G1",
    variantLevel: "change_one_number",
  }),
);
assert.equal(
  validateCorrectReviewBinding({
    candidate: changedNumberCandidate,
    request: request("change_one_number"),
    sourceDelivery,
  }).valid,
  true,
);

const wrongAnswer = validateCorrectReviewBinding({
  candidate: { ...contextCandidate, answer: contextCandidate.answer + 1 },
  request: request("context_change"),
  sourceDelivery,
});
assert.ok(wrongAnswer.errors.includes("correct_review_context_answer_mismatch"));

const wrongRelation = validateCorrectReviewBinding({
  candidate: { ...contextCandidate, answerRule: "1 + 1" },
  request: request("context_change"),
  sourceDelivery,
});
assert.ok(wrongRelation.errors.includes("correct_review_context_relation_mismatch"));

const staleContext = validateCorrectReviewBinding({
  candidate: sourceCandidate,
  request: request("context_change"),
  sourceDelivery,
});
assert.ok(staleContext.errors.includes("correct_review_candidate_variant_mismatch"));
assert.ok(staleContext.errors.includes("correct_review_context_prompt_not_refreshed"));
assert.ok(staleContext.errors.includes("correct_review_context_template_not_changed"));

const wrongVariantControl = validateCorrectReviewBinding({
  candidate: {
    ...changedNumberCandidate,
    metadataTags: {
      ...changedNumberCandidate.metadataTags,
      variantControl: {
        ...changedNumberCandidate.metadataTags.variantControl,
        expectedIndependentChangeCount: 2,
      },
    },
  },
  request: request("change_one_number"),
  sourceDelivery,
});
assert.ok(wrongVariantControl.errors.includes("correct_review_variant_control_mismatch"));

const notIndependentSource = validateCorrectReviewBinding({
  candidate: contextCandidate,
  request: request("context_change"),
  sourceDelivery: { ...sourceDelivery, attempts: [{ isCorrect: true, hintDepth: 1 }] },
});
assert.ok(notIndependentSource.errors.includes("correct_review_source_not_independent_correct"));

console.log("correct-review-binding-validator-contract: passed");
