import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createMathAnswerInput } from "../src/services/math-answer-input.js";
import { generateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import {
  createQuestionSourceContract,
  resolveQuestionCandidateForDelivery,
} from "../src/services/question-source.js";

const family = shanghaiMathItemFamilies.find((item) => item.id === "part_whole_add_subtract");
assert.ok(family);

const request = {
  family,
  instructionalGrade: "G1",
  seed: 31,
  variantLevel: "change_one_number",
};

const semiAi = await resolveQuestionCandidateForDelivery({ ...request, aiVersion: "semi_ai" });
assert.equal(semiAi.error, null);
assert.equal(semiAi.candidate.qualityStatus, "system_validated");
assert.equal(semiAi.candidate.sourceMode, "bounded_rule_generator");
assert.equal(semiAi.candidate.metadataTags.sourceProvenance.aiCandidateUsed, false);
assert.equal(semiAi.candidate.metadataTags.itemTags.qualityTags.aiGenerated, false);

const missingProvider = await resolveQuestionCandidateForDelivery({ ...request, aiVersion: "full_ai_ready" });
assert.equal(missingProvider.candidate, null);
assert.equal(missingProvider.error, "ai_candidate_provider_required");

const rejectedCandidate = generateMathQuestionCandidate({ ...request, aiVersion: "full_ai_ready" });
rejectedCandidate.answer += 1;
const rejected = await resolveQuestionCandidateForDelivery({
  ...request,
  aiVersion: "full_ai_ready",
  candidateProvider: async () => ({ candidate: rejectedCandidate, providerId: "contract-ai-v1" }),
});
assert.equal(rejected.candidate, null);
assert.equal(rejected.error, "ai_candidate_validation_failed");
assert.ok(rejected.validationErrors.includes("ai_candidate_answer_mismatch"));

const relationRejectedCandidate = generateMathQuestionCandidate({ ...request, aiVersion: "full_ai_ready" });
relationRejectedCandidate.answerRule = "999 - 888";
relationRejectedCandidate.answer = 111;
const relationRejected = await resolveQuestionCandidateForDelivery({
  ...request,
  aiVersion: "full_ai_ready",
  candidateProvider: async () => ({ candidate: relationRejectedCandidate, providerId: "contract-ai-v1" }),
});
assert.equal(relationRejected.candidate, null);
assert.equal(relationRejected.error, "ai_candidate_validation_failed");
assert.ok(relationRejected.validationErrors.includes("semantic_rule_shape_mismatch"));
assert.ok(relationRejected.validationErrors.includes("semantic_rule_numbers_not_grounded"));

const strategyRejectedCandidate = generateMathQuestionCandidate({ ...request, aiVersion: "full_ai_ready" });
strategyRejectedCandidate.solutionStrategies[0].steps[1] = "unverified strategy text";
const strategyRejected = await resolveQuestionCandidateForDelivery({
  ...request,
  aiVersion: "full_ai_ready",
  candidateProvider: async () => ({ candidate: strategyRejectedCandidate, providerId: "contract-ai-v1" }),
});
assert.equal(strategyRejected.candidate, null);
assert.equal(strategyRejected.error, "ai_candidate_validation_failed");
assert.ok(strategyRejected.validationErrors.includes("solution_strategies_not_template_bound"));
assert.ok(strategyRejected.validationErrors.includes("ai_candidate_strategies_not_canonically_bound"));

const contextRejectedCandidate = generateMathQuestionCandidate({ ...request, aiVersion: "full_ai_ready" });
contextRejectedCandidate.metadataTags.applicationContext.questionPurpose = "calculation_only";
const contextRejected = await resolveQuestionCandidateForDelivery({
  ...request,
  aiVersion: "full_ai_ready",
  candidateProvider: async () => ({ candidate: contextRejectedCandidate, providerId: "contract-ai-v1" }),
});
assert.equal(contextRejected.candidate, null);
assert.equal(contextRejected.error, "ai_candidate_validation_failed");
assert.ok(contextRejected.validationErrors.includes("application_context_question_purpose_invalid"));
assert.ok(contextRejected.validationErrors.includes("ai_candidate_application_context_not_canonically_bound"));

const clockTimeFamily = shanghaiMathItemFamilies.find((item) => item.id === "time_elapsed_simple");
assert.ok(clockTimeFamily);
const clockTimeRequest = {
  family: clockTimeFamily,
  instructionalGrade: "G3",
  seed: 31,
  variantLevel: "reverse_question",
};
const answerInputRejectedCandidate = generateMathQuestionCandidate({ ...clockTimeRequest, aiVersion: "full_ai_ready" });
answerInputRejectedCandidate.answerInput = createMathAnswerInput({ kind: "numeric" });
const answerInputRejected = await resolveQuestionCandidateForDelivery({
  ...clockTimeRequest,
  aiVersion: "full_ai_ready",
  candidateProvider: async () => ({ candidate: answerInputRejectedCandidate, providerId: "contract-ai-v1" }),
});
assert.equal(answerInputRejected.candidate, null);
assert.equal(answerInputRejected.error, "ai_candidate_validation_failed");
assert.ok(answerInputRejected.validationErrors.includes("ai_candidate_answer_input_not_canonically_bound"));

const acceptedCandidate = generateMathQuestionCandidate({ ...request, aiVersion: "full_ai_ready" });
const fullAi = await resolveQuestionCandidateForDelivery({
  ...request,
  aiVersion: "full_ai_ready",
  candidateProvider: async () => ({ candidate: acceptedCandidate, providerId: "contract-ai-v1" }),
});
assert.equal(fullAi.error, null);
assert.equal(fullAi.candidate.qualityStatus, "system_validated");
assert.equal(fullAi.candidate.sourceMode, "ai_candidate_validated");
assert.equal(fullAi.candidate.metadataTags.sourceProvenance.providerId, "contract-ai-v1");
assert.equal(fullAi.candidate.metadataTags.itemTags.qualityTags.aiGenerated, true);

const contract = createQuestionSourceContract({ aiVersion: "full_ai_ready", itemFamily: family });
assert.equal(contract.availability, "provider_required");
assert.ok(contract.deliveryGate.includes("server_ai_candidate_provider"));
assert.ok(contract.deliveryGate.includes("family_semantics_verified"));
assert.ok(contract.deliveryGate.includes("application_context_verified"));
assert.ok(contract.deliveryGate.includes("canonical_reference_binding"));

console.log("question-source-contract: passed");
