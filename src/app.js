import {
  abilityMap,
  assessmentModules,
  aiVersionProfiles,
  accountProfileSettings,
  accountRoleAssignments,
  accountUsers,
  basicBioInfo,
  behaviorAwareQuestionEngine,
  dailyTasks as demoDailyTasks,
  initialAbilityQuestionSet,
  initialLearningCurve,
  knowledgeAtlas,
  knowledgePuzzleMap as baseKnowledgePuzzleMap,
  learningGoal as initialLearningGoal,
  learningParameterConfig,
  learningPlan,
  messages,
  personalityLogicLibrary,
  peerQuestionTypeBenchmark,
  professionalAbilityAssessment,
  professionalAbilityEvidence,
  psychologicalPersonalityLibrary,
  questionLogicLibrary,
  questionLogic,
  behaviorEvents as seededBehaviorEvents,
  questions,
  reportSummary,
  roleReportConfigurations,
  settings,
  shanghaiMathItemFamilies,
  shanghaiPrimaryMathResearch,
  statisticalBaseline,
  studentProfile,
  studentGuardianLinks,
  studentTeacherLinks,
  subjectSelection,
  supportedSubjects,
} from "./data/mock-data.js?v=math-catalog-v4-2";
import { createAppState } from "./core/app-state.js?v=initial-assessment-2";
import { setText } from "./core/dom.js";
import { formatDateParts, percent } from "./core/format.js";
import { createViewRouter } from "./core/view-router.js?v=system-runtime-3";
import {
  buildAbilityMapFromRuntimeEvidence,
  generateAbilityMapFromEvidence,
} from "./services/ability-map-engine.js?v=ability-evidence-4";
import {
  assembleInitialAbilityTest,
  resolveInitialAssessmentGrade,
} from "./services/ability-test-assembly.js?v=math-logic-library-11";
import { buildAccountContext } from "./services/account-service.js?v=system-runtime-4";
import { createDailyAllocation } from "./services/daily-allocation-engine.js?v=adaptive-support-4";
import {
  createDailyQuestionQueue,
  selectVerifiedGraphSuccessorFamilies,
} from "./services/daily-question-queue-engine.js?v=daily-evidence-routing-12";
import {
  createMathLearningPath,
  DEFAULT_MATH_LEARNING_PATH_VERSION,
  LEGACY_MATH_LEARNING_PATH_VERSION,
} from "./services/math-learning-path-engine.js?v=learning-path-6";
import { createStaticLearningCurve, createTodayTaskFromLearningCurve } from "./services/learning-curve-engine.js?v=static-curve-feasibility-3";
import { createAdjustedDynamicCurve } from "./services/dynamic-learning-curve-engine.js?v=student-curve-adjustment-3";
import { createSameFamilyHarderVariantSequence } from "./services/challenge-variant-policy.js?v=challenge-variant-policy-10";
import { createLearningParameterRuntime } from "./services/learning-parameter-service.js?v=system-runtime-16";
import {
  createMathLearningGoalDraft,
  getMathLearningGoalOptions,
} from "./services/math-learning-goal-runtime.js?v=learning-goal-runtime-2";
import { createOnboardingEvidence } from "./services/onboarding-evidence-engine.js?v=initial-assessment-1";
import {
  generatePersonalityQuestionSets,
  scorePersonalityQuestionSets,
} from "./services/personality-assessment-engine.js?v=personality-runtime-5";
import { createAssessmentSessionRepository } from "./services/assessment-session-repository.js?v=system-runtime-36";
import { analyzeLearningBehavior } from "./services/behavior-analysis-engine.js?v=behavior-analysis-6";
import { buildAdaptiveSupportProfile } from "./services/adaptive-support-profile-engine.js?v=adaptive-support-8";
import { createBehaviorEventRepository } from "./services/behavior-event-repository.js?v=trusted-answer-events-3";
import { createEngagementSessionTracker } from "./services/engagement-session-engine.js?v=engagement-session-1";
import { summarizeLearningEvidence } from "./services/learning-evidence-engine.js?v=learning-evidence-33";
import { buildLearningReport } from "./services/learning-report-engine.js?v=learning-report-6";
import { createLearningReportRepository } from "./services/learning-report-repository.js?v=server-report-1";
import { createQuestionTypeBenchmarkRepository } from "./services/question-type-benchmark-repository.js?v=peer-question-benchmark-2";
import { createKnowledgeAtlasRepository } from "./services/knowledge-atlas-repository.js?v=server-knowledge-atlas-1";
import { createKnowledgeGraphRepository } from "./services/knowledge-graph-repository.js?v=knowledge-graph-1";
import { buildStudentKnowledgeGraph } from "./services/student-knowledge-graph-engine.js?v=student-knowledge-graph-1";
import { summarizeMathKnowledgeAtlas } from "./services/math-atlas-projection.js?v=math-atlas-projection-2";
import { createKnowledgeAtlasExplorationRepository } from "./services/knowledge-atlas-exploration-repository.js?v=local-remote-gate-1";
import { createAtlasPracticeResumeRepository } from "./services/atlas-practice-resume-repository.js?v=atlas-practice-resume-1";
import { buildKnowledgePuzzleMap } from "./services/knowledge-atlas-evidence-engine.js?v=knowledge-evidence-6";
import { createStudentPlanRepository } from "./services/student-plan-repository.js?v=initial-learning-plan-1";
import { createDailyPracticeSessionRepository } from "./services/daily-practice-session-repository.js?v=system-runtime-1";
import { createDailyPracticePlanRepository } from "./services/daily-practice-plan-repository.js?v=mandatory-stage-gate-1";
import { createDailyPracticeRunRepository } from "./services/daily-practice-run-repository.js?v=mandatory-stage-gate-3";
import { createStudentPreferenceRepository } from "./services/student-preference-repository.js?v=student-preferences-3";
import { createStudentMessageRepository } from "./services/student-message-repository.js?v=local-remote-gate-1";
import { createStudentOnboardingPrefillRepository } from "./services/student-onboarding-prefill-repository.js?v=onboarding-prefill-4";
import { createStudentLearningGoalDraftRepository } from "./services/student-learning-goal-draft-repository.js?v=learning-goal-draft-1";
import {
  getOnboardingPrefillOptions,
  isCompleteOnboardingPrefill,
  isOnboardingSubjectConfirmed,
  normalizeOnboardingPrefillDraft,
  resolveOnboardingPrefill,
} from "./services/student-onboarding-prefill-model.js?v=subject-selection-1";
import { createTaskCadence } from "./services/task-cadence-engine.js?v=task-cadence-1";
import { createAssessmentCadence } from "./services/assessment-cadence-engine.js?v=test-entry-routes-1";
import { createMathLevelDefinition } from "./services/level-attainment-engine.js?v=level-attainment-2";
import { assembleStageAssessment } from "./services/stage-assessment-assembly.js?v=math-logic-library-11";
import { createStageAssessmentRunRepository } from "./services/stage-assessment-run-repository.js?v=stage-assessment-run-1";
import { createInitialAssessmentRunRepository } from "./services/initial-assessment-run-repository.js?v=initial-assessment-run-2";
import { createInitialLearningPlanRepository } from "./services/initial-learning-plan-repository.js?v=initial-learning-plan-1";
import { createPersonalityAssessmentRunRepository } from "./services/personality-assessment-run-repository.js?v=personality-assessment-run-1";
import {
  createStageAssessmentRun,
  finalizeStageAssessmentRun,
  recordStageAssessmentResponse,
} from "./services/stage-assessment-runtime.js?v=assessment-answer-input-2";
import {
  generateMathQuestionCandidate,
  validateMathQuestionCandidate,
  createGeneratorComparison,
} from "./services/math-item-generator.js?v=math-help-framework-21";
import {
  createMathAnswerInput,
  formatMathAnswerValue,
  mathAnswerValuesMatch,
  normalizeMathAnswerValue,
} from "./services/math-answer-input.js?v=math-answer-input-fraction-1";
import { createQuestionDeliveryRepository } from "./services/question-delivery-repository.js?v=local-remote-gate-1";
import { createQuestionSourceContract } from "./services/question-source.js?v=system-runtime-54";
import {
  createReportConfigRuntime,
  summarizeRoleReportConfigs,
} from "./services/report-config-service.js?v=system-runtime-10";
import { renderBehaviorSummary as renderBehaviorSummaryView } from "./modules/behavior-report.js?v=student-copy-1";
import {
  appendGeneratedExtraPractice,
  createDailyPracticePlan,
  createGeneratedPracticeQuestion,
  getQuestionFromPracticePlan,
} from "./modules/daily-practice-engine.js?v=atlas-local-practice-1";
import { renderHomeView } from "./modules/home-view.js?v=home-focus-1";
import { renderInitialAbilityResult } from "./modules/ability-result.js?v=ability-map-visual-2";
import { renderHomeKnowledgePuzzle, renderKnowledgeAtlasPage, renderKnowledgePuzzle } from "./modules/knowledge-atlas.js?v=local-exploration-1";
import { renderOnboardingAssessment } from "./modules/onboarding-assessment.js?v=onboarding-ability-result-1";
import { renderOnboardingFlow } from "./modules/onboarding-flow-view.js?v=onboarding-order-4";
import { createPracticeRuntime } from "./modules/practice-runtime.js?v=practice-runtime-41";
import { renderPracticeSummary as renderPracticeSummaryView } from "./modules/practice-summary.js?v=support-presentation-1";
import {
  renderHintStack,
  renderPreviousAttempt,
  renderQuestionView,
  renderSupportModes,
} from "./modules/practice-view.js?v=support-presentation-1";
import { renderReportDashboard } from "./modules/report-dashboard.js?v=knowledge-coverage-1";
import { renderSystemFoundation } from "./modules/system-foundation-view.js?v=math-logic-library-1";
import { renderStageAssessment } from "./modules/stage-assessment-view.js?v=stage-answer-input-2";
import { renderStudentSettings, updateStudentProfileTrigger } from "./modules/student-settings.js?v=student-preferences-4";
import {
  createStudentOnboardingBaseline,
  resolveStudentRuntimeIdentity,
} from "./services/student-runtime-identity.js?v=student-identity-2";
import { isLocalStudentDemo } from "./services/local-demo-entry-policy.js?v=demo-entry-policy-1";
import { resolveRuntimePracticeDate } from "./services/runtime-practice-date.js?v=runtime-practice-date-1";

const activeStudentBootstrap = globalThis.__AI_EDUCATION_ACTIVE_STUDENT__ || null;
const runtimeSearchParams = new URLSearchParams(globalThis.location?.search || "");
const isLocalFreshOnboardingDemo = isLocalStudentDemo();

function createLocalDemoSessionId() {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLocalDemoSessionId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 48);
}

let localDemoSessionId = normalizeLocalDemoSessionId(runtimeSearchParams.get("session"));
if (isLocalFreshOnboardingDemo && !localDemoSessionId) {
  localDemoSessionId = createLocalDemoSessionId();
  runtimeSearchParams.set("session", localDemoSessionId);
  const nextSearch = runtimeSearchParams.toString();
  globalThis.history?.replaceState?.(null, "", `${globalThis.location.pathname}?${nextSearch}${globalThis.location.hash || ""}`);
}

const activeStudentIdentity = resolveStudentRuntimeIdentity({
  bootstrap: activeStudentBootstrap,
  fallbackStudentId: isLocalFreshOnboardingDemo ? `student-onboarding-${localDemoSessionId}` : undefined,
});
const hasAuthenticatedStudentIdentity = activeStudentIdentity.authenticated;
const runtimeBasicBioInfo = createStudentOnboardingBaseline({
  identity: activeStudentIdentity,
  demoBio: isLocalFreshOnboardingDemo ? { isBlankOnboardingBaseline: true } : basicBioInfo,
});

if (hasAuthenticatedStudentIdentity) {
  const resolvedStudentId = activeStudentIdentity.studentId;
  const resolvedDisplayName = activeStudentIdentity.displayName;
  Object.assign(studentProfile, {
    id: resolvedStudentId,
    name: resolvedDisplayName,
    goal: "完成数学起点测试",
    currentLevel: 0,
    streakDays: 0,
    strengths: [],
    weaknesses: [],
    behaviorTags: [],
    currentSuggestion: "先看清题目，再慢慢作答。",
  });
  Object.assign(settings, {
    studentId: resolvedStudentId,
    displayName: resolvedDisplayName,
    avatarUrl: null,
  });
}

if (isLocalFreshOnboardingDemo) {
  Object.assign(studentProfile, {
    id: activeStudentIdentity.studentId,
    name: "新同学",
    goal: "先完成数学起点测试",
    currentLevel: 0,
    streakDays: 0,
    strengths: [],
    weaknesses: [],
    behaviorTags: [],
    currentSuggestion: "先慢慢回答，系统会从这里认识你。",
  });
  Object.assign(settings, {
    studentId: activeStudentIdentity.studentId,
    displayName: "新同学",
    avatarUrl: null,
  });
}

const useDemoSeedData = activeStudentIdentity.useDemoSeedData;
const shouldSeedDemoHistory = useDemoSeedData && !isLocalFreshOnboardingDemo;
const dailyTasks = {
  ...demoDailyTasks,
  date: resolveRuntimePracticeDate({
    demoDate: demoDailyTasks.date,
    useDemoSeedData: shouldSeedDemoHistory,
  }),
};

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const title = document.querySelector("#view-title");
const targetButtons = document.querySelectorAll("[data-view-target]");
let generatedAbilityMap = generateAbilityMapFromEvidence({
  assessment: professionalAbilityAssessment,
  evidenceItems: shouldSeedDemoHistory ? professionalAbilityEvidence : [],
  studentId: studentProfile.id,
  subjectId: subjectSelection.subjectId,
});
let runtimeAbilityMap = generatedAbilityMap;
let activeLearningGoal = createMathLearningGoalDraft({ existingGoal: initialLearningGoal });
let generatedStaticCurve = createStaticLearningCurve({
  abilityMap: generatedAbilityMap,
  learningGoal: activeLearningGoal,
  statisticalBaseline,
  weeks: activeLearningGoal.durationWeeks,
});
let generatedTodayTask = createTodayTaskFromLearningCurve({
  curve: generatedStaticCurve,
  date: dailyTasks.date,
  focus: dailyTasks.focus,
});
let generatedDailyAllocation = createDailyAllocation({
  generatedTodayTask,
  behaviorSummary: {
    wrongRate: 0.28,
    hintDepthAverage: 1.8,
    variantTransferRate: generatedAbilityMap.dimensions.find((dimension) => dimension.id === "transfer")?.score || 0.5,
  },
});
let nextPracticeAllocation = generatedDailyAllocation;
let nextPracticeQueue = null;
const generatorComparison = createGeneratorComparison({
  aiVersionProfiles,
  families: shanghaiMathItemFamilies,
});
let generatedInitialAbilityTest = null;
let activeInitialAssessment = null;
let initialAssessmentRunStarting = false;
let initialAssessmentStartAttempted = false;
let initialAssessmentError = "";
let initialAbilityQuestionStartedAt = Date.now();
let activePersonalityAssessment = null;
let personalityAssessmentRunStarting = false;
let personalityAssessmentStartAttempted = false;
let personalityAssessmentError = "";
let personalityQuestionStartedAt = Date.now();

function getDailyInstructionalGrade() {
  return (
    activeInitialAssessment?.targetGrade ||
    generatedInitialAbilityTest?.routing?.targetGrade ||
    resolveInitialAssessmentGrade({
      gradeLabel: runtimeBasicBioInfo.grade,
      fallbackGrade: activeLearningGoal.targetGrade || "G6",
    })
  );
}

function getInstructionalGradeFamilies(instructionalGrade = getDailyInstructionalGrade()) {
  const eligibleFamilies = shanghaiMathItemFamilies.filter((family) => family.gradeBands.includes(instructionalGrade));
  return eligibleFamilies.length ? eligibleFamilies : shanghaiMathItemFamilies;
}

function resolveActiveGeneratedQuestionFamily({
  instructionalGrade = getDailyInstructionalGrade(),
  preferredFamilyId = null,
} = {}) {
  const eligibleFamilies = getInstructionalGradeFamilies(instructionalGrade);
  const preferred = eligibleFamilies.find((family) => family.id === preferredFamilyId);
  if (preferred) return preferred;
  return eligibleFamilies[0] || shanghaiMathItemFamilies[0];
}

let activeGeneratedQuestionFamily = resolveActiveGeneratedQuestionFamily();

function refreshActiveGeneratedQuestionFamily({ preferredFamilyId = null } = {}) {
  activeGeneratedQuestionFamily = resolveActiveGeneratedQuestionFamily({ preferredFamilyId });
  return activeGeneratedQuestionFamily;
}

function createGeneratedPracticeCandidates({ aiVersion = "semi_ai", queueItem = null } = {}) {
  const instructionalGrade = getDailyInstructionalGrade();
  const eligibleFamilies = getInstructionalGradeFamilies(instructionalGrade);
  const family =
    eligibleFamilies.find((item) => item.id === queueItem?.familyId) ||
    resolveActiveGeneratedQuestionFamily({
      instructionalGrade,
      preferredFamilyId: activeGeneratedQuestionFamily.id,
    });
  const seed = Number.isFinite(Number(queueItem?.seed)) ? Number(queueItem.seed) : 0;

  return ["original", "change_one_number", "change_two_numbers"]
    .map((variantLevel) =>
      validateMathQuestionCandidate(
        generateMathQuestionCandidate({
        aiVersion,
        family,
        seed,
        instructionalGrade,
        variantLevel,
        }),
      ),
    )
    .filter((candidate) => candidate.qualityStatus === "system_validated");
}

function createGeneratedPracticeCandidateUnits({ aiVersion = "semi_ai", questionQueue = null } = {}) {
  const queueItems = questionQueue?.items?.length ? questionQueue.items : [null];
  return queueItems.map((queueItem) => ({
    queueItem,
    candidates: createGeneratedPracticeCandidates({ aiVersion, queueItem }),
  }));
}

let generatedPracticeCandidates = createGeneratedPracticeCandidates();
generatedInitialAbilityTest = assembleInitialAbilityTest({
  aiVersion: "semi_ai",
  families: shanghaiMathItemFamilies,
  maxQuestions: 8,
  subjectId: "math",
  targetGrade: resolveInitialAssessmentGrade({ gradeLabel: runtimeBasicBioInfo.grade }),
});
function getPersonalityQuestionSets() {
  if (activePersonalityAssessment?.serverAuthoritative) {
    const questions = activePersonalityAssessment.presentationQuestions || [];
    return {
      psychologicalQuestions: questions.filter((question) => question.step === "psychological_personality"),
      learningQuestions: questions.filter((question) => question.step === "learning_personality"),
    };
  }
  return generatePersonalityQuestionSets({
    studentId: studentProfile.id,
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
}

function getPersonalityResult(responses = appState.getSnapshot().onboardingResponses) {
  if (activePersonalityAssessment?.serverAuthoritative && activePersonalityAssessment.result) {
    return activePersonalityAssessment.result;
  }
  return scorePersonalityQuestionSets({
    questionSets: getPersonalityQuestionSets(),
    responses,
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
}

function resolveInitialPersonalitySupportProfile(responses = []) {
  return getPersonalityResult(responses).supportProfile;
}

function getPersonalityAssessmentPrerequisites() {
  return {
    ready:
      onboardingPrefill?.confirmationStatus === "student_confirmed" &&
      isCompleteOnboardingPrefill(onboardingPrefill),
  };
}

function shouldPrepareRemotePersonalityAssessment() {
  return Boolean(
    hasAuthenticatedStudentIdentity &&
      personalityAssessmentRunRepository?.remoteAvailable?.() &&
      getPersonalityAssessmentPrerequisites().ready,
  );
}

async function ensurePersonalityAssessmentRun({ force = false } = {}) {
  if (
    !getPersonalityAssessmentPrerequisites().ready ||
    personalityAssessmentRunStarting ||
    (!force && personalityAssessmentStartAttempted) ||
    !hasAuthenticatedStudentIdentity ||
    !personalityAssessmentRunRepository.remoteAvailable() ||
    activePersonalityAssessment?.serverAuthoritative
  ) {
    return;
  }

  personalityAssessmentRunStarting = true;
  personalityAssessmentError = "";
  const remoteRun = await personalityAssessmentRunRepository.start({
    runRequest: {
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    },
  });
  personalityAssessmentRunStarting = false;
  personalityAssessmentStartAttempted = true;
  if (!remoteRun?.session) {
    if (hasAuthenticatedStudentIdentity) {
      personalityAssessmentError = "暂时无法准备这组问题，请检查连接后重试。";
      renderInitialData();
    }
    return;
  }

  activePersonalityAssessment = remoteRun.session;
  personalityAssessmentError = "";
  restoreServerPersonalityAssessmentResponses(activePersonalityAssessment);
  personalityQuestionStartedAt = Date.now();
  refreshPersonalizationFromOnboardingResponses();
  renderInitialData();
}

function getInitialAssessmentPrerequisites() {
  const responses = appState.getSnapshot().onboardingResponses;
  const personalityResult = getPersonalityResult(responses);
  return {
    ready:
      onboardingPrefill?.confirmationStatus === "student_confirmed" &&
      isCompleteOnboardingPrefill(onboardingPrefill) &&
      isOnboardingSubjectConfirmed(onboardingPrefill, "math") &&
      personalityResult.complete,
    targetGrade: resolveInitialAssessmentGrade({
      gradeLevelOptionId: resolvedOnboardingPrefill?.basicInfo?.gradeLevelOptionId,
      gradeLabel: resolvedBasicBioInfo?.grade,
    }),
  };
}

function shouldPrepareRemoteInitialAssessment() {
  return Boolean(
    hasAuthenticatedStudentIdentity &&
      initialAssessmentRunRepository?.remoteAvailable?.() &&
      getInitialAssessmentPrerequisites().ready,
  );
}

function getInitialAbilityQuestionSet() {
  if (activeInitialAssessment?.serverAuthoritative) return activeInitialAssessment.presentationQuestions || [];
  if (shouldPrepareRemoteInitialAssessment()) return [];
  return generatedInitialAbilityTest?.questions || [];
}

function getAuthoritativeInitialAbilityMap() {
  if (activeInitialAssessment?.serverAuthoritative && activeInitialAssessment.result?.abilityMap?.serverAuthoritative) {
    return activeInitialAssessment.result.abilityMap;
  }
  if (activeStudentPlan?.serverAuthoritative && activeStudentPlan.initialAbilityMap?.serverAuthoritative) {
    return activeStudentPlan.initialAbilityMap;
  }
  return null;
}

function resolvePersonalitySupportProfile(responses = [], behaviorEvents = []) {
  return buildAdaptiveSupportProfile({
    initialProfile: resolveInitialPersonalitySupportProfile(responses),
    behaviorEvents,
  });
}

function getOnboardingReadiness() {
  const responses = appState.getSnapshot().onboardingResponses;
  const personalityResult = getPersonalityResult(responses);
  const initialAbilityQuestions = getInitialAbilityQuestionSet();
  const abilityTestComplete =
    initialAbilityQuestions.length > 0 &&
    initialAbilityQuestions.every((question) =>
      responses.some((response) => response.step === "ability_test" && response.questionId === question.id),
    );
  const basicInfoConfirmed =
    onboardingPrefill?.confirmationStatus === "student_confirmed" && isCompleteOnboardingPrefill(onboardingPrefill);
  const subjectSelected = isOnboardingSubjectConfirmed(onboardingPrefill, "math");
  const goalOptions = getMathLearningGoalOptions();
  const targetSelected = goalOptions.targets.some((target) => target.targetGrade === activeLearningGoal.targetGrade);
  const rhythmSelected =
    goalOptions.rhythm.durationWeeks.includes(activeLearningGoal.durationWeeks) &&
    goalOptions.rhythm.dailyStudyMinutes.includes(activeLearningGoal.dailyStudyMinutes) &&
    goalOptions.rhythm.weeklyStudyDays.includes(activeLearningGoal.weeklyStudyDays);
  const learningGoalConfirmed = Boolean(
    activeStudentPlan?.staticCurveConfirmedAt || learningGoalDraft?.confirmationStatus === "student_confirmed",
  );
  const curveReady =
    generatedStaticCurve.progressCurve.length > 0 &&
    generatedStaticCurve.feasibility?.status !== "needs_adjustment";
  const stepReadiness = {
    basic_info: {
      complete: basicInfoConfirmed,
      blockerCopy: "先确认基本信息，系统才能匹配合适的测试起点。",
    },
    psychological_personality: {
      complete: personalityResult.psychologicalComplete,
      blockerCopy: "先完成这一组轻量心理性格小问答。",
    },
    learning_personality: {
      complete: personalityResult.learningComplete,
      blockerCopy: "再完成学习性格小问答，系统才会进入学科测试。",
    },
    subject_selection: {
      complete: subjectSelected,
      blockerCopy: "先选择数学，系统才能准备对应的起点测试。",
    },
    ability_test: {
      complete: abilityTestComplete,
      blockerCopy: "先完成数学起点测试，系统才能知道从哪里开始。",
    },
    ability_map: {
      complete: abilityTestComplete,
      blockerCopy: "等待数学起点测试完成后生成能力图。",
    },
    goal: {
      complete: learningGoalConfirmed,
      canAdvance: targetSelected,
      blockerCopy: "先确定想达到的数学水平。",
    },
    rhythm: {
      complete: learningGoalConfirmed,
      canAdvance: rhythmSelected,
      blockerCopy: "先选择学习周期、每天时长和每周频率。",
    },
    static_curve: {
      complete: curveReady,
      blockerCopy:
        generatedStaticCurve.feasibility?.status === "needs_adjustment"
          ? "这条曲线还不够可执行；先调整目标或学习节奏，再确认。"
          : "目标和学习节奏确认后，系统才能生成可执行的静态曲线。",
    },
  };
  const orderedSteps = [
    "basic_info",
    "psychological_personality",
    "learning_personality",
    "subject_selection",
    "ability_test",
    "ability_map",
    "goal",
    "rhythm",
    "static_curve",
  ];
  const unlockedSteps = [orderedSteps[0]];
  for (let index = 1; index < orderedSteps.length; index += 1) {
    const previousStep = orderedSteps[index - 1];
    if (!stepReadiness[previousStep].complete) break;
    unlockedSteps.push(orderedSteps[index]);
  }
  const currentStep = appState.getSnapshot().onboardingStep;
  return {
    canAdvance: Boolean(stepReadiness[currentStep]?.canAdvance ?? stepReadiness[currentStep]?.complete),
    currentBlockerCopy: stepReadiness[currentStep]?.blockerCopy || "请先完成当前步骤。",
    stepReadiness,
    unlockedSteps,
  };
}

function restoreOnboardingProgress() {
  const readiness = getOnboardingReadiness();
  const steps = appState.getSnapshot().onboardingSteps;
  const staticCurveConfirmed = Boolean(activeStudentPlan?.staticCurveConfirmedAt);
  const completedSteps = staticCurveConfirmed
    ? steps
    : steps.filter((step) => step !== "static_curve" && readiness.stepReadiness[step]?.complete);
  const currentStep = staticCurveConfirmed
    ? "static_curve"
    : steps.find((step) => !completedSteps.includes(step)) || "static_curve";

  appState.restoreOnboardingProgress({
    completedSteps,
    currentStep,
    staticCurveConfirmed,
  });
}

let generatedSupportProfile = resolvePersonalitySupportProfile();
const accountContext = buildAccountContext({
  accountProfileSettings,
  accountRoleAssignments,
  accountUsers,
  selectedStudentUserId: "user-student-001",
  studentGuardianLinks,
  studentTeacherLinks,
});
const roleReportConfigSummary = summarizeRoleReportConfigs(roleReportConfigurations);
const reportConfigRuntime = createReportConfigRuntime(roleReportConfigurations);
const learningParameterRuntime = createLearningParameterRuntime(learningParameterConfig);
const assessmentSessionRepository = createAssessmentSessionRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
  allowRemoteMirror: !hasAuthenticatedStudentIdentity,
});
const restoredAssessmentSession = hasAuthenticatedStudentIdentity
  ? null
  : assessmentSessionRepository.findLatest({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    });
const restoredPersonalitySession = hasAuthenticatedStudentIdentity
  ? null
  : assessmentSessionRepository.findLatest({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      assessmentType: "onboarding_personality",
    });
if (restoredPersonalitySession?.serverAuthoritative && restoredPersonalitySession.assessmentType === "onboarding_personality") {
  activePersonalityAssessment = restoredPersonalitySession;
}
if (restoredAssessmentSession?.serverAuthoritative && restoredAssessmentSession.assessmentType === "initial_onboarding") {
  activeInitialAssessment = restoredAssessmentSession;
}
let activeStageAssessment = hasAuthenticatedStudentIdentity
  ? null
  : assessmentSessionRepository.findLatest({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      assessmentType: "stage_test",
    });
let stageQuestionStartedAt = Date.now();
let stageAssessmentError = null;
let curveAdjustmentDraft = null;
let curveAdjustmentError = null;
let staticCurveConfirming = false;
let staticCurveSaveError = "";
const studentPlanRepository = createStudentPlanRepository();
const behaviorEventRepository = createBehaviorEventRepository();
const dailyPracticeSessionRepository = createDailyPracticeSessionRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
  allowRemoteMirror: !hasAuthenticatedStudentIdentity,
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const dailyPracticePlanRepository = createDailyPracticePlanRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const dailyPracticeRunRepository = createDailyPracticeRunRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const learningReportRepository = createLearningReportRepository();
const questionTypeBenchmarkRepository = createQuestionTypeBenchmarkRepository();
const knowledgeAtlasRepository = createKnowledgeAtlasRepository();
const knowledgeGraphRepository = createKnowledgeGraphRepository();
const knowledgeAtlasExplorationRepository = createKnowledgeAtlasExplorationRepository({
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const atlasPracticeResumeRepository = createAtlasPracticeResumeRepository();
const studentPreferenceRepository = createStudentPreferenceRepository();
const studentMessageRepository = createStudentMessageRepository({
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const onboardingPrefillRepository = createStudentOnboardingPrefillRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
});
const learningGoalDraftRepository = createStudentLearningGoalDraftRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
});
const questionDeliveryRepository = createQuestionDeliveryRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const stageAssessmentRunRepository = createStageAssessmentRunRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
});
const initialAssessmentRunRepository = createInitialAssessmentRunRepository({
  allowLocalFallback: !hasAuthenticatedStudentIdentity,
});
const initialLearningPlanRepository = createInitialLearningPlanRepository({
  remoteEnabled: hasAuthenticatedStudentIdentity,
});
const personalityAssessmentRunRepository = createPersonalityAssessmentRunRepository();
const onboardingPrefillOptions = getOnboardingPrefillOptions();
const restoredBehaviorEvents = behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId);
generatedSupportProfile = resolvePersonalitySupportProfile(
  [...(restoredPersonalitySession?.responses || []), ...(restoredAssessmentSession?.responses || [])],
  restoredBehaviorEvents,
);
let onboardingPrefill = onboardingPrefillRepository.find(studentProfile.id);
let learningGoalDraft = learningGoalDraftRepository.find({
  studentId: studentProfile.id,
  subjectId: subjectSelection.subjectId,
});
let basicInfoEditing = false;
let basicInfoSaveError = "";
let basicInfoSaving = false;
let basicInfoDraftOverride = null;
let subjectSelectionSaving = false;
let subjectSelectionError = "";
let resolvedOnboardingPrefill = resolveOnboardingPrefill({
  studentId: studentProfile.id,
  basicBioInfo: runtimeBasicBioInfo,
  prefill: onboardingPrefill,
});
let resolvedBasicBioInfo = resolvedOnboardingPrefill.bio;
refreshInitialAbilityTestForBasicInfo();
let activeStudentPlan = studentPlanRepository.findLatest(studentProfile.id, subjectSelection.subjectId);
const initialStoredLearningGoal = activeStudentPlan?.learningGoal || learningGoalDraft?.learningGoal;
if (initialStoredLearningGoal) {
  activeLearningGoal = createMathLearningGoalDraft({ existingGoal: initialStoredLearningGoal });
  const calculatedStaticCurve = createStaticLearningCurve({
    abilityMap: generatedAbilityMap,
    learningGoal: activeLearningGoal,
    statisticalBaseline,
    weeks: activeLearningGoal.durationWeeks,
  });
  generatedStaticCurve =
    activeStudentPlan?.serverAuthoritative && activeStudentPlan.staticCurve
      ? activeStudentPlan.staticCurve
      : calculatedStaticCurve;
  generatedTodayTask = createTodayTaskFromLearningCurve({
    curve: generatedStaticCurve,
    date: dailyTasks.date,
    focus: dailyTasks.focus,
  });
  generatedDailyAllocation = createDailyAllocation({
    generatedTodayTask,
    behaviorSummary: {
      wrongRate: 0.28,
      hintDepthAverage: 1.8,
      variantTransferRate: generatedAbilityMap.dimensions.find((dimension) => dimension.id === "transfer")?.score || 0.5,
    },
    supportProfile: generatedSupportProfile,
  });
}
let activeDailyPracticeSession = dailyPracticeSessionRepository.find({
  studentId: studentProfile.id,
  subjectId: subjectSelection.subjectId,
  practiceDate: normalizePracticeDate(dailyTasks.date),
});
let serverDailyPracticePlan = null;
let serverDailyPracticeRun = null;
let serverDailyPracticeSummary = null;
let serverPracticeGate = null;
let serverLearningReport = null;
let serverQuestionTypeBenchmark = null;
let serverQuestionTypeBenchmarkFamilyId = null;
let questionTypeBenchmarkRequestFamilyId = null;
let questionTypeBenchmarkResolvedFamilyId = null;
let serverKnowledgePuzzleMap = null;
let serverKnowledgeGraph = null;
let runtimeKnowledgeGraph = null;
let activeMathLearningPath = null;
let taskCadence = null;
let stageTestCadence = null;
let practicePlan = createDailyPracticePlan({
  allocation: generatedDailyAllocation,
  behaviorAwareQuestionEngine,
  dailyTasks,
  generatedCandidates: generatedPracticeCandidates,
  generatedTodayTask,
  initialLearningCurve,
  questionLogic,
  questions,
});
const appState = createAppState({
  aiVersionProfiles,
  initialAiVersion: "semi_ai",
  initialOnboardingResponses: [
    ...(restoredPersonalitySession?.responses || []),
    ...(restoredAssessmentSession?.responses || []),
  ],
  studentProfile,
});
const baseQuestion = practicePlan.baseQuestion;
let practiceSequence = practicePlan.practiceSequence;
let currentQuestionIndex = 0;
let activeAtlasExploration = null;
let activeQuestion = getCurrentQuestion();
let canAdvanceQuestion = false;
let revealedHints = 0;
let guidedStepIndex = 0;
let practiceDetailsVisible = false;
let practiceSummaryOfferTrackedForRunId = null;
let requiredPracticeCompleted = false;
let optionalPracticeActive = false;
let studentSettingsOpen = false;
let studentSettingsDraft = null;
let studentSettingsSaveState = "";
let entryViewResolved = false;
let studentPreferences = {
  studentId: studentProfile.id,
  displayName: settings.displayName || studentProfile.name,
  avatarDataUrl: settings.avatarUrl || null,
  pageStyle: "warm",
  informationDensity: "relaxed",
};
let studentMessages = shouldSeedDemoHistory
  ? messages.map((message) => ({ ...message, studentId: message.toStudentId || studentProfile.id }))
  : studentMessageRepository.list(studentProfile.id);
let runtimeKnowledgePuzzleMap = null;

function normalizePracticeDate(date) {
  const normalized = String(date || "").replace(/\./g, "-");
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toISOString().slice(0, 10);
}

function getNextPracticeDate(date) {
  const normalized = normalizePracticeDate(date);
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return `${normalized}-next`;
  parsed.setDate(parsed.getDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function getDailyPracticeSessionId() {
  return `daily-practice-session-${studentProfile.id}-${subjectSelection.subjectId}-${normalizePracticeDate(dailyTasks.date)}`;
}

function refreshTaskCadence({ persistPlan = false } = {}) {
  taskCadence = createTaskCadence({
    today: normalizePracticeDate(dailyTasks.date),
    sessions: dailyPracticeSessionRepository.listByStudent({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    }),
    weeklyStudyDays: activeLearningGoal.weeklyStudyDays,
    focus: generatedTodayTask?.focus || dailyTasks.focus,
    estimatedMinutes: generatedTodayTask?.estimatedMinutes || dailyTasks.estimatedMinutes,
    planStartedAt: activeStudentPlan?.taskCadence?.planStartedAt || activeStudentPlan?.todayTask?.date || dailyTasks.date,
  });

  if (persistPlan && activeStudentPlan) {
    const updatedPlan = studentPlanRepository.updateTaskCadence({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      taskCadence,
    });
    if (updatedPlan) activeStudentPlan = updatedPlan;
  }

  return taskCadence;
}

function getAssessmentCadenceSettings() {
  const defaults = initialLearningCurve.updatePolicy?.assessmentCadence || {};
  return {
    ...defaults,
    ...(activeStudentPlan?.assessmentCadence || {}),
  };
}

function refreshStageTestCadence() {
  const localCadence = createAssessmentCadence({
    sessions: dailyPracticeSessionRepository.listByStudent({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    }),
    stageAssessmentHistory: activeStudentPlan?.stageAssessmentHistory || [],
    config: getAssessmentCadenceSettings(),
    today: normalizePracticeDate(dailyTasks.date),
  });
  const serverCadence = serverPracticeGate?.assessmentCadence;
  stageTestCadence =
    serverCadence?.status === "mandatory"
      ? {
          ...localCadence,
          ...serverCadence,
          status: "mandatory",
          canStart: true,
          canSkip: false,
        }
      : localCadence;
  return stageTestCadence;
}

function createInitialAssessmentCadence() {
  const settings = getAssessmentCadenceSettings();
  return {
    suggestedAfterPracticeDays: Number(settings.suggestedAfterPracticeDays) || 3,
    mandatoryAfterPracticeDays: Number(settings.mandatoryAfterPracticeDays) || 10,
    configuredByRole: "system",
    configuredAt: new Date().toISOString(),
    lastVerifiedPracticeDate: null,
    lastSkippedAtPracticeCount: 0,
  };
}

function persistDailyPracticeSession() {
  const sessionQuestion = activeAtlasExploration
    ? getQuestionFromPracticePlan(practicePlan, currentQuestionIndex)
    : activeQuestion;
  activeDailyPracticeSession = dailyPracticeSessionRepository.save({
    id: activeDailyPracticeSession?.id || getDailyPracticeSessionId(),
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    practiceDate: normalizePracticeDate(dailyTasks.date),
    sessionStatus: requiredPracticeCompleted ? "required_completed" : optionalPracticeActive ? "optional_practice" : "in_progress",
    currentQuestionIndex,
    currentQuestionId: sessionQuestion?.id || null,
    requiredPracticeCompleted,
    optionalPracticeActive,
    recoveredTaskDate:
      activeDailyPracticeSession?.recoveredTaskDate || taskCadence?.makeUpTask?.date || null,
    practiceDetailsVisible,
    revealedHints,
    guidedStepIndex,
    mandatorySequenceLength: practicePlan.queueUnitCount * 3,
    questionQueueId: practicePlan.questionQueue?.id || null,
    serverPracticeRunId: serverDailyPracticeRun?.id || null,
    serverPracticeRunStatus: serverDailyPracticeRun?.status || null,
    practiceSummaryItems: getPracticeSummary().items,
    practiceSequence: practicePlan.practiceSequence.map(toPersistedPracticeSequenceItem),
  });
  refreshTaskCadence({ persistPlan: !hasAuthenticatedStudentIdentity });
  refreshStageTestCadence();
  renderReportPanels();
}

function restoreDailyPracticeSession(session) {
  if (!session?.practiceSequence?.length || session.practiceDate !== normalizePracticeDate(dailyTasks.date)) return;

  const generatedSequence = practicePlan.practiceSequence;
  const restoredSequence = hasAuthenticatedStudentIdentity
    ? session.practiceSequence
    : session.practiceSequence.map((persistedQuestion) => {
        const generatedQuestion = generatedSequence.find(
          (candidate) =>
            candidate.id === persistedQuestion.id ||
            (candidate.queueItemId &&
              candidate.queueItemId === persistedQuestion.queueItemId &&
              Number(candidate.queueStageIndex) === Number(persistedQuestion.queueStageIndex)),
        );
        if (!generatedQuestion) return persistedQuestion;
        return {
          ...generatedQuestion,
          ...persistedQuestion,
          answer: generatedQuestion.answer,
          answerInput: generatedQuestion.answerInput,
          steps: generatedQuestion.steps,
          hints: generatedQuestion.hints,
          hintCount: generatedQuestion.hintCount ?? generatedQuestion.hints?.length ?? 0,
          guidedStepCount: generatedQuestion.guidedStepCount ?? generatedQuestion.guidedMode?.steps?.length ?? 0,
          solutionStrategies: generatedQuestion.solutionStrategies,
          guidedMode: generatedQuestion.guidedMode,
          generationMetadata: {
            ...generatedQuestion.generationMetadata,
            ...persistedQuestion.generationMetadata,
          },
        };
      });

  practicePlan = {
    ...practicePlan,
    practiceSequence: restoredSequence,
  };
  practiceSequence = practicePlan.practiceSequence;
  currentQuestionIndex = Math.min(Math.max(0, Number(session.currentQuestionIndex || 0)), practiceSequence.length - 1);
  activeQuestion = getCurrentQuestion();
  requiredPracticeCompleted = Boolean(session.requiredPracticeCompleted);
  optionalPracticeActive = Boolean(session.optionalPracticeActive);
  practiceDetailsVisible = Boolean(session.practiceDetailsVisible);
  revealedHints = Math.max(0, Number(session.revealedHints || 0));
  guidedStepIndex = Math.max(0, Number(session.guidedStepIndex || 0));
  canAdvanceQuestion = false;
  if (session.practiceSummaryItems?.length) {
    practiceRuntime.restoreCompletedItemsFromSummaryItems(session.practiceSummaryItems);
  }
}

function getVisibleViewId() {
  return document.querySelector(".view.active")?.id || "home";
}

function applyStudentPreferences() {
  document.documentElement.dataset.studentStyle = studentPreferences.pageStyle || "warm";
  document.documentElement.dataset.informationDensity = studentPreferences.informationDensity || "relaxed";
  updateStudentProfileTrigger({ preferences: studentPreferences });
  const homeStudentLabel = document.querySelector("#home .hero-band .label");
  if (homeStudentLabel) homeStudentLabel.textContent = `学生：${studentPreferences.displayName}`;
}

function renderStudentSettingsPanel() {
  renderStudentSettings({
    container: document.querySelector("#student-settings-layer"),
    open: studentSettingsOpen,
    preferences: studentSettingsDraft || studentPreferences,
    saveState: studentSettingsSaveState,
    onAvatarChange: async (file) => {
      if (!file || file.size > 1024 * 1024) return;
      const avatarDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result || "")));
        reader.addEventListener("error", reject);
        reader.readAsDataURL(file);
      }).catch(() => "");
      if (!avatarDataUrl) return;
      studentSettingsDraft = { ...(studentSettingsDraft || studentPreferences), avatarDataUrl };
      studentSettingsSaveState = "";
      renderStudentSettingsPanel();
    },
    onClose: () => {
      studentSettingsOpen = false;
      studentSettingsDraft = null;
      studentSettingsSaveState = "";
      renderStudentSettingsPanel();
    },
    onSave: async (nextPreferences) => {
      const candidate = {
        ...(studentSettingsDraft || studentPreferences),
        ...nextPreferences,
        studentId: studentProfile.id,
      };
      studentSettingsDraft = candidate;
      studentSettingsSaveState = "正在保存设置...";
      renderStudentSettingsPanel();
      try {
        studentPreferences = await studentPreferenceRepository.saveConfirmed(candidate);
        studentSettingsDraft = null;
        studentSettingsSaveState = "";
        studentSettingsOpen = false;
        applyStudentPreferences();
        renderStudentSettingsPanel();
      } catch {
        studentSettingsSaveState = "暂时无法保存设置，请稍后重试。";
        renderStudentSettingsPanel();
      }
    },
  });
}

function openStudentSettings() {
  studentSettingsOpen = true;
  studentSettingsDraft = { ...studentPreferences };
  studentSettingsSaveState = "";
  renderStudentSettingsPanel();
}

const practiceRuntime = createPracticeRuntime({
  baseQuestionId: baseQuestion.id,
  getDefaultTargetId: () => activeQuestion.id,
  getPage: getVisibleViewId,
  seedEvents: [...(shouldSeedDemoHistory ? seededBehaviorEvents : []), ...restoredBehaviorEvents],
  studentId: studentProfile.id,
  subjectId: subjectSelection.subjectId,
});
const engagementSessionTracker = createEngagementSessionTracker({
  initialVisible: document.visibilityState !== "hidden",
});

function refreshKnowledgePuzzleMap() {
  if (serverKnowledgePuzzleMap?.serverAuthoritative) {
    runtimeKnowledgePuzzleMap = serverKnowledgePuzzleMap;
    return runtimeKnowledgePuzzleMap;
  }
  runtimeKnowledgePuzzleMap = buildKnowledgePuzzleMap({
    baseMap: baseKnowledgePuzzleMap,
    behaviorEvents: behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId),
    assessmentResponses: appState.getSnapshot().onboardingResponses,
    abilityQuestions: getInitialAbilityQuestionSet(),
  });
  return runtimeKnowledgePuzzleMap;
}

function currentAtlasFocusFamilyId() {
  return (
    serverDailyPracticePlan?.learningPath?.focusFamilyId ||
    activeMathLearningPath?.focusFamilyId ||
    practicePlan?.activeQueueItem?.familyId ||
    activeGeneratedQuestionFamily?.id ||
    null
  );
}

function refreshRuntimeAbilityMap() {
  if (serverLearningReport?.abilityMap?.serverAuthoritative) {
    runtimeAbilityMap = serverLearningReport.abilityMap;
    return runtimeAbilityMap;
  }
  runtimeAbilityMap = buildAbilityMapFromRuntimeEvidence({
    assessment: professionalAbilityAssessment,
    assessmentResponses: appState.getSnapshot().onboardingResponses,
    abilityQuestions: getInitialAbilityQuestionSet(),
    behaviorEvents: behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId),
    initialEvidence: shouldSeedDemoHistory ? professionalAbilityEvidence : [],
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
  });
  return runtimeAbilityMap;
}

function refreshRuntimeKnowledgeGraph() {
  runtimeKnowledgeGraph =
    serverKnowledgeGraph ||
    buildStudentKnowledgeGraph({
      behaviorEvents: behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId),
      includePrototypeEvidence: !hasAuthenticatedStudentIdentity,
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    });
  return runtimeKnowledgeGraph;
}

function renderKnowledgeEvidencePanels() {
  const knowledgePuzzleMap = refreshKnowledgePuzzleMap();
  const currentFamilyId = currentAtlasFocusFamilyId();
  refreshRuntimeKnowledgeGraph();
  renderKnowledgePuzzle({ knowledgePuzzleMap, knowledgeGraph: runtimeKnowledgeGraph, currentFamilyId, percent });
  renderHomeKnowledgePuzzle({ knowledgePuzzleMap, knowledgeGraph: runtimeKnowledgeGraph, currentFamilyId, percent });
  renderKnowledgeAtlasPage({
    knowledgeAtlas,
    knowledgePuzzleMap,
    knowledgeGraph: runtimeKnowledgeGraph,
    currentFamilyId,
    onExploreFamily: startKnowledgeAtlasExploration,
    onRetryWrongQuestion: startKnowledgeAtlasWrongRetry,
  });
}

function refreshPersonalizationFromOnboardingResponses() {
  const behaviorEvents = behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId);
  const onboardingEvidence = createOnboardingEvidence({
    responses: appState.getSnapshot().onboardingResponses,
    abilityQuestions: getInitialAbilityQuestionSet(),
  });
  generatedSupportProfile = resolvePersonalitySupportProfile(appState.getSnapshot().onboardingResponses, behaviorEvents);
  generatedAbilityMap =
    getAuthoritativeInitialAbilityMap() ||
    generateAbilityMapFromEvidence({
      assessment: professionalAbilityAssessment,
      evidenceItems: [...(shouldSeedDemoHistory ? professionalAbilityEvidence : []), ...onboardingEvidence.abilityEvidence],
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    });
  refreshRuntimeAbilityMap();
  const calculatedStaticCurve = createStaticLearningCurve({
    abilityMap: generatedAbilityMap,
    learningGoal: activeLearningGoal,
    statisticalBaseline,
    weeks: activeLearningGoal.durationWeeks,
  });
  generatedStaticCurve =
    activeStudentPlan?.serverAuthoritative && activeStudentPlan.staticCurve
      ? activeStudentPlan.staticCurve
      : calculatedStaticCurve;
  const activePlanningCurve = activeStudentPlan?.dynamicCurve?.canUpdate
    ? activeStudentPlan.dynamicCurve
    : generatedStaticCurve;
  const currentPracticeDate = normalizePracticeDate(dailyTasks.date);
  const learningPath = createMathLearningPath({
    behaviorEvents,
    curve: activePlanningCurve,
    families: shanghaiMathItemFamilies,
    instructionalGrade: getDailyInstructionalGrade(),
    pathVersion:
      activeStudentPlan?.learningPathVersion ||
      activeStudentPlan?.learningPath?.version ||
      (activeStudentPlan?.serverAuthoritative ? LEGACY_MATH_LEARNING_PATH_VERSION : DEFAULT_MATH_LEARNING_PATH_VERSION),
    planStartedAt: activeStudentPlan?.taskCadence?.planStartedAt || activeStudentPlan?.staticCurveConfirmedAt,
    practiceDate: currentPracticeDate,
  });
  activeMathLearningPath = learningPath;
  refreshActiveGeneratedQuestionFamily({ preferredFamilyId: learningPath.focusFamilyId });
  const serverTask = serverDailyPracticePlan?.practiceDate === currentPracticeDate ? serverDailyPracticePlan.task : null;
  generatedTodayTask =
    serverTask ||
    (activeStudentPlan?.todayTask?.date === currentPracticeDate
      ? activeStudentPlan.todayTask
      : activeStudentPlan?.nextDynamicTask?.date === currentPracticeDate
        ? activeStudentPlan.nextDynamicTask
        : createTodayTaskFromLearningCurve({
            curve: activePlanningCurve,
            date: dailyTasks.date,
            focus: learningPath.focusFamilyName || dailyTasks.focus,
          }));
  generatedDailyAllocation = createDailyAllocation({
    generatedTodayTask,
    behaviorSummary: {
      wrongRate:
        onboardingEvidence.coverage.abilityAnswersRecorded > 0
          ? 1 - onboardingEvidence.coverage.abilityAnswersCorrect / onboardingEvidence.coverage.abilityAnswersRecorded
          : 0.28,
      hintDepthAverage: generatedSupportProfile.supportMode.hintDepthTarget,
      variantTransferRate: generatedAbilityMap.dimensions.find((dimension) => dimension.id === "transfer")?.score || 0.5,
    },
    supportProfile: generatedSupportProfile,
  });
  const storedNextAllocation = activeStudentPlan?.nextPracticeAllocation || null;
  const allocationForCurrentPlan =
    storedNextAllocation?.effectiveDate === currentPracticeDate ? storedNextAllocation : generatedDailyAllocation;
  const storedQueueForCurrentDate =
    activeStudentPlan?.todayQuestionQueue?.date === currentPracticeDate
      ? activeStudentPlan.todayQuestionQueue
      : activeStudentPlan?.nextQuestionQueue?.date === currentPracticeDate
        ? activeStudentPlan.nextQuestionQueue
        : null;
  const instructionalGrade = getDailyInstructionalGrade();
  const storedQueueMatchesInstructionalGrade =
    storedQueueForCurrentDate?.instructionalGrade === instructionalGrade &&
    storedQueueForCurrentDate.items?.every((item) =>
      shanghaiMathItemFamilies.find((family) => family.id === item.familyId)?.gradeBands.includes(instructionalGrade),
    );
  const serverQueueForCurrentDate =
    serverDailyPracticePlan?.practiceDate === currentPracticeDate &&
    serverDailyPracticePlan.questionQueue?.instructionalGrade === instructionalGrade &&
    serverDailyPracticePlan.questionQueue?.items?.every((item) =>
      shanghaiMathItemFamilies.find((family) => family.id === item.familyId)?.gradeBands.includes(instructionalGrade),
    )
      ? serverDailyPracticePlan.questionQueue
      : null;
  const usesServerOwnedQueue = Boolean(serverQueueForCurrentDate);
  const currentQuestionQueue = serverQueueForCurrentDate || (storedQueueMatchesInstructionalGrade ? storedQueueForCurrentDate : null) || createDailyQuestionQueue({
    allocation: allocationForCurrentPlan,
    behaviorEvents,
    date: currentPracticeDate,
    dailyMinutes: activeLearningGoal.dailyStudyMinutes,
    plannedFamilyId: learningPath.focusFamilyId || activeGeneratedQuestionFamily.id,
    families: shanghaiMathItemFamilies,
    supportProfile: generatedSupportProfile,
    targetGrade: instructionalGrade,
  });
  nextPracticeAllocation = storedNextAllocation || generatedDailyAllocation;
  nextPracticeQueue = activeStudentPlan?.nextQuestionQueue || null;
  const generatedCandidateUnits = usesServerOwnedQueue
    ? []
    : createGeneratedPracticeCandidateUnits({
        aiVersion: appState.getSnapshot().aiVersion,
        questionQueue: currentQuestionQueue,
      });
  generatedPracticeCandidates = usesServerOwnedQueue
    ? []
    : generatedCandidateUnits[0]?.candidates || createGeneratedPracticeCandidates();
  practicePlan = createDailyPracticePlan({
    allocation: allocationForCurrentPlan,
    behaviorAwareQuestionEngine,
    dailyTasks,
    generatedCandidates: generatedPracticeCandidates,
    generatedCandidateUnits,
    generatedTodayTask,
    initialLearningCurve,
    questionQueue: currentQuestionQueue,
    questionLogic,
    questions,
    serverOwned: usesServerOwnedQueue,
  });
  practiceSequence = practicePlan.practiceSequence;
  currentQuestionIndex = Math.min(currentQuestionIndex, practicePlan.practiceSequence.length - 1);
  activeQuestion = getCurrentQuestion();

  return onboardingEvidence;
}

async function resolveServerDailyPracticePlan() {
  const plan = await dailyPracticePlanRepository.resolve({
    planRequest: {
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      practiceDate: normalizePracticeDate(dailyTasks.date),
    },
  });
  const gate = refreshServerPracticeGate();
  if (gate) return null;
  if (plan) serverDailyPracticePlan = plan;
  return plan;
}

function refreshServerPracticeGate() {
  serverPracticeGate =
    dailyPracticeRunRepository.getBlockingState?.() || dailyPracticePlanRepository.getBlockingState?.() || null;
  if (serverPracticeGate?.assessmentCadence?.status === "mandatory") refreshStageTestCadence();
  return serverPracticeGate;
}

function clearServerPracticeGate() {
  dailyPracticePlanRepository.clearBlockingState?.();
  dailyPracticeRunRepository.clearBlockingState?.();
  serverPracticeGate = null;
}

function isMandatoryStageAssessmentGate() {
  if (serverDailyPracticeRun?.id && !serverDailyPracticeRun.requiredPracticeCompleted) return false;
  const serverStatus = serverPracticeGate?.assessmentCadence?.status;
  return serverStatus === "mandatory" || stageTestCadence?.status === "mandatory";
}

function openMandatoryStageAssessmentGate(source = "mandatory_stage_assessment_gate") {
  refreshStageTestCadence();
  if (getVisibleViewId() !== "onboarding") showView("onboarding", { source });
  renderStageAssessmentPanel();
}

function findServerRunQuestionIndex(run = serverDailyPracticeRun) {
  const step = run?.currentStep;
  if (!step) return null;
  const index = practicePlan.practiceSequence.findIndex(
    (item) => item.queueItemId === step.queueItemId && Number(item.queueStageIndex) === Number(step.stageIndex),
  );
  return index >= 0 ? index : null;
}

function findServerOptionalPracticeQuestionIndex(run = serverDailyPracticeRun) {
  const optionalPractice = run?.optionalPractice;
  const step = optionalPractice?.currentStep;
  if (!optionalPractice?.id || !step) return null;
  const index = practicePlan.practiceSequence.findIndex(
    (item) =>
      item.serverOptionalPractice &&
      item.optionalPracticeSessionId === optionalPractice.id &&
      Number(item.optionalPracticeIndex) === Number(step.index),
  );
  return index >= 0 ? index : null;
}

function createServerOptionalPracticePlaceholder(run = serverDailyPracticeRun) {
  const optionalPractice = run?.optionalPractice;
  const step = optionalPractice?.currentStep;
  if (!optionalPractice?.id || !step) return null;
  const challenge = optionalPractice.mode === "harder";
  const wrongRetry = optionalPractice.mode === "wrong_retry";
  const label = wrongRetry ? "错题重做" : challenge ? "自愿挑战" : "同类型加练";
  const graphSuccessorChallenge = optionalPractice.challengeRoute === "knowledge_graph_successor";
  return {
    id: `server-optional-${optionalPractice.id}-${step.index}`,
    logicId: step.familyId,
    variantLevel: step.variantLevel,
    knowledgePoint: label,
    prompt: "题目准备中",
    answer: null,
    steps: [],
    hints: [],
    guidedMode: { steps: [] },
    diagnosticTags: [],
    generationMetadata: { sourceMode: "server_optional_practice" },
    stageLabel: label,
    changeReason: wrongRetry
      ? "回到刚才做错的原题，再独立完成一次。"
      : challenge
        ? graphSuccessorChallenge
          ? "试试和刚才知识点相连的新关系。"
          : "把同一关系带到更多变化中。"
        : "换一种数字或场景，再走一遍关系。",
    queueItemId: step.itemId,
    queueUnitIndex: null,
    queueStageIndex: null,
    isQueueUnitLast: false,
    extraPracticeMode: optionalPractice.mode,
    serverOptionalPractice: true,
    optionalPracticeSessionId: optionalPractice.id,
    optionalPracticeIndex: step.index,
  };
}

function ensureServerOptionalPracticeQuestion(run = serverDailyPracticeRun) {
  const existing = findServerOptionalPracticeQuestionIndex(run);
  if (existing !== null) return existing;
  const placeholder = createServerOptionalPracticePlaceholder(run);
  if (!placeholder) return null;
  practicePlan.practiceSequence.push(placeholder);
  practiceSequence = practicePlan.practiceSequence;
  return practicePlan.practiceSequence.length - 1;
}

function synchronizeServerDailyPracticeRun(run) {
  if (!run) return null;
  if (serverDailyPracticeRun?.id && serverDailyPracticeRun.id !== run.id) serverDailyPracticeSummary = null;
  serverDailyPracticeRun = run;
  requiredPracticeCompleted = Boolean(run.requiredPracticeCompleted);
  const optionalIndex = ensureServerOptionalPracticeQuestion(run);
  if (optionalIndex !== null) {
    currentQuestionIndex = optionalIndex;
    activeQuestion = getCurrentQuestion();
    optionalPracticeActive = true;
    canAdvanceQuestion = false;
    revealedHints = 0;
    guidedStepIndex = 0;
    return run;
  }
  if (!run.optionalPractice?.currentStep) optionalPracticeActive = false;
  let index = findServerRunQuestionIndex(run);
  if (index === null && run.currentStep && serverDailyPracticePlan) {
    refreshPersonalizationFromOnboardingResponses();
    index = findServerRunQuestionIndex(run);
  }
  if (index === null) return run;
  currentQuestionIndex = index;
  activeQuestion = getCurrentQuestion();
  canAdvanceQuestion = false;
  revealedHints = 0;
  guidedStepIndex = 0;
  return run;
}

function isServerOwnedRequiredPracticeQuestion(question) {
  return Boolean(
    serverDailyPracticeRun?.id &&
      !serverDailyPracticeRun.requiredPracticeCompleted &&
      !question?.extraPracticeMode,
  );
}

function isServerOwnedOptionalPracticeQuestion(question) {
  const optionalPractice = serverDailyPracticeRun?.optionalPractice;
  const step = optionalPractice?.currentStep;
  return Boolean(
    question?.serverOptionalPractice &&
      optionalPractice?.id === question.optionalPracticeSessionId &&
      step &&
      Number(step.index) === Number(question.optionalPracticeIndex),
  );
}

async function resolveServerDailyPracticeRun() {
  const run = await dailyPracticeRunRepository.resolve({
    runRequest: {
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      practiceDate: normalizePracticeDate(dailyTasks.date),
    },
  });
  const gate = refreshServerPracticeGate();
  if (gate) return null;
  return run ? synchronizeServerDailyPracticeRun(run) : null;
}

function restorePracticeSummaryFromBehaviorEvents(events = []) {
  const practiceRunId = serverDailyPracticeRun?.id || activeDailyPracticeSession?.serverPracticeRunId || null;
  if (practiceRunId) {
    practiceRuntime.restoreCompletedItemsFromEvents(events, {
      practiceRunId,
      requireServerScored: Boolean(hasAuthenticatedStudentIdentity),
    });
    return;
  }
  if (hasAuthenticatedStudentIdentity || !activeDailyPracticeSession?.id) return;

  const sessionCreatedAt = Date.parse(activeDailyPracticeSession.createdAt || "");
  const legacySessionFloor = Number.isFinite(sessionCreatedAt) ? sessionCreatedAt - 10_000 : null;
  const localSessionEvents = events.filter((event) => {
    if (event?.payload?.practiceSessionId === activeDailyPracticeSession.id) return true;
    if (event?.payload?.practiceSessionId || legacySessionFloor === null || event?.page !== "practice") return false;
    const eventTimestamp = Date.parse(event.timestamp || "");
    return Number.isFinite(eventTimestamp) && eventTimestamp >= legacySessionFloor;
  });
  practiceRuntime.restoreCompletedItemsFromEvents(localSessionEvents, {
    practiceRunId: null,
    requireServerScored: false,
  });
}

async function hydrateServerPracticeSummary() {
  const practiceRunId = serverDailyPracticeRun?.id || activeDailyPracticeSession?.serverPracticeRunId || null;
  if (!practiceRunId) return null;
  const summary = await dailyPracticeRunRepository.getSummary({ runId: practiceRunId });
  if (!summary || summary.practiceRunId !== practiceRunId) return null;
  if (serverDailyPracticeRun?.id && serverDailyPracticeRun.id !== practiceRunId) return null;
  serverDailyPracticeSummary = summary;
  practiceRuntime.restoreCompletedItemsFromSummaryItems(summary.items);
  return summary;
}

const viewTitles = {
  onboarding: "测试模块",
  home: "学生学习首页",
  practice: "做题练习",
  atlas: "知识图鉴",
  report: "学习报告",
};

const { showView } = createViewRouter({
  navItems,
  views,
  title,
  viewTitles,
  onNavigate(targetView, payload) {
    if (isLocalFreshOnboardingDemo && targetView === "onboarding") return;
    trackEvent("page_view", {
      targetId: targetView,
      viewId: targetView,
      source: payload.source,
    });

    if (targetView === "practice") {
      ensurePracticeStarted(payload.source);
    }
  },
});

targetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetView = button.dataset.viewTarget;
    showView(targetView);
    trackEvent(targetView === "practice" ? "training_opened" : "page_view", {
      targetId: targetView,
      viewId: targetView,
      source: button.textContent.trim(),
    });

    if (targetView === "practice") {
      if (isMandatoryStageAssessmentGate()) return;
      if (button.dataset.practiceMode === "extra") {
        startOptionalPractice({ mode: "same_type", count: 3, source: button.textContent.trim() });
      }
      if (button.dataset.practiceMode === "harder") {
        const count = Number(document.querySelector("#harder-practice-count")?.value || 3);
        startOptionalPractice({ mode: "harder", count, source: button.textContent.trim() });
      }
    }
  });
});

const hintStack = document.querySelector("#hint-stack");
const revealHint = document.querySelector("#reveal-hint");
const hintNote = document.querySelector("#hint-note");
const questionText = document.querySelector("#question-text");
const stepStrip = document.querySelector("#step-strip");
const questionStage = document.querySelector("#question-stage");
const answerInput = document.querySelector("#answer-input");
const submitAnswer = document.querySelector("#submit-answer");
const resetPractice = document.querySelector("#reset-practice");
const nextQuestion = document.querySelector("#next-question");
const feedback = document.querySelector("#feedback");
const previousAttempt = document.querySelector("#previous-attempt");
const strategyList = document.querySelector("#strategy-list");
const guidedMode = document.querySelector("#guided-mode");
const supportModePanel = document.querySelector("#support-mode-panel");
const fuzzyProgress = document.querySelector("#practice-fuzzy-progress");
let answerRevisionCount = 0;
let lastAnswerInputValue = "";

function resetAnswerRevisionTracking() {
  answerRevisionCount = 0;
  lastAnswerInputValue = "";
}

function beginNextAnswerAttemptTracking() {
  answerRevisionCount = 0;
  lastAnswerInputValue = String(answerInput?.value || "");
}

function trackAnswerRevision({ currentTarget }) {
  const nextValue = String(currentTarget?.value || "");
  const isTypingOrDeleting =
    !lastAnswerInputValue ||
    !nextValue ||
    nextValue.startsWith(lastAnswerInputValue) ||
    lastAnswerInputValue.startsWith(nextValue);
  if (!isTypingOrDeleting) answerRevisionCount = Math.min(25, answerRevisionCount + 1);
  // The prior value lives only in the active input; drafts are never persisted or sent.
  lastAnswerInputValue = nextValue;
}

answerInput?.addEventListener("input", trackAnswerRevision);

function getRawCurrentQuestion() {
  if (activeAtlasExploration?.question) return activeAtlasExploration.question;
  return getQuestionFromPracticePlan(practicePlan, currentQuestionIndex);
}

function getDeliveryStateForQuestion(question = getRawCurrentQuestion()) {
  const state = questionDeliveryRepository.stateForQuestion(question?.id);
  if (!isServerOwnedRequiredPracticeQuestion(question)) return state;
  return state?.delivery?.id === serverDailyPracticeRun?.activeDeliveryId ? state : null;
}

function toPersistedPracticeSequenceItem(question) {
  if (!questionDeliveryRepository.remoteAvailable()) return question;

  const deliveryState = getDeliveryStateForQuestion(question);
  const deliveredQuestion = deliveryState?.delivery?.question;
  const safeLearningPath = deliveredQuestion?.learningPath?.length
    ? deliveredQuestion.learningPath
    : ["读题", "找关系", "计算", "检查"];
  const safeQueueItem = question?.queueItem
    ? {
        id: question.queueItem.id,
        bucketId: question.queueItem.bucketId,
        familyId: question.queueItem.familyId,
        familyName: question.queueItem.familyName,
        variantLevel: question.queueItem.variantLevel,
        ...(!isServerOwnedRequiredPracticeQuestion(question) ? { seed: question.queueItem.seed } : {}),
        instructionalGrade: question.queueItem.instructionalGrade,
        source: question.queueItem.source,
      }
    : null;
  const metadata = deliveredQuestion?.metadata || {};
  return {
    id: question.id,
    logicId: deliveredQuestion?.familyId || question.logicId,
    variantLevel: deliveredQuestion?.variantLevel || question.variantLevel || "original",
    knowledgePoint: deliveredQuestion?.knowledgePoint || question.knowledgePoint || "数学关系",
    prompt: deliveredQuestion?.prompt || question.prompt || "题目准备中",
    answerInput: deliveredQuestion?.answerInput || question.answerInput || createMathAnswerInput(),
    answer: null,
    steps: safeLearningPath,
    hints: [],
    hintCount: deliveredQuestion?.support?.hintCount || 0,
    guidedStepCount: deliveredQuestion?.support?.guidedStepCount || 0,
    solutionStrategies: deliveredQuestion?.solutionStrategies || [],
    guidedMode: { steps: [] },
    diagnosticTags: metadata.abilityTags || question.diagnosticTags || [],
    generationMetadata: {
      sourceMode: "server_delivery",
      qualityStatus: "system_validated",
      atlasNodeIds: metadata.atlasNodeIds || question.generationMetadata?.atlasNodeIds || [],
      abilityTags: metadata.abilityTags || question.generationMetadata?.abilityTags || [],
      variantControl: question.generationMetadata?.variantControl || null,
      itemTags: metadata.itemTags || question.generationMetadata?.itemTags || null,
    },
    stageLabel: question.stageLabel,
    changeReason: question.changeReason,
    queueItem: safeQueueItem,
    queueItemId: question.queueItemId || safeQueueItem?.id || null,
    queueUnitIndex: question.queueUnitIndex ?? null,
    queueUnitCount: question.queueUnitCount ?? null,
    queueStageIndex: question.queueStageIndex ?? null,
    isQueueUnitLast: Boolean(question.isQueueUnitLast),
    extraPracticeMode: question.extraPracticeMode || null,
    retrySourceQuestionId: question.retrySourceQuestionId || null,
    previousAttemptReference: question.previousAttemptReference || null,
  };
}

function createQuestionDeliveryRequest(question) {
  const requestedSeed =
    question?.queueItem?.seed ?? question?.generationMetadata?.itemTags?.generationTags?.requestedSeed;
  const seed = Number(requestedSeed);
  const instructionalGrade =
    question?.queueItem?.instructionalGrade ||
    question?.generationMetadata?.itemTags?.difficultyTags?.instructionalGrade ||
    getDailyInstructionalGrade();
  if (!question?.id || !question?.logicId || !Number.isFinite(seed) || !instructionalGrade) return null;
  return {
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    mode: "practice",
    familyId: question.logicId,
    instructionalGrade,
    variantLevel: question.variantLevel || "original",
    aiVersion: appState.getSnapshot().aiVersion,
    seed,
    queueItemId: question.queueItemId || null,
    sessionId: getDailyPracticeSessionId(),
    source: "daily_practice_runtime",
    practiceMode: question.extraPracticeMode || null,
    stageLabel: question.stageLabel || null,
  };
}

function decorateQuestionFromDelivery(rawQuestion) {
  const deliveryState = getDeliveryStateForQuestion(rawQuestion);
  const deliveredQuestion = deliveryState?.delivery?.question;
  if (!deliveredQuestion) return rawQuestion;

  const safeLearningPath = deliveredQuestion.learningPath?.length
    ? deliveredQuestion.learningPath
    : ["读题", "找关系", "计算", "检查"];
  const guidedResponseByLevel = new Map(
    (deliveryState.guidedResponses || []).map((response) => [Number(response.level), response]),
  );
  const revealedGuidedSteps = (deliveryState.revealedGuidedSteps || deliveredQuestion.revealedGuidedSteps || []).map((step) => {
    const response = guidedResponseByLevel.get(Number(step.level)) || null;
    return {
      id: `server-guided-${step.level}`,
      level: Number(step.level),
      phase: step.phase || null,
      prompt: step.prompt,
      responseType: step.responseType || "short_reasoning",
      answerInput: step.answerInput || null,
      responseStatus: response?.status || null,
      responseAttemptCount: response?.attemptCount || 0,
      responseValue: response?.responseValue || "",
    };
  });
  return {
    ...rawQuestion,
    prompt: deliveredQuestion.prompt,
    answerInput: deliveredQuestion.answerInput || rawQuestion.answerInput || createMathAnswerInput(),
    knowledgePoint: deliveredQuestion.knowledgePoint || rawQuestion.knowledgePoint,
    logicId: deliveredQuestion.familyId || rawQuestion.logicId,
    variantLevel: deliveredQuestion.variantLevel || rawQuestion.variantLevel,
    diagnosticTags: deliveredQuestion.metadata?.abilityTags || rawQuestion.diagnosticTags,
    steps: safeLearningPath,
    generationMetadata: {
      ...rawQuestion.generationMetadata,
      atlasNodeIds: deliveredQuestion.metadata?.atlasNodeIds || rawQuestion.generationMetadata?.atlasNodeIds || [],
      abilityTags: deliveredQuestion.metadata?.abilityTags || rawQuestion.generationMetadata?.abilityTags || [],
      itemTags: deliveredQuestion.metadata?.itemTags || rawQuestion.generationMetadata?.itemTags || null,
    },
    hints: deliveryState.revealedHints || [],
    hintCount: deliveredQuestion.support?.hintCount || 0,
    guidedStepCount: deliveredQuestion.support?.guidedStepCount || 0,
    solutionStrategies: deliveredQuestion.solutionStrategies || [],
    previousAttemptReference: deliveredQuestion.previousAttemptReference || rawQuestion.previousAttemptReference || null,
    guidedMode: {
      ...rawQuestion.guidedMode,
      steps: revealedGuidedSteps,
    },
    deliveryId: deliveryState.delivery.id,
    serverAuthoritative: true,
    answer: null,
  };
}

async function ensureActiveQuestionDelivery(question = activeQuestion) {
  let rawQuestion = getRawCurrentQuestion();
  if (!rawQuestion?.id) return null;

  if (isServerOwnedRequiredPracticeQuestion(question)) {
    const resolved = await dailyPracticeRunRepository.ensureDelivery({ runId: serverDailyPracticeRun.id });
    if (!resolved?.run || !resolved?.delivery) return null;
    synchronizeServerDailyPracticeRun(resolved.run);
    rawQuestion = getRawCurrentQuestion();
    if (!rawQuestion?.id) return null;
    let deliveryState = questionDeliveryRepository.adoptDelivery({
      questionId: rawQuestion.id,
      delivery: resolved.delivery,
    });
    const started = await questionDeliveryRepository.markStarted({
      questionId: rawQuestion.id,
      studentId: studentProfile.id,
    });
    if (started?.state) deliveryState = started.state;
    activeQuestion = getCurrentQuestion();
    revealedHints = deliveryState.revealedHints.length;
    guidedStepIndex = Math.max(0, deliveryState.revealedGuidedSteps.length - 1);
    renderQuestion();
    renderHints();
    renderSupport();
    return deliveryState;
  }

  if (isServerOwnedOptionalPracticeQuestion(question)) {
    const resolved = await dailyPracticeRunRepository.ensureOptionalDelivery({ runId: serverDailyPracticeRun.id });
    if (!resolved?.run || !resolved?.delivery) return null;
    synchronizeServerDailyPracticeRun(resolved.run);
    rawQuestion = getRawCurrentQuestion();
    if (!rawQuestion?.id) return null;
    let deliveryState = questionDeliveryRepository.adoptDelivery({
      questionId: rawQuestion.id,
      delivery: resolved.delivery,
    });
    const started = await questionDeliveryRepository.markStarted({
      questionId: rawQuestion.id,
      studentId: studentProfile.id,
    });
    if (started?.state) deliveryState = started.state;
    activeQuestion = getCurrentQuestion();
    revealedHints = deliveryState.revealedHints.length;
    guidedStepIndex = Math.max(0, deliveryState.revealedGuidedSteps.length - 1);
    renderQuestion();
    renderHints();
    renderSupport();
    return deliveryState;
  }

  if (rawQuestion.id !== question?.id) return null;
  if (questionDeliveryRepository.stateForQuestion(rawQuestion.id)) return null;
  const deliveryRequest = createQuestionDeliveryRequest(rawQuestion);
  if (!deliveryRequest) return null;
  const deliveryState = await questionDeliveryRepository.ensureDelivery({
    questionId: rawQuestion.id,
    deliveryRequest,
  });
  if (!deliveryState) {
    if (getRawCurrentQuestion()?.id === rawQuestion.id) {
      activeQuestion = getCurrentQuestion();
      renderQuestion();
      renderHints();
      renderSupport();
    }
    return null;
  }
  if (getRawCurrentQuestion()?.id !== rawQuestion.id) return deliveryState;
  const started = await questionDeliveryRepository.markStarted({
    questionId: rawQuestion.id,
    studentId: studentProfile.id,
  });
  const resolvedState = started?.state || deliveryState;
  activeQuestion = getCurrentQuestion();
  revealedHints = resolvedState.revealedHints.length;
  guidedStepIndex = Math.max(0, resolvedState.revealedGuidedSteps.length - 1);
  renderQuestion();
  renderHints();
  renderSupport();
  return resolvedState;
}

function getCurrentQuestion() {
  const rawQuestion = getRawCurrentQuestion();
  const decoratedQuestion = decorateQuestionFromDelivery(rawQuestion);
  if (decoratedQuestion !== rawQuestion) return decoratedQuestion;
  if (isServerOwnedRequiredPracticeQuestion(rawQuestion)) {
    return {
      ...toPersistedPracticeSequenceItem(rawQuestion),
      deliveryPending: true,
      serverAuthoritative: false,
    };
  }
  if (isServerOwnedOptionalPracticeQuestion(rawQuestion)) {
    return {
      ...toPersistedPracticeSequenceItem(rawQuestion),
      deliveryPending: true,
      serverAuthoritative: false,
    };
  }
  if (questionDeliveryRepository.remoteAvailable() && createQuestionDeliveryRequest(rawQuestion)) {
    return {
      ...toPersistedPracticeSequenceItem(rawQuestion),
      deliveryPending: true,
      serverAuthoritative: false,
    };
  }
  return rawQuestion;
}

function getActiveMathLevelDefinition() {
  return createMathLevelDefinition({
    targetGrade: activeLearningGoal.targetGrade || generatedInitialAbilityTest.routing?.targetGrade || "G6",
    families: shanghaiMathItemFamilies,
    subjectId: subjectSelection.subjectId,
  });
}

function getStageAssessmentBlueprint() {
  const preferredFamilyId =
    practicePlan.activeQueueItem?.familyId || activeQuestion.logicId || activeGeneratedQuestionFamily.id;
  return assembleStageAssessment({
    aiVersion: appState.getSnapshot().aiVersion,
    attemptIndex: activeStudentPlan?.stageAssessmentHistory?.length || 0,
    families: shanghaiMathItemFamilies,
    maxQuestions: 8,
    minQuestions: 6,
    preferredFamilyId,
    subjectId: subjectSelection.subjectId,
    targetGrade: activeLearningGoal.targetGrade || generatedInitialAbilityTest.routing?.targetGrade || "G6",
  });
}

function renderStageAssessmentPanel() {
  renderStageAssessment({
    container: document.querySelector("#stage-assessment-panel"),
    session: activeStageAssessment,
    cadence: stageTestCadence,
    error: stageAssessmentError,
    curveAdjustment: {
      curve: activeStudentPlan?.dynamicCurve || null,
      draft: curveAdjustmentDraft,
      error: curveAdjustmentError,
      learningParameterConfig,
      testIntervalPracticeDays: getAssessmentCadenceSettings().suggestedAfterPracticeDays,
    },
    onCurveAdjustmentPreview: previewStudentCurveAdjustment,
    onCurveAdjustmentConfirm: confirmStudentCurveAdjustment,
  });
}

function previewStudentCurveAdjustment(parameters) {
  try {
    if (!activeStudentPlan?.dynamicCurve?.canUpdate) {
      throw new Error("requires_verified_dynamic_curve");
    }
    curveAdjustmentDraft = createAdjustedDynamicCurve({
      baseCurve: activeStudentPlan.dynamicCurve,
      learningGoal: activeStudentPlan.learningGoal || activeLearningGoal,
      parameters,
      actorRole: "student",
      actorUserId: studentProfile.id,
    });
    curveAdjustmentError = null;
    trackEvent("dynamic_curve_adjustment_previewed", {
      targetId: activeStudentPlan.dynamicCurve.id,
      durationWeeks: parameters.durationWeeks,
      dailyStudyMinutes: parameters.dailyStudyMinutes,
      weeklyStudyDays: parameters.weeklyStudyDays,
      curveAdjustmentMode: parameters.curveAdjustmentMode,
    });
  } catch {
    curveAdjustmentDraft = null;
    curveAdjustmentError = "这个节奏暂时不能生成，换一个组合再试试。";
  }
  renderStageAssessmentPanel();
}

async function confirmStudentCurveAdjustment() {
  if (!curveAdjustmentDraft?.adjustment?.parameters || !activeStudentPlan) return;

  const parameters = curveAdjustmentDraft.adjustment.parameters;
  let confirmedPlan = await studentPlanRepository.confirmCurveAdjustment({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    parameters,
  });

  if (!confirmedPlan && activeStudentPlan.serverAuthoritative) {
    curveAdjustmentError = "暂时没能保存新的节奏，请稍后再试。";
    renderStageAssessmentPanel();
    return;
  }

  if (!confirmedPlan) {
    const confirmedAt = new Date().toISOString();
    confirmedPlan = studentPlanRepository.replace({
      ...activeStudentPlan,
      updatedAt: confirmedAt,
      dynamicCurve: curveAdjustmentDraft,
      nextDynamicTask: null,
      curveAdjustmentHistory: [
        ...(activeStudentPlan.curveAdjustmentHistory || []),
        {
          confirmationId: `curve-adjustment-local-${Date.now()}`,
          action: "dynamic_curve_adjustment_confirmed",
          actorRole: "student",
          actorUserId: studentProfile.id,
          confirmedAt,
          parameters,
          baseCurveId: activeStudentPlan.dynamicCurve.id,
          adjustedCurveId: curveAdjustmentDraft.id,
          appliesFrom: "next_learning_day",
        },
      ],
    });
  }

  if (!confirmedPlan) {
    curveAdjustmentError = "暂时没能保存新的节奏，请稍后再试。";
    renderStageAssessmentPanel();
    return;
  }

  activeStudentPlan = confirmedPlan;
  curveAdjustmentDraft = null;
  curveAdjustmentError = null;
  trackEvent("dynamic_curve_adjustment_confirmed", {
    targetId: activeStudentPlan.dynamicCurve?.id || "dynamic_curve",
    durationWeeks: parameters.durationWeeks,
    dailyStudyMinutes: parameters.dailyStudyMinutes,
    weeklyStudyDays: parameters.weeklyStudyDays,
    curveAdjustmentMode: parameters.curveAdjustmentMode,
    appliesFrom: "next_learning_day",
  });
  refreshStageTestCadence();
  renderInitialData();
  renderStageAssessmentPanel();
  renderReportPanels();
}

function openStageTestFromEntry(source) {
  refreshStageTestCadence();
  if (!stageTestCadence?.canStart) {
    renderStageAssessmentPanel();
    return;
  }

  showView("onboarding", { source });
  trackEvent("stage_assessment_entry_opened", {
    targetId: "stage_assessment",
    source,
    stageTestStatus: stageTestCadence.status,
    suggestionSource: stageTestCadence.suggestionSource || "cadence",
  });
  renderStageAssessmentPanel();
}

async function startStageAssessment() {
  if (activeStageAssessment?.status === "in_progress") {
    renderStageAssessmentPanel();
    return;
  }

  if (!stageTestCadence) refreshStageTestCadence();
  if (!stageTestCadence?.canStart) {
    renderStageAssessmentPanel();
    return;
  }

  curveAdjustmentDraft = null;
  curveAdjustmentError = null;
  stageAssessmentError = null;

  const preferredFamilyId =
    practicePlan.activeQueueItem?.familyId || activeQuestion.logicId || activeGeneratedQuestionFamily.id;
  const remoteRun = await stageAssessmentRunRepository.start({
    runRequest: {
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      targetGrade: activeLearningGoal.targetGrade || generatedInitialAbilityTest.routing?.targetGrade || "G6",
      preferredFamilyId,
      attemptIndex: activeStudentPlan?.stageAssessmentHistory?.length || 0,
      plannedWeek: Number(learningPlan.currentWeek || 1),
    },
  });
  if (remoteRun?.session) {
    activeStageAssessment = remoteRun.session;
    stageQuestionStartedAt = Date.now();
    trackEvent("stage_assessment_started", {
      targetId: activeStageAssessment.id,
      practiceDaysSinceVerifiedTest: stageTestCadence.practiceDaysSinceVerifiedTest,
      stageTestStatus: stageTestCadence.status,
      assessmentScope: activeStageAssessment.assessmentBlueprint?.coverage?.assessmentScope || "cross_family_calibration_sample",
      coreFamilyCount: activeStageAssessment.assessmentBlueprint?.coverage?.coreFamilyIds?.length || 0,
      suggestionSource: stageTestCadence.suggestionSource || "cadence",
      scoringSource: "server_authoritative",
    });
    renderStageAssessmentPanel();
    return;
  }

  if (hasAuthenticatedStudentIdentity) {
    stageAssessmentError = "暂时无法开始这次测试，请检查连接后再试。";
    renderStageAssessmentPanel();
    return;
  }

  const stageBlueprint = getStageAssessmentBlueprint();
  if (stageBlueprint.questions.length < stageBlueprint.minimumQuestions) return;

  activeStageAssessment = createStageAssessmentRun({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    questions: stageBlueprint.questions,
    assessmentType: "stage_test",
    plannedWeek: Number(learningPlan.currentWeek || 1),
    minimumQuestions: stageBlueprint.minimumQuestions,
    attemptId: Date.now(),
    assessmentBlueprint: {
      assessmentMode: stageBlueprint.assessmentMode,
      levelDefinitionId: stageBlueprint.levelDefinition.id,
      coverage: stageBlueprint.coverage,
      guardrail: stageBlueprint.guardrail,
    },
  });
  assessmentSessionRepository.saveSession(activeStageAssessment);
  stageQuestionStartedAt = Date.now();
  trackEvent("stage_assessment_started", {
    targetId: activeStageAssessment.id,
    practiceDaysSinceVerifiedTest: stageTestCadence.practiceDaysSinceVerifiedTest,
    stageTestStatus: stageTestCadence.status,
    assessmentScope: stageBlueprint.coverage.assessmentScope || "cross_family_calibration_sample",
    coreFamilyCount: stageBlueprint.coverage.coreFamilyIds.length,
    suggestionSource: stageTestCadence.suggestionSource || "cadence",
    scoringSource: "prototype_fallback",
  });
  renderStageAssessmentPanel();
}

async function skipStageAssessment() {
  if (!stageTestCadence?.canSkip || !activeStudentPlan) return;
  const skippedAt = new Date().toISOString();
  const updatedPlan = hasAuthenticatedStudentIdentity
    ? await studentPlanRepository.skipStageAssessment({
        studentId: studentProfile.id,
        subjectId: subjectSelection.subjectId,
        practiceDate: normalizePracticeDate(dailyTasks.date),
      })
    : studentPlanRepository.updateAssessmentCadence({
        studentId: studentProfile.id,
        subjectId: subjectSelection.subjectId,
        assessmentCadence: {
          ...getAssessmentCadenceSettings(),
          lastSkippedAt: skippedAt,
          lastSkippedAtPracticeCount: stageTestCadence.practiceDaysSinceVerifiedTest,
          ...(stageTestCadence.observerRequestActive
            ? {
                observerRequestAcknowledgedAt: skippedAt,
                observerRequestAcknowledgedByRole: "student",
                observerRequestStatus: "skipped",
              }
            : {}),
        },
      });
  if (!updatedPlan) {
    stageAssessmentError = "暂时无法记录这次跳过，请检查连接后再试。";
    renderStageAssessmentPanel();
    return;
  }
  if (updatedPlan) activeStudentPlan = updatedPlan;
  stageAssessmentError = null;
  trackEvent("stage_assessment_skipped", {
    targetId: "stage_assessment",
    practiceDaysSinceVerifiedTest: stageTestCadence.practiceDaysSinceVerifiedTest,
    suggestionSource: stageTestCadence.suggestionSource || "cadence",
  });
  refreshStageTestCadence();
  renderStageAssessmentPanel();
}

async function submitStageAssessmentAnswer() {
  const answerInput = document.querySelector("#stage-assessment-answer");
  const question = activeStageAssessment?.presentationQuestions?.find(
    (item) => !(activeStageAssessment.responses || []).some((response) => response.questionId === item.id),
  );
  if (!answerInput || !question) return;

  if (answerInput.value.trim() === "") {
    answerInput.focus();
    return;
  }

  const answerInputDefinition = question.answerInput || createMathAnswerInput();
  if (normalizeMathAnswerValue({ answerInput: answerInputDefinition, value: answerInput.value }) === null) {
    answerInput.focus();
    return;
  }

  if (activeStageAssessment?.serverAuthoritative) {
    const responseTimeMs = Date.now() - stageQuestionStartedAt;
    const response = await stageAssessmentRunRepository.submitResponse({
      sessionId: activeStageAssessment.id,
      studentId: studentProfile.id,
      questionId: question.id,
      answer: answerInput.value,
      responseTimeMs,
    });
    if (!response?.session) return;
    activeStageAssessment = response.session;
    if (response.plan) activeStudentPlan = studentPlanRepository.replace(response.plan) || response.plan;
    trackEvent("stage_assessment_response_recorded", {
      targetId: activeStageAssessment.id,
      questionId: question.id,
      responseTimeMs,
      scoringSource: "server_authoritative",
      completed: activeStageAssessment.status === "completed_verified" || activeStageAssessment.status === "completed_needs_review",
    });
    if (activeStageAssessment.status === "completed_verified" || activeStageAssessment.status === "completed_needs_review") {
      curveAdjustmentDraft = null;
      curveAdjustmentError = null;
      if (activeStageAssessment.status === "completed_verified") clearServerPracticeGate();
      refreshStageTestCadence();
      updateNextPracticeAllocationFromBehavior();
    } else {
      stageQuestionStartedAt = Date.now();
    }
    renderStageAssessmentPanel();
    renderReportPanels();
    renderSystemFoundationPanel();
    return;
  }

  activeStageAssessment = recordStageAssessmentResponse({
    session: activeStageAssessment,
    answer: answerInput.value,
    questionId: question.id,
    responseTimeMs: Date.now() - stageQuestionStartedAt,
  });

  if (activeStageAssessment.status === "ready_to_score") {
    const finalized = finalizeStageAssessmentRun({
      session: activeStageAssessment,
      staticCurve: activeStudentPlan?.staticCurve || generatedStaticCurve,
      levelDefinition: getActiveMathLevelDefinition(),
      priorStageResults: activeStudentPlan?.stageAssessmentHistory || [],
    });
    const nextDynamicTask = finalized.dynamicCurve.canUpdate
      ? createTodayTaskFromLearningCurve({
          curve: finalized.dynamicCurve,
          date: getNextPracticeDate(dailyTasks.date),
          focus: dailyTasks.focus,
        })
      : null;
    const completedThroughPracticeDate =
      stageTestCadence?.latestCompletedPracticeDate || normalizePracticeDate(dailyTasks.date);
    const stageResult = {
      ...finalized.result,
      completedThroughPracticeDate,
    };
    activeStageAssessment = {
      ...finalized.session,
      result: stageResult,
    };
    const updatedPlan = studentPlanRepository.recordStageAssessment({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      stageResult,
      dynamicCurve: finalized.dynamicCurve,
      nextDynamicTask,
    });
    if (updatedPlan) activeStudentPlan = updatedPlan;
    const cadencePlan = studentPlanRepository.updateAssessmentCadence({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      assessmentCadence: {
        ...getAssessmentCadenceSettings(),
        lastVerifiedPracticeDate: completedThroughPracticeDate,
        lastVerifiedAt: new Date().toISOString(),
        lastSkippedAt: null,
        lastSkippedAtPracticeCount: 0,
        ...(stageTestCadence?.observerRequestActive
          ? {
              observerRequestAcknowledgedAt: new Date().toISOString(),
              observerRequestAcknowledgedByRole: "student",
              observerRequestStatus: "completed",
            }
          : {}),
      },
    });
    if (cadencePlan) activeStudentPlan = cadencePlan;
    curveAdjustmentDraft = null;
    curveAdjustmentError = null;
    refreshStageTestCadence();
    updateNextPracticeAllocationFromBehavior();
  } else {
    stageQuestionStartedAt = Date.now();
  }

  assessmentSessionRepository.saveSession(activeStageAssessment);
  renderStageAssessmentPanel();
  renderReportPanels();
  renderSystemFoundationPanel();
}

function renderBehaviorSummary() {
  renderBehaviorSummaryView({
    activeQuestion,
    hintNote,
    practiceRuntime,
    revealedHints,
  });
}

function getPracticeSummary() {
  return practiceRuntime.getPracticeSummary();
}

function getPracticeSummaryQuestionFamilyId() {
  return activeQuestion?.logicId || practicePlan.activeQueueItem?.familyId || activeGeneratedQuestionFamily?.id || null;
}

function getPracticeSummaryQuestionBenchmark() {
  const familyId = getPracticeSummaryQuestionFamilyId();
  if (questionTypeBenchmarkRepository.usesPrototypeFallback()) return peerQuestionTypeBenchmark;
  if (serverQuestionTypeBenchmarkFamilyId === familyId && serverQuestionTypeBenchmark) return serverQuestionTypeBenchmark;
  return {
    availability: "calibrating",
    label: "同类型题参考正在建立",
    studentCopy: "多一些同类型练习记录后，这里会出现温和的参考。",
  };
}

async function refreshServerQuestionTypeBenchmark() {
  const familyId = getPracticeSummaryQuestionFamilyId();
  if (
    questionTypeBenchmarkRepository.usesPrototypeFallback() ||
    !questionTypeBenchmarkRepository.remoteAvailable() ||
    !requiredPracticeCompleted ||
    optionalPracticeActive ||
    !familyId ||
    questionTypeBenchmarkRequestFamilyId === familyId ||
    questionTypeBenchmarkResolvedFamilyId === familyId
  ) {
    return serverQuestionTypeBenchmark;
  }

  questionTypeBenchmarkRequestFamilyId = familyId;
  try {
    const benchmark = await questionTypeBenchmarkRepository.hydrate({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      familyId,
    });
    if (getPracticeSummaryQuestionFamilyId() === familyId) {
      serverQuestionTypeBenchmark = benchmark;
      serverQuestionTypeBenchmarkFamilyId = familyId;
      questionTypeBenchmarkResolvedFamilyId = familyId;
      renderPracticeSummary();
    }
    return benchmark;
  } finally {
    if (questionTypeBenchmarkRequestFamilyId === familyId) questionTypeBenchmarkRequestFamilyId = null;
  }
}

function renderPracticeSummary() {
  const summary = getPracticeSummary();
  const visible = requiredPracticeCompleted && !optionalPracticeActive && !activeAtlasExploration;
  const wrongRetry =
    Boolean(serverDailyPracticeSummary?.practiceRunId) &&
    serverDailyPracticeSummary.practiceRunId === serverDailyPracticeRun?.id &&
    Number(serverDailyPracticeSummary.total) === Number(summary.total)
      ? serverDailyPracticeSummary.wrongRetry
      : null;
  refreshStageTestCadence();
  renderPracticeSummaryView({
    knowledgeAtlas,
    onOpenStageTest: openStageTestFromEntry,
    peerQuestionTypeBenchmark: getPracticeSummaryQuestionBenchmark(),
    percent,
    practiceDetailsVisible,
    reviewPromptStyle: getActivePracticeSupportPresentation().reviewPromptStyle,
    stageTestCadence,
    visible,
    summary,
    wrongRetry,
    onOpenAtlas: () => {
      trackEvent("today_atlas_opened", {
        targetId: "atlas",
        knowledgePoint: knowledgeAtlas.knowledgePoint,
        source: "practice_summary",
      });
      showView("atlas");
    },
  });
  trackPracticeSummaryOptionsOffered({ visible, summary });
  if (visible && summary.total > 0) void refreshServerQuestionTypeBenchmark();
}

function getActivePracticeSupportPresentation() {
  const currentPracticeDate = normalizePracticeDate(dailyTasks.date);
  const serverPresentation =
    serverDailyPracticePlan?.practiceDate === currentPracticeDate ? serverDailyPracticePlan.supportPresentation : null;
  const source = serverPresentation || generatedSupportProfile?.supportPlan || generatedSupportProfile || {};
  return {
    helpEntryStyle: source.helpEntryStyle === "private_reassurance" ? "private_reassurance" : "self_then_choose",
    guidedStructurePreferred: Boolean(source.guidedStructurePreferred || source.guidedStructureObserved),
    reviewPromptStyle: ["reflective", "optional"].includes(source.reviewPromptStyle)
      ? source.reviewPromptStyle
      : "light",
  };
}

function trackPracticeSummaryOptionsOffered({ visible, summary }) {
  const runId = serverDailyPracticeRun?.id || null;
  if (!visible || !summary?.total || !runId || practiceSummaryOfferTrackedForRunId === runId) return;
  practiceSummaryOfferTrackedForRunId = runId;
  queueMicrotask(() => {
    if (serverDailyPracticeRun?.id !== runId || !requiredPracticeCompleted) return;
    trackEvent("practice_summary_options_offered", {
      targetId: runId,
      source: "practice_summary",
      offeredActions: ["details", "atlas", "same_type", "harder", "wrong_retry"],
    });
  });
}

function renderReportPanels() {
  const knowledgePuzzleMap = refreshKnowledgePuzzleMap();
  const knowledgeGraph = refreshRuntimeKnowledgeGraph();
  const knowledgeCoverage = summarizeMathKnowledgeAtlas(
    (knowledgeGraph?.graph?.nodes || []).filter((node) => node.kind === "question_family"),
  ).completionRate;
  const localLearningReport = buildLearningReport({
    behaviorEvents: behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId),
  });
  const learningReport = serverLearningReport?.learning || localLearningReport;
  renderReportDashboard({
    abilityMap: runtimeAbilityMap,
    behaviorStats: practiceRuntime.getStats(),
    dynamicCurve: activeStudentPlan?.dynamicCurve || null,
    generatedStaticCurve,
    initialLearningCurve,
    knowledgeCoverage,
    knowledgePuzzleMap,
    learningReport,
    learningTrend: serverLearningReport?.learningTrend || null,
    latestMessage: studentMessages[0] || null,
    nextStep: serverLearningReport?.nextStep || null,
    onOpenAtlas: (source) => {
      trackEvent("today_atlas_opened", {
        targetId: "atlas",
        source,
      });
      showView("atlas", { source });
    },
    onOpenPracticeReview: (source) => {
      practiceDetailsVisible = true;
      renderPracticeSummary();
      persistDailyPracticeSession();
      trackEvent("practice_detail_opened", {
        targetId: "practice_summary_details",
        source,
      });
      showView("practice", { source });
    },
    peerReference: serverLearningReport?.peerReference || null,
    nextPracticeAllocation,
    practicePlan,
    practiceSummary: getPracticeSummary(),
    requiredPracticeCompleted,
    reportSummary,
    studentProfile,
    testHistory: buildStudentTestHistory(),
    levelAttainment: serverLearningReport?.levelAttainment || null,
    percent,
    stageTestCadence,
    onOpenStageTest: openStageTestFromEntry,
  });
}

async function refreshServerLearningReport() {
  const report = await learningReportRepository.hydrate({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
  });
  if (!report) return null;
  serverLearningReport = report;
  renderReportPanels();
  return report;
}

async function refreshServerKnowledgeAtlas() {
  const atlas = await knowledgeAtlasRepository.hydrate({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
  });
  if (!atlas) return null;
  serverKnowledgePuzzleMap = atlas;
  renderKnowledgeEvidencePanels();
  renderReportPanels();
  return atlas;
}

async function refreshServerKnowledgeGraph() {
  const knowledgeGraph = await knowledgeGraphRepository.hydrate({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
  });
  if (!knowledgeGraph) return null;
  serverKnowledgeGraph = knowledgeGraph;
  renderKnowledgeEvidencePanels();
  return knowledgeGraph;
}

function buildStudentTestHistory() {
  const initialSession = assessmentSessionRepository.findLatest({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
  });
  const dateLabel = (value, fallback) => {
    const parsed = new Date(value || "");
    return Number.isNaN(parsed.getTime()) ? fallback : `${parsed.getMonth() + 1} 月 ${parsed.getDate()} 日`;
  };
  const initialUncertaintySummary = (item) => {
    const uncertainCount = Number(item?.uncertainCount || 0);
    if (!uncertainCount) return "";
    return ` 有 ${uncertainCount} 次先标记为不确定，系统会在后续练习中继续确认。`;
  };
  const transferFocusLabel = (variantLevel) => {
    const labels = {
      context_change: "换一个生活场景",
      relationship_reframe: "换一种关系说法",
      question_order_variant: "换一种提问顺序",
    };
    return labels[variantLevel] || null;
  };
  const serverHistory = serverLearningReport?.testHistory;
  if (Array.isArray(serverHistory) && serverHistory.length) {
    return serverHistory.map((item) => {
      const scoreLabel = typeof item.accuracy === "number" ? percent(item.masteryScore ?? item.accuracy) : "--";
      if (item.type === "initial") {
        return {
          id: item.id,
          title: "初始能力测试",
          dateLabel: dateLabel(item.completedAt, "开始学习时"),
          scoreLabel,
          summary: `已记录 ${item.completedQuestionCount || 0} 条测试回答，形成了你的第一条学习曲线。${initialUncertaintySummary(item)}`,
          status: "recorded",
        };
      }
      return {
        id: item.id,
        title: "阶段测试",
        dateLabel: dateLabel(item.completedAt, "阶段测试"),
        scoreLabel,
        // A formal test can check whether understanding survives a bounded wording change.
        // Keep this friendly on the student surface; details stay in the adult report.
        summary: item.verified
          ? `正确率 ${typeof item.accuracy === "number" ? percent(item.accuracy) : "--"}${transferFocusLabel(item.transferVariantLevel) ? `，也试着${transferFocusLabel(item.transferVariantLevel)}` : ""}。学习曲线已据此校准。`
          : `正确率 ${typeof item.accuracy === "number" ? percent(item.accuracy) : "--"}${transferFocusLabel(item.transferVariantLevel) ? `，也试着${transferFocusLabel(item.transferVariantLevel)}` : ""}。结果已记录，等待系统复核。`,
        status: item.verified ? "verified" : "recorded",
      };
    });
  }
  const initialRecord = {
    id: "initial-assessment-record",
    title: "初始能力测试",
    dateLabel: dateLabel(initialSession?.updatedAt, "开始学习时"),
    scoreLabel: percent(generatedAbilityMap.overallLevel),
    summary: initialSession?.responseCount
      ? `已记录 ${initialSession.responseCount} 条测试回答，形成了你的第一条学习曲线。${initialUncertaintySummary(initialSession?.result)}`
      : "系统根据初始测试，形成了你的第一条学习曲线。",
    status: "recorded",
  };
  const stageRecords = (activeStudentPlan?.stageAssessmentHistory || []).map((result) => ({
    id: result.id,
    title: "阶段测试",
    dateLabel: dateLabel(result.completedAt || result.createdAt, `第 ${result.plannedWeek || ""} 周`),
    scoreLabel: percent(result.masteryScore || result.accuracy || 0),
    summary:
      result.status === "completed_verified"
        ? `正确率 ${percent(result.accuracy)}，迁移表现 ${percent(result.transferAccuracy)}。学习曲线已据此校准。`
        : `正确率 ${percent(result.accuracy)}，结果已记录，等待系统复核。`,
    status: result.status === "completed_verified" ? "verified" : "recorded",
  }));
  return [...stageRecords.reverse(), initialRecord];
}

function updateNextPracticeAllocationFromBehavior() {
  const behaviorEvents = behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId);
  generatedSupportProfile = resolvePersonalitySupportProfile(appState.getSnapshot().onboardingResponses, behaviorEvents);
  const behaviorAnalysis = analyzeLearningBehavior(behaviorEvents);
  const transferFallback = runtimeAbilityMap.dimensions.find((dimension) => dimension.id === "transfer")?.score || 0.5;
  const learningEvidence = summarizeLearningEvidence(behaviorEvents);
  const observedTransfer = learningEvidence.dimensions.find((dimension) => dimension.id === "transfer")?.observedScore;
  const nextPracticeDate = getNextPracticeDate(dailyTasks.date);
  const nextLearningPath = createMathLearningPath({
    behaviorEvents,
    curve: activeStudentPlan?.dynamicCurve?.canUpdate ? activeStudentPlan.dynamicCurve : generatedStaticCurve,
    families: shanghaiMathItemFamilies,
    instructionalGrade: getDailyInstructionalGrade(),
    pathVersion:
      activeStudentPlan?.learningPathVersion ||
      activeStudentPlan?.learningPath?.version ||
      (activeStudentPlan?.serverAuthoritative ? LEGACY_MATH_LEARNING_PATH_VERSION : DEFAULT_MATH_LEARNING_PATH_VERSION),
    planStartedAt: activeStudentPlan?.taskCadence?.planStartedAt || activeStudentPlan?.staticCurveConfirmedAt,
    practiceDate: nextPracticeDate,
  });
  const nextTaskBase =
    activeStudentPlan?.nextDynamicTask?.date === nextPracticeDate ? activeStudentPlan.nextDynamicTask : generatedTodayTask;
  nextPracticeAllocation = {
    ...createDailyAllocation({
      generatedTodayTask: nextTaskBase,
      previousAllocation: nextPracticeAllocation,
      behaviorSummary: {
        ...behaviorAnalysis.allocationInputs,
        answerCount: behaviorAnalysis.answerCount,
        evidenceConfidence: behaviorAnalysis.confidence,
        hintDepthAverage:
          behaviorAnalysis.answerCount > 0
            ? behaviorAnalysis.allocationInputs.hintDepthAverage
            : generatedSupportProfile.supportMode.hintDepthTarget,
        variantTransferRate: observedTransfer ?? behaviorAnalysis.allocationInputs.variantTransferRate ?? transferFallback,
      },
      supportProfile: generatedSupportProfile,
    }),
    behaviorAnalysis: {
      confidence: behaviorAnalysis.confidence,
      observations: behaviorAnalysis.observations,
      reportMetrics: behaviorAnalysis.reportMetrics,
    },
  };
  nextPracticeQueue = createDailyQuestionQueue({
    allocation: nextPracticeAllocation,
    behaviorEvents,
    date: nextPracticeDate,
    dailyMinutes: activeLearningGoal.dailyStudyMinutes,
    plannedFamilyId: nextLearningPath.focusFamilyId || activeGeneratedQuestionFamily.id,
    families: shanghaiMathItemFamilies,
    supportProfile: generatedSupportProfile,
    targetGrade: getDailyInstructionalGrade(),
  });

  const updatedPlan = studentPlanRepository.updateNextPracticeAllocation({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    allocation: {
      ...nextPracticeAllocation,
      effectiveDate: nextPracticeDate,
    },
    questionQueue: nextPracticeQueue,
    supportProfile: generatedSupportProfile,
  });
  if (updatedPlan) activeStudentPlan = updatedPlan;
}

function updateActiveLearningGoal(values) {
  activeLearningGoal = createMathLearningGoalDraft({
    existingGoal: activeLearningGoal,
    values,
  });
  refreshActiveGeneratedQuestionFamily();
  refreshPersonalizationFromOnboardingResponses();
  renderInitialData();
}

function renderSystemFoundationPanel() {
  // The question generator, model contracts, and account internals stay server-side.
  // This no-op keeps older rendering calls harmless while the student surface stays focused.
  if (!document.querySelector("#system-foundation-panel")) return;

  const itemFamily = activeGeneratedQuestionFamily;
  const snapshot = appState.getSnapshot();
  const questionSourceContract = createQuestionSourceContract({
    aiVersion: snapshot.aiVersion,
    itemFamily,
  });

  renderSystemFoundation({
    accountContext,
    abilityMap: generatedAbilityMap,
    appState,
    aiVersionProfiles,
    assessmentSession: assessmentSessionRepository.findLatest({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    }),
    generatorComparison,
    itemFamilies: shanghaiMathItemFamilies,
    learningParameterProposal: learningParameterRuntime.createCurveProposal({
      currentCurve: generatedStaticCurve,
      learningGoal: activeLearningGoal,
    }),
    learningParameterSnapshot: learningParameterRuntime.getSnapshot(),
    learningEvidence: summarizeLearningEvidence(
      behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId),
    ),
    onLearningParameterChange: (key, value) => {
      learningParameterRuntime.updateParameter(key, value);
      renderSystemFoundationPanel();
    },
    onLearningParameterConfirm: () => {
      const parameterSnapshot = learningParameterRuntime.confirmCurveProposal({
        currentCurve: generatedStaticCurve,
        learningGoal: activeLearningGoal,
      });
      activeStudentPlan = studentPlanRepository.appendConfirmedProposal({
        studentId: studentProfile.id,
        subjectId: subjectSelection.subjectId,
        confirmation: parameterSnapshot.latestConfirmedProposal,
      });
      renderSystemFoundationPanel();
    },
    onLearningParameterRoleChange: (role) => {
      learningParameterRuntime.setRole(role);
      renderSystemFoundationPanel();
    },
    onReportConfigModuleToggle: (moduleId) => {
      reportConfigRuntime.toggleModule(moduleId);
      renderSystemFoundationPanel();
    },
    onReportConfigRoleChange: (role) => {
      reportConfigRuntime.setActiveRole(role);
      renderSystemFoundationPanel();
    },
    questionSourceContract,
    research: shanghaiPrimaryMathResearch,
    reportConfigSnapshot: reportConfigRuntime.getSnapshot(),
    roleReportConfigSummary,
    studentPlanRecord: activeStudentPlan,
  });
}

function renderOnboardingFlowPanel() {
  renderOnboardingFlow({
    appState,
    generatedStaticCurve,
    generatedTodayTask,
    initialLearningCurve,
    learningGoal: activeLearningGoal,
    readiness: getOnboardingReadiness(),
    staticCurveConfirming,
    staticCurveSaveError,
    onStaticCurveConfirmed: async () => {
      if (!getOnboardingReadiness().canAdvance) return;
      if (staticCurveConfirming) return;
      staticCurveConfirming = true;
      staticCurveSaveError = "";
      renderOnboardingFlowPanel();
      const planConfirmation = await initialLearningPlanRepository.confirm({
        planRequest: {
          studentId: studentProfile.id,
          subjectId: subjectSelection.subjectId,
          practiceDate: normalizePracticeDate(dailyTasks.date),
          learningGoal: activeLearningGoal,
        },
      });

      if (planConfirmation?.record) {
        activeStudentPlan = studentPlanRepository.replace(planConfirmation.record) || planConfirmation.record;
        learningGoalDraft = planConfirmation.goalDraft || learningGoalDraft;
      } else if (!initialLearningPlanRepository.remoteAvailable()) {
        activeStudentPlan = studentPlanRepository.upsertInitialPlan({
          studentId: studentProfile.id,
          subjectId: subjectSelection.subjectId,
          learningGoal: activeLearningGoal,
          staticCurve: generatedStaticCurve,
          todayTask: generatedTodayTask,
          todayQuestionQueue: practicePlan.questionQueue,
          dailyAllocation: generatedDailyAllocation,
          supportProfile: generatedSupportProfile,
          taskCadence: refreshTaskCadence(),
          assessmentCadence: createInitialAssessmentCadence(),
        });
        await learningGoalDraftRepository.confirmByStudent({
          studentId: studentProfile.id,
          subjectId: subjectSelection.subjectId,
          learningGoal: activeLearningGoal,
        });
        learningGoalDraft = learningGoalDraftRepository.find({
          studentId: studentProfile.id,
          subjectId: subjectSelection.subjectId,
        });
      } else {
        staticCurveConfirming = false;
        staticCurveSaveError = "暂时无法确认学习曲线，请检查连接后再试。";
        renderOnboardingFlowPanel();
        return;
      }

      appState.confirmStaticCurve();
      staticCurveConfirming = false;
      await resolveServerDailyPracticePlan();
      refreshPersonalizationFromOnboardingResponses();
      await resolveServerDailyPracticeRun();
      refreshStageTestCadence();
      renderQuestion();
      renderHints();
      renderSupport();
      renderSystemFoundationPanel();
      trackEvent("static_curve_confirmed", {
        targetId: "initial_static_curve",
        source: "onboarding_flow",
        generatedDailyTask: practicePlan.activeTask.id,
        generatedFromCurveId: generatedTodayTask.generatedFromCurveId,
      });
      showView("practice", { source: "static_curve_confirmed" });
    },
  });
}

function trackEvent(eventType, payload = {}, { existingEvent = null, mirror = true } = {}) {
  const basePayload = payload && typeof payload === "object" ? payload : {};
  const contextualPayload =
    !existingEvent && serverDailyPracticeRun?.id && !basePayload.practiceRunId
      ? { ...basePayload, practiceRunId: serverDailyPracticeRun.id }
      : !existingEvent && !basePayload.practiceSessionId
        ? {
            ...basePayload,
            practiceSessionId: getDailyPracticeSessionId(),
            practiceDate: normalizePracticeDate(dailyTasks.date),
          }
        : basePayload;
  const event = existingEvent || practiceRuntime.trackEvent(eventType, contextualPayload);
  if (existingEvent) practiceRuntime.importHistoricalEvents([existingEvent]);
  behaviorEventRepository.append(event, { mirror });
  refreshRuntimeAbilityMap();
  updateNextPracticeAllocationFromBehavior();
  renderKnowledgeEvidencePanels();
  renderBehaviorSummary();
  renderReportPanels();
  renderSystemFoundationPanel();
  return event;
}

supportModePanel?.addEventListener("toggle", () => {
  if (!supportModePanel.open || !activeQuestion?.id) return;
  trackEvent("solution_strategy_opened", {
    targetId: activeQuestion.id,
    variantLevel: activeQuestion.variantLevel || "original",
    supportMode: "strategy_and_guided",
    deliveryId: activeQuestion.deliveryId || null,
  });
});

strategyList?.addEventListener(
  "toggle",
  (event) => {
    const card = event.target?.matches?.("details.strategy-card") ? event.target : null;
    const strategyId = card?.dataset?.solutionStrategyId || null;
    if (!card?.open || !strategyId || !activeQuestion?.id) return;
    trackEvent("solution_strategy_opened", {
      targetId: activeQuestion.id,
      variantLevel: activeQuestion.variantLevel || "original",
      strategyId,
      supportMode: "strategy_and_guided",
      deliveryId: activeQuestion.deliveryId || null,
    });
  },
  true,
);

function ensurePracticeStarted(source = "practice") {
  if (isMandatoryStageAssessmentGate()) {
    openMandatoryStageAssessmentGate(source);
    return false;
  }
  if (hasAuthenticatedStudentIdentity && !activeAtlasExploration && !serverDailyPracticeRun?.id) {
    if (!activeStudentPlan?.staticCurveConfirmedAt) {
      showView("onboarding", { source: "practice_requires_confirmed_curve" });
      return false;
    }
    feedback.className = "feedback";
    feedback.textContent = "正在准备今天的题目，请稍后再试。";
    void resolveServerDailyPracticeRun().then((run) => {
      if (!run) {
        feedback.textContent = "今天的题目还没有准备好，请检查连接后再试。";
        return;
      }
      feedback.textContent = "题目已经准备好。";
      renderQuestion();
      renderHints();
      renderSupport();
    });
    return false;
  }
  const startedNow = practiceRuntime.markStarted();
  practiceRuntime.startQuestion(activeQuestion.id);
  if (!startedNow) return true;
  trackEvent("question_started", {
    targetId: activeQuestion.id,
    source,
    taskId: dailyTasks.tasks.find((task) => task.status === "current")?.id,
    variantLevel: activeQuestion.variantLevel,
  });
  persistDailyPracticeSession();
  return true;
}

function resetQuestionAttempt(message = "先试一试。") {
  answerInput.value = "";
  resetAnswerRevisionTracking();
  revealedHints = 0;
  guidedStepIndex = 0;
  canAdvanceQuestion = false;
  nextQuestion.disabled = true;
  nextQuestion.hidden = true;
  feedback.className = "feedback";
  feedback.textContent = message;
  renderHints();
  renderSupport();
}

function storeLocalOnboardingResponse(storedResponse) {
  appState.recordOnboardingResponse(storedResponse);
  assessmentSessionRepository.recordResponse({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    response: storedResponse,
    questionMetadata: getOnboardingQuestionMetadata(storedResponse),
    assessmentType: storedResponse.step === "ability_test" ? "initial_onboarding" : "onboarding_personality",
  });
}

function restoreServerPersonalityAssessmentResponses(session) {
  (session?.responses || []).forEach((response) => {
    appState.recordOnboardingResponse({
      ...response,
      step: response.step,
      responseType: "choice",
      metadata: response.metadata || {},
    });
  });
}

function restoreServerInitialAssessmentResponses(session) {
  (session?.responses || []).forEach((response) => {
    appState.recordOnboardingResponse({
      ...response,
      step: "ability_test",
      responseType: response.responseType || "numeric_answer",
      answer: null,
    });
  });
}

async function ensureInitialAbilityAssessmentRun({ force = false } = {}) {
  const prerequisites = getInitialAssessmentPrerequisites();
  if (
    !prerequisites.ready ||
    initialAssessmentRunStarting ||
    (!force && initialAssessmentStartAttempted) ||
    !hasAuthenticatedStudentIdentity ||
    !initialAssessmentRunRepository.remoteAvailable()
  ) {
    return;
  }
  if (activeInitialAssessment?.serverAuthoritative && activeInitialAssessment.targetGrade === prerequisites.targetGrade) return;

  initialAssessmentRunStarting = true;
  initialAssessmentError = "";
  const remoteRun = await initialAssessmentRunRepository.start({
    runRequest: {
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      targetGrade: prerequisites.targetGrade,
    },
  });
  initialAssessmentRunStarting = false;
  initialAssessmentStartAttempted = true;

  if (remoteRun?.session) {
    activeInitialAssessment = remoteRun.session;
    restoreServerInitialAssessmentResponses(activeInitialAssessment);
    initialAbilityQuestionStartedAt = Date.now();
    initialAssessmentError = "";
  } else if (hasAuthenticatedStudentIdentity) {
    initialAssessmentError = "暂时无法准备这组数学题，请检查连接后重试。";
  }
  refreshPersonalizationFromOnboardingResponses();
  renderInitialData();
}

async function handleOnboardingResponse(response) {
  if (
    ["psychological_personality", "learning_personality"].includes(response.step) &&
    activePersonalityAssessment?.serverAuthoritative
  ) {
    const remoteRun = await personalityAssessmentRunRepository.submitResponse({
      sessionId: activePersonalityAssessment.id,
      studentId: studentProfile.id,
      questionId: response.questionId,
      answer: response.answer,
      responseTimeMs: Date.now() - personalityQuestionStartedAt,
    });
    if (!remoteRun?.session) {
      if (hasAuthenticatedStudentIdentity) {
        personalityAssessmentError = "这一题还没有记录，请检查连接后再选一次。";
        renderInitialData();
      }
      return;
    }
    activePersonalityAssessment = remoteRun.session;
    personalityAssessmentError = "";
    restoreServerPersonalityAssessmentResponses(activePersonalityAssessment);
    personalityQuestionStartedAt = Date.now();
    refreshPersonalizationFromOnboardingResponses();
    renderInitialData();
    renderQuestion();
    return;
  }

  if (response.step === "ability_test" && activeInitialAssessment?.serverAuthoritative) {
    const remoteRun = await initialAssessmentRunRepository.submitResponse({
      sessionId: activeInitialAssessment.id,
      studentId: studentProfile.id,
      questionId: response.questionId,
      answer: response.answer,
      isUncertain: Boolean(response.isUncertain),
      responseTimeMs: Date.now() - initialAbilityQuestionStartedAt,
    });
    if (!remoteRun?.session) {
      if (hasAuthenticatedStudentIdentity) {
        initialAssessmentError = "这一题还没有记录，请检查连接后再提交。";
        renderInitialData();
      }
      return;
    }
    activeInitialAssessment = remoteRun.session;
    initialAssessmentError = "";
    restoreServerInitialAssessmentResponses(activeInitialAssessment);
    initialAbilityQuestionStartedAt = Date.now();
    refreshPersonalizationFromOnboardingResponses();
    renderInitialData();
    renderQuestion();
    return;
  }

  if (hasAuthenticatedStudentIdentity && ["psychological_personality", "learning_personality", "ability_test"].includes(response.step)) {
    return;
  }

  const question =
    response.step === "ability_test"
      ? getInitialAbilityQuestionSet().find((item) => item.id === response.questionId)
      : null;
  const storedResponse = question
    ? (() => {
        const answerInput = question.answerInput || createMathAnswerInput();
        const answer = normalizeMathAnswerValue({ answerInput, value: response.answer, allowCanonicalNumber: true });
        return {
          ...response,
          answer,
          isCorrect:
            answer !== null &&
            mathAnswerValuesMatch({ answerInput, actual: answer, expected: question.answer }),
        };
      })()
    : response;
  storeLocalOnboardingResponse(storedResponse);
  refreshPersonalizationFromOnboardingResponses();
  renderInitialData();
  renderQuestion();
}

function renderOnboardingAssessmentPanel() {
  renderOnboardingAssessment({
    abilityMap: getAuthoritativeInitialAbilityMap() || generatedAbilityMap,
    assessmentModules,
    basicBioInfo: resolvedBasicBioInfo,
    generatedStaticCurve,
    generatedAbilityQuestionSet: getInitialAbilityQuestionSet(),
    initialAssessmentError,
    initialAssessmentPending: shouldPrepareRemoteInitialAssessment() && !activeInitialAssessment,
    initialAbilityQuestionSet,
    initialLearningCurve,
    learningGoal: activeLearningGoal,
    learningGoalDraft,
    learningGoalOptions: getMathLearningGoalOptions(),
    onboardingPrefillDraft: basicInfoDraftOverride || resolvedOnboardingPrefill,
    onboardingPrefillOptions,
    onboardingResponses: appState.getSnapshot().onboardingResponses,
    onboardingPrefill,
    basicInfoEditing,
    basicInfoSaveError,
    basicInfoSaving,
    availableSubjects: supportedSubjects,
    onBasicInfoConfirm: async () => {
      if (basicInfoSaving) return;
      basicInfoSaving = true;
      basicInfoSaveError = "";
      renderInitialData();
      const confirmed = await onboardingPrefillRepository.confirmByStudent({ studentId: studentProfile.id });
      if (!confirmed) {
        basicInfoSaving = false;
        basicInfoSaveError = "暂时无法确认这些信息，请检查连接后再试。";
        renderInitialData();
        return;
      }
      onboardingPrefill = confirmed;
      basicInfoEditing = false;
      basicInfoSaving = false;
      basicInfoSaveError = "";
      basicInfoDraftOverride = null;
      personalityAssessmentStartAttempted = false;
      personalityAssessmentError = "";
      initialAssessmentStartAttempted = false;
      initialAssessmentError = "";
      refreshResolvedBasicBioInfo();
      refreshPersonalizationFromOnboardingResponses();
      trackEvent("onboarding_basic_info_confirmed", {
        targetId: "basic_information",
        source: confirmed.sourceRole || "student",
        subjectIds: confirmed.subjectIds || [],
      });
      await ensurePersonalityAssessmentRun();
      renderInitialData();
    },
    onBasicInfoEditChange: (editing) => {
      if (basicInfoSaving) return;
      basicInfoEditing = editing;
      if (editing) {
        basicInfoSaveError = "";
      } else {
        basicInfoDraftOverride = null;
      }
      renderInitialData();
    },
    onBasicInfoSave: async (values) => {
      if (basicInfoSaving) return;
      const draft = normalizeOnboardingPrefillDraft({
        studentId: studentProfile.id,
        basicBioInfo: runtimeBasicBioInfo,
        values: {
          ...values,
          subjectIds: resolvedOnboardingPrefill.subjectIds || [],
        },
      });
      basicInfoDraftOverride = resolveOnboardingPrefill({
        studentId: studentProfile.id,
        basicBioInfo: runtimeBasicBioInfo,
        prefill: draft,
      });
      basicInfoSaving = true;
      basicInfoSaveError = "";
      renderInitialData();
      const savedPrefill = await onboardingPrefillRepository.saveByStudent({
        studentId: studentProfile.id,
        prefill: draft,
      });
      if (!savedPrefill) {
        basicInfoSaving = false;
        basicInfoSaveError = "暂时无法保存这些信息，请检查连接后再试。";
        renderInitialData();
        return;
      }
      onboardingPrefill = savedPrefill;
      basicInfoEditing = false;
      basicInfoSaving = false;
      basicInfoSaveError = "";
      basicInfoDraftOverride = null;
      personalityAssessmentStartAttempted = false;
      personalityAssessmentError = "";
      initialAssessmentStartAttempted = false;
      initialAssessmentError = "";
      refreshResolvedBasicBioInfo();
      refreshPersonalizationFromOnboardingResponses();
      trackEvent("onboarding_basic_info_updated", {
        targetId: "basic_information",
        subjectIds: onboardingPrefill?.subjectIds || [],
      });
      renderInitialData();
    },
    onSubjectSelectionConfirm: async (subjectId) => {
      if (subjectSelectionSaving || subjectId !== "math") return;
      const draft = normalizeOnboardingPrefillDraft({
        studentId: studentProfile.id,
        basicBioInfo: runtimeBasicBioInfo,
        values: {
          ...resolvedOnboardingPrefill.basicInfo,
          subjectIds: [subjectId],
          confirmSubjectSelection: true,
        },
      });
      subjectSelectionSaving = true;
      subjectSelectionError = "";
      renderInitialData();
      const savedPrefill = await onboardingPrefillRepository.saveByStudent({
        studentId: studentProfile.id,
        prefill: draft,
      });
      if (!savedPrefill) {
        subjectSelectionSaving = false;
        subjectSelectionError = "暂时无法确认这门学科，请检查连接后再试。";
        renderInitialData();
        return;
      }
      onboardingPrefill = savedPrefill;
      subjectSelectionSaving = false;
      subjectSelectionError = "";
      initialAssessmentStartAttempted = false;
      initialAssessmentError = "";
      refreshResolvedBasicBioInfo();
      trackEvent("onboarding_subject_confirmed", {
        targetId: subjectId,
        source: "student",
      });
      renderInitialData();
    },
    onInitialAssessmentRetry: () => {
      initialAssessmentStartAttempted = false;
      initialAssessmentError = "";
      void ensureInitialAbilityAssessmentRun({ force: true });
    },
    onLearningGoalDraftChange: updateActiveLearningGoal,
    onPersonalityAssessmentRetry: () => {
      personalityAssessmentStartAttempted = false;
      personalityAssessmentError = "";
      void ensurePersonalityAssessmentRun({ force: true });
    },
    onResponseChange: handleOnboardingResponse,
    personalityAssessmentError,
    personalityAssessmentPending: shouldPrepareRemotePersonalityAssessment() && !activePersonalityAssessment?.serverAuthoritative,
    personalityQuestionSets: getPersonalityQuestionSets(),
    personalityResult: getPersonalityResult(),
    personalityLogicLibrary,
    percent,
    psychologicalPersonalityLibrary,
    statisticalBaseline,
    subjectSelection,
    subjectSelectionError,
    subjectSelectionSaving,
  });
}

function refreshResolvedBasicBioInfo() {
  resolvedOnboardingPrefill = resolveOnboardingPrefill({
    studentId: studentProfile.id,
    basicBioInfo: runtimeBasicBioInfo,
    prefill: onboardingPrefill,
  });
  resolvedBasicBioInfo = resolvedOnboardingPrefill.bio;
  refreshInitialAbilityTestForBasicInfo();
}

function refreshInitialAbilityTestForBasicInfo() {
  const targetGrade = resolveInitialAssessmentGrade({
    gradeLevelOptionId: resolvedOnboardingPrefill?.basicInfo?.gradeLevelOptionId,
    gradeLabel: resolvedBasicBioInfo?.grade,
  });
  if (generatedInitialAbilityTest?.routing?.targetGrade === targetGrade) {
    refreshActiveGeneratedQuestionFamily();
    return generatedInitialAbilityTest;
  }
  generatedInitialAbilityTest = assembleInitialAbilityTest({
    aiVersion: "semi_ai",
    families: shanghaiMathItemFamilies,
    maxQuestions: 8,
    subjectId: "math",
    targetGrade,
  });
  refreshActiveGeneratedQuestionFamily();
  return generatedInitialAbilityTest;
}

function getOnboardingQuestionMetadata(response) {
  if (response.step !== "ability_test") {
    return {
      dimension: response.metadata?.dimension || null,
      responseType: response.responseType,
    };
  }

  if (response.metadata?.tags) {
    return {
      qualityStatus: null,
      targetDimension: response.metadata.targetDimension || null,
      tags: response.metadata.tags,
    };
  }

  const question = getInitialAbilityQuestionSet().find((item) => item.id === response.questionId);
  if (!question) return null;
  return {
    prompt: question.prompt,
    ...(question.answer !== undefined ? { correctAnswer: question.answer } : {}),
    qualityStatus: question.qualityStatus,
    targetDimension: question.targetDimension,
    tags: question.metadataTags,
  };
}

function refreshFreshOnboardingChrome() {
  const inProgress = isLocalFreshOnboardingDemo && !appState.getSnapshot().staticCurveConfirmed;
  navItems.forEach((item) => {
    const isAssessment = item.dataset.view === "onboarding";
    item.hidden = inProgress && !isAssessment;
    item.disabled = inProgress && !isAssessment;
  });
  targetButtons.forEach((button) => {
    button.hidden = inProgress && button.dataset.viewTarget !== "onboarding";
  });
  const topCurve = document.querySelector(".top-curve");
  if (topCurve) topCurve.hidden = inProgress;
}

function renderInitialData() {
  const dateParts = formatDateParts(dailyTasks.date);
  const activeLearningCurve = activeStudentPlan?.dynamicCurve?.canUpdate
    ? activeStudentPlan.dynamicCurve
    : generatedStaticCurve;
  const currentLevel = percent(activeLearningCurve?.currentPoint?.progressTowardTarget ?? runtimeAbilityMap.overallLevel);
  const currentWeek = Number(activeLearningCurve?.currentPoint?.week || learningPlan.currentWeek || 1);
  const durationWeeks = activeLearningGoal.durationWeeks;
  renderOnboardingAssessmentPanel();
  renderOnboardingFlowPanel();
  refreshFreshOnboardingChrome();
  if (isLocalFreshOnboardingDemo && !appState.getSnapshot().staticCurveConfirmed) {
    renderStudentSettingsPanel();
    return;
  }

  renderStageAssessmentPanel();
  renderInitialAbilityResult({
    abilityMap: getAuthoritativeInitialAbilityMap() || generatedAbilityMap,
    professionalAbilityAssessment,
    learningGoal: activeLearningGoal,
    learningCurve: activeLearningCurve,
    percent,
  });
  renderKnowledgeEvidencePanels();
  renderReportPanels();
  renderSystemFoundationPanel();

  renderHomeView({
    abilityMap: runtimeAbilityMap,
    currentLevel,
    currentWeek,
    dailyTasks,
    dateParts,
    durationWeeks,
    learningGoal: activeLearningGoal,
    learningCurve: activeLearningCurve,
    messages: studentMessages,
    practicePlan,
    questionLogic,
    settings,
    studentProfile,
    taskCadence,
    stageTestCadence,
    onOpenStageTest: openStageTestFromEntry,
  });

  setText("#training-date-label", `${dateParts.full} · 今日练习`);
  setText("#training-focus-title", practicePlan.focus);
  setText(
    "#training-entry-copy",
    `预计 ${practicePlan.estimatedMinutes} 分钟。今天只需要专心做题。`,
  );

  renderBehaviorSummary();
  if (shouldPrepareRemotePersonalityAssessment() && !activePersonalityAssessment?.serverAuthoritative) {
    void ensurePersonalityAssessmentRun();
  }
  if (shouldPrepareRemoteInitialAssessment() && !activeInitialAssessment) {
    void ensureInitialAbilityAssessmentRun();
  }
}

function renderQuestion() {
  activeQuestion = getCurrentQuestion();
  renderQuestionView({
    activeQuestion,
    canAdvanceQuestion,
    currentQuestionIndex,
    nextQuestion,
    practiceSequenceLength: practiceSequence.length,
    questionStage,
    questionText,
    fuzzyProgress,
    stepStrip,
    answerInput,
  });
  renderPreviousAttempt({
    activeQuestion,
    previousAttempt,
  });
  renderSupport();
  if (isServerOwnedRequiredPracticeQuestion(activeQuestion) || isServerOwnedOptionalPracticeQuestion(activeQuestion)) {
    if (!getDeliveryStateForQuestion(getRawCurrentQuestion())) void ensureActiveQuestionDelivery(activeQuestion);
  } else if (!activeQuestion.serverAuthoritative && questionDeliveryRepository.remoteAvailable()) {
    void ensureActiveQuestionDelivery(activeQuestion);
  }
}

function renderHints() {
  const supportPresentation = getActivePracticeSupportPresentation();
  renderHintStack({
    activeQuestion,
    hintNote,
    hintStack,
    revealHint,
    revealedHints,
    supportCue: generatedSupportProfile.studentCue,
    supportModeId: generatedSupportProfile.supportMode.id,
    helpEntryStyle: supportPresentation.helpEntryStyle,
  });
  renderBehaviorSummary();
}

function getRetryFeedbackCopy() {
  if (generatedSupportProfile.feedbackStyle === "warm_specific") {
    return "还差一点。先找题目问什么和哪些数量相等，再回到原题重做。";
  }
  if (generatedSupportProfile.feedbackStyle === "reflective_prompt") {
    return "还不对。先回看：题目真正要找的量是什么？找清楚后再重做原题。";
  }
  return "还不对。先原题重做，不推进到变式。可以打开下一层提示，看看卡点是不是在设未知数或列方程。";
}

function renderSupport() {
  const supportPresentation = getActivePracticeSupportPresentation();
  renderSupportModes({
    activeQuestion,
    guidedMode,
    guidedStepIndex,
    strategyList,
    guidedStructurePreferred: supportPresentation.guidedStructurePreferred,
  });
}

async function handleRevealHint() {
  if (!ensurePracticeStarted("hint")) return;
  const deliveryState =
    getDeliveryStateForQuestion(getRawCurrentQuestion()) || (await ensureActiveQuestionDelivery(activeQuestion));
  if (deliveryState?.delivery) {
    const revealed = await questionDeliveryRepository.revealHint({
      questionId: activeQuestion.id,
      studentId: studentProfile.id,
    });
    if (revealed?.state) {
      activeQuestion = getCurrentQuestion();
      revealedHints = revealed.state.revealedHints.length;
      practiceRuntime.setHighestHintLevel(revealedHints);
      if (revealed.behaviorEvent) {
        trackEvent(revealed.behaviorEvent.eventType, {}, { existingEvent: revealed.behaviorEvent, mirror: false });
      }
      renderHints();
      persistDailyPracticeSession();
      return;
    }
  }

  if (hasAuthenticatedStudentIdentity) {
    feedback.className = "feedback";
    feedback.textContent = "提示正在等待安全校验。请检查连接后再试。";
    return;
  }

  if (revealedHints < activeQuestion.hints.length) {
    revealedHints += 1;
    practiceRuntime.setHighestHintLevel(revealedHints);
    trackEvent("hint_opened", {
      targetId: activeQuestion.id,
      hintLevel: revealedHints,
      knowledgePoint: activeQuestion.knowledgePoint,
      variantLevel: activeQuestion.variantLevel,
    });
    renderHints();
    persistDailyPracticeSession();
  }
}

function handleOpenPreviousAttempt() {
  const detail = document.querySelector("#previous-attempt-detail");
  if (!detail) return;
  detail.hidden = !detail.hidden;
  trackEvent(detail.hidden ? "previous_attempt_closed" : "previous_attempt_opened", {
    targetId: activeQuestion.id,
    recallKind: activeQuestion.previousAttemptReference?.recallKind || null,
  });
}

async function handleGuidedNextStep() {
  if (!ensurePracticeStarted("guided_step")) return;
  const deliveryState =
    getDeliveryStateForQuestion(getRawCurrentQuestion()) || (await ensureActiveQuestionDelivery(activeQuestion));
  if (deliveryState?.delivery) {
    const revealed = await questionDeliveryRepository.revealGuidedStep({
      questionId: activeQuestion.id,
      studentId: studentProfile.id,
    });
    if (revealed?.state) {
      activeQuestion = getCurrentQuestion();
      guidedStepIndex = Math.max(0, revealed.state.revealedGuidedSteps.length - 1);
      if (revealed.behaviorEvent) {
        trackEvent(revealed.behaviorEvent.eventType, {}, { existingEvent: revealed.behaviorEvent, mirror: false });
      }
      renderSupport();
      persistDailyPracticeSession();
      return;
    }
    feedback.className = "feedback";
    feedback.textContent = "先完成当前这一步，再继续。";
    return;
  }

  if (hasAuthenticatedStudentIdentity) {
    feedback.className = "feedback";
    feedback.textContent = "分步引导正在等待安全校验。请检查连接后再试。";
    return;
  }

  const steps = activeQuestion.guidedMode?.steps || [];
  if (!steps.length || guidedStepIndex >= steps.length - 1) return;
  guidedStepIndex += 1;
  trackEvent("guided_step_opened", {
    targetId: activeQuestion.id,
    guidedStepIndex,
    guidedStepId: steps[guidedStepIndex]?.id,
  });
  renderSupport();
  persistDailyPracticeSession();
}

async function handleSubmitGuidedStep() {
  if (!ensurePracticeStarted("guided_step_response")) return;
  const currentStep = activeQuestion.guidedMode?.steps?.at(-1);
  const input = document.querySelector("#guided-response-input");
  if (!currentStep || !input) return;

  const response = input.value.trim();
  if (!response) {
    feedback.className = "feedback";
    feedback.textContent = currentStep.responseType === "final_answer" ? "先写下你算出的结果。" : "先写下这一小步的想法。";
    return;
  }

  const deliveryState =
    getDeliveryStateForQuestion(getRawCurrentQuestion()) || (await ensureActiveQuestionDelivery(activeQuestion));
  if (!deliveryState?.delivery) {
    feedback.className = "feedback";
    feedback.textContent = "这一步正在准备，请稍后再试。";
    return;
  }

  const recorded = await questionDeliveryRepository.submitGuidedStepResponse({
    questionId: activeQuestion.id,
    studentId: studentProfile.id,
    level: currentStep.level,
    response,
  });
  if (!recorded?.state) {
    feedback.className = "feedback";
    feedback.textContent = "这一步正在确认，请稍后再试。";
    return;
  }

  activeQuestion = getCurrentQuestion();
  guidedStepIndex = Math.max(0, recorded.state.revealedGuidedSteps.length - 1);
  if (recorded.behaviorEvent) {
    trackEvent(recorded.behaviorEvent.eventType, {}, { existingEvent: recorded.behaviorEvent, mirror: false });
  }
  renderSupport();
  persistDailyPracticeSession();
}

function downloadGuidedProcess({ prompt, steps }) {
  if (!prompt || !steps?.length) return;
  const lines = [
    "我的分步解题过程",
    "",
    `题目：${prompt}`,
    "",
    ...steps.flatMap((step, index) => [
      `第 ${index + 1} 步：${step.prompt}`,
      `我的记录：${step.response || step.responseValue || "已完成这一步"}`,
      "",
    ]),
  ];
  const file = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "math-guided-process.txt";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function handleExportGuidedProcess() {
  const steps = activeQuestion.guidedMode?.steps || [];
  const finalStep = steps.at(-1);
  if (!steps.length || finalStep?.responseStatus !== "confirmed") return;

  const deliveryState = getDeliveryStateForQuestion(getRawCurrentQuestion());
  const exported = deliveryState
    ? await questionDeliveryRepository.getGuidedProcess({ questionId: activeQuestion.id })
    : null;
  if (exported) {
    downloadGuidedProcess(exported);
    return;
  }
  downloadGuidedProcess({ prompt: activeQuestion.prompt, steps });
}

async function handleSubmitAnswer() {
  if (!ensurePracticeStarted("submit")) return;
  const answerValue = answerInput.value.trim();
  const answerInputDefinition = activeQuestion.answerInput || createMathAnswerInput();
  const elapsedSeconds = practiceRuntime.getCurrentQuestionElapsedSeconds();
  const answerRevisionCountForAttempt = answerRevisionCount;

  if (!answerValue) {
    trackEvent("answer_blank_submitted", {
      targetId: activeQuestion.id,
      hintsOpened: revealedHints,
      errorType: "empty_answer",
      variantLevel: activeQuestion.variantLevel,
      elapsedSeconds,
    });
    feedback.className = "feedback wrong";
    feedback.textContent = "先写下一个你认为的答案。";
    persistDailyPracticeSession();
    return;
  }

  const answer = normalizeMathAnswerValue({ answerInput: answerInputDefinition, value: answerValue });
  if (answer === null) {
    feedback.className = "feedback wrong";
    feedback.textContent =
      answerInputDefinition.kind === "clock_time"
        ? "请按 HH:MM 填写时刻。"
        : answerInputDefinition.kind === "fraction"
          ? "请用 a/b 的形式填写分数。"
          : "请填写一个有效的数字答案。";
    answerInput.focus();
    return;
  }

  const rawQuestion = getRawCurrentQuestion();
  const deliveryState =
    getDeliveryStateForQuestion(rawQuestion) || (await ensureActiveQuestionDelivery(activeQuestion));
  if (!deliveryState?.delivery && hasAuthenticatedStudentIdentity) {
    feedback.className = "feedback";
    feedback.textContent = "这道题正在等待安全校验。请检查连接后再试。";
    return;
  }
  let remoteAttempt = null;
  if (deliveryState?.delivery) {
    remoteAttempt = await questionDeliveryRepository.submitAttempt({
      questionId: activeQuestion.id,
      studentId: studentProfile.id,
      answer: answerInputDefinition.kind === "numeric" ? answer : answerValue,
      elapsedSeconds,
      answerRevisionCount: answerRevisionCountForAttempt,
    });
    if (!remoteAttempt?.result) {
      feedback.className = "feedback";
      feedback.textContent = "答案正在等待安全校验，请稍后再试。";
      return;
    }
    if (remoteAttempt.practiceRun) serverDailyPracticeRun = remoteAttempt.practiceRun;
    activeQuestion = getCurrentQuestion();
  }
  const isCorrect = remoteAttempt
    ? remoteAttempt.result.isCorrect
    : mathAnswerValuesMatch({ answerInput: answerInputDefinition, actual: answer, expected: rawQuestion.answer });
  const guidedStepsOpened = Math.max(
    0,
    Number(deliveryState?.revealedGuidedSteps?.length || 0),
    Number(guidedStepIndex || 0),
  );
  const requiresIndependentRetry = remoteAttempt
    ? Boolean(remoteAttempt.result?.requiresIndependentRetry)
    : Boolean(isCorrect && (revealedHints > 0 || guidedStepsOpened > 0));
  const questionSnapshot = remoteAttempt
    ? {
        ...toPersistedPracticeSequenceItem(rawQuestion),
        serverDeliveryId: deliveryState.delivery.id,
        variants: [],
        extraPracticeMode: rawQuestion.extraPracticeMode || activeQuestion.extraPracticeMode || null,
        retrySourceQuestionId: rawQuestion.retrySourceQuestionId || null,
      }
    : {
        ...activeQuestion,
        variants: [],
        extraPracticeMode: "wrong_retry",
        retrySourceQuestionId: activeQuestion.id,
      };
  practiceRuntime.addAttempt({
    answer,
    isCorrect,
    hintsOpened: revealedHints,
    guidedStepsOpened,
    elapsedSeconds,
    answerRevisionCount: answerRevisionCountForAttempt,
    submittedAt: new Date().toISOString(),
  });
  practiceRuntime.addCompletedItem({
    questionId: activeQuestion.id,
    prompt: activeQuestion.prompt,
    stageLabel: activeQuestion.stageLabel,
    answer,
    answerText: `你的答案：${formatMathAnswerValue({ answerInput: answerInputDefinition, value: answer })}`,
    isCorrect,
    hintsOpened: revealedHints,
    guidedStepsOpened,
    questionSnapshot,
  });
  beginNextAnswerAttemptTracking();
  if (remoteAttempt?.behaviorEvent) {
    trackEvent("answer_submitted", {}, { existingEvent: remoteAttempt.behaviorEvent, mirror: false });
    void refreshServerLearningReport();
    void refreshServerKnowledgeAtlas();
    void refreshServerKnowledgeGraph();
    void hydrateServerPracticeSummary().then((summary) => {
      if (summary) renderPracticeSummary();
    });
  } else {
    trackEvent("answer_submitted", {
      targetId: activeQuestion.id,
      answer,
      isCorrect,
      hintsOpened: revealedHints,
      guidedStepsOpened,
      knowledgePoint: activeQuestion.knowledgePoint,
      questionPrompt: activeQuestion.prompt,
      variantLevel: activeQuestion.variantLevel,
      questionFamilyId: activeQuestion.logicId,
      abilityTags: activeQuestion.diagnosticTags || activeQuestion.generationMetadata?.abilityTags || [],
      atlasNodeIds: activeQuestion.generationMetadata?.atlasNodeIds || [],
      controlledChanges: activeQuestion.generationMetadata?.variantControl?.changedIndependentVariables || [],
      itemTags: activeQuestion.generationMetadata?.itemTags || null,
      extraPracticeMode: activeQuestion.extraPracticeMode || null,
      queueItemId: activeQuestion.queueItemId || activeQuestion.queueItem?.id || null,
      stageLabel: activeQuestion.stageLabel,
      elapsedSeconds,
      answerRevisionCount: answerRevisionCountForAttempt,
      interactionMetadataSource: "client_observed_count",
      deliveryId: activeQuestion.deliveryId || null,
      scoringSource: "prototype_fallback",
    });
  }
  renderPracticeSummary();

  if (requiresIndependentRetry) {
    if (remoteAttempt) {
      canAdvanceQuestion = false;
      nextQuestion.disabled = true;
      nextQuestion.hidden = true;
      answerInput.value = "";
      resetAnswerRevisionTracking();
      await ensureActiveQuestionDelivery(activeQuestion);
    } else {
      practiceRuntime.restartQuestionTimer(activeQuestion.id);
      resetQuestionAttempt();
    }
    feedback.className = "feedback correct";
    feedback.textContent = "这次借助提示完成了。现在提示已收起，请独立重做同一道题，再继续下一步。";
    persistDailyPracticeSession();
    return;
  }

  if (isCorrect) {
    canAdvanceQuestion = true;
    nextQuestion.disabled = false;
    nextQuestion.hidden = false;
    feedback.className = "feedback correct";
    const optionalGroupComplete = activeQuestion.serverOptionalPractice
      ? !serverDailyPracticeRun?.optionalPractice?.currentStep
      : currentQuestionIndex >= practiceSequence.length - 1;
    const doneAll = activeQuestion.extraPracticeMode
      ? optionalGroupComplete
      : Boolean(serverDailyPracticeRun?.requiredPracticeCompleted) || currentQuestionIndex >= practiceSequence.length - 1;
    const progressText = doneAll
      ? activeQuestion.extraPracticeMode
        ? "这组题已完成，可以结束这组加练。"
        : "这一组已经走通了。"
      : "可以进入下一题。";
    feedback.textContent = `答对了。${progressText}`;
  } else {
    canAdvanceQuestion = false;
    nextQuestion.disabled = true;
    nextQuestion.hidden = true;
    feedback.className = "feedback wrong";
    feedback.textContent = getRetryFeedbackCopy();
  }
  persistDailyPracticeSession();
}

function handleResetPractice() {
  if (!ensurePracticeStarted("retry")) return;
  trackEvent("retry_clicked", {
    targetId: activeQuestion.id,
    previousHintDepth: revealedHints,
    attemptsBeforeRetry: practiceRuntime.questionSession.attempts.length,
    variantLevel: activeQuestion.variantLevel,
  });
  practiceRuntime.restartQuestionTimer(activeQuestion.id);
  resetQuestionAttempt("回到当前题重做。先看题目问什么，再处理数字。");
}

async function handleNextQuestion() {
  if (isMandatoryStageAssessmentGate()) {
    openMandatoryStageAssessmentGate("next_question");
    return;
  }
  if (!canAdvanceQuestion) return;

  if (activeQuestion.atlasExploration) {
    const completedExploration = activeAtlasExploration;
    const isWrongRetryReview = completedExploration?.kind === "wrong_retry";
    atlasPracticeResumeRepository.clear({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      deliveryId: completedExploration?.deliveryId || activeQuestion.deliveryId || null,
    });
    activeAtlasExploration = null;
    canAdvanceQuestion = false;
    nextQuestion.disabled = true;
    nextQuestion.hidden = true;
    trackEvent(isWrongRetryReview ? "atlas_wrong_retry_completed" : "atlas_related_practice_completed", {
      targetId: activeQuestion.id,
      familyId: completedExploration?.familyId || activeQuestion.logicId,
      source: isWrongRetryReview ? "knowledge_atlas_wrong_review" : "knowledge_atlas_library",
      deliveryId: activeQuestion.deliveryId || completedExploration?.deliveryId || null,
      extraPracticeMode: isWrongRetryReview ? "atlas_wrong_retry" : "atlas_related",
    });
    activeQuestion = getCurrentQuestion();
    void refreshServerKnowledgeAtlas();
    void refreshServerKnowledgeGraph();
    renderKnowledgeEvidencePanels();
    persistDailyPracticeSession();
    showView("atlas", { source: isWrongRetryReview ? "atlas_wrong_retry_completed" : "atlas_related_practice_completed" });
    return;
  }

  const completedStage = activeQuestion.stageLabel;
  const isOptionalPractice = Boolean(activeQuestion.extraPracticeMode);
  const isServerOptionalPractice = Boolean(activeQuestion.serverOptionalPractice);
  const usesServerProgression = Boolean(serverDailyPracticeRun?.id && !isOptionalPractice);
  let serverRunCompleted = Boolean(usesServerProgression && serverDailyPracticeRun.requiredPracticeCompleted);
  let nextIndex = null;

  if (isServerOptionalPractice) {
    const optionalNextIndex = ensureServerOptionalPracticeQuestion(serverDailyPracticeRun);
    if (optionalNextIndex !== null && optionalNextIndex > currentQuestionIndex) {
      currentQuestionIndex = optionalNextIndex;
      activeQuestion = getCurrentQuestion();
      practiceRuntime.startQuestion(activeQuestion.id);
      trackEvent("optional_practice_next_released", {
        targetId: activeQuestion.id,
        mode: activeQuestion.extraPracticeMode,
        source: "server_optional_practice",
      });
      renderQuestion();
      resetQuestionAttempt("继续下一道加练题。保持刚才的思路，再看新的条件。");
      persistDailyPracticeSession();
      return;
    }
  }

  if (usesServerProgression && !serverRunCompleted) {
    nextIndex = findServerRunQuestionIndex(serverDailyPracticeRun);
    if (nextIndex === null || nextIndex <= currentQuestionIndex) {
      const refreshedRun = await dailyPracticeRunRepository.get({
        studentId: studentProfile.id,
        subjectId: subjectSelection.subjectId,
        practiceDate: normalizePracticeDate(dailyTasks.date),
      });
      if (refreshedRun) serverDailyPracticeRun = refreshedRun;
      serverRunCompleted = Boolean(serverDailyPracticeRun?.requiredPracticeCompleted);
      nextIndex = findServerRunQuestionIndex(serverDailyPracticeRun);
    }
    if (!serverRunCompleted && (nextIndex === null || nextIndex <= currentQuestionIndex)) {
      canAdvanceQuestion = false;
      nextQuestion.disabled = true;
      nextQuestion.hidden = true;
      feedback.className = "feedback";
      feedback.textContent = "下一题正在确认，请稍后再试。";
      return;
    }
  }

  if (!serverRunCompleted && (nextIndex !== null || currentQuestionIndex < practiceSequence.length - 1)) {
    const completedQueueUnit = Boolean(activeQuestion.isQueueUnitLast);
    currentQuestionIndex = nextIndex ?? currentQuestionIndex + 1;
    activeQuestion = getCurrentQuestion();
    practiceRuntime.startQuestion(activeQuestion.id);
    practiceRuntime.setRecommendationState(activeQuestion.variantLevel);
    trackEvent(completedQueueUnit ? "daily_queue_unit_completed" : "variant_requested", {
      targetId: activeQuestion.id,
      fromStage: completedStage,
      toStage: activeQuestion.stageLabel,
      variantLevel: activeQuestion.variantLevel,
      reason: completedQueueUnit ? "controlled practice unit completed; continue to the next generated item" : activeQuestion.changeReason,
      queueItemId: activeQuestion.queueItemId || null,
      queueUnitIndex: activeQuestion.queueUnitIndex ?? null,
    });
    renderQuestion();
    resetQuestionAttempt(
      completedQueueUnit
        ? "这一组已经走通，继续下一题。"
        : `${activeQuestion.stageLabel}：${activeQuestion.changeReason}`,
    );
    persistDailyPracticeSession();
    return;
  }

  trackEvent(isOptionalPractice ? "optional_practice_completed" : "progression_completed", {
    targetId: activeQuestion.id,
    completedStages: practiceSequence.map((item) => item.stageLabel),
    nextRecommendation: isOptionalPractice ? "可以回到今日任务，也可以继续自愿加练" : "可以结束今日练习，也可以自愿再练几道",
  });
  canAdvanceQuestion = false;
  nextQuestion.disabled = true;
  nextQuestion.hidden = true;
  if (isOptionalPractice) {
    optionalPracticeActive = false;
  } else {
    requiredPracticeCompleted = true;
  }
  feedback.className = "feedback correct";
  feedback.textContent = isOptionalPractice
    ? activeQuestion.extraPracticeMode === "wrong_retry"
      ? "这组错题已经重做完成。"
      : activeQuestion.extraPracticeMode === "atlas_related"
        ? "这次图鉴探索已完成。"
      : "这组加练已完成。"
    : "今天这一组已经完成。想继续的话，再练几道。";
  persistDailyPracticeSession();
  renderBehaviorSummary();
  renderPracticeSummary();
  if (serverDailyPracticeRun?.id) {
    void hydrateServerPracticeSummary().then((summary) => {
      if (summary) renderPracticeSummary();
    });
  }
}

async function handleRetryWrongQuestions() {
  const summary = getPracticeSummary();
  if (!summary.wrongItems.length || optionalPracticeActive) return;

  if (serverDailyPracticeRun?.id && dailyPracticeRunRepository.remoteAvailable()) {
    const started = await startOptionalPractice({ mode: "wrong_retry", count: null, source: "practice_summary" });
    if (started) return;
    if (dailyPracticeRunRepository.remoteAvailable()) {
      const refreshedSummary = await hydrateServerPracticeSummary();
      feedback.className = "feedback";
      feedback.textContent =
        refreshedSummary?.wrongRetry?.available === false
          ? "这些错题已经安排过重做。"
          : "这些错题正在整理为可安全重做的原题，请稍后再试。";
      return;
    }
  }

  const retryQuestions = [...new Map(
    summary.wrongItems
      .filter((item) => item.questionSnapshot?.id)
      .map((item) => [item.questionSnapshot.id, item.questionSnapshot]),
  ).values()];
  if (!retryQuestions.length) return;

  trackEvent("wrong_retry_requested", {
    targetId: activeQuestion.id,
    wrongCount: retryQuestions.length,
    source: "practice_summary",
  });
  const startIndex = practicePlan.practiceSequence.length;
  practicePlan.practiceSequence.push(
    ...retryQuestions.map((question) => ({
      ...question,
      stageLabel: "错题重做",
      changeReason: "回到刚才做错的题，再独立完成一次。",
      isQueueUnitLast: false,
    })),
  );
  practiceSequence = practicePlan.practiceSequence;
  currentQuestionIndex = startIndex;
  activeQuestion = getCurrentQuestion();
  optionalPracticeActive = true;
  practiceRuntime.startQuestion(activeQuestion.id);
  renderQuestion();
  renderPracticeSummary();
  resetQuestionAttempt("开始重做刚才的错题。先自己想一遍，不急着看答案。");
  persistDailyPracticeSession();
}

function handleMoreSameType() {
  startOptionalPractice({ mode: "same_type", count: 3, source: "practice_summary" });
}

function handleMoreHarderType() {
  const count = Number(document.querySelector("#summary-harder-practice-count")?.value || 3);
  startOptionalPractice({ mode: "harder", count, source: "practice_summary" });
}

async function startOptionalPractice({ mode, count, source }) {
  if (isMandatoryStageAssessmentGate()) {
    openMandatoryStageAssessmentGate(source);
    return false;
  }
  if (!requiredPracticeCompleted || optionalPracticeActive) return false;
  if (serverDailyPracticeRun?.id && dailyPracticeRunRepository.remoteAvailable()) {
    const run = await dailyPracticeRunRepository.startOptionalPractice({
      runId: serverDailyPracticeRun.id,
      mode,
      count,
      source,
    });
    if (!run) return false;
    synchronizeServerDailyPracticeRun(run);
    if (!activeQuestion?.serverOptionalPractice) return false;
    practiceRuntime.startQuestion(activeQuestion.id);
    const eventType =
      mode === "wrong_retry" ? "wrong_retry_requested" : mode === "harder" ? "harder_extra_practice_requested" : "same_type_more_requested";
    trackEvent(eventType, {
      targetId: activeQuestion.id,
      knowledgePoint: activeQuestion.knowledgePoint,
      source,
      mode,
      requestedCount: count,
      generationSource: "server_optional_practice",
    });
    void hydrateServerPracticeSummary().then((summary) => {
      if (summary) renderPracticeSummary();
    });
    renderPracticeSummary();
    renderQuestion();
    resetQuestionAttempt(
      mode === "wrong_retry"
        ? "开始重做刚才的错题。先自己想一遍，不急着看答案。"
        : mode === "harder"
          ? run.optionalPractice?.challengeRoute === "knowledge_graph_successor"
            ? "这是自愿挑战。今天的必做部分已经完成，接下来试试相连的新知识点。"
            : "这是自愿挑战。今天的必做部分已经完成，接下来试试多一个整理步骤的题。"
          : "这是自愿加练。今天的必做部分已经完成，继续做同类型的新题。",
    );
    persistDailyPracticeSession();
    return true;
  }
  if (mode === "wrong_retry") return false;
  const family = shanghaiMathItemFamilies.find((item) => item.id === activeQuestion.logicId) || activeGeneratedQuestionFamily;
  const instructionalGrade = getDailyInstructionalGrade();
  const successor =
    mode === "harder" && family
      ? selectVerifiedGraphSuccessorFamilies({
          anchorFamilyId: family.id,
          behaviorEvents: behaviorEventRepository.listByStudent(studentProfile.id, subjectSelection.subjectId),
          families: shanghaiMathItemFamilies,
          instructionalGrade,
        })[0] || null
      : null;
  const challengeFamily = successor || family;
  const variantLevels =
    mode === "harder"
      ? successor
        ? ["original"]
        : createSameFamilyHarderVariantSequence({ family: challengeFamily, count })
      : ["context_change", "change_one_number", "change_two_numbers"];
  const seedBase = 100 + practicePlan.practiceSequence.length * 11;
  const candidates = Array.from({ length: count }, (_, index) =>
    validateMathQuestionCandidate(
      generateMathQuestionCandidate({
        aiVersion: appState.getSnapshot().aiVersion,
        family: challengeFamily,
        seed: seedBase + index,
        instructionalGrade,
        variantLevel: variantLevels[index % variantLevels.length],
      }),
    ),
  ).filter((candidate) => candidate.qualityStatus === "system_validated");
  const appended = appendGeneratedExtraPractice({
    practicePlan,
    candidates,
    mode,
    challengeRoute: successor ? "knowledge_graph_successor" : "same_family_deeper_variant",
  });
  if (!appended.count) return false;

  currentQuestionIndex = appended.startIndex;
  activeQuestion = getCurrentQuestion();
  optionalPracticeActive = true;
  practiceRuntime.startQuestion(activeQuestion.id);
  trackEvent(mode === "harder" ? "harder_extra_practice_requested" : "same_type_more_requested", {
    targetId: activeQuestion.id,
    knowledgePoint: activeQuestion.knowledgePoint,
    source,
    mode,
    requestedCount: appended.count,
    variantLevels: candidates.map((candidate) => candidate.metadataTags.variantLevel),
  });
  renderPracticeSummary();
  renderQuestion();
  resetQuestionAttempt(
    mode === "harder"
      ? successor
        ? "来试试相连的新知识点。"
        : "来几道需要先整理信息的挑战题。"
      : `再练几道同类型题。`,
  );
  persistDailyPracticeSession();
  return true;
}

function createAtlasPracticeRawQuestion({ delivery, kind, stageLabel, changeReason }) {
  if (!delivery?.id || !delivery?.question) return null;
  return {
    id: `server-atlas-${kind}-${delivery.id}`,
    logicId: delivery.question.familyId,
    variantLevel: delivery.question.variantLevel || "original",
    knowledgePoint: delivery.question.knowledgePoint || stageLabel,
    prompt: "题目准备中",
    answer: null,
    steps: [],
    hints: [],
    guidedMode: { steps: [] },
    diagnosticTags: [],
    generationMetadata: {
      sourceMode: kind === "wrong_retry" ? "server_knowledge_atlas_wrong_retry" : "server_knowledge_atlas_exploration",
      atlasNodeIds: delivery.question.metadata?.atlasNodeIds || [],
      abilityTags: delivery.question.metadata?.abilityTags || [],
      itemTags: delivery.question.metadata?.itemTags || null,
    },
    stageLabel,
    changeReason,
    queueItemId: null,
    queueUnitIndex: null,
    queueStageIndex: null,
    isQueueUnitLast: false,
    extraPracticeMode: kind === "wrong_retry" ? "atlas_wrong_retry" : "atlas_related",
    atlasExploration: true,
  };
}

async function beginAtlasPracticeDelivery({
  changeReason,
  delivery,
  familyId,
  kind,
  requestedEventType,
  requestedSource,
  resetMessage,
  stageLabel,
}) {
  if (!delivery?.question) return;

  const resolvedFamilyId = familyId || delivery.question.familyId || null;
  const rawQuestion = createAtlasPracticeRawQuestion({ delivery, kind, stageLabel, changeReason });
  if (!rawQuestion) return;
  activeAtlasExploration = { deliveryId: delivery.id, familyId: resolvedFamilyId, kind, question: rawQuestion };
  let deliveryState = questionDeliveryRepository.adoptDelivery({
    questionId: rawQuestion.id,
    delivery,
    source: kind === "wrong_retry" ? "knowledge_atlas_wrong_retry" : "knowledge_atlas_exploration",
  });
  const started = await questionDeliveryRepository.markStarted({
    questionId: rawQuestion.id,
    studentId: studentProfile.id,
  });
  if (started?.state) deliveryState = started.state;
  if (!deliveryState?.delivery) {
    activeAtlasExploration = null;
    return;
  }
  atlasPracticeResumeRepository.save({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    deliveryId: delivery.id,
    familyId: resolvedFamilyId,
    kind,
  });

  activeQuestion = getCurrentQuestion();
  revealedHints = deliveryState.revealedHints.length;
  guidedStepIndex = Math.max(0, deliveryState.revealedGuidedSteps.length - 1);
  practiceRuntime.startQuestion(activeQuestion.id);
  trackEvent(requestedEventType, {
    targetId: activeQuestion.id,
    familyId: resolvedFamilyId,
    source: requestedSource,
    deliveryId: delivery.id,
    extraPracticeMode: rawQuestion.extraPracticeMode,
  });
  showView("practice", { source: requestedSource });
  renderQuestion();
  renderPracticeSummary();
  renderHints();
  renderSupport();
  resetQuestionAttempt(resetMessage);
}

async function restoreAtlasPracticeResume() {
  if (!hasAuthenticatedStudentIdentity || activeAtlasExploration || !questionDeliveryRepository.remoteAvailable()) return false;
  const resume = atlasPracticeResumeRepository.find({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
  });
  if (!resume) return false;

  const provisionalQuestionId = `server-atlas-${resume.kind}-${resume.deliveryId}`;
  let deliveryState = await questionDeliveryRepository.hydrateDelivery({
    questionId: provisionalQuestionId,
    deliveryId: resume.deliveryId,
    source: resume.kind === "wrong_retry" ? "knowledge_atlas_wrong_retry_resume" : "knowledge_atlas_exploration_resume",
  });
  const delivery = deliveryState?.delivery;
  if (!delivery) return false;
  if (
    delivery.studentId !== studentProfile.id ||
    delivery.subjectId !== subjectSelection.subjectId ||
    delivery.status === "completed" ||
    !delivery.question?.familyId
  ) {
    atlasPracticeResumeRepository.clear({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      deliveryId: resume.deliveryId,
    });
    return false;
  }

  const familyId = delivery.question.familyId;
  if (resume.familyId && resume.familyId !== familyId) {
    atlasPracticeResumeRepository.clear({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      deliveryId: resume.deliveryId,
    });
    return false;
  }

  const stageLabel = resume.kind === "wrong_retry" ? "错题重做" : "图鉴探索";
  const changeReason =
    resume.kind === "wrong_retry"
      ? "这是你选择回看的原题，不占用今日任务。"
      : "这是你主动选择的一题，不占用今日任务。";
  const rawQuestion = createAtlasPracticeRawQuestion({
    delivery,
    kind: resume.kind,
    stageLabel,
    changeReason,
  });
  if (!rawQuestion) return false;

  activeAtlasExploration = {
    deliveryId: delivery.id,
    familyId,
    kind: resume.kind,
    question: rawQuestion,
  };
  if (delivery.status === "delivered") {
    const started = await questionDeliveryRepository.markStarted({
      questionId: rawQuestion.id,
      studentId: studentProfile.id,
    });
    if (started?.state) deliveryState = started.state;
  }
  activeQuestion = getCurrentQuestion();
  revealedHints = deliveryState.revealedHints.length;
  guidedStepIndex = Math.max(0, deliveryState.revealedGuidedSteps.length - 1);
  canAdvanceQuestion = false;
  practiceRuntime.startQuestion(activeQuestion.id);
  feedback.className = "feedback";
  feedback.textContent = "继续刚才的这一题。需要时再打开提示。";
  showView("practice", { source: "atlas_practice_resumed" });
  renderQuestion();
  renderPracticeSummary();
  renderHints();
  renderSupport();
  return true;
}

async function startKnowledgeAtlasExploration(familyId) {
  if (!familyId || activeAtlasExploration) return;

  if (!hasAuthenticatedStudentIdentity) {
    const family = shanghaiMathItemFamilies.find((item) => item.id === familyId);
    if (!family) return;
    const seed = [...familyId].reduce((total, character) => total + character.charCodeAt(0), 17);
    const candidate = validateMathQuestionCandidate(
      generateMathQuestionCandidate({
        aiVersion: appState.getSnapshot().aiVersion,
        family,
        instructionalGrade: family.gradeBands.includes(getDailyInstructionalGrade())
          ? getDailyInstructionalGrade()
          : family.gradeBands.at(-1) || getDailyInstructionalGrade(),
        seed,
        variantLevel: "two_steps_added_variant",
      }),
    );
    if (candidate.qualityStatus !== "system_validated") return;
    const question = createGeneratedPracticeQuestion({
      candidate,
      fallbackQuestion: practicePlan.baseQuestion,
      stageLabel: "图鉴探索",
      changeReason: "这是你主动选择的一题，不占用今日任务。",
    });
    if (!question) return;
    question.atlasExploration = true;
    question.extraPracticeMode = "atlas_related";
    activeAtlasExploration = { deliveryId: null, familyId, kind: "exploration", question };
    activeQuestion = getCurrentQuestion();
    practiceRuntime.startQuestion(activeQuestion.id);
    trackEvent("atlas_related_practice_requested", {
      targetId: activeQuestion.id,
      familyId,
      source: "knowledge_atlas_library",
      extraPracticeMode: "atlas_related",
    });
    showView("practice", { source: "knowledge_atlas_library" });
    renderQuestion();
    renderPracticeSummary();
    resetQuestionAttempt("这是你主动探索的一题。先自己试试，需要时再打开提示。");
    persistDailyPracticeSession();
    return;
  }

  if (!knowledgeAtlasExplorationRepository.remoteAvailable()) return;

  const created = await knowledgeAtlasExplorationRepository.start({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    familyId,
  });
  await beginAtlasPracticeDelivery({
    changeReason: "这是你主动选择的一题，不占用今日任务。",
    delivery: created?.delivery,
    familyId,
    kind: "exploration",
    requestedEventType: "atlas_related_practice_requested",
    requestedSource: "knowledge_atlas_library",
    resetMessage: "这是你主动探索的一题。先自己试试，需要时再打开提示。",
    stageLabel: "图鉴探索",
  });
}

async function startKnowledgeAtlasWrongRetry(questionId) {
  if (!questionId || activeAtlasExploration || !knowledgeAtlasExplorationRepository.remoteAvailable()) return;

  const created = await knowledgeAtlasExplorationRepository.startWrongRetry({
    studentId: studentProfile.id,
    subjectId: subjectSelection.subjectId,
    questionId,
  });
  await beginAtlasPracticeDelivery({
    changeReason: "这是你选择回看的原题，不占用今日任务。",
    delivery: created?.delivery,
    familyId: created?.delivery?.question?.familyId || null,
    kind: "wrong_retry",
    requestedEventType: "atlas_wrong_retry_requested",
    requestedSource: "knowledge_atlas_wrong_review",
    resetMessage: "先自己重做原题。你也可以打开上次的作答来回忆，再需要时使用提示。",
    stageLabel: "错题重做",
  });
}

function handleTogglePracticeDetails() {
  practiceDetailsVisible = !practiceDetailsVisible;
  trackEvent(practiceDetailsVisible ? "practice_detail_opened" : "practice_detail_closed", {
    targetId: "practice_summary_details",
    source: "practice_summary",
  });
  renderPracticeSummary();
  persistDailyPracticeSession();
}

async function hydrateFromLocalApi() {
  const [remotePlan, remoteAssessment, remotePersonalityAssessment, remoteStageAssessment, remoteDailyPracticeSession, remoteDailyPracticeHistory, remoteEvents, remotePreferences, remoteMessages, remoteOnboardingPrefill, remoteLearningGoalDraft, remoteLearningReport, remoteKnowledgeAtlas, remoteKnowledgeGraph] = await Promise.all([
    studentPlanRepository.hydrateLatest(studentProfile.id, subjectSelection.subjectId),
    assessmentSessionRepository.hydrateLatest({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    }),
    personalityAssessmentRunRepository.hydrate({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    }),
    assessmentSessionRepository.hydrateLatest({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      assessmentType: "stage_test",
    }),
    dailyPracticeSessionRepository.hydrate({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
      practiceDate: normalizePracticeDate(dailyTasks.date),
    }),
    dailyPracticeSessionRepository.hydrateHistory({
      studentId: studentProfile.id,
      subjectId: subjectSelection.subjectId,
    }),
    behaviorEventRepository.hydrateByStudent(studentProfile.id, subjectSelection.subjectId),
    studentPreferenceRepository.hydrate({
      studentId: studentProfile.id,
      defaults: studentPreferences,
    }),
    studentMessageRepository.hydrate(studentProfile.id, shouldSeedDemoHistory ? messages : []),
    onboardingPrefillRepository.hydrate({ studentId: studentProfile.id }),
    learningGoalDraftRepository.hydrate({ studentId: studentProfile.id, subjectId: subjectSelection.subjectId }),
    learningReportRepository.hydrate({ studentId: studentProfile.id, subjectId: subjectSelection.subjectId }),
    knowledgeAtlasRepository.hydrate({ studentId: studentProfile.id, subjectId: subjectSelection.subjectId }),
    knowledgeGraphRepository.hydrate({ studentId: studentProfile.id, subjectId: subjectSelection.subjectId }),
  ]);

  if (remotePlan) {
    activeStudentPlan = remotePlan;
    if (remotePlan.learningGoal) {
      activeLearningGoal = createMathLearningGoalDraft({ existingGoal: remotePlan.learningGoal });
    }
  } else if (remoteLearningGoalDraft?.learningGoal) {
    activeLearningGoal = createMathLearningGoalDraft({ existingGoal: remoteLearningGoalDraft.learningGoal });
  }
  if (remoteAssessment?.serverAuthoritative && remoteAssessment.assessmentType === "initial_onboarding") {
    activeInitialAssessment = remoteAssessment;
  }
  if (remotePersonalityAssessment?.serverAuthoritative) activePersonalityAssessment = remotePersonalityAssessment;
  if (remoteStageAssessment) activeStageAssessment = remoteStageAssessment;
  if (hasAuthenticatedStudentIdentity) {
    activeDailyPracticeSession = remoteDailyPracticeSession || null;
  } else if (remoteDailyPracticeSession) {
    activeDailyPracticeSession = remoteDailyPracticeSession;
  }
  if (remotePreferences) studentPreferences = remotePreferences;
  if (remoteMessages) studentMessages = remoteMessages;
  if (remoteOnboardingPrefill) onboardingPrefill = remoteOnboardingPrefill;
  if (remoteLearningGoalDraft) learningGoalDraft = remoteLearningGoalDraft;
  if (remoteLearningReport) serverLearningReport = remoteLearningReport;
  if (remoteKnowledgeAtlas) serverKnowledgePuzzleMap = remoteKnowledgeAtlas;
  if (remoteKnowledgeGraph) serverKnowledgeGraph = remoteKnowledgeGraph;
  refreshResolvedBasicBioInfo();
  void remoteDailyPracticeHistory;
  restoreServerPersonalityAssessmentResponses(remotePersonalityAssessment);
  remoteAssessment?.responses?.forEach((response) => appState.recordOnboardingResponse(response));
  practiceRuntime.importHistoricalEvents(remoteEvents);
  await resolveServerDailyPracticePlan();
  refreshPersonalizationFromOnboardingResponses();
  refreshTaskCadence();
  refreshStageTestCadence();
  restoreOnboardingProgress();
  if (!entryViewResolved) {
    entryViewResolved = true;
    if (!activeStudentPlan?.staticCurveConfirmedAt) {
      showView("onboarding", { source: "initial_setup" });
    }
  }
  await ensurePersonalityAssessmentRun();
  restoreDailyPracticeSession(activeDailyPracticeSession);
  await resolveServerDailyPracticeRun();
  await restoreAtlasPracticeResume();
  const restoredSummary = await hydrateServerPracticeSummary();
  if (!restoredSummary) restorePracticeSummaryFromBehaviorEvents(remoteEvents);
  renderInitialData();
  renderQuestion();
  renderHints();
  renderSupport();
  renderPracticeSummary();
  applyStudentPreferences();
  renderStudentSettingsPanel();
}

const practiceActionHandlers = {
  "start-stage-assessment": startStageAssessment,
  "skip-stage-assessment": skipStageAssessment,
  "submit-stage-assessment-answer": submitStageAssessmentAnswer,
  "reveal-hint": handleRevealHint,
  "submit-answer": handleSubmitAnswer,
  "reset-practice": handleResetPractice,
  "next-question": handleNextQuestion,
  "retry-wrong-questions": handleRetryWrongQuestions,
  "more-same-type": handleMoreSameType,
  "more-harder-type": handleMoreHarderType,
  "toggle-practice-details": handleTogglePracticeDetails,
  "open-previous-attempt": handleOpenPreviousAttempt,
  "guided-next-step": handleGuidedNextStep,
  "guided-submit-step": handleSubmitGuidedStep,
  "guided-export-process": handleExportGuidedProcess,
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const handler = practiceActionHandlers[button?.id];
  if (!handler) return;

  event.preventDefault();
  handler();
}, true);

document.querySelector("#student-profile-trigger")?.addEventListener("click", openStudentSettings);

refreshPersonalizationFromOnboardingResponses();
refreshTaskCadence();
refreshStageTestCadence();
restoreDailyPracticeSession(activeDailyPracticeSession);
applyStudentPreferences();
restoreOnboardingProgress();
renderStudentSettingsPanel();
renderInitialData();
appState.subscribe((snapshot) => {
  renderSystemFoundationPanel();
  renderOnboardingFlowPanel();
  if (snapshot.staticCurveConfirmed && getVisibleViewId() === "onboarding") {
    setText("#basic-info-next", "静态曲线已确认。今日任务会从这条曲线派发，可以进入练习。");
  }
});
if (!isLocalFreshOnboardingDemo) {
  renderQuestion();
  renderHints();
  renderSupport();
  renderPracticeSummary();
}
function trackEngagementSession(record) {
  if (!record) return;
  trackEvent(record.eventType, {
    targetId: "app_session",
    ...record.payload,
  });
}

trackEngagementSession(engagementSessionTracker.start({ entryView: getVisibleViewId() }));

document.addEventListener("visibilitychange", () => {
  const record =
    document.visibilityState === "hidden"
      ? engagementSessionTracker.pause({ lastView: getVisibleViewId() })
      : engagementSessionTracker.resume({ currentView: getVisibleViewId() });
  trackEngagementSession(record);
});

globalThis.addEventListener("pagehide", () => {
  trackEngagementSession(engagementSessionTracker.end({ lastView: getVisibleViewId() }));
});

function revealStudentApp() {
  document.body?.classList.remove("app-booting");
  document.querySelector("#student-app-loading")?.setAttribute("hidden", "");
}

async function hydrateStudentApp() {
  if (isLocalFreshOnboardingDemo) {
    const hasConfirmedCurve = Boolean(activeStudentPlan?.staticCurveConfirmedAt);
    showView(hasConfirmedCurve ? "practice" : "onboarding", {
      source: hasConfirmedCurve ? "confirmed_student_demo" : "fresh_student_onboarding",
    });
    if (hasConfirmedCurve) {
      renderQuestion();
      renderHints();
      renderSupport();
      renderPracticeSummary();
    }
    revealStudentApp();
    return;
  }

  try {
    await hydrateFromLocalApi();
  } catch {
    // Keep an authenticated student on their own blank onboarding baseline if a later request is unavailable.
    if (hasAuthenticatedStudentIdentity && !activeStudentPlan?.staticCurveConfirmedAt) {
      showView("onboarding", { source: "authenticated_setup_fallback" });
      renderInitialData();
    }
  } finally {
    revealStudentApp();
  }
}

void hydrateStudentApp();
