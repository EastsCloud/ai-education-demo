import assert from "node:assert/strict";
import { createQuestionDeliveryRepository } from "../src/services/question-delivery-repository.js";

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const directRequest = deferred();
let directRequestCount = 0;
const apiClient = {
  enabled: true,
  createQuestionDelivery: async () => {
    directRequestCount += 1;
    return directRequest.promise;
  },
  getQuestionDelivery: async ({ deliveryId }) => ({
    delivery: {
      id: deliveryId,
      studentId: "student-001",
      subjectId: "math-linear-equations",
      status: "in_progress",
      question: { id: "atlas-resume-question" },
    },
  }),
  markQuestionDeliveryStarted: async ({ deliveryId }) => ({
    delivery: { id: deliveryId, status: "in_progress", question: { id: "generated-question" } },
  }),
  revealQuestionDeliveryHint: async ({ deliveryId }) => ({
    delivery: { id: deliveryId, status: "in_progress", question: { id: "generated-question" } },
    hint: { level: 1, title: "Hint 1", body: "Use the relationship." },
  }),
  revealQuestionDeliveryGuidedStep: async ({ deliveryId }) => ({
    delivery: {
      id: deliveryId,
      status: "in_progress",
      question: {
        id: "generated-question",
        support: { guidedResponseStates: [] },
        revealedGuidedSteps: [
          { level: 1, phase: "read_translate", prompt: "Name the known information.", responseType: "short_reasoning" },
        ],
      },
    },
    step: { level: 1, phase: "read_translate", prompt: "Name the known information.", responseType: "short_reasoning" },
  }),
  submitQuestionDeliveryGuidedStepResponse: async ({ deliveryId, level }) => ({
    delivery: {
      id: deliveryId,
      status: "in_progress",
      question: {
        id: "generated-question",
        support: {
          guidedResponseStates: [
            { level, responseType: "short_reasoning", status: "recorded", attemptCount: 1 },
          ],
        },
        revealedGuidedSteps: [
          { level, phase: "read_translate", prompt: "Name the known information.", responseType: "short_reasoning" },
        ],
      },
    },
    response: { level, responseType: "short_reasoning", status: "recorded", attemptCount: 1 },
    result: { status: "recorded", feedbackCode: "guided_reasoning_recorded" },
  }),
};

const repository = createQuestionDeliveryRepository({ apiClient });
const questionId = "daily-run-question";
const directDeliveryPromise = repository.ensureDelivery({
  questionId,
  deliveryRequest: {
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode: "practice",
    familyId: "linear_equation_word_problem",
    instructionalGrade: "G5",
    variantLevel: "original",
    seed: 1,
  },
});

const serverRunDelivery = {
  id: "run-owned-delivery",
  status: "delivered",
  question: { id: "generated-question" },
};
repository.adoptDelivery({ questionId, delivery: serverRunDelivery });

directRequest.resolve({
  delivery: {
    id: "stale-direct-delivery",
    status: "delivered",
    question: { id: "different-question" },
  },
});

const afterDirectRace = await directDeliveryPromise;
assert.equal(afterDirectRace.delivery.id, "run-owned-delivery");
assert.equal(repository.stateForQuestion(questionId).delivery.id, "run-owned-delivery");
assert.equal(repository.stateForQuestion(questionId).source, "server_daily_run");

const started = await repository.markStarted({ questionId, studentId: "student-001" });
assert.equal(started.state.delivery.id, "run-owned-delivery");
assert.equal(started.state.source, "server_daily_run");

const revealed = await repository.revealHint({ questionId, studentId: "student-001" });
assert.equal(revealed.state.revealedHints.length, 1);
assert.equal(revealed.state.source, "server_daily_run");

const guidedStep = await repository.revealGuidedStep({ questionId, studentId: "student-001" });
assert.equal(guidedStep.state.revealedGuidedSteps.length, 1);
assert.equal(guidedStep.state.revealedGuidedSteps[0].responseType, "short_reasoning");

const guidedResponse = await repository.submitGuidedStepResponse({
  questionId,
  studentId: "student-001",
  level: 1,
  response: "I first identify what is known.",
});
assert.equal(guidedResponse.state.guidedResponses[0].status, "recorded");
assert.equal(guidedResponse.state.guidedResponses[0].responseValue, "I first identify what is known.");

const repeated = await repository.ensureDelivery({
  questionId,
  deliveryRequest: {
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode: "practice",
    familyId: "linear_equation_word_problem",
    instructionalGrade: "G5",
    variantLevel: "original",
    seed: 1,
  },
});
assert.equal(repeated.delivery.id, "run-owned-delivery");
assert.equal(directRequestCount, 1);

const resumed = await repository.hydrateDelivery({
  questionId: "atlas-resume-question",
  deliveryId: "atlas-resume-delivery",
  source: "knowledge_atlas_exploration_resume",
});
assert.equal(resumed.delivery.id, "atlas-resume-delivery");
assert.equal(resumed.source, "knowledge_atlas_exploration_resume");

let disabledRemoteRequestCount = 0;
const localDemoRepository = createQuestionDeliveryRepository({
  apiClient: {
    enabled: true,
    createQuestionDelivery: async () => {
      disabledRemoteRequestCount += 1;
      return { delivery: null };
    },
  },
  remoteEnabled: false,
});
assert.equal(localDemoRepository.remoteAvailable(), false);
assert.equal(
  await localDemoRepository.ensureDelivery({
    questionId: "local-demo-question",
    deliveryRequest: {
      studentId: "student-demo",
      subjectId: "math",
      mode: "practice",
      familyId: "whole_part_addition",
      instructionalGrade: "G1",
      variantLevel: "original",
      seed: 1,
    },
  }),
  null,
);
assert.equal(disabledRemoteRequestCount, 0);

console.log("question-delivery-repository-contract: passed");
