import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";
import {
  createQuestionDeliveryRecord,
  recordQuestionDeliveryAttempt,
} from "../src/services/question-delivery-runtime.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

const studentId = "student-001";
const subjectId = "math-linear-equations";
const run = {
  id: "wrong-retry-run-student-001-math",
  studentId,
  subjectId,
  practiceDate: "2026-07-14",
  dailyPlanId: "wrong-retry-plan",
  status: "required_completed",
  queueItems: [
    { id: "wrong-retry-a", familyId: "part_whole_add_subtract", instructionalGrade: "G1", seed: 41, order: 0 },
    { id: "wrong-retry-b", familyId: "compare_more_less", instructionalGrade: "G1", seed: 89, order: 1 },
  ],
  currentUnitIndex: 2,
  currentStageIndex: 0,
  activeDeliveryId: null,
  completedStages: [],
  optionalPracticeSessions: [],
  requiredPracticeCompleted: true,
  createdAt: "2026-07-14T08:00:00.000Z",
  updatedAt: "2026-07-14T08:00:00.000Z",
};

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

async function signIn(baseUrl, loginName, password) {
  const response = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName, password },
  });
  assert.equal(response.status, 200);
  return response.cookie;
}

function createCompletedWrongSource({ deliveryId, familyId, seed, variantLevel }) {
  const family = shanghaiMathItemFamilies.find((item) => item.id === familyId);
  const candidate = validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      aiVersion: "semi_ai",
      family,
      seed,
      instructionalGrade: "G1",
      variantLevel,
    }),
  );
  assert.equal(candidate.qualityStatus, "system_validated");
  const requestRecord = {
    studentId,
    subjectId,
    mode: "practice",
    familyId,
    instructionalGrade: "G1",
    variantLevel,
    aiVersion: "semi_ai",
    seed,
    queueItemId: `source-${deliveryId}`,
    sessionId: run.id,
    source: "server_daily_practice_run",
    practiceMode: null,
    practiceRunId: run.id,
    optionalPracticeSessionId: null,
    optionalPracticeIndex: null,
    retrySourceDeliveryId: null,
    progressionUnitIndex: 0,
    progressionStageIndex: 0,
    stageLabel: variantLevel,
  };
  const delivery = createQuestionDeliveryRecord({ candidate, deliveryId, request: requestRecord });
  const wrong = recordQuestionDeliveryAttempt({ delivery, answer: -1, elapsedSeconds: 1 });
  const corrected = recordQuestionDeliveryAttempt({
    delivery: wrong.delivery,
    answer: candidate.answer,
    elapsedSeconds: 2,
  });
  assert.equal(corrected.result.isCorrect, true);
  return corrected.delivery;
}

try {
  database.saveDailyPracticeRun(run);
  const sourceA = createCompletedWrongSource({
    deliveryId: "wrong-retry-source-a",
    familyId: "part_whole_add_subtract",
    seed: 41,
    variantLevel: "original",
  });
  const sourceB = createCompletedWrongSource({
    deliveryId: "wrong-retry-source-b",
    familyId: "compare_more_less",
    seed: 89,
    variantLevel: "change_one_number",
  });
  database.saveQuestionDelivery(sourceA);
  database.saveQuestionDelivery(sourceB);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const beforeRetrySummary = await request(baseUrl, `/api/daily-practice-runs/${run.id}/summary`, {
    cookie: studentCookie,
  });
  assert.equal(beforeRetrySummary.status, 200, JSON.stringify(beforeRetrySummary.body));
  assert.deepEqual(beforeRetrySummary.body.summary.wrongRetry, { available: true, eligibleCount: 2 });
  assert.equal(JSON.stringify(beforeRetrySummary.body.summary).includes("wrong-retry-source-a"), false);

  const parentCreate = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: parentCookie,
    body: { mode: "wrong_retry" },
  });
  assert.equal(parentCreate.status, 403);

  const created = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: studentCookie,
    body: { mode: "wrong_retry", source: "practice_summary" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.run.optionalPractice.mode, "wrong_retry");
  assert.equal(created.body.run.optionalPractice.requestedCount, 2);
  assert.equal(created.body.run.optionalPractice.familyId, null);
  assert.equal(JSON.stringify(created.body.run).toLowerCase().includes("seed"), false);
  assert.equal(JSON.stringify(created.body.run).includes("retrySourceDeliveryId"), false);

  const afterSchedulingRetrySummary = await request(baseUrl, `/api/daily-practice-runs/${run.id}/summary`, {
    cookie: studentCookie,
  });
  assert.equal(afterSchedulingRetrySummary.status, 200, JSON.stringify(afterSchedulingRetrySummary.body));
  assert.deepEqual(afterSchedulingRetrySummary.body.summary.wrongRetry, { available: false, eligibleCount: 0 });

  for (let index = 0; index < 2; index += 1) {
    const delivered = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`, {
      method: "POST",
      cookie: studentCookie,
      body: {},
    });
    assert.ok([200, 201].includes(delivered.status), JSON.stringify(delivered.body));
    assert.equal(JSON.stringify(delivered.body.delivery).includes('"answer"'), false);
    assert.equal(JSON.stringify(delivered.body.delivery).toLowerCase().includes("seed"), false);

    const retryDelivery = database.getQuestionDelivery({ deliveryId: delivered.body.delivery.id });
    assert.equal(retryDelivery.generationRequest.practiceMode, "wrong_retry");
    const sourceDelivery = database.getQuestionDelivery({
      deliveryId: retryDelivery.generationRequest.retrySourceDeliveryId,
    });
    assert.ok(sourceDelivery);
    assert.equal(delivered.body.delivery.question.prompt, sourceDelivery.privateCandidate.prompt);
    assert.equal(delivered.body.delivery.question.variantLevel, sourceDelivery.generationRequest.variantLevel);
    const recall = delivered.body.delivery.question.previousAttemptReference;
    assert.equal(recall.availableBeforeHints, true);
    assert.equal(recall.recallKind, "previous_wrong_attempt");
    assert.equal(recall.sourcePrompt, sourceDelivery.privateCandidate.prompt);
    assert.equal(recall.studentAnswerDisplay, String(sourceDelivery.attempts.find((attempt) => !attempt.isCorrect).answer));
    assert.equal(Object.hasOwn(recall, "studentAnswer"), false);
    assert.equal(Object.hasOwn(recall, "correctAnswer"), false);
    assert.equal(Object.hasOwn(recall, "sourceQuestionId"), false);
    assert.equal(Object.hasOwn(recall, "sourceDeliveryId"), false);

    const started = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/start`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId },
    });
    assert.equal(started.status, 200);

    if (index === 0) {
      const wrong = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/attempts`, {
        method: "POST",
        cookie: studentCookie,
        body: { studentId, answer: -1, elapsedSeconds: 1 },
      });
      assert.equal(wrong.status, 200);
      assert.equal(wrong.body.result.isCorrect, false);
      assert.equal(wrong.body.practiceRun.optionalPractice.currentStep.index, 0);
    }

    const scored = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/attempts`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId, answer: retryDelivery.privateCandidate.answer, elapsedSeconds: 2 },
    });
    assert.equal(scored.status, 200);
    if (index === 0) assert.equal(scored.body.practiceRun.optionalPractice.currentStep.index, 1);
    if (index === 1) assert.equal(scored.body.practiceRun.optionalPractice, null);
  }

  const repeated = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: studentCookie,
    body: { mode: "wrong_retry" },
  });
  assert.equal(repeated.status, 409);
  assert.equal(repeated.body.error, "no_server_scored_wrong_items_available");

  console.log("wrong-retry-practice-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
