import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createDailyQuestionQueue } from "../src/services/daily-question-queue-engine.js";

function answerEvent({
  familyId,
  hintsOpened = 0,
  isCorrect = true,
  queueItemId,
  timestamp,
  variantLevel = "original",
}) {
  return {
    eventType: "answer_submitted",
    timestamp,
    payload: {
      questionFamilyId: familyId,
      isCorrect,
      hintsOpened,
      queueItemId,
      scoringSource: "server_authoritative",
      variantLevel,
    },
  };
}

function challengeQueue(behaviorEvents) {
  return createDailyQuestionQueue({
    allocation: {
      buckets: {
        wrong_retry: 0,
        correct_review: 0,
        new_stage_questions: 0,
        challenge_extension: 1,
      },
    },
    behaviorEvents,
    date: "2026-07-14",
    dailyMinutes: 8,
    plannedFamilyId: "ratio_rate_unit",
    families: shanghaiMathItemFamilies,
    targetGrade: "G5",
  });
}

const stablePrerequisiteEvidence = [
  ...["original", "change_one_number", "change_two_numbers"].map((variantLevel, index) =>
    answerEvent({
      familyId: "ratio_rate_unit",
      queueItemId: "ratio-unit-1",
      timestamp: `2026-07-10T08:0${index}:00.000Z`,
      variantLevel,
    }),
  ),
  ...["original", "change_one_number", "change_two_numbers"].map((variantLevel, index) =>
    answerEvent({
      familyId: "measurement_conversion",
      queueItemId: "measurement-unit-1",
      timestamp: `2026-07-11T08:0${index}:00.000Z`,
      variantLevel,
    }),
  ),
];

const graphAdvanceQueue = challengeQueue(stablePrerequisiteEvidence);
assert.equal(graphAdvanceQueue.items.every((item) => item.familyId === "distance_speed_time"), true);
assert.equal(graphAdvanceQueue.items.every((item) => item.variantLevel === "original"), true);
assert.equal(graphAdvanceQueue.items.every((item) => item.source === "knowledge_graph_successor"), true);
assert.equal(graphAdvanceQueue.items.every((item) => item.advancesFromFamilyId === "ratio_rate_unit"), true);

const sameFamilyQueue = challengeQueue([
  answerEvent({ familyId: "ratio_rate_unit", queueItemId: "ratio-unit-2", timestamp: "2026-07-10T08:00:00.000Z" }),
  answerEvent({
    familyId: "ratio_rate_unit",
    hintsOpened: 2,
    queueItemId: "ratio-unit-2",
    timestamp: "2026-07-10T08:03:00.000Z",
    variantLevel: "change_one_number",
  }),
]);
assert.equal(sameFamilyQueue.items.every((item) => item.familyId === "ratio_rate_unit"), true);
assert.equal(sameFamilyQueue.items.every((item) => item.variantLevel === "change_two_numbers"), true);
assert.equal(sameFamilyQueue.items.every((item) => item.source === "same_family_extension"), true);

console.log("graph-aware-daily-queue-contract: passed");
