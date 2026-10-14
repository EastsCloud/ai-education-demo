import { buildAdaptiveSupportProfile } from "../src/services/adaptive-support-profile-engine.js";
import { createStaticLearningCurve, createTodayTaskFromLearningCurve } from "../src/services/learning-curve-engine.js";
import {
  createMathLearningPath,
  DEFAULT_MATH_LEARNING_PATH_VERSION,
} from "../src/services/math-learning-path-engine.js";
import { generatePersonalityQuestionSets, scorePersonalityQuestionSets } from "../src/services/personality-assessment-engine.js";
import {
  personalityLogicLibrary,
  psychologicalPersonalityLibrary,
  shanghaiMathItemFamilies,
  statisticalBaseline,
} from "../src/data/mock-data.js";
import { createPersonalityQuestionSetsFromSession } from "./personality-assessment-run-service.mjs";
import { buildServerInitialAbilityMap } from "./initial-ability-profile-service.mjs";
import { assessmentCadenceConfig } from "../src/data/learning-parameter-config.js";

const INITIAL_ASSESSMENT_TYPE = "initial_onboarding";
const PERSONALITY_ASSESSMENT_TYPE = "onboarding_personality";

function buildInitialSupportProfile({ database, studentId, subjectId }) {
  const personalitySession = database.getLatestAssessmentSession({
    studentId,
    subjectId,
    assessmentType: PERSONALITY_ASSESSMENT_TYPE,
  });
  const questionSets =
    personalitySession?.serverAuthoritative && personalitySession.questionSnapshot
      ? createPersonalityQuestionSetsFromSession(personalitySession)
      : generatePersonalityQuestionSets({
          studentId,
          psychologicalLibrary: psychologicalPersonalityLibrary,
          learningLibrary: personalityLogicLibrary,
        });
  const personalityResult = scorePersonalityQuestionSets({
    questionSets,
    responses: personalitySession?.responses || [],
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
  return buildAdaptiveSupportProfile({
    initialProfile: personalityResult.supportProfile,
    behaviorEvents: database.listBehaviorEvents({ studentId, subjectId, limit: 2000 }),
  });
}

function assessmentSummary(session) {
  return {
    id: session.id,
    targetGrade: session.targetGrade,
    completedAt: session.updatedAt,
    completedQuestionCount: session.result?.completedQuestionCount || session.responses?.length || 0,
    accuracy: typeof session.result?.accuracy === "number" ? session.result.accuracy : null,
    familyCount: session.result?.familyCount || 0,
    allItemsQualityPassed: Boolean(session.result?.allItemsQualityPassed),
  };
}

export function createInitialLearningPlanRecord({
  database,
  existingPlan = null,
  initialAssessment,
  learningGoal,
  practiceDate,
  studentId,
  subjectId,
  user,
}) {
  if (!initialAssessment?.serverAuthoritative || initialAssessment.status !== "completed") {
    return { error: "initial_learning_plan_requires_completed_initial_assessment" };
  }
  if (existingPlan?.serverAuthoritative && existingPlan.staticCurveConfirmedAt) {
    return { plan: existingPlan, idempotent: true };
  }

  const abilityMap = buildServerInitialAbilityMap({ session: initialAssessment, studentId, subjectId });
  const goal = {
    ...learningGoal,
    currentInstructionalGrade: initialAssessment.targetGrade,
  };
  const staticCurve = createStaticLearningCurve({
    abilityMap,
    learningGoal: goal,
    statisticalBaseline,
    weeks: goal.durationWeeks,
  });
  if (staticCurve.feasibility?.status === "needs_adjustment") {
    return {
      error: "initial_learning_plan_requires_feasible_curve",
      staticCurve,
      abilityMap,
    };
  }

  const now = new Date().toISOString();
  const supportProfile = buildInitialSupportProfile({ database, studentId, subjectId });
  const learningPathVersion = existingPlan?.learningPathVersion || DEFAULT_MATH_LEARNING_PATH_VERSION;
  const learningPath = createMathLearningPath({
    behaviorEvents: database.listBehaviorEvents({ studentId, subjectId, limit: 2000 }),
    curve: staticCurve,
    families: shanghaiMathItemFamilies,
    instructionalGrade: initialAssessment.targetGrade,
    pathVersion: learningPathVersion,
    planStartedAt: practiceDate,
    practiceDate,
  });
  const todayTask = createTodayTaskFromLearningCurve({
    curve: staticCurve,
    date: practiceDate,
    focus: learningPath.focusFamilyName || "数学关系",
  });
  const confirmation = {
    confirmationId: `static-curve-confirmation-${studentId}-${subjectId}-${Date.now()}`,
    action: "static_curve_confirmed",
    actorRole: user.role,
    actorUserId: user.userId,
    confirmedAt: now,
    source: "server_initial_learning_plan_v1",
  };

  return {
    plan: {
      id: `student-plan-${studentId}-${subjectId}`,
      studentId,
      subjectId,
      status: "active",
      createdAt: existingPlan?.createdAt || now,
      updatedAt: now,
      serverAuthoritative: true,
      persistence: "server_authoritative_record",
      learningGoal: goal,
      staticCurve,
      staticCurveConfirmedAt: now,
      staticCurveConfirmation: confirmation,
      initialAssessment: assessmentSummary(initialAssessment),
      initialAbilityMap: abilityMap,
      learningPathVersion,
      learningPath,
      todayTask,
      todayQuestionQueue: {
        instructionalGrade: initialAssessment.targetGrade,
        source: "initial_assessment_instructional_grade",
      },
      supportProfile,
      taskCadence: {
        source: "server_initial_curve_plan_v1",
        planStartedAt: practiceDate,
        dailyStudyMinutes: goal.dailyStudyMinutes,
        weeklyStudyDays: goal.weeklyStudyDays,
      },
      assessmentCadence: {
        suggestedAfterPracticeDays: assessmentCadenceConfig.defaults.suggestedAfterPracticeDays,
        mandatoryAfterPracticeDays: assessmentCadenceConfig.defaults.mandatoryAfterPracticeDays,
        policyVersion: "guardian_configurable_assessment_cadence_v1",
        configuredByRole: "system",
        configuredAt: now,
        lastVerifiedPracticeDate: null,
        lastSkippedAtPracticeCount: 0,
      },
      curveProposalHistory: existingPlan?.curveProposalHistory || [],
      stageAssessmentHistory: existingPlan?.stageAssessmentHistory || [],
      dynamicCurve: existingPlan?.dynamicCurve || null,
      curveAdjustmentHistory: existingPlan?.curveAdjustmentHistory || [],
    },
    abilityMap,
    idempotent: false,
    supportProfile,
  };
}

export const initialLearningPlanAssessmentType = INITIAL_ASSESSMENT_TYPE;
