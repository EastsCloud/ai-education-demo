import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";
import { createQuestionDeliveryRecord, recordQuestionDeliveryAttempt } from "../src/services/question-delivery-runtime.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

const studentId = "student-001";
const subjectId = "math-linear-equations";
const practiceDate = "2026-07-21";
const familyId = "part_whole_add_subtract";
const sourceSeed = 731;
const planRequest = { studentId, subjectId, practiceDate };

function staticCurve() {
  return {
    id: "static-prior-attempt-recall-contract",
    curveType: "static",
    progressCurve: [0.48, 0.6, 0.72, 0.86, 1],
    targetProgress: 1,
    currentPoint: { week: 1, progressTowardTarget: 0.48, remainingGap: 0.52 },
    sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
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

async function signIn(baseUrl) {
  const response = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "lin.an", password: "student-demo-2026" },
  });
  assert.equal(response.status, 200);
  return response.cookie;
}

function createPriorWrongDelivery() {
  const family = shanghaiMathItemFamilies.find((item) => item.id === familyId);
  const candidate = validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      aiVersion: "semi_ai",
      family,
      seed: sourceSeed,
      instructionalGrade: "G1",
      variantLevel: "original",
    }),
  );
  assert.equal(candidate.qualityStatus, "system_validated");
  const original = createQuestionDeliveryRecord({
    candidate,
    deliveryId: "prior-original-delivery",
    request: {
      studentId,
      subjectId,
      mode: "practice",
      familyId,
      instructionalGrade: "G1",
      variantLevel: "original",
      aiVersion: "semi_ai",
      seed: sourceSeed,
      queueItemId: "prior-original-queue-item",
      sessionId: "prior-session",
      source: "server_daily_practice_run",
      practiceMode: null,
      practiceRunId: null,
      optionalPracticeSessionId: null,
      optionalPracticeIndex: null,
      retrySourceDeliveryId: null,
      progressionUnitIndex: null,
      progressionStageIndex: null,
      independentRetry: false,
      stageLabel: "original",
    },
    createdAt: "2026-07-20T09:00:00.000Z",
  });
  const wrong = recordQuestionDeliveryAttempt({
    delivery: original,
    answer: Number(candidate.answer) + 1,
    elapsedSeconds: 8,
    submittedAt: "2026-07-20T09:02:00.000Z",
  });
  assert.equal(wrong.result.isCorrect, false);
  return wrong.delivery;
}

try {
  database.savePlan({
    id: `student-plan-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    status: "active",
    staticCurveConfirmedAt: "2026-07-21T00:00:00.000Z",
    staticCurve: staticCurve(),
    learningGoal: { targetGrade: "G1", dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    todayQuestionQueue: { instructionalGrade: "G1" },
    taskCadence: { planStartedAt: practiceDate },
    updatedAt: "2026-07-21T00:00:00.000Z",
  });
  const priorDelivery = createPriorWrongDelivery();
  database.saveQuestionDelivery(priorDelivery);
  database.saveBehaviorEvent({
    eventId: "prior-original-wrong-evidence",
    studentId,
    subjectId,
    sessionId: "prior-session",
    eventType: "answer_submitted",
    timestamp: "2026-07-20T09:02:00.000Z",
    payload: {
      scoringSource: "server_authoritative",
      isCorrect: false,
      hintsOpened: 0,
      elapsedSeconds: 8,
      questionFamilyId: familyId,
      variantLevel: "original",
      deliveryId: priorDelivery.id,
    },
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl);

  const createdPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(createdPlan.status, 201, JSON.stringify(createdPlan.body));
  assert.equal(JSON.stringify(createdPlan.body.plan).includes("retrySourceDeliveryId"), false);
  assert.equal(JSON.stringify(createdPlan.body.plan).includes('"seed"'), false);

  const privatePlan = database.getDailyPracticePlan(planRequest);
  const replayItem = privatePlan.questionQueue.items.find((item) => item.retrySourceDeliveryId === priorDelivery.id);
  assert.ok(replayItem);
  assert.equal(replayItem.familyId, familyId);
  assert.equal(replayItem.instructionalGrade, "G1");
  assert.equal(replayItem.variantLevel, "original");
  assert.equal(replayItem.seed, sourceSeed);
  assert.equal(replayItem.source, "exact_prior_original_replay");

  const createdRun = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(createdRun.status, 201, JSON.stringify(createdRun.body));

  const delivered = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(createdRun.body.run.id)}/deliveries`, {
    method: "POST",
    cookie: studentCookie,
    body: {},
  });
  assert.equal(delivered.status, 201, JSON.stringify(delivered.body));
  assert.equal(delivered.body.delivery.question.prompt, priorDelivery.privateCandidate.prompt);
  assert.equal(delivered.body.delivery.question.variantLevel, "original");
  assert.equal(JSON.stringify(delivered.body.delivery).includes('"answer"'), false);
  assert.equal(JSON.stringify(delivered.body.delivery).includes("retrySourceDeliveryId"), false);
  const recall = delivered.body.delivery.question.previousAttemptReference;
  assert.equal(recall.availableBeforeHints, true);
  assert.equal(recall.recallKind, "previous_wrong_attempt");
  assert.equal(recall.sourcePrompt, priorDelivery.privateCandidate.prompt);
  assert.equal(recall.studentAnswerDisplay, String(priorDelivery.attempts[0].answer));
  assert.equal(Object.hasOwn(recall, "studentAnswer"), false);
  assert.equal(Object.hasOwn(recall, "correctAnswer"), false);
  assert.equal(Object.hasOwn(recall, "sourceQuestionId"), false);
  assert.equal(Object.hasOwn(recall, "sourceDeliveryId"), false);

  const storedDelivery = database.getQuestionDelivery({ deliveryId: delivered.body.delivery.id });
  assert.equal(storedDelivery.generationRequest.retrySourceDeliveryId, priorDelivery.id);
  assert.equal(storedDelivery.generationRequest.seed, sourceSeed);

  console.log("daily-prior-attempt-recall-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
