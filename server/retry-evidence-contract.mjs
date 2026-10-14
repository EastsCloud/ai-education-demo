import assert from "node:assert/strict";
import { buildLearningReport } from "../src/services/learning-report-engine.js";
import { summarizeRetryEvidence } from "../src/services/retry-evidence-engine.js";

function answer({
  eventId,
  timestamp,
  targetId,
  deliveryId,
  isCorrect,
  hintsOpened = 0,
  retrySourceDeliveryId = null,
  sessionId = "retry-contract-session",
}) {
  return {
    eventId,
    eventType: "answer_submitted",
    timestamp,
    targetId,
    sessionId,
    payload: {
      deliveryId,
      isCorrect,
      hintsOpened,
      ...(retrySourceDeliveryId ? { retrySourceDeliveryId } : {}),
    },
  };
}

function support({ eventId, timestamp, targetId, deliveryId, sessionId = "retry-contract-session" }) {
  return {
    eventId,
    eventType: "guided_step_opened",
    timestamp,
    targetId,
    sessionId,
    payload: { deliveryId },
  };
}

const events = [
  answer({
    eventId: "source-wrong",
    timestamp: "2026-09-06T10:00:00.000Z",
    targetId: "question-original",
    deliveryId: "source-delivery-1",
    isCorrect: false,
  }),
  {
    eventId: "explicit-retry-linked-to-server-replay",
    eventType: "retry_clicked",
    timestamp: "2026-09-06T10:01:00.000Z",
    targetId: "question-original",
    sessionId: "retry-contract-session",
    payload: {},
  },
  support({
    eventId: "assisted-replay-guided-step",
    timestamp: "2026-09-06T10:02:00.000Z",
    targetId: "question-original",
    deliveryId: "replay-assisted-delivery",
  }),
  answer({
    eventId: "assisted-replay-correct",
    timestamp: "2026-09-06T10:02:30.000Z",
    targetId: "question-original",
    deliveryId: "replay-assisted-delivery",
    isCorrect: true,
    retrySourceDeliveryId: "source-delivery-1",
  }),
  answer({
    eventId: "independent-replay-correct",
    timestamp: "2026-09-06T10:03:30.000Z",
    targetId: "question-original",
    deliveryId: "replay-independent-delivery",
    isCorrect: true,
    retrySourceDeliveryId: "source-delivery-1",
  }),
  {
    eventId: "explicit-direct-retry",
    eventType: "retry_clicked",
    timestamp: "2026-09-06T10:04:00.000Z",
    targetId: "question-direct",
    sessionId: "direct-retry-session",
    payload: {},
  },
  support({
    eventId: "direct-retry-guided-step",
    timestamp: "2026-09-06T10:04:30.000Z",
    targetId: "question-direct",
    deliveryId: "direct-retry-delivery",
    sessionId: "direct-retry-session",
  }),
  answer({
    eventId: "direct-retry-assisted-correct",
    timestamp: "2026-09-06T10:05:00.000Z",
    targetId: "question-direct",
    deliveryId: "direct-retry-delivery",
    isCorrect: true,
    sessionId: "direct-retry-session",
  }),
];

const answers = events.filter((event) => event.eventType === "answer_submitted");
const retryEvidence = summarizeRetryEvidence({ events, answers });
assert.equal(retryEvidence.retryCount, 2);
assert.equal(retryEvidence.retrySuccessCount, 1);

const report = buildLearningReport({ behaviorEvents: events });
assert.equal(report.retryCount, 2);
assert.equal(report.retrySuccessRate, 0.5);
assert.equal(report.noHintAnswerCount, 2);
assert.equal(JSON.stringify(report).includes("source-delivery-1"), false);

console.log("retry-evidence-contract: passed");
