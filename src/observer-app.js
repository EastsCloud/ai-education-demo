import {
  accountUsers,
  basicBioInfo,
  behaviorEvents as seededBehaviorEvents,
  knowledgePuzzleMap as baseKnowledgePuzzleMap,
  learningParameterConfig,
  messages as seededMessages,
  personalityLogicLibrary,
  psychologicalPersonalityLibrary,
  professionalAbilityAssessment,
  professionalAbilityEvidence,
  reportSummary,
  studentProfile,
} from "./data/mock-data.js?v=math-catalog-v4-2";
import { renderObserverDashboard } from "./modules/observer-dashboard.js?v=authenticated-sync-1";
import { createBehaviorEventRepository } from "./services/behavior-event-repository.js?v=observer-dashboard-3";
import { createLearningReportRepository } from "./services/learning-report-repository.js?v=server-report-1";
import { createKnowledgeAtlasRepository } from "./services/knowledge-atlas-repository.js?v=server-knowledge-atlas-1";
import { createKnowledgeGraphRepository } from "./services/knowledge-graph-repository.js?v=api-envelope-1";
import { createObserverWorkspaceRepository } from "./services/observer-workspace-repository.js?v=peer-default-1";
import { createStudentMessageRepository } from "./services/student-message-repository.js?v=local-remote-gate-1";
import { createStudentPlanRepository } from "./services/student-plan-repository.js?v=assessment-cadence-1";
import { createAssessmentSessionRepository } from "./services/assessment-session-repository.js?v=knowledge-evidence-2";
import { createPersonalityAssessmentRunRepository } from "./services/personality-assessment-run-repository.js?v=observer-personality-sync-1";
import { createAuthClient } from "./services/auth-client.js?v=auth-client-1";
import { createSignInDestination, getEntryActionForUser } from "./services/app-entry-route-policy.js?v=auth-gate-1";
import { createAdjustedDynamicCurve } from "./services/dynamic-learning-curve-engine.js?v=curve-adjustment-3";
import { createLocalApiClient } from "./services/local-api-client.js?v=observer-authoritative-1";
import { buildKnowledgePuzzleMap } from "./services/knowledge-atlas-evidence-engine.js?v=knowledge-evidence-6";
import { buildAbilityMapFromRuntimeEvidence } from "./services/ability-map-engine.js?v=ability-evidence-3";
import { buildStudentKnowledgeGraph } from "./services/student-knowledge-graph-engine.js?v=student-knowledge-graph-1";
import {
  generatePersonalityQuestionSets,
  scorePersonalityQuestionSets,
} from "./services/personality-assessment-engine.js?v=personality-runtime-5";
import { createStudentOnboardingPrefillRepository } from "./services/student-onboarding-prefill-repository.js?v=onboarding-prefill-4";
import { createStudentLearningGoalDraftRepository } from "./services/student-learning-goal-draft-repository.js?v=learning-goal-draft-1";
import { createMathLearningGoalDraft, getMathLearningGoalOptions } from "./services/math-learning-goal-runtime.js?v=learning-goal-runtime-2";
import {
  getOnboardingPrefillOptions,
  normalizeOnboardingPrefillDraft,
  resolveOnboardingPrefill,
} from "./services/student-onboarding-prefill-model.js?v=subject-selection-1";
import { createStudentOnboardingBaseline } from "./services/student-runtime-identity.js?v=student-identity-2";
import { assessmentCadenceConfig } from "./data/learning-parameter-config.js?v=assessment-cadence-1";
import { waitForSession } from "./services/session-boot-guard.js?v=session-boot-guard-1";
import { isLocalObserverDemo, resolveLocalDemoContext } from "./services/local-demo-entry-policy.js?v=shared-demo-session-1";

const localObserverDemo = isLocalObserverDemo() ? resolveLocalDemoContext() : null;

const actorByRole = {
  parent: accountUsers.find((user) => user.roleHint === "parent"),
  teacher: accountUsers.find((user) => user.roleHint === "teacher"),
};

const dashboard = document.querySelector("#observer-dashboard");
const roleSelect = document.querySelector("#observer-role");
const studentSelect = document.querySelector("#observer-student");
const studentInitial = document.querySelector("#observer-student-initial");
const studentLabel = document.querySelector("#observer-student-label");
const saveState = document.querySelector("#observer-save-state");
const accountSwitch = document.querySelector("#observer-account-switch");
const workspaceRepository = createObserverWorkspaceRepository();
const messageRepository = createStudentMessageRepository({
  remoteEnabled: () => Boolean(signedInUser),
});
const behaviorRepository = createBehaviorEventRepository();
const learningReportRepository = createLearningReportRepository();
const knowledgeAtlasRepository = createKnowledgeAtlasRepository();
const knowledgeGraphRepository = createKnowledgeGraphRepository();
const planRepository = createStudentPlanRepository();
const assessmentSessionRepository = createAssessmentSessionRepository({
  allowLocalFallback: () => !signedInUser,
  allowRemoteMirror: () => !signedInUser,
});
const personalityAssessmentRunRepository = createPersonalityAssessmentRunRepository();
const onboardingPrefillRepository = createStudentOnboardingPrefillRepository({
  allowLocalFallback: () => !signedInUser,
});
const learningGoalDraftRepository = createStudentLearningGoalDraftRepository({
  allowLocalFallback: () => !signedInUser,
});
const authClient = createAuthClient();
const apiClient = createLocalApiClient();
const onboardingPrefillOptions = getOnboardingPrefillOptions();
const learningGoalOptions = getMathLearningGoalOptions();

let role = "parent";
let activeSection = "overview";
let workspace = null;
let plan = null;
let behaviorEvents = [];
let serverLearningReport = null;
let serverKnowledgePuzzleMap = null;
let serverKnowledgeGraph = null;
let currentDailyPracticePlan = null;
let assessmentResponses = [];
let personalityAssessmentResponses = [];
let initialAssessmentStatus = null;
let personalityAssessmentStatus = null;
let studentMessages = [];
let signedInUser = null;
let curveAdjustmentDraft = null;
let curveAdjustmentError = null;
let observedStudent = studentProfile;
let linkedStudents = [];
let workspaceLoadVersion = 0;
let onboardingPrefill = null;
let learningGoalDraft = null;
let serverOnboardingStatus = null;

const DEMO_LINKED_STUDENT = {
  studentId: localObserverDemo?.studentId || studentProfile.id,
  relationshipType: localObserverDemo?.role === "teacher" ? "teacher" : "parent",
  displayName: localObserverDemo ? "新同学" : studentProfile.name,
  gradeLabel: localObserverDemo ? null : "小学五年级",
};

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function selectedStudentStorageKey() {
  return signedInUser?.userId ? `ai-education-observer-selected-student-${signedInUser.userId}` : null;
}

function readSelectedStudentId() {
  const key = selectedStudentStorageKey();
  const storage = getBrowserStorage();
  if (!key || !storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function persistSelectedStudentId(studentId) {
  const key = selectedStudentStorageKey();
  const storage = getBrowserStorage();
  if (!key || !storage || !studentId) return;
  try {
    storage.setItem(key, studentId);
  } catch {
    // Remembering the last viewed student is only a convenience.
  }
}

function studentFromLink(link) {
  return {
    ...studentProfile,
    id: link.studentId,
    name: link.displayName || "学生",
    gradeLabel: link.gradeLabel || null,
    relationshipType: link.relationshipType || null,
  };
}

function getObservedStudentOnboardingBaseline() {
  if (observedStudent?.id === studentProfile.id) return basicBioInfo;

  return createStudentOnboardingBaseline({
    identity: {
      studentId: observedStudent?.id || null,
      gradeLabel: observedStudent?.gradeLabel || null,
      useDemoSeedData: false,
    },
    demoBio: basicBioInfo,
  });
}

function studentInitialText(name) {
  return Array.from(String(name || "学生").trim())[0] || "学";
}

function updateObservedStudentIdentity() {
  if (!observedStudent) {
    if (studentInitial) studentInitial.textContent = "-";
    if (studentLabel) studentLabel.textContent = "等待关联学生";
    return;
  }
  if (studentInitial) studentInitial.textContent = studentInitialText(observedStudent.name);
  if (studentLabel) studentLabel.textContent = `${observedStudent.name} · 数学`;
}

function renderStudentPicker() {
  if (!studentSelect) return;
  studentSelect.replaceChildren();

  if (!linkedStudents.length) {
    const option = new Option("暂无已关联学生", "");
    option.selected = true;
    studentSelect.add(option);
    studentSelect.disabled = true;
    return;
  }

  linkedStudents.forEach((student) => {
    const suffix = student.gradeLabel ? ` · ${student.gradeLabel}` : "";
    const option = new Option(`${student.displayName || "学生"}${suffix}`, student.studentId);
    option.selected = student.studentId === observedStudent?.id;
    studentSelect.add(option);
  });
  studentSelect.disabled = linkedStudents.length < 2;
}

function resetStudentWorkspace() {
  workspaceLoadVersion += 1;
  activeSection = "overview";
  workspace = null;
  plan = null;
  behaviorEvents = [];
  serverLearningReport = null;
  serverKnowledgePuzzleMap = null;
  serverKnowledgeGraph = null;
  currentDailyPracticePlan = null;
  assessmentResponses = [];
  personalityAssessmentResponses = [];
  initialAssessmentStatus = null;
  personalityAssessmentStatus = null;
  studentMessages = [];
  onboardingPrefill = null;
  learningGoalDraft = null;
  serverOnboardingStatus = null;
  curveAdjustmentDraft = null;
  curveAdjustmentError = null;
}

function renderNoLinkedStudentState() {
  dashboard.innerHTML = `
    <section class="observer-empty-state">
      <p class="label">还没有学生</p>
      <h1>关联一位学生后，学习记录会出现在这里。</h1>
      <p>学生、家长和老师之间的绑定由账号管理完成；未关联时不会显示任何学习数据。</p>
    </section>
  `;
}

function actor() {
  return signedInUser || actorByRole[role] || actorByRole.parent;
}

function updateSaveState(text) {
  saveState.textContent = text;
}

function setObserverLoadingCopy(copy) {
  const label = document.querySelector("#observer-app-loading span");
  if (label) label.textContent = copy;
}

function revealObserverApp() {
  document.querySelector("#observer-shell")?.removeAttribute("hidden");
  document.querySelector("#observer-app-loading")?.setAttribute("hidden", "");
}

function returnToSignIn() {
  setObserverLoadingCopy("暂时无法进入观察空间，正在回到登录页。");
  globalThis.location.replace(createSignInDestination());
}

function renderObserverUnavailableState() {
  dashboard.innerHTML = `
    <section class="observer-empty-state">
      <p class="label">暂时无法读取</p>
      <h1>观察空间还没有准备好。</h1>
      <p>请稍后刷新页面，再继续查看学生的学习记录。</p>
    </section>
  `;
}

async function resolveSignedInRole() {
  if (localObserverDemo) {
    role = localObserverDemo.role;
    roleSelect.value = role;
    updateSaveState("正在同步学习记录");
    return true;
  }
  if (!authClient.enabled) return true;

  try {
    const response = await waitForSession(authClient.getSession());
    const user = response?.session?.user;
    const action = getEntryActionForUser(user);
    if (action === "student") {
      globalThis.location.assign("./index.html");
      return false;
    }
    if (action === "observer") {
      signedInUser = user;
      role = user.role;
      roleSelect.value = role;
      roleSelect.disabled = true;
      updateSaveState(`已作为${role === "teacher" ? "老师" : "家长"}登录`);
      return true;
    }
  } catch {
    // The redirect below keeps protected observer data out of an unavailable session.
  }

  returnToSignIn();
  return false;
}

async function loadLinkedStudents() {
  if (!signedInUser) {
    linkedStudents = [DEMO_LINKED_STUDENT];
    observedStudent = studentFromLink(DEMO_LINKED_STUDENT);
    updateObservedStudentIdentity();
    renderStudentPicker();
    return true;
  }

  try {
    const response = await apiClient.getLinkedStudents();
    linkedStudents = Array.isArray(response?.students) ? response.students.filter((student) => student?.studentId) : [];
  } catch {
    linkedStudents = [];
    resetStudentWorkspace();
    observedStudent = null;
    renderStudentPicker();
    updateSaveState("暂时无法读取已关联学生");
    renderObserverUnavailableState();
    return false;
  }

  if (!linkedStudents.length) {
    resetStudentWorkspace();
    observedStudent = null;
    renderStudentPicker();
    updateSaveState("还没有已关联学生");
    renderNoLinkedStudentState();
    return false;
  }

  const rememberedStudentId = readSelectedStudentId();
  const selectedLink =
    linkedStudents.find((student) => student.studentId === rememberedStudentId) || linkedStudents[0];
  observedStudent = studentFromLink(selectedLink);
  updateObservedStudentIdentity();
  renderStudentPicker();
  return true;
}

function render() {
  if (!workspace || !observedStudent) return;
  if (roleSelect && !signedInUser) roleSelect.value = role;
  const observedStudentBasicBio = getObservedStudentOnboardingBaseline();
  const abilityEvidenceMap =
    serverLearningReport?.abilityMap?.serverAuthoritative
      ? serverLearningReport.abilityMap
      : buildAbilityMapFromRuntimeEvidence({
          assessment: professionalAbilityAssessment,
          assessmentResponses,
          behaviorEvents,
          learningReport: serverLearningReport?.learning || null,
          initialEvidence: observedStudent.id === studentProfile.id ? professionalAbilityEvidence : [],
          studentId: observedStudent.id,
          subjectId: "math-linear-equations",
        });
  const knowledgePuzzleMap =
    serverKnowledgePuzzleMap?.serverAuthoritative
      ? serverKnowledgePuzzleMap
      : buildKnowledgePuzzleMap({
          baseMap: baseKnowledgePuzzleMap,
          behaviorEvents,
          assessmentResponses,
        });
  const personalityQuestionSets = generatePersonalityQuestionSets({
    studentId: observedStudent.id,
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
  const personalityProfile = scorePersonalityQuestionSets({
    questionSets: personalityQuestionSets,
    responses: personalityAssessmentResponses,
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
  const observerLearningGoal = createMathLearningGoalDraft({
    existingGoal: learningGoalDraft?.learningGoal || plan?.learningGoal || {},
  });
  const runtimeKnowledgeGraph =
    serverKnowledgeGraph ||
    (!signedInUser
      ? buildStudentKnowledgeGraph({
          behaviorEvents,
          includePrototypeEvidence: true,
          studentId: observedStudent.id,
          subjectId: "math-linear-equations",
        })
      : null);
  renderObserverDashboard({
    activeSection,
    abilityMap: abilityEvidenceMap,
    behaviorEvents,
    container: dashboard,
    curveAdjustmentDraft,
    curveAdjustmentError,
    knowledgePuzzleMap,
    knowledgeGraph: runtimeKnowledgeGraph,
    learningGoal: observerLearningGoal,
    learningGoalDraft,
    learningGoalOptions,
    learningParameterConfig,
    assessmentCadenceConfig,
    initialAssessmentStatus,
    messages: studentMessages,
    onboardingStatus: serverOnboardingStatus,
    onboardingPrefill,
    onboardingPrefillDraft: resolveOnboardingPrefill({
      studentId: observedStudent.id,
      basicBioInfo: observedStudentBasicBio,
      prefill: onboardingPrefill,
    }),
    onboardingPrefillOptions,
    personalityProfile,
    personalityAssessmentStatus,
    async onAssessmentCadenceUpdate({ suggestedAfterPracticeDays, mandatoryAfterPracticeDays }) {
      if (!plan) {
        updateSaveState("请先由学生确认学习曲线");
        return;
      }
      try {
        const minimumGap = assessmentCadenceConfig.defaults.minimumPracticeDaysBetweenSuggestionAndRequired;
        if (mandatoryAfterPracticeDays < suggestedAfterPracticeDays + minimumGap) {
          throw new Error("invalid_assessment_cadence");
        }
        if (signedInUser) {
          const response = await apiClient.updateAssessmentCadence({
            studentId: observedStudent.id,
            subjectId: "math-linear-equations",
            suggestedAfterPracticeDays,
            mandatoryAfterPracticeDays,
          });
          plan = planRepository.replace(response.record) || response.record;
        } else {
          plan = planRepository.updateAssessmentCadence({
            studentId: observedStudent.id,
            subjectId: "math-linear-equations",
            assessmentCadence: {
              ...(plan.assessmentCadence || {}),
              suggestedAfterPracticeDays,
              mandatoryAfterPracticeDays,
              policyVersion: "guardian_configurable_assessment_cadence_v1",
              configuredByRole: role,
              configuredAt: new Date().toISOString(),
            },
          });
        }
        updateSaveState("测试节奏已保存");
      } catch (error) {
        updateSaveState(error instanceof Error ? "暂时无法保存测试节奏" : "暂时无法保存测试节奏");
      }
      render();
    },
    async onAssessmentRequest() {
      if (!plan) {
        updateSaveState("请先由学生确认学习曲线");
        return;
      }
      try {
        if (signedInUser) {
          const response = await apiClient.requestStageAssessment({
            studentId: observedStudent.id,
            subjectId: "math-linear-equations",
          });
          plan = planRepository.replace(response.record) || response.record;
        } else {
          const user = actor();
          plan = planRepository.updateAssessmentCadence({
            studentId: observedStudent.id,
            subjectId: "math-linear-equations",
            assessmentCadence: {
              ...(plan.assessmentCadence || {}),
              observerRequestedAt: new Date().toISOString(),
              observerRequestedByRole: role,
              observerRequestedByUserId: user.userId,
              observerRequestAcknowledgedAt: null,
              observerRequestAcknowledgedByRole: null,
              observerRequestStatus: "requested",
            },
          });
        }
        updateSaveState("已建议学生做一次测试，学生可自行选择");
      } catch {
        updateSaveState("暂时无法发送测试建议");
      }
      render();
    },
    async onOnboardingPrefillSave(values) {
      try {
        const draft = normalizeOnboardingPrefillDraft({
          studentId: observedStudent.id,
          basicBioInfo: observedStudentBasicBio,
          values,
        });
        const savedPrefill = await onboardingPrefillRepository.saveByObserver({
          studentId: observedStudent.id,
          prefill: draft,
        });
        if (!savedPrefill) throw new Error("onboarding_prefill_save_unconfirmed");
        onboardingPrefill = savedPrefill;
        updateSaveState("学生起点已保存，等待学生确认");
      } catch {
        updateSaveState("暂时无法保存学生起点");
      }
      render();
    },
    async onLearningGoalDraftSave(values) {
      if (plan?.staticCurveConfirmedAt) {
        updateSaveState("初始目标已确认；后续节奏请从动态曲线调整进入");
        return;
      }
      try {
        const learningGoal = createMathLearningGoalDraft({
          existingGoal: learningGoalDraft?.learningGoal || {},
          values,
        });
        const savedDraft = await learningGoalDraftRepository.saveByObserver({
          studentId: observedStudent.id,
          subjectId: "math-linear-equations",
          learningGoal,
          actorRole: role,
        });
        if (!savedDraft) throw new Error("learning_goal_draft_save_unconfirmed");
        learningGoalDraft = savedDraft;
        updateSaveState("目标和学习节奏已建议给学生，等待学生确认");
      } catch {
        updateSaveState("暂时无法保存目标和学习节奏");
      }
      render();
    },
    async onMessageSubmit(body) {
      const user = actor();
      const message = {
        id: "message-" + role + "-" + Date.now(),
        studentId: observedStudent.id,
        fromUserId: user.userId,
        fromRole: role,
        title: "给你的话",
        body,
        createdAt: new Date().toISOString(),
      };
      try {
        const response = signedInUser ? await apiClient.saveStudentMessage({ message }) : null;
        if (signedInUser && !response?.message) throw new Error("student_message_save_unconfirmed");
        const savedMessage = response?.message || message;
        messageRepository.add(savedMessage, { mirror: !signedInUser });
        studentMessages = messageRepository.list(observedStudent.id);
        updateSaveState("留言已保存，学生端可以读取");
      } catch {
        updateSaveState("暂时无法保存留言");
        return;
      }
      render();
    },
    async onModuleToggle(moduleId) {
      const previousWorkspace = workspace;
      const candidate = workspaceRepository.toggleModule({
        actorUserId: actor().userId,
        studentId: observedStudent.id,
        role,
        moduleId,
        mirror: !signedInUser,
      });
      try {
        if (signedInUser) {
          const response = await apiClient.saveObserverWorkspace({ record: candidate });
          if (!response?.record) throw new Error("observer_workspace_save_unconfirmed");
          workspace = workspaceRepository.replace(response.record);
        } else {
          workspace = candidate;
        }
        updateSaveState("观察页已保存");
      } catch {
        workspace = previousWorkspace ? workspaceRepository.replace(previousWorkspace) : previousWorkspace;
        updateSaveState("暂时无法保存观察页设置");
      }
      render();
    },
    onCurveAdjustmentPreview(parameters) {
      try {
        if (!plan?.dynamicCurve?.canUpdate) throw new Error("需要先完成一次正式阶段测试");
        const user = actor();
        curveAdjustmentDraft = createAdjustedDynamicCurve({
          baseCurve: plan.dynamicCurve,
          learningGoal: plan.learningGoal,
          parameters,
          actorRole: role,
          actorUserId: user.userId,
        });
        curveAdjustmentError = null;
      } catch (error) {
        curveAdjustmentDraft = null;
        curveAdjustmentError = error instanceof Error ? error.message : "暂时无法生成调整方案";
      }
      render();
    },
    async onCurveAdjustmentConfirm() {
      if (!curveAdjustmentDraft) return;
      try {
        if (!signedInUser) throw new Error("请先登录后确认新的学习节奏");
        const response = await apiClient.confirmCurveAdjustment({
          studentId: observedStudent.id,
          subjectId: "math-linear-equations",
          parameters: curveAdjustmentDraft.adjustment.parameters,
        });
        plan = response.record;
        curveAdjustmentDraft = null;
        curveAdjustmentError = null;
        updateSaveState("新的学习节奏会从下一学习日开始");
      } catch (error) {
        curveAdjustmentError = error instanceof Error ? error.message.replace(/^local_api_/, "") : "暂时无法确认调整";
      }
      render();
    },
    onSectionChange(section) {
      activeSection = section;
      render();
    },
    plan,
    dailyPracticePlan: currentDailyPracticePlan,
    learningReport: serverLearningReport,
    reportSummary,
    student: observedStudent,
    workspace,
  });
}

async function loadRoleWorkspace() {
  if (!observedStudent?.id) {
    renderNoLinkedStudentState();
    return false;
  }

  if (roleSelect && !signedInUser) roleSelect.value = role;
  const loadVersion = ++workspaceLoadVersion;
  const studentId = observedStudent.id;
  updateSaveState("正在读取学习记录");
  const currentActor = actor();
  try {
    const [
      nextWorkspace,
      nextPlan,
      nextAssessment,
      nextPersonalityAssessment,
      nextEvents,
      nextMessages,
      remoteProfile,
      nextOnboardingPrefill,
      nextLearningGoalDraft,
      nextOnboardingStatus,
      nextLearningReport,
      nextKnowledgeAtlas,
      nextKnowledgeGraph,
      nextDailyPracticePlan,
    ] = await Promise.all([
      workspaceRepository.hydrate({ actorUserId: currentActor.userId, studentId, role }),
      planRepository.hydrateLatest(studentId, "math-linear-equations"),
      assessmentSessionRepository.hydrateLatest({
        studentId,
        subjectId: "math-linear-equations",
      }),
      signedInUser
        ? personalityAssessmentRunRepository.hydrate({
            studentId,
            subjectId: "math-linear-equations",
          })
        : assessmentSessionRepository.hydrateLatest({
            studentId,
            subjectId: "math-linear-equations",
            assessmentType: "onboarding_personality",
          }),
      behaviorRepository.hydrateByStudent(studentId, "math-linear-equations"),
      messageRepository.hydrate(studentId, studentId === studentProfile.id ? seededMessages : []),
      apiClient.getStudentProfile({ studentId }).catch(() => null),
      onboardingPrefillRepository.hydrate({ studentId }),
      learningGoalDraftRepository.hydrate({ studentId, subjectId: "math-linear-equations" }),
      apiClient
        .getStudentOnboardingStatus({ studentId, subjectId: "math-linear-equations" })
        .then((response) => response?.status || null)
        .catch(() => null),
      learningReportRepository.hydrate({ studentId, subjectId: "math-linear-equations" }),
      knowledgeAtlasRepository.hydrate({ studentId, subjectId: "math-linear-equations" }),
      knowledgeGraphRepository.hydrate({ studentId, subjectId: "math-linear-equations" }),
      apiClient
        .getLatestDailyPracticePlan({ studentId, subjectId: "math-linear-equations" })
        .then((response) => response?.plan || null)
        .catch(() => null),
    ]);
    if (loadVersion !== workspaceLoadVersion || observedStudent?.id !== studentId) return false;

    if (remoteProfile?.profile) {
      observedStudent = {
        ...studentProfile,
        id: remoteProfile.profile.studentId,
        name: remoteProfile.profile.displayName || observedStudent.name,
        gradeLabel: remoteProfile.profile.gradeLabel || observedStudent.gradeLabel,
      };
      linkedStudents = linkedStudents.map((student) =>
        student.studentId === studentId
          ? {
              ...student,
              displayName: remoteProfile.profile.displayName || student.displayName,
              gradeLabel: remoteProfile.profile.gradeLabel || student.gradeLabel,
            }
          : student,
      );
      updateObservedStudentIdentity();
      renderStudentPicker();
    }
    workspace = nextWorkspace;
    plan = nextPlan;
    assessmentResponses = nextAssessment?.responses || [];
    personalityAssessmentResponses = nextPersonalityAssessment?.responses || [];
    initialAssessmentStatus = nextAssessment?.status || null;
    personalityAssessmentStatus = nextPersonalityAssessment?.status || null;
    const seedEvents = observedStudent.id === studentProfile.id ? seededBehaviorEvents : [];
    const mergedEvents = new Map(seedEvents.map((event) => [event.eventId, event]));
    nextEvents.forEach((event) => mergedEvents.set(event.eventId, event));
    behaviorEvents = [...mergedEvents.values()];
    studentMessages = nextMessages;
    onboardingPrefill = nextOnboardingPrefill;
    learningGoalDraft = nextLearningGoalDraft;
    serverOnboardingStatus = nextOnboardingStatus;
    serverLearningReport = nextLearningReport;
    serverKnowledgePuzzleMap = nextKnowledgeAtlas;
    serverKnowledgeGraph = nextKnowledgeGraph;
    currentDailyPracticePlan = nextDailyPracticePlan;
    updateSaveState("学习记录已同步");
    render();
    return true;
  } catch {
    if (loadVersion !== workspaceLoadVersion || observedStudent?.id !== studentId) return false;
    updateSaveState("暂时无法读取学习记录");
    renderObserverUnavailableState();
    return false;
  }
}

roleSelect.addEventListener("change", (event) => {
  if (signedInUser) return;
  role = event.target.value;
  activeSection = "overview";
  loadRoleWorkspace();
});

studentSelect.addEventListener("change", (event) => {
  const selectedLink = linkedStudents.find((student) => student.studentId === event.target.value);
  if (!selectedLink || selectedLink.studentId === observedStudent?.id) return;
  resetStudentWorkspace();
  observedStudent = studentFromLink(selectedLink);
  persistSelectedStudentId(observedStudent.id);
  updateObservedStudentIdentity();
  renderStudentPicker();
  updateSaveState("正在切换学生");
  loadRoleWorkspace();
});

accountSwitch?.addEventListener("click", async (event) => {
  event.preventDefault();
  if (localObserverDemo?.sessionId) {
    globalThis.location.assign(`./demo.html?session=${encodeURIComponent(localObserverDemo.sessionId)}`);
    return;
  }
  try {
    await authClient.signOut();
  } finally {
    globalThis.location.replace("./signin.html");
  }
});

async function bootObserverApp() {
  if (!(await resolveSignedInRole())) return;

  try {
    if (await loadLinkedStudents()) await loadRoleWorkspace();
  } finally {
    revealObserverApp();
  }
}

void bootObserverApp();
