import {
  isControlledNumberVariant,
  isReadingFormTransferVariant,
} from "./variant-evidence-policy.js?v=variant-evidence-policy-1";
import {
  createMathAnswerInput,
  mathAnswerValuesMatch,
  normalizeMathAnswerValue,
} from "./math-answer-input.js?v=math-answer-input-fraction-1";

const PERMITTED_CURVE_UPDATE_TYPES = new Set(["stage_test", "dynamic_calibration_test", "targeted_retest"]);

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createQuestionSnapshot(question) {
  return {
    id: question.id,
    answer: question.answer,
    answerInput: question.answerInput || createMathAnswerInput(),
    familyId: question.metadataTags?.familyId || question.familyId || null,
    variantLevel: question.metadataTags?.variantLevel || question.variantLevel || "original",
    gradeBands: question.metadataTags?.gradeBands || question.metadataTags?.itemTags?.systemLevelTags?.gradeBands || [],
    knowledgePointIds:
      question.metadataTags?.itemTags?.knowledgeTags?.knowledgePointIds || question.metadataTags?.atlasNodeIds || [],
    abilityTags: question.metadataTags?.abilityTags || question.diagnosticTags || [],
    atlasNodeIds: question.metadataTags?.atlasNodeIds || [],
    itemTags: question.metadataTags?.itemTags || question.generationMetadata?.itemTags || null,
    assessmentRouting: question.metadataTags?.stageAssessmentRouting || null,
    qualityStatus: question.qualityStatus || question.generationMetadata?.qualityStatus || null,
  };
}

export function createStageAssessmentSession({
  studentId,
  subjectId,
  questions,
  assessmentType = "stage_test",
  plannedWeek = 1,
  minimumQuestions = 4,
  attemptId = null,
}) {
  if (!PERMITTED_CURVE_UPDATE_TYPES.has(assessmentType)) {
    throw new Error("assessment_type_cannot_update_curve");
  }

  const questionSnapshot = questions.map(createQuestionSnapshot);
  return {
    id: `stage-assessment-${studentId}-${subjectId}-week-${plannedWeek}${attemptId ? `-attempt-${attemptId}` : ""}`,
    studentId,
    subjectId,
    assessmentType,
    plannedWeek,
    minimumQuestions: Math.min(minimumQuestions, questionSnapshot.length),
    questionSnapshot,
    supportAllowed: false,
    status: "ready",
    guardrail: "Stage tests do not expose Help You Learn and only completed test evidence can update the dynamic curve.",
  };
}

export function scoreStageAssessment({ session, responses = [] }) {
  const responseByQuestion = new Map(responses.map((response) => [response.questionId, response]));
  const questionResults = session.questionSnapshot.map((question) => {
    const response = responseByQuestion.get(question.id);
    const answer = normalizeMathAnswerValue({
      answerInput: question.answerInput || createMathAnswerInput(),
      value: response?.answer,
      allowCanonicalNumber: true,
    });
    const hasSupportViolation = Number(response?.hintsOpened || 0) > 0 || Boolean(response?.supportUsed);
    const isCorrect = answer !== null && mathAnswerValuesMatch({ answerInput: question.answerInput, actual: answer, expected: question.answer });

    return {
      questionId: question.id,
      familyId: question.familyId,
      variantLevel: question.variantLevel,
      gradeBands: question.gradeBands || [],
      knowledgePointIds: question.knowledgePointIds || [],
      qualityStatus: question.qualityStatus,
      assessmentRouting: question.assessmentRouting || null,
      answered: answer !== null,
      isCorrect,
      hasSupportViolation,
      responseTimeMs: Number(response?.responseTimeMs || 0),
    };
  });

  const answered = questionResults.filter((item) => item.answered);
  const correct = questionResults.filter((item) => item.isCorrect);
  // Changing numbers checks stability. Changing how the same relationship is expressed
  // checks transfer. They are deliberately kept as separate formal-test evidence.
  const controlledVariantItems = questionResults.filter((item) => isControlledNumberVariant(item.variantLevel));
  const controlledVariantCorrect = controlledVariantItems.filter((item) => item.isCorrect);
  const transferItems = questionResults.filter((item) => isReadingFormTransferVariant(item.variantLevel));
  const transferCorrect = transferItems.filter((item) => item.isCorrect);
  const hasSupportViolation = questionResults.some((item) => item.hasSupportViolation);
  const allItemsQualityPassed = questionResults.every((item) => item.qualityStatus === "system_validated");
  const complete = answered.length === questionResults.length && questionResults.length >= session.minimumQuestions;
  const accuracy = questionResults.length ? correct.length / questionResults.length : 0;
  const controlledVariantAccuracy = controlledVariantItems.length
    ? controlledVariantCorrect.length / controlledVariantItems.length
    : accuracy;
  const transferAccuracy = transferItems.length ? transferCorrect.length / transferItems.length : accuracy;
  const masteryScore = Number(
    clamp(accuracy * 0.8 + controlledVariantAccuracy * 0.1 + transferAccuracy * 0.1).toFixed(4),
  );
  const uniqueFamilies = new Set(questionResults.map((item) => item.familyId).filter(Boolean)).size;
  const eligibleForCurveUpdate =
    complete &&
    !hasSupportViolation &&
    allItemsQualityPassed &&
    PERMITTED_CURVE_UPDATE_TYPES.has(session.assessmentType);

  return {
    id: `${session.id}-result`,
    sessionId: session.id,
    studentId: session.studentId,
    subjectId: session.subjectId,
    assessmentType: session.assessmentType,
    plannedWeek: session.plannedWeek,
    status: eligibleForCurveUpdate ? "completed_verified" : complete ? "completed_needs_review" : "incomplete",
    eligibleForCurveUpdate,
    completedQuestionCount: answered.length,
    requiredQuestionCount: session.questionSnapshot.length,
    correctCount: correct.length,
    accuracy,
    controlledVariantItemCount: controlledVariantItems.length,
    controlledVariantAccuracy,
    transferItemCount: transferItems.length,
    transferAccuracy,
    masteryScore,
    uniqueFamilies,
    supportViolation: hasSupportViolation,
    allItemsQualityPassed,
    questionResults,
    guardrail: eligibleForCurveUpdate
      ? "This verified stage-test result may update the dynamic learning curve."
      : "This result is retained as evidence but cannot update the dynamic learning curve until every item is validated and the test is completed without support.",
  };
}
