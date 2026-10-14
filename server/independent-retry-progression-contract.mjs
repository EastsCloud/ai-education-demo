import assert from "node:assert/strict";
import {
  advanceDailyPracticeRun,
  createDailyPracticeRun,
  getDailyPracticeRunStep,
  toPublicDailyPracticeRun,
} from "./daily-practice-run-service.mjs";

const dailyPlan = {
  id: "daily-plan-student-001-math-2026-07-14",
  questionQueue: {
    items: [
      {
        id: "queue-unit-1",
        familyId: "ratio_rate_unit",
        instructionalGrade: "G5",
        seed: 123,
      },
    ],
  },
};

function delivery({ id, run, support = {}, independentRetry = false }) {
  const step = getDailyPracticeRunStep(run);
  return {
    id,
    support: {
      revealedHintCount: 0,
      revealedGuidedStepCount: 0,
      ...support,
    },
    generationRequest: {
      practiceRunId: run.id,
      queueItemId: step.queueItem.id,
      progressionUnitIndex: step.unitIndex,
      progressionStageIndex: step.stageIndex,
      variantLevel: step.variantLevel,
      independentRetry,
    },
  };
}

let run = createDailyPracticeRun({
  dailyPlan,
  studentId: "student-001",
  subjectId: "math",
  practiceDate: "2026-07-14",
});
run = { ...run, activeDeliveryId: "delivery-hinted" };

const hinted = advanceDailyPracticeRun({
  delivery: delivery({ id: "delivery-hinted", run, support: { revealedHintCount: 1 } }),
  result: { isCorrect: true },
  run,
  completedAt: "2026-07-14T08:00:00.000Z",
});
assert.equal(hinted.advanced, false);
assert.equal(hinted.requiresIndependentRetry, true);
assert.equal(hinted.run.activeDeliveryId, null);
assert.equal(getDailyPracticeRunStep(hinted.run).variantLevel, "original");
assert.equal(toPublicDailyPracticeRun(hinted.run).independentRetryRequired, true);

run = { ...hinted.run, activeDeliveryId: "delivery-independent" };
const independent = advanceDailyPracticeRun({
  delivery: delivery({ id: "delivery-independent", run, independentRetry: true }),
  result: { isCorrect: true },
  run,
  completedAt: "2026-07-14T08:01:00.000Z",
});
assert.equal(independent.advanced, true);
assert.equal(independent.run.independentRetry, null);
assert.equal(getDailyPracticeRunStep(independent.run).variantLevel, "change_one_number");

console.log("independent-retry-progression-contract: passed");
