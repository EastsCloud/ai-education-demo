import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import {
  createMathAnswerInput,
  formatMathAnswerValue,
  mathAnswerValuesMatch,
  normalizeMathAnswerValue,
  validateMathAnswerInput,
} from "../src/services/math-answer-input.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import {
  createQuestionDeliveryGuidedProcessExport,
  createQuestionDeliveryRecord,
  markQuestionDeliveryStarted,
  recordQuestionDeliveryAttempt,
  recordQuestionDeliveryGuidedStepResponse,
  revealNextQuestionGuidedStep,
  toQuestionDeliveryPresentation,
} from "../src/services/question-delivery-runtime.js";
import {
  createStageAssessmentRun,
  recordStageAssessmentResponse,
} from "../src/services/stage-assessment-runtime.js";
import { scoreStageAssessment } from "../src/services/stage-assessment-engine.js";

const numericInput = createMathAnswerInput();
const clockInput = createMathAnswerInput({ kind: "clock_time" });
const fractionInput = createMathAnswerInput({ kind: "fraction" });

assert.equal(normalizeMathAnswerValue({ answerInput: numericInput, value: "12.5" }), 12.5);
assert.equal(normalizeMathAnswerValue({ answerInput: clockInput, value: "9:05" }), 545);
assert.equal(normalizeMathAnswerValue({ answerInput: clockInput, value: "09:05" }), 545);
assert.equal(normalizeMathAnswerValue({ answerInput: clockInput, value: "24:00" }), null);
assert.equal(normalizeMathAnswerValue({ answerInput: clockInput, value: "9:5" }), null);
assert.equal(formatMathAnswerValue({ answerInput: clockInput, value: 545 }), "09:05");
assert.equal(validateMathAnswerInput({ answerInput: clockInput, answer: 545 }).valid, true);
assert.equal(validateMathAnswerInput({ answerInput: clockInput, answer: 545.5 }).valid, false);
assert.equal(normalizeMathAnswerValue({ answerInput: fractionInput, value: "3/6" }), 0.5);
assert.equal(normalizeMathAnswerValue({ answerInput: fractionInput, value: " 2 / 3 " }), 2 / 3);
assert.equal(normalizeMathAnswerValue({ answerInput: fractionInput, value: "0.5" }), null);
assert.equal(normalizeMathAnswerValue({ answerInput: fractionInput, value: "3/0" }), null);
assert.equal(formatMathAnswerValue({ answerInput: fractionInput, value: 0.5 }), "1/2");
assert.equal(mathAnswerValuesMatch({ answerInput: fractionInput, actual: "3/6", expected: 0.5 }), true);

const timeFamily = shanghaiMathItemFamilies.find((family) => family.id === "time_elapsed_simple");
assert.ok(timeFamily);
const candidate = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family: timeFamily,
    instructionalGrade: "G3",
    seed: 7,
    variantLevel: "reverse_question",
  }),
);
assert.equal(candidate.qualityStatus, "system_validated");
assert.equal(candidate.answerInput.kind, "clock_time");
assert.equal(candidate.solutionDerivation.answerInputKind, "clock_time");
assert.equal(candidate.guidedSteps.at(-1).answerInput.kind, "clock_time");

const request = {
  studentId: "student-001",
  subjectId: "math",
  mode: "practice",
  familyId: timeFamily.id,
  instructionalGrade: "G3",
  variantLevel: "reverse_question",
  seed: 7,
};
const expectedClock = formatMathAnswerValue({ answerInput: candidate.answerInput, value: candidate.answer });

let delivery = createQuestionDeliveryRecord({ candidate, deliveryId: "clock-answer-delivery", request });
delivery = markQuestionDeliveryStarted({ delivery, startedAt: "2026-09-05T10:00:00.000Z" });
const presentation = toQuestionDeliveryPresentation(delivery);
assert.equal(presentation.question.answerInput.kind, "clock_time");
assert.equal(Object.hasOwn(presentation.question, "answer"), false);

assert.equal(recordQuestionDeliveryAttempt({ delivery, answer: String(candidate.answer) }), null);
const scored = recordQuestionDeliveryAttempt({
  delivery,
  answer: expectedClock,
  submittedAt: "2026-09-05T10:00:03.000Z",
});
assert.equal(scored.result.isCorrect, true);
assert.equal(scored.delivery.attempts[0].answer, candidate.answer);

let guidedDelivery = createQuestionDeliveryRecord({ candidate, deliveryId: "clock-guided-delivery", request });
guidedDelivery = markQuestionDeliveryStarted({ delivery: guidedDelivery });
for (const [index, sourceStep] of candidate.guidedSteps.entries()) {
  const revealed = revealNextQuestionGuidedStep({ delivery: guidedDelivery });
  assert.ok(revealed.step);
  guidedDelivery = revealed.delivery;
  if (sourceStep.responseType === "final_answer") {
    assert.equal(revealed.step.answerInput.kind, "clock_time");
  }
  const recorded = recordQuestionDeliveryGuidedStepResponse({
    delivery: guidedDelivery,
    level: index + 1,
    response: sourceStep.responseType === "final_answer" ? expectedClock : "我先把已知条件和要找的量整理出来。",
  });
  assert.ok(recorded.delivery);
  guidedDelivery = recorded.delivery;
}
const guidedExport = createQuestionDeliveryGuidedProcessExport(guidedDelivery);
assert.equal(guidedExport.steps.at(-1).response, expectedClock);

let stageRun = createStageAssessmentRun({
  studentId: "student-001",
  subjectId: "math",
  questions: [candidate],
  minimumQuestions: 1,
  attemptId: "clock-answer",
});
assert.equal(stageRun.presentationQuestions[0].answerInput.kind, "clock_time");
assert.equal(Object.hasOwn(stageRun.presentationQuestions[0], "answer"), false);
assert.throws(
  () =>
    recordStageAssessmentResponse({
      session: stageRun,
      answer: candidate.answer,
      questionId: candidate.id,
      responseTimeMs: 1000,
    }),
  /invalid_stage_assessment_answer/,
);
stageRun = recordStageAssessmentResponse({
  session: stageRun,
  answer: expectedClock,
  questionId: candidate.id,
  responseTimeMs: 1000,
});
assert.equal(stageRun.responses[0].answer, candidate.answer);
assert.equal(scoreStageAssessment({ session: stageRun, responses: stageRun.responses }).accuracy, 1);

const fractionFamily = shanghaiMathItemFamilies.find((family) => family.id === "fraction_add_same_denominator");
assert.ok(fractionFamily);
const fractionCandidate = Array.from({ length: 21 }, (_, seed) =>
  validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      family: fractionFamily,
      instructionalGrade: "G4",
      seed,
      variantLevel: "original",
    }),
  ),
).find((item) => Math.abs(item.answer - 0.5) < 1e-9);
assert.ok(fractionCandidate);
assert.equal(fractionCandidate.qualityStatus, "system_validated");
assert.equal(fractionCandidate.answerInput.kind, "fraction");
assert.equal(formatMathAnswerValue({ answerInput: fractionCandidate.answerInput, value: fractionCandidate.answer }), "1/2");

let fractionDelivery = createQuestionDeliveryRecord({
  candidate: fractionCandidate,
  deliveryId: "fraction-answer-delivery",
  request: { ...request, familyId: fractionFamily.id, instructionalGrade: "G4", seed: 2 },
});
fractionDelivery = markQuestionDeliveryStarted({ delivery: fractionDelivery });
assert.equal(recordQuestionDeliveryAttempt({ delivery: fractionDelivery, answer: "0.5" }), null);
const fractionScored = recordQuestionDeliveryAttempt({
  delivery: fractionDelivery,
  answer: "3/6",
  submittedAt: "2026-09-05T10:00:03.000Z",
});
assert.equal(fractionScored.result.isCorrect, true);
assert.equal(fractionScored.delivery.attempts[0].answer, 0.5);

let fractionGuidedDelivery = createQuestionDeliveryRecord({
  candidate: fractionCandidate,
  deliveryId: "fraction-guided-delivery",
  request: { ...request, familyId: fractionFamily.id, instructionalGrade: "G4", seed: 2 },
});
fractionGuidedDelivery = markQuestionDeliveryStarted({ delivery: fractionGuidedDelivery });
for (const [index, sourceStep] of fractionCandidate.guidedSteps.entries()) {
  const revealed = revealNextQuestionGuidedStep({ delivery: fractionGuidedDelivery });
  assert.ok(revealed.step);
  fractionGuidedDelivery = revealed.delivery;
  const recorded = recordQuestionDeliveryGuidedStepResponse({
    delivery: fractionGuidedDelivery,
    level: index + 1,
    response: sourceStep.responseType === "final_answer" ? "3/6" : "我先整理题目里的分数关系。",
  });
  assert.ok(recorded.delivery);
  fractionGuidedDelivery = recorded.delivery;
}
assert.equal(createQuestionDeliveryGuidedProcessExport(fractionGuidedDelivery).steps.at(-1).response, "1/2");

let fractionStageRun = createStageAssessmentRun({
  studentId: "student-001",
  subjectId: "math",
  questions: [fractionCandidate],
  minimumQuestions: 1,
  attemptId: "fraction-answer",
});
fractionStageRun = recordStageAssessmentResponse({
  session: fractionStageRun,
  answer: "3/6",
  questionId: fractionCandidate.id,
  responseTimeMs: 1000,
});
assert.equal(scoreStageAssessment({ session: fractionStageRun, responses: fractionStageRun.responses }).accuracy, 1);

const fractionSubtractFamily = shanghaiMathItemFamilies.find((family) => family.id === "fraction_subtract_same_denominator");
assert.ok(fractionSubtractFamily);
const fractionSubtractCandidate = validateMathQuestionCandidate(
  generateMathQuestionCandidate({
    family: fractionSubtractFamily,
    instructionalGrade: "G4",
    seed: 4,
    variantLevel: "original",
  }),
);
assert.equal(fractionSubtractCandidate.qualityStatus, "system_validated");
assert.equal(fractionSubtractCandidate.answerInput.kind, "fraction");
assert.match(formatMathAnswerValue({ answerInput: fractionSubtractCandidate.answerInput, value: fractionSubtractCandidate.answer }), /^-?\d+\/\d+$/);

console.log("math-answer-input-contract: passed");
