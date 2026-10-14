import assert from "node:assert/strict";
import { buildObserverGuidance } from "./observer-guidance-service.mjs";

const nextStep = { focus: "关系建模" };

const collecting = buildObserverGuidance({
  audience: "parent",
  learning: { answerCount: 2 },
  nextStep,
  plan: {},
});
assert.equal(collecting.evidenceStatus, "collecting");
assert.ok(collecting.actions.some((item) => item.id === "collect_more_evidence"));
assert.ok(collecting.actions.some((item) => item.id === "next_practice_focus"));

const rapid = buildObserverGuidance({
  audience: "teacher",
  learning: {
    answerCount: 8,
    fastGuessRate: 0.38,
    hintUseRate: 0.1,
    noHintAccuracy: 0.5,
  },
  nextStep,
  plan: {},
});
assert.equal(rapid.evidenceStatus, "ready");
assert.equal(rapid.actions[0].id, "slow_down_before_answer");
assert.match(rapid.actions[0].action, /圈出已知量/);

const hintHeavy = buildObserverGuidance({
  audience: "parent",
  learning: {
    answerCount: 8,
    fastGuessRate: 0.1,
    hintUseRate: 0.75,
    noHintAccuracy: 0.4,
  },
  nextStep,
  plan: {},
});
assert.ok(hintHeavy.actions.some((item) => item.id === "restore_independent_entry"));
assert.match(hintHeavy.actions.find((item) => item.id === "restore_independent_entry").action, /给等待时间/);

const rhythm = buildObserverGuidance({
  audience: "parent",
  learning: { answerCount: 9, noHintAccuracy: 0.84 },
  nextStep,
  plan: {
    taskCadence: {
      observerReminder: {
        title: "一起重新看学习节奏",
        body: "近两周有多次未完成任务。",
      },
    },
  },
});
assert.equal(rhythm.actions[0].id, "restore_learning_rhythm");
assert.ok(rhythm.actions.some((item) => item.id === "extend_independent_thinking"));

assert.equal(buildObserverGuidance({ audience: "student", learning: {}, nextStep, plan: {} }), null);

console.log("observer-guidance-contract: passed");
