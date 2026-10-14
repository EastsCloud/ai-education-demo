import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

database.savePlan({
  id: "client-behavior-strategy-plan",
  studentId: "student-001",
  subjectId: "math-linear-equations",
  supportProfile: {
    confidence: 0.5,
    responseCount: 12,
    supportMode: { id: "try_then_light_hint", label: "先尝试，再给轻提示", hintDepthTarget: 1.5 },
    taskChunking: "standard_short_chunks",
  },
  updatedAt: "2026-09-06T00:00:00.000Z",
});

function linkedStrategyDelivery(id) {
  return {
    id,
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode: "practice",
    status: "delivered",
    support: { allowed: true },
    privateCandidate: {
      id,
      solutionStrategies: [{ id: "relation_model" }],
    },
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
  };
}

database.saveQuestionDelivery(linkedStrategyDelivery("delivery-contract-1"));
database.saveQuestionDelivery(linkedStrategyDelivery("delivery-contract-2"));

async function request(baseUrl, path, { body, cookie, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    status: response.status,
  };
}

async function signIn(baseUrl) {
  const response = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "lin.an", password: "student-demo-2026" },
  });
  assert.equal(response.status, 200);
  assert.ok(response.cookie);
  return response.cookie;
}

function clientEvent(overrides = {}) {
  return {
    eventId: "client-strategy-opened-1",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    sessionId: "client-session-1",
    eventType: "solution_strategy_opened",
    timestamp: new Date().toISOString(),
    page: "practice",
    targetId: "delivery-contract-1",
    payload: {
      deliveryId: "delivery-contract-1",
      practiceRunId: "run-1",
      strategyId: "relation_model",
      supportMode: "strategy_and_guided",
      hintLevel: 1,
      rawAnswer: "42",
      scoringSource: "browser_claimed",
      nestedClaim: { isCorrect: true },
    },
    ...overrides,
  };
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl);

  const accepted = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: { event: clientEvent() },
  });
  assert.equal(accepted.status, 201);
  assert.equal(accepted.body.event.eventType, "solution_strategy_opened");
  assert.deepEqual(accepted.body.event.payload, {
    deliveryId: "delivery-contract-1",
    practiceRunId: "run-1",
    strategyId: "relation_model",
    supportMode: "strategy_and_guided",
    hintLevel: 1,
  });
  assert.equal(JSON.stringify(accepted.body.event).includes("rawAnswer"), false);
  assert.equal(JSON.stringify(accepted.body.event).includes("browser_claimed"), false);
  assert.equal(JSON.stringify(accepted.body.event).includes("nestedClaim"), false);

  const endedVisit = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: clientEvent({
        eventId: "client-session-ended-1",
        eventType: "app_session_ended",
        page: "report",
        targetId: "app_session",
        payload: {
          activeSeconds: 843,
          elapsedSeconds: 921,
          entryHour: 19,
          lastView: "report",
          pauseCount: 2,
          browserClaimedLevel: "G6",
        },
      }),
    },
  });
  assert.equal(endedVisit.status, 201);
  assert.deepEqual(endedVisit.body.event.payload, {
    activeSeconds: 843,
    elapsedSeconds: 921,
    entryHour: 19,
    lastView: "report",
    pauseCount: 2,
  });
  assert.equal(JSON.stringify(endedVisit.body.event).includes("browserClaimedLevel"), false);

  const repeatedRecognizedStrategy = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: clientEvent({
        eventId: "client-strategy-opened-2",
        targetId: "delivery-contract-2",
        payload: {
          ...clientEvent().payload,
          deliveryId: "delivery-contract-2",
          strategyId: "relation_model",
        },
      }),
    },
  });
  assert.equal(repeatedRecognizedStrategy.status, 201);
  assert.deepEqual(
    database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" }).supportProfile.strategyPreference.orderedStrategyIds,
    ["relation_model"],
  );

  const unlinkedRecognizedStrategy = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: clientEvent({
        eventId: "client-strategy-opened-unlinked",
        targetId: "unlinked-candidate",
        payload: {
          ...clientEvent().payload,
          deliveryId: "unlinked-delivery",
          strategyId: "relation_model",
        },
      }),
    },
  });
  assert.equal(unlinkedRecognizedStrategy.status, 201);
  assert.equal(Object.hasOwn(unlinkedRecognizedStrategy.body.event.payload, "strategyId"), false);

  const unrecognizedStrategy = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: clientEvent({
        eventId: "client-strategy-opened-unrecognized",
        payload: {
          ...clientEvent().payload,
          strategyId: "unbounded_model_claim",
        },
      }),
    },
  });
  assert.equal(unrecognizedStrategy.status, 201);
  assert.equal(Object.hasOwn(unrecognizedStrategy.body.event.payload, "strategyId"), false);

  const unknownType = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: { event: clientEvent({ eventId: "unknown-client-event", eventType: "browser_claimed_level_change" }) },
  });
  assert.equal(unknownType.status, 400);
  assert.equal(unknownType.body.error, "invalid_behavior_event");

  const spoofedAnswer = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: { event: clientEvent({ eventId: "browser-answer-claim", eventType: "answer_submitted" }) },
  });
  assert.equal(spoofedAnswer.status, 403);
  assert.equal(spoofedAnswer.body.error, "server_scored_answer_event_required");

  const futureEvent = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: clientEvent({
        eventId: "future-client-event",
        timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    },
  });
  assert.equal(futureEvent.status, 400);
  assert.equal(futureEvent.body.error, "invalid_behavior_event");

  const invalidBody = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: { event: null },
  });
  assert.equal(invalidBody.status, 400);
  assert.equal(invalidBody.body.error, "invalid_behavior_event");

  console.log("client-behavior-event-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
