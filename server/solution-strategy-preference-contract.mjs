import assert from "node:assert/strict";
import {
  orderSolutionStrategies,
  summarizeSolutionStrategyPreference,
} from "../src/services/solution-strategy-preference-engine.js";

function strategyOpening({ eventId, strategyId, deliveryId, targetId = `question-${deliveryId}`, timestamp }) {
  return {
    eventId,
    eventType: "solution_strategy_opened",
    targetId,
    timestamp,
    payload: { deliveryId, strategyId },
  };
}

const collecting = summarizeSolutionStrategyPreference([
  strategyOpening({
    eventId: "strategy-1",
    strategyId: "relation_model",
    deliveryId: "delivery-1",
    timestamp: "2026-09-06T10:00:00.000Z",
  }),
]);
assert.equal(collecting.evidenceCount, 1);
assert.equal(collecting.distinctQuestionCount, 1);
assert.deepEqual(collecting.orderedStrategyIds, []);
assert.equal(collecting.confidence, "collecting");

const observed = summarizeSolutionStrategyPreference([
  strategyOpening({
    eventId: "strategy-2",
    strategyId: "quantity_relation_table",
    deliveryId: "delivery-2",
    timestamp: "2026-09-06T10:01:00.000Z",
  }),
  strategyOpening({
    eventId: "strategy-2-duplicate",
    strategyId: "quantity_relation_table",
    deliveryId: "delivery-2",
    timestamp: "2026-09-06T10:02:00.000Z",
  }),
  strategyOpening({
    eventId: "strategy-3",
    strategyId: "quantity_relation_table",
    deliveryId: "delivery-3",
    timestamp: "2026-09-06T10:03:00.000Z",
  }),
  strategyOpening({
    eventId: "strategy-4",
    strategyId: "relation_model",
    deliveryId: "delivery-3",
    timestamp: "2026-09-06T10:04:00.000Z",
  }),
  strategyOpening({
    eventId: "strategy-ignored",
    strategyId: "unbounded_model_claim",
    deliveryId: "delivery-4",
    timestamp: "2026-09-06T10:05:00.000Z",
  }),
]);
assert.equal(observed.evidenceCount, 3);
assert.equal(observed.distinctQuestionCount, 2);
assert.deepEqual(observed.orderedStrategyIds, ["quantity_relation_table"]);
assert.equal(observed.dominantStrategyId, "quantity_relation_table");
assert.equal(observed.dominantStrategyLabel, "数量关系表");
assert.equal(observed.confidence, "observed");

const strategies = [
  { id: "relation_model", name: "关系式法", steps: ["a", "b", "c"] },
  { id: "quantity_relation_table", name: "数量关系表", steps: ["d", "e", "f"] },
  { id: "logical_trial_check", name: "有逻辑的试猜", steps: ["g", "h", "i"] },
];
const ordered = orderSolutionStrategies({ strategies, preference: observed });
assert.deepEqual(ordered.map((strategy) => strategy.id), ["quantity_relation_table", "relation_model", "logical_trial_check"]);
assert.deepEqual(ordered.find((strategy) => strategy.id === "quantity_relation_table"), strategies[1]);
assert.deepEqual(orderSolutionStrategies({ strategies, preference: collecting }), strategies);

console.log("solution-strategy-preference-contract: passed");
