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

function answerEvent({ familyId, queueItemId, timestamp, variantLevel }) {
  return {
    eventId: `challenge-evidence-${familyId}-${queueItemId}-${variantLevel}`,
    studentId: "student-001",
    subjectId: "math-linear-equations",
    sessionId: `challenge-evidence-${queueItemId}`,
    eventType: "answer_submitted",
    timestamp,
    page: "practice",
    targetId: queueItemId,
    payload: {
      scoringSource: "server_authoritative",
      isCorrect: true,
      hintsOpened: 0,
      questionFamilyId: familyId,
      queueItemId,
      variantLevel,
    },
  };
}

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

try {
  ["ratio_rate_unit", "measurement_conversion"].forEach((familyId, familyIndex) => {
    ["original", "change_one_number", "change_two_numbers"].forEach((variantLevel, variantIndex) => {
      database.saveBehaviorEvent(
        answerEvent({
          familyId,
          queueItemId: `${familyId}-required-unit-1`,
          timestamp: `2026-07-${10 + familyIndex}T08:0${variantIndex}:00.000Z`,
          variantLevel,
        }),
      );
    });
  });

  database.saveDailyPracticeRun({
    id: "optional-challenge-routing-run",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    practiceDate: "2026-07-14",
    dailyPlanId: "optional-challenge-routing-plan",
    status: "required_completed",
    queueItems: [
      {
        id: "ratio-rate-required-item",
        familyId: "ratio_rate_unit",
        instructionalGrade: "G5",
        seed: 41,
        order: 0,
      },
    ],
    currentUnitIndex: 1,
    currentStageIndex: 0,
    activeDeliveryId: null,
    completedStages: [
      {
        queueItemId: "ratio-rate-required-item",
        unitIndex: 0,
        stageIndex: 2,
        variantLevel: "change_two_numbers",
        completedAt: "2026-07-14T08:00:00.000Z",
      },
    ],
    optionalPracticeSessions: [],
    requiredPracticeCompleted: true,
    createdAt: "2026-07-14T08:00:00.000Z",
    updatedAt: "2026-07-14T08:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const signedIn = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "lin.an", password: "student-demo-2026" },
  });
  assert.equal(signedIn.status, 200);

  const challenge = await request(baseUrl, "/api/daily-practice-runs/optional-challenge-routing-run/optional-practice", {
    method: "POST",
    cookie: signedIn.cookie,
    body: { mode: "harder", count: 3, source: "practice_summary" },
  });
  assert.equal(challenge.status, 201, JSON.stringify(challenge.body));
  assert.equal(challenge.body.run.optionalPractice.mode, "harder");
  assert.equal(challenge.body.run.optionalPractice.familyId, "distance_speed_time");
  assert.equal(challenge.body.run.optionalPractice.instructionalGrade, "G5");
  assert.equal(challenge.body.run.optionalPractice.challengeRoute, "knowledge_graph_successor");
  assert.equal(challenge.body.run.optionalPractice.currentStep.variantLevel, "original");
  assert.equal(JSON.stringify(challenge.body).includes("seed"), false);

  const delivered = await request(
    baseUrl,
    "/api/daily-practice-runs/optional-challenge-routing-run/optional-practice/deliveries",
    { method: "POST", cookie: signedIn.cookie, body: {} },
  );
  assert.ok([200, 201].includes(delivered.status), JSON.stringify(delivered.body));
  assert.equal(delivered.body.delivery.question.familyId, "distance_speed_time");
  assert.equal(delivered.body.delivery.question.variantLevel, "original");
  assert.equal(JSON.stringify(delivered.body.delivery).includes('"answer"'), false);

  console.log("optional-challenge-routing-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
