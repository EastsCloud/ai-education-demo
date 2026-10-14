import assert from "node:assert/strict";
import { createInitialLearningPlanRepository } from "../src/services/initial-learning-plan-repository.js";
import { createStudentLearningGoalDraftRepository } from "../src/services/student-learning-goal-draft-repository.js";
import { createStudentOnboardingPrefillRepository } from "../src/services/student-onboarding-prefill-repository.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const failingApi = {
  async getStudentLearningGoalDraft() {
    throw new Error("offline");
  },
  async getStudentOnboardingPrefill() {
    throw new Error("offline");
  },
  async saveStudentLearningGoalDraft() {
    throw new Error("offline");
  },
  async saveStudentOnboardingPrefill() {
    throw new Error("offline");
  },
  async confirmStudentOnboardingPrefill() {
    throw new Error("offline");
  },
  async confirmStudentLearningGoalDraft() {
    throw new Error("offline");
  },
};

const prefill = {
  basicInfo: {
    birthYear: 2016,
    birthMonth: 5,
    birthDay: 9,
    gradeLevelOptionId: "cn_primary_4",
  },
  subjectIds: ["math"],
};
const learningGoal = {
  targetGrade: "G5",
  durationWeeks: 12,
  dailyStudyMinutes: 30,
  weeklyStudyDays: 5,
};

const offlineStorage = createMemoryStorage();
const offlinePrefills = createStudentOnboardingPrefillRepository({
  storage: offlineStorage,
  apiClient: failingApi,
  allowLocalFallback: true,
});
const offlineSavedPrefill = await offlinePrefills.saveByObserver({ studentId: "student-offline", prefill });
assert.equal(offlineSavedPrefill.persistence, "browser_local_fallback");
assert.equal(offlinePrefills.find("student-offline").confirmationStatus, "prefilled");

const offlineStudentPrefill = await offlinePrefills.saveByStudent({
  studentId: "student-offline",
  prefill: { ...prefill, confirmSubjectSelection: true },
});
assert.equal(offlineStudentPrefill.persistence, "browser_local_fallback");
assert.ok(offlineStudentPrefill.subjectSelectionConfirmedAt);
const preservedLocalSelection = await offlinePrefills.saveByStudent({
  studentId: "student-offline",
  prefill,
});
assert.equal(preservedLocalSelection.subjectSelectionConfirmedAt, offlineStudentPrefill.subjectSelectionConfirmedAt);

let savedStudentPrefillRequest = null;
const recordingApi = {
  async saveStudentOnboardingPrefill(request) {
    savedStudentPrefillRequest = request;
    return {
      record: {
        ...request.prefill,
        subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
      },
    };
  },
};
const remoteStudentPrefills = createStudentOnboardingPrefillRepository({
  storage: createMemoryStorage(),
  apiClient: recordingApi,
  allowLocalFallback: false,
});
const remoteStudentPrefill = await remoteStudentPrefills.saveByStudent({
  studentId: "student-auth",
  prefill: { ...prefill, confirmSubjectSelection: true },
});
assert.equal(savedStudentPrefillRequest.prefill.confirmSubjectSelection, true);
assert.equal(remoteStudentPrefill.persistence, "server_authoritative");
assert.ok(remoteStudentPrefill.subjectSelectionConfirmedAt);

const authenticatedPrefills = createStudentOnboardingPrefillRepository({
  storage: offlineStorage,
  apiClient: failingApi,
  allowLocalFallback: false,
});
assert.equal(authenticatedPrefills.find("student-offline"), null);
assert.equal(await authenticatedPrefills.hydrate({ studentId: "student-offline" }), null);
assert.equal(await authenticatedPrefills.saveByStudent({ studentId: "student-auth", prefill }), null);
assert.equal(authenticatedPrefills.find("student-auth"), null);
assert.equal(await authenticatedPrefills.confirmByStudent({ studentId: "student-offline" }), null);

const remotePrefillApi = {
  async getStudentOnboardingPrefill() {
    return { record: { ...prefill, studentId: "student-auth", confirmationStatus: "prefilled" } };
  },
};
const serverBackedPrefills = createStudentOnboardingPrefillRepository({
  storage: createMemoryStorage(),
  apiClient: remotePrefillApi,
  allowLocalFallback: false,
});
const hydratedPrefill = await serverBackedPrefills.hydrate({ studentId: "student-auth" });
assert.equal(hydratedPrefill.persistence, "server_authoritative");
assert.equal(serverBackedPrefills.find("student-auth").persistence, "server_authoritative");

const offlineGoalStorage = createMemoryStorage();
const offlineGoals = createStudentLearningGoalDraftRepository({
  storage: offlineGoalStorage,
  apiClient: failingApi,
  allowLocalFallback: true,
});
const offlineGoal = await offlineGoals.saveByObserver({
  studentId: "student-offline",
  subjectId: "math-linear-equations",
  learningGoal,
});
assert.equal(offlineGoal.persistence, "browser_local_fallback");

const authenticatedGoals = createStudentLearningGoalDraftRepository({
  storage: offlineGoalStorage,
  apiClient: failingApi,
  allowLocalFallback: false,
});
assert.equal(authenticatedGoals.find({ studentId: "student-offline", subjectId: "math-linear-equations" }), null);
assert.equal(
  await authenticatedGoals.saveByObserver({
    studentId: "student-auth",
    subjectId: "math-linear-equations",
    learningGoal,
  }),
  null,
);

const localDemoPlans = createInitialLearningPlanRepository({
  apiClient: {
    enabled: true,
    async confirmInitialLearningPlan() {
      throw new Error("local demo must not call the authenticated plan endpoint");
    },
  },
  remoteEnabled: false,
});
assert.equal(localDemoPlans.remoteAvailable(), false);
assert.equal(await localDemoPlans.confirm({ planRequest: {} }), null);

console.log("onboarding-persistence-boundary-contract: passed");
