import assert from "node:assert/strict";
import { buildKnowledgePuzzleMap } from "../src/services/knowledge-atlas-evidence-engine.js";

const baseMap = {
  title: "数学知识地图",
  pieces: [
    { id: "read_target", title: "读懂题意", status: "unlocked" },
    { id: "one_number_variant", title: "换一个数字", status: "locked" },
    { id: "two_number_variant", title: "换两个数字", status: "locked" },
    { id: "step_added_variant", title: "多一个整理步骤", status: "locked" },
    { id: "two_steps_added_variant", title: "多两个整理步骤", status: "locked" },
  ],
};

function answer({ id, variantLevel, timestamp }) {
  return {
    eventId: id,
    eventType: "answer_submitted",
    timestamp,
    targetId: `question-${id}`,
    payload: {
      isCorrect: true,
      hintsOpened: 0,
      abilityTags: ["read_context"],
      atlasNodeIds: ["more_less"],
      questionPrompt: "一共有 12 个，拿走 5 个，还剩多少个？",
      variantLevel,
    },
  };
}

const numberOnly = buildKnowledgePuzzleMap({
  baseMap,
  behaviorEvents: [
    answer({ id: "original", variantLevel: "original", timestamp: "2026-08-03T09:00:00.000Z" }),
    answer({ id: "number", variantLevel: "change_one_number", timestamp: "2026-08-03T09:01:00.000Z" }),
  ],
});

assert.equal(numberOnly.pieces.find((piece) => piece.id === "one_number_variant")?.completed, true);
assert.ok(numberOnly.timeline.some((line) => line.includes("数字变化后")));
assert.equal(numberOnly.timeline.some((line) => line.includes("不同表达")), false);

const withReadingFormTransfer = buildKnowledgePuzzleMap({
  baseMap,
  behaviorEvents: [
    answer({ id: "number", variantLevel: "change_two_numbers", timestamp: "2026-08-03T09:01:00.000Z" }),
    answer({ id: "transfer", variantLevel: "context_change", timestamp: "2026-08-03T09:02:00.000Z" }),
  ],
});

assert.ok(withReadingFormTransfer.timeline.some((line) => line.includes("不同表达")));
assert.ok(withReadingFormTransfer.examples.breakthrough.includes("变化后"));
assert.equal(withReadingFormTransfer.pieces.find((piece) => piece.id === "two_number_variant")?.completed, true);
assert.equal(withReadingFormTransfer.pieces.find((piece) => piece.id === "step_added_variant")?.completed, false);

const withStepAddedChallenge = buildKnowledgePuzzleMap({
  baseMap,
  behaviorEvents: [answer({ id: "step", variantLevel: "step_added_variant", timestamp: "2026-08-03T09:03:00.000Z" })],
});

assert.equal(withStepAddedChallenge.pieces.find((piece) => piece.id === "step_added_variant")?.completed, true);
assert.equal(withStepAddedChallenge.pieces.find((piece) => piece.id === "two_number_variant")?.completed, false);

const withTwoStepsAddedChallenge = buildKnowledgePuzzleMap({
  baseMap,
  behaviorEvents: [answer({ id: "two-steps", variantLevel: "two_steps_added_variant", timestamp: "2026-08-03T09:04:00.000Z" })],
});

assert.equal(withTwoStepsAddedChallenge.pieces.find((piece) => piece.id === "two_steps_added_variant")?.completed, true);
assert.equal(withTwoStepsAddedChallenge.pieces.find((piece) => piece.id === "step_added_variant")?.completed, false);

console.log("knowledge-atlas-variant-evidence-contract: passed");
