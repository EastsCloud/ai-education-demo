import assert from "node:assert/strict";
import { createDailyPracticePlanRepository } from "../src/services/daily-practice-plan-repository.js";
import { createDailyPracticeRunRepository } from "../src/services/daily-practice-run-repository.js";

const request = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
  practiceDate: "2026-07-21",
};
const gatePayload = {
  error: "mandatory_stage_assessment_required",
  assessmentCadence: {
    status: "mandatory",
    canStart: true,
    canSkip: false,
  },
};

function mandatoryGateError() {
  const error = new Error("local_api_409");
  error.code = gatePayload.error;
  error.payload = gatePayload;
  return error;
}

let planBlocked = true;
const planRepository = createDailyPracticePlanRepository({
  apiClient: {
    enabled: true,
    async resolveDailyPracticePlan() {
      if (planBlocked) throw mandatoryGateError();
      return { plan: { ...request, id: "daily-plan-after-test" } };
    },
  },
});

assert.equal(await planRepository.resolve({ planRequest: request }), null);
assert.equal(planRepository.remoteAvailable(), true);
assert.equal(planRepository.getBlockingState().assessmentCadence.status, "mandatory");
planBlocked = false;
assert.equal((await planRepository.resolve({ planRequest: request })).id, "daily-plan-after-test");
assert.equal(planRepository.getBlockingState(), null);

let runBlocked = true;
const runRepository = createDailyPracticeRunRepository({
  apiClient: {
    enabled: true,
    async resolveDailyPracticeRun() {
      if (runBlocked) throw mandatoryGateError();
      return { run: { ...request, id: "daily-run-after-test" } };
    },
  },
});
runRepository.remember({ ...request, id: "stale-browser-run" });
assert.equal(await runRepository.resolve({ runRequest: request }), null);
assert.equal(runRepository.remoteAvailable(), true);
assert.equal(runRepository.getBlockingState().assessmentCadence.status, "mandatory");
runBlocked = false;
assert.equal((await runRepository.resolve({ runRequest: request })).id, "daily-run-after-test");
assert.equal(runRepository.getBlockingState(), null);

console.log("mandatory-stage-assessment-client-gate-contract: passed");
