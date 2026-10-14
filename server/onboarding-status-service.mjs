import { PERSONALITY_ASSESSMENT_TYPE } from "./personality-assessment-run-service.mjs";

const STAGE_IDS = ["start_context", "personality", "math_ability", "goal", "curve"];

function isCompletedAssessment(session) {
  return Boolean(
    session?.serverAuthoritative && ["completed", "completed_verified"].includes(session.status),
  );
}

function assessmentStageState(session) {
  if (isCompletedAssessment(session)) return "completed";
  if (session?.serverAuthoritative && session.status === "in_progress") return "in_progress";
  return "not_started";
}

function startContextStageState(prefill) {
  if (prefill?.confirmationStatus === "student_confirmed") {
    return "completed";
  }
  if (prefill) return "awaiting_student_confirmation";
  return "not_started";
}

function mathAbilityStageState({ session, prefill }) {
  if (!prefill?.subjectIds?.includes("math") || !prefill?.subjectSelectionConfirmedAt) {
    return "awaiting_subject_selection";
  }
  return assessmentStageState(session);
}

function goalStageState({ learningGoalDraft, plan }) {
  if (plan?.staticCurveConfirmedAt || learningGoalDraft?.confirmationStatus === "student_confirmed") {
    return "completed";
  }
  if (learningGoalDraft?.confirmationStatus === "prefilled") return "awaiting_student_confirmation";
  return "not_started";
}

function curveStageState(plan) {
  if (plan?.staticCurveConfirmedAt) return "completed";
  if (plan?.staticCurve) return "awaiting_student_confirmation";
  return "not_started";
}

// This is intentionally a status-only projection. It joins durable records without
// returning personal basic-info fields, answers, score mappings, or private plans.
export function buildServerOnboardingStatus({ database, studentId, subjectId }) {
  const onboardingPrefill = database.getStudentOnboardingPrefill({ studentId });
  const personalityAssessment = database.getLatestAssessmentSession({
    studentId,
    subjectId,
    assessmentType: PERSONALITY_ASSESSMENT_TYPE,
  });
  const initialAssessment = database.getLatestAssessmentSession({
    studentId,
    subjectId,
    assessmentType: "initial_onboarding",
  });
  const learningGoalDraft = database.getStudentLearningGoalDraft({ studentId, subjectId });
  const plan = database.getPlan({ studentId, subjectId });
  const stateById = {
    start_context: startContextStageState(onboardingPrefill),
    personality: assessmentStageState(personalityAssessment),
    math_ability: mathAbilityStageState({ session: initialAssessment, prefill: onboardingPrefill }),
    goal: goalStageState({ learningGoalDraft, plan }),
    curve: curveStageState(plan),
  };
  const stages = STAGE_IDS.map((id) => ({ id, state: stateById[id] }));
  const nextStageId = stages.find((stage) => stage.state !== "completed")?.id || null;

  return {
    version: "server_onboarding_status_v1",
    studentId,
    subjectId,
    stages,
    nextStageId,
    complete: nextStageId === null,
    readyForPractice: Boolean(plan?.staticCurveConfirmedAt),
  };
}
