import {
  personalityLogicLibrary,
  psychologicalPersonalityLibrary,
} from "../src/data/mock-data.js";
import {
  generatePersonalityQuestionSets,
  scorePersonalityQuestionSets,
} from "../src/services/personality-assessment-engine.js";

export const PERSONALITY_ASSESSMENT_TYPE = "onboarding_personality";

function questionSetsFromQuestions(questions = []) {
  return {
    psychologicalQuestions: questions.filter((question) => question.step === "psychological_personality"),
    learningQuestions: questions.filter((question) => question.step === "learning_personality"),
  };
}

function publicDimension(dimension) {
  return {
    id: dimension.id,
    name: dimension.name,
    score: dimension.score,
    confidence: dimension.confidence,
    label: dimension.label,
  };
}

function publicSupportProfile(profile) {
  return {
    id: profile.id,
    source: profile.source,
    responseCount: profile.responseCount,
    supportMode: profile.supportMode,
    taskChunking: profile.taskChunking,
    confidence: profile.confidence,
    guardrail: profile.guardrail,
  };
}

function scoreRun(session) {
  const questionSets = createPersonalityQuestionSetsFromSession(session);
  const result = scorePersonalityQuestionSets({
    questionSets,
    responses: session.responses || [],
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
  return {
    complete: result.complete,
    psychologicalComplete: result.psychologicalComplete,
    learningComplete: result.learningComplete,
    completedCount: result.completedCount,
    totalCount: result.totalCount,
    psychologicalDimensions: result.psychologicalDimensions.map(publicDimension),
    learningDimensions: result.learningDimensions.map(publicDimension),
    studentType: result.studentType,
    supportProfile: publicSupportProfile(result.supportProfile),
    guardrail:
      "This is an initial learning-support view, not a fixed personality label. Later practice behavior continues to refine support.",
  };
}

function privateQuestion(question, step) {
  return {
    id: question.id,
    step,
    dimension: question.dimension,
    dimensionId: question.dimensionId,
    optionScores: question.optionScores,
    metadata: question.metadata || {},
  };
}

function presentationQuestion(question, step) {
  return {
    id: question.id,
    step,
    dimension: question.dimension,
    prompt: question.prompt,
    options: question.options,
    metadata: question.metadata || {},
  };
}

function publicResponse(response) {
  return {
    step: response.step,
    questionId: response.questionId,
    responseType: "choice",
    answer: response.answer,
    responseTimeMs: response.responseTimeMs,
    submittedAt: response.submittedAt,
    metadata: response.metadata || {},
  };
}

export function createPersonalityQuestionSetsFromSession(session) {
  return questionSetsFromQuestions(session?.questionSnapshot || []);
}

export function createServerPersonalityAssessmentRun({ studentId, subjectId }) {
  const generated = generatePersonalityQuestionSets({
    studentId,
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
  const psychological = generated.psychologicalQuestions.map((question) => ({ question, step: "psychological_personality" }));
  const learning = generated.learningQuestions.map((question) => ({ question, step: "learning_personality" }));
  const allQuestions = [...psychological, ...learning];
  if (!allQuestions.length || allQuestions.length > generated.combinedItemCap || allQuestions.length > 12) {
    return { error: "personality_assessment_question_cap_invalid" };
  }

  const now = new Date().toISOString();
  const session = {
    id: `personality-assessment-${studentId}-${subjectId}-${Date.now()}`,
    studentId,
    subjectId,
    assessmentType: PERSONALITY_ASSESSMENT_TYPE,
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
    responseCount: 0,
    questionSnapshot: allQuestions.map(({ question, step }) => privateQuestion(question, step)),
    presentationQuestions: allQuestions.map(({ question, step }) => presentationQuestion(question, step)),
    responses: [],
    serverAuthoritative: true,
    guardrail:
      "The server owns the scenario-template order and scoring logic. Student answers inform learning support only and are not a medical or fixed-label diagnosis.",
  };
  return { session };
}

export function recordPersonalityAssessmentResponse({ session, answer, questionId, responseTimeMs }) {
  const answeredIds = new Set((session.responses || []).map((response) => response.questionId));
  const expectedQuestion = (session.questionSnapshot || []).find((question) => !answeredIds.has(question.id));
  if (!expectedQuestion || expectedQuestion.id !== questionId) {
    return { error: "personality_assessment_question_order_denied" };
  }

  const normalizedAnswer = Number(answer);
  if (!Number.isInteger(normalizedAnswer) || normalizedAnswer < 0 || normalizedAnswer >= expectedQuestion.optionScores.length) {
    return { error: "invalid_personality_assessment_answer" };
  }

  const submittedAt = new Date().toISOString();
  const response = {
    step: expectedQuestion.step,
    questionId,
    answer: normalizedAnswer,
    responseType: "choice",
    responseTimeMs: Math.max(0, Math.min(6 * 60 * 60 * 1000, Number(responseTimeMs) || 0)),
    submittedAt,
    metadata: expectedQuestion.metadata || {},
  };
  const responses = [...(session.responses || []), response];
  const complete = responses.length === (session.questionSnapshot || []).length;
  const updated = {
    ...session,
    responses,
    responseCount: responses.length,
    status: complete ? "completed" : "in_progress",
    updatedAt: submittedAt,
  };
  return { session: updated };
}

export function toPublicPersonalityAssessmentRun(session) {
  if (!session) return null;
  return {
    id: session.id,
    studentId: session.studentId,
    subjectId: session.subjectId,
    assessmentType: session.assessmentType,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    responseCount: session.responseCount || (session.responses || []).length,
    presentationQuestions: session.presentationQuestions || [],
    responses: (session.responses || []).map(publicResponse),
    result: scoreRun(session),
    serverAuthoritative: true,
    guardrail: session.guardrail,
  };
}
