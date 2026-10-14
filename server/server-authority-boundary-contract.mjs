import assert from "node:assert/strict";
import { createDailyPracticePlanRepository } from "../src/services/daily-practice-plan-repository.js";
import { createDailyPracticeRunRepository } from "../src/services/daily-practice-run-repository.js";
import { createDailyPracticeSessionRepository } from "../src/services/daily-practice-session-repository.js";
import { createAssessmentSessionRepository } from "../src/services/assessment-session-repository.js";
import { createInitialAssessmentRunRepository } from "../src/services/initial-assessment-run-repository.js";
import { createQuestionDeliveryRepository } from "../src/services/question-delivery-repository.js";
import { createStageAssessmentRunRepository } from "../src/services/stage-assessment-run-repository.js";

const unavailableApi = {
  enabled: true,
  async createInitialAssessmentRun() {
    throw new Error("local_api_401");
  },
  async createQuestionDelivery() {
    throw new Error("local_api_401");
  },
  async createStageAssessmentRun() {
    throw new Error("local_api_401");
  },
  async resolveDailyPracticePlan() {
    throw new Error("local_api_401");
  },
  async resolveDailyPracticeRun() {
    throw new Error("local_api_401");
  },
};

const runRequest = {
  studentId: "student-auth",
  subjectId: "math-linear-equations",
  practiceDate: "2026-08-03",
};

const strictQuestionDelivery = createQuestionDeliveryRepository({
  apiClient: unavailableApi,
  allowLocalFallback: false,
});
assert.equal(
  await strictQuestionDelivery.ensureDelivery({
    questionId: "question-auth",
    deliveryRequest: {
      ...runRequest,
      mode: "practice",
      familyId: "math-linear-equations",
      instructionalGrade: "G4",
      variantLevel: "original",
      seed: 0,
    },
  }),
  null,
);
assert.equal(strictQuestionDelivery.remoteAvailable(), true);

const strictInitialAssessment = createInitialAssessmentRunRepository({
  apiClient: unavailableApi,
  allowLocalFallback: false,
});
assert.equal(await strictInitialAssessment.start({ runRequest }), null);
assert.equal(strictInitialAssessment.remoteAvailable(), true);

const strictStageAssessment = createStageAssessmentRunRepository({
  apiClient: unavailableApi,
  allowLocalFallback: false,
});
assert.equal(await strictStageAssessment.start({ runRequest }), null);
assert.equal(strictStageAssessment.remoteAvailable(), true);

const strictDailyPlan = createDailyPracticePlanRepository({
  apiClient: unavailableApi,
  allowLocalFallback: false,
});
assert.equal(await strictDailyPlan.resolve({ planRequest: runRequest }), null);
assert.equal(strictDailyPlan.remoteAvailable(), true);

const strictDailyRun = createDailyPracticeRunRepository({
  apiClient: unavailableApi,
  allowLocalFallback: false,
});
assert.equal(await strictDailyRun.resolve({ runRequest }), null);
assert.equal(strictDailyRun.remoteAvailable(), true);

const offlineInitialAssessment = createInitialAssessmentRunRepository({
  apiClient: unavailableApi,
  allowLocalFallback: true,
});
await offlineInitialAssessment.start({ runRequest });
assert.equal(offlineInitialAssessment.remoteAvailable(), false);

const offlineStageAssessment = createStageAssessmentRunRepository({
  apiClient: unavailableApi,
  allowLocalFallback: true,
});
await offlineStageAssessment.start({ runRequest });
assert.equal(offlineStageAssessment.remoteAvailable(), false);

const offlineDailyPlan = createDailyPracticePlanRepository({
  apiClient: unavailableApi,
  allowLocalFallback: true,
});
await offlineDailyPlan.resolve({ planRequest: runRequest });
assert.equal(offlineDailyPlan.remoteAvailable(), false);

const offlineDailyRun = createDailyPracticeRunRepository({
  apiClient: unavailableApi,
  allowLocalFallback: true,
});
await offlineDailyRun.resolve({ runRequest });
assert.equal(offlineDailyRun.remoteAvailable(), false);

let disabledDailyRuntimeRequestCount = 0;
const disabledDailyApi = {
  enabled: true,
  async resolveDailyPracticePlan() {
    disabledDailyRuntimeRequestCount += 1;
    return { plan: null };
  },
  async resolveDailyPracticeRun() {
    disabledDailyRuntimeRequestCount += 1;
    return { run: null };
  },
};
const localOnlyDailyPlan = createDailyPracticePlanRepository({ apiClient: disabledDailyApi, remoteEnabled: false });
const localOnlyDailyRun = createDailyPracticeRunRepository({ apiClient: disabledDailyApi, remoteEnabled: false });
assert.equal(await localOnlyDailyPlan.resolve({ planRequest: runRequest }), null);
assert.equal(await localOnlyDailyRun.resolve({ runRequest }), null);
assert.equal(disabledDailyRuntimeRequestCount, 0);

let mirroredDailySessionCount = 0;
const strictDailySessionStorage = {
  getItem() {
    return JSON.stringify([
      {
        id: "stale-browser-session",
        studentId: "student-auth",
        subjectId: "math-linear-equations",
        practiceDate: "2026-08-03",
        sessionStatus: "required_completed",
      },
    ]);
  },
  setItem() {},
};
const strictDailySession = createDailyPracticeSessionRepository({
  storage: strictDailySessionStorage,
  apiClient: {
    mirrorDailyPracticeSession() {
      mirroredDailySessionCount += 1;
    },
    async getDailyPracticeSession() {
      return { session: null };
    },
    async getDailyPracticeHistory() {
      return { sessions: [] };
    },
  },
  allowLocalFallback: false,
  allowRemoteMirror: false,
});
strictDailySession.save({
  id: "local-ui-session",
  studentId: "student-auth",
  subjectId: "math-linear-equations",
  practiceDate: "2026-08-03",
  sessionStatus: "in_progress",
});
assert.equal(mirroredDailySessionCount, 0);
assert.equal(
  await strictDailySession.hydrate({
    studentId: "student-auth",
    subjectId: "math-linear-equations",
    practiceDate: "2026-08-03",
  }),
  null,
);
assert.deepEqual(
  await strictDailySession.hydrateHistory({
    studentId: "student-auth",
    subjectId: "math-linear-equations",
  }),
  [],
);

let localDemoRemoteReadCount = 0;
const localDemoSession = createDailyPracticeSessionRepository({
  storage: strictDailySessionStorage,
  apiClient: {
    enabled: true,
    async getDailyPracticeSession() {
      localDemoRemoteReadCount += 1;
      return { session: null };
    },
    async getDailyPracticeHistory() {
      localDemoRemoteReadCount += 1;
      return { sessions: [] };
    },
  },
  allowLocalFallback: true,
  remoteEnabled: false,
});
assert.equal(
  (await localDemoSession.hydrate({
    studentId: "student-auth",
    subjectId: "math-linear-equations",
    practiceDate: "2026-08-03",
  }))?.id,
  "stale-browser-session",
);
assert.equal(
  (await localDemoSession.hydrateHistory({
    studentId: "student-auth",
    subjectId: "math-linear-equations",
  })).length,
  1,
);
assert.equal(localDemoRemoteReadCount, 0);

let mirroredAssessmentCount = 0;
const strictAssessmentSession = createAssessmentSessionRepository({
  storage: {
    getItem() {
      return JSON.stringify([
        {
          id: "stale-browser-assessment",
          studentId: "student-auth",
          subjectId: "math-linear-equations",
          assessmentType: "initial_onboarding",
          status: "completed",
        },
      ]);
    },
    setItem() {},
  },
  apiClient: {
    mirrorAssessmentSession() {
      mirroredAssessmentCount += 1;
    },
    async getAssessmentSession() {
      return { session: null };
    },
  },
  allowLocalFallback: false,
  allowRemoteMirror: false,
});
strictAssessmentSession.saveSession({
  id: "cached-assessment-session",
  studentId: "student-auth",
  subjectId: "math-linear-equations",
  assessmentType: "initial_onboarding",
  status: "in_progress",
});
assert.equal(mirroredAssessmentCount, 0);
assert.equal(
  await strictAssessmentSession.hydrateLatest({
    studentId: "student-auth",
    subjectId: "math-linear-equations",
  }),
  null,
);

console.log("server-authority-boundary-contract: passed");
