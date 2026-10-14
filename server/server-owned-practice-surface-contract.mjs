import assert from "node:assert/strict";
import { createDailyPracticePlan } from "../src/modules/daily-practice-engine.js";

const dailyTasks = {
  date: "2026-07-14",
  estimatedMinutes: 20,
  focus: "数学关系",
  generatedFrom: "static_curve",
  entryPoints: ["today"],
  tasks: [{ id: "today", status: "current" }],
};

const plan = createDailyPracticePlan({
  allocation: null,
  behaviorAwareQuestionEngine: {
    historyInputPolicy: { guardrail: "history stays private" },
    initialBuckets: [],
  },
  dailyTasks,
  generatedCandidates: [],
  generatedCandidateUnits: [],
  generatedTodayTask: {
    id: "task-2026-07-14",
    estimatedMinutes: 20,
    focus: "数学关系",
    rationale: "Follow the confirmed curve.",
  },
  initialLearningCurve: {
    guardrail: "formal tests update the curve",
    updatePolicy: {
      dailyPracticeAffects: ["next_question"],
      curveUpdatesOnlyFrom: ["stage_test"],
      assessmentCadence: "configured",
    },
  },
  questionLogic: [],
  questionQueue: {
    id: "public-daily-queue",
    instructionalGrade: "G5",
    items: [
      {
        id: "queue-item-1",
        familyId: "ratio_rate_unit",
        familyName: "Rate and unit value",
        instructionalGrade: "G5",
      },
      {
        id: "queue-item-2",
        familyId: "decimal_money_context",
        familyName: "Decimal money context",
        instructionalGrade: "G5",
      },
    ],
  },
  questions: [
    {
      logicId: "fallback-family",
      knowledgePoint: "Fallback relationship",
      prompt: "This must not become a visible required question.",
      answer: 99,
    },
  ],
  serverOwned: true,
});

assert.equal(plan.serverOwned, true);
assert.equal(plan.practiceSequence.length, 6);
assert.deepEqual(
  plan.practiceSequence.map((question) => question.variantLevel),
  ["original", "change_one_number", "change_two_numbers", "original", "change_one_number", "change_two_numbers"],
);
assert.equal(plan.practiceSequence.every((question) => question.answer === null), true);
assert.equal(plan.practiceSequence.every((question) => question.prompt === "题目正在准备中"), true);
assert.equal(plan.practiceSequence.every((question) => question.queueItemId), true);
assert.equal(JSON.stringify(plan).includes("seed"), false);
assert.equal(JSON.stringify(plan).includes("99"), false);

console.log("server-owned-practice-surface-contract: passed");
