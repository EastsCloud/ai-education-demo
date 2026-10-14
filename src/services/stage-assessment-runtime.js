import { createDynamicLearningCurve } from "./dynamic-learning-curve-engine.js?v=form-transfer-evidence-2";
import { createStageAssessmentSession, scoreStageAssessment } from "./stage-assessment-engine.js?v=assessment-answer-input-1";
import { evaluateLevelAttainment } from "./level-attainment-engine.js?v=level-attainment-2";
import {
  createMathAnswerInput,
  normalizeMathAnswerValue,
} from "./math-answer-input.js?v=math-answer-input-fraction-1";

function toResponse(answer, { answerInput, ...response } = {}) {
  const normalizedAnswer = normalizeMathAnswerValue({
    answerInput: answerInput || createMathAnswerInput(),
    value: answer,
  });
  if (normalizedAnswer === null) return null;
  return {
    questionId: response.questionId,
    answer: normalizedAnswer,
    responseTimeMs: Math.max(0, Number(response.responseTimeMs || 0)),
    hintsOpened: 0,
    supportUsed: false,
    submittedAt: response.submittedAt || new Date().toISOString(),
  };
}

export function createStageAssessmentRun({
  studentId,
  subjectId,
  questions,
  assessmentType = "stage_test",
  plannedWeek = 1,
  minimumQuestions = 4,
  attemptId = null,
  assessmentBlueprint = null,
}) {
  const session = createStageAssessmentSession({
    studentId,
    subjectId,
    questions,
    assessmentType,
    plannedWeek,
    minimumQuestions,
    attemptId,
  });

  return {
    ...session,
    status: "in_progress",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assessmentBlueprint,
    responses: [],
    presentationQuestions: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      answerInput: question.answerInput || createMathAnswerInput(),
      knowledgePoint: question.familyName || question.knowledgePoint || "数学关系",
      familyId: question.familyId || question.metadataTags?.familyId || null,
      variantLevel: question.variantLevel || question.metadataTags?.variantLevel || "original",
    })),
    guardrail:
      "Stage tests use the shared item logic but never expose Help You Learn. Only the completed result may be considered for a dynamic curve.",
  };
}

export function recordStageAssessmentResponse({ session, answer, questionId, responseTimeMs }) {
  const question = session?.questionSnapshot?.find((item) => item.id === questionId);
  if (!question) {
    throw new Error("unknown_stage_assessment_question");
  }
  if (session.supportAllowed) throw new Error("stage_assessment_support_must_be_disabled");

  const response = toResponse(answer, { answerInput: question.answerInput, questionId, responseTimeMs });
  if (!response) throw new Error("invalid_stage_assessment_answer");
  const responses = [...(session.responses || []).filter((item) => item.questionId !== questionId), response];
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    responses,
    responseCount: responses.length,
    status: responses.length === session.questionSnapshot.length ? "ready_to_score" : "in_progress",
  };
}

export function finalizeStageAssessmentRun({ session, staticCurve, levelDefinition = null, priorStageResults = [] }) {
  const scoredResult = scoreStageAssessment({ session, responses: session.responses || [] });
  const levelAttainment = levelDefinition
    ? evaluateLevelAttainment({
        levelDefinition,
        currentStageResult: scoredResult,
        priorStageResults,
      })
    : null;
  const result = {
    ...scoredResult,
    assessmentScope: session.assessmentBlueprint?.coverage || null,
    ...(levelAttainment ? { levelAttainment } : {}),
  };
  const dynamicCurve = createDynamicLearningCurve({ staticCurve, stageResult: result });
  return {
    session: {
      ...session,
      updatedAt: new Date().toISOString(),
      status: result.status,
      result,
      levelAttainment,
      dynamicCurve,
    },
    result,
    dynamicCurve,
  };
}
