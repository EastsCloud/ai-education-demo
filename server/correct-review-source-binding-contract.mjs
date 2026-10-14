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
import { analyzeLearningBehavior } from "../src/services/behavior-analysis-engine.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

const studentId = "student-001";
const subjectId = "math-linear-equations";
const practiceDate = "2026-07-23";
const familyId = "part_whole_add_subtract";
const sourceSeed = 731;
const planRequest = { studentId, subjectId, practiceDate };

function staticCurve() {
  return {
    id: "static-correct-review-source-binding-contract",
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

function createPriorIndependentCorrectDelivery() {
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
    deliveryId: "prior-independent-correct-delivery",
    request: {
      studentId,
      subjectId,
      mode: "practice",
      familyId,
      instructionalGrade: "G1",
      variantLevel: "original",
      aiVersion: "semi_ai",
      seed: sourceSeed,
      queueItemId: "prior-independent-correct-queue-item",
      sessionId: "prior-independent-correct-session",
      source: "server_daily_practice_run",
      practiceMode: null,
      practiceRunId: null,
      optionalPracticeSessionId: null,
      optionalPracticeIndex: null,
      retrySourceDeliveryId: null,
      correctReviewSourceDeliveryId: null,
      progressionUnitIndex: null,
      progressionStageIndex: null,
      independentRetry: false,
      stageLabel: "original",
    },
    createdAt: "2026-07-22T09:00:00.000Z",
  });
  const correct = recordQuestionDeliveryAttempt({
    delivery: original,
    answer: candidate.answer,
    elapsedSeconds: 12,
    submittedAt: "2026-07-22T09:02:00.000Z",
  });
  assert.equal(correct.result.isCorrect, true);
  return correct.delivery;
}

async function completeCurrentUnitUntilReview({ baseUrl, cookie, reviewIndex, runId }) {
  let run = database.getDailyPracticeRunById({ runId });
  while (run.currentUnitIndex < reviewIndex) {
    const delivered = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(runId)}/deliveries`, {
      method: "POST",
      cookie,
      body: {},
    });
    assert.equal(delivered.status, 201, JSON.stringify(delivered.body));
    const storedDelivery = database.getQuestionDelivery({ deliveryId: delivered.body.delivery.id });
    const answered = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(storedDelivery.id)}/attempts`, {
      method: "POST",
      cookie,
      body: { studentId, answer: storedDelivery.privateCandidate.answer },
    });
    assert.equal(answered.status, 200, JSON.stringify(answered.body));
    assert.equal(answered.body.result.isCorrect, true);
    run = database.getDailyPracticeRunById({ runId });
  }
  return run;
}

try {
  database.savePlan({
    id: `student-plan-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    status: "active",
    staticCurveConfirmedAt: "2026-07-23T00:00:00.000Z",
    staticCurve: staticCurve(),
    learningGoal: { targetGrade: "G1", dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    todayQuestionQueue: { instructionalGrade: "G1" },
    taskCadence: { planStartedAt: practiceDate },
    updatedAt: "2026-07-23T00:00:00.000Z",
  });
  const priorDelivery = createPriorIndependentCorrectDelivery();
  database.saveQuestionDelivery(priorDelivery);
  database.saveBehaviorEvent({
    eventId: "prior-independent-correct-evidence",
    studentId,
    subjectId,
    sessionId: "prior-independent-correct-session",
    eventType: "answer_submitted",
    timestamp: "2026-07-22T09:02:00.000Z",
    payload: {
      scoringSource: "server_authoritative",
      isCorrect: true,
      hintsOpened: 0,
      elapsedSeconds: 12,
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
  assert.equal(JSON.stringify(createdPlan.body.plan).includes("correctReviewSourceDeliveryId"), false);
  assert.equal(JSON.stringify(createdPlan.body.plan).includes('"seed"'), false);

  const privatePlan = database.getDailyPracticePlan(planRequest);
  const reviewIndex = privatePlan.questionQueue.items.findIndex(
    (item) => item.correctReviewSourceDeliveryId === priorDelivery.id,
  );
  assert.ok(reviewIndex >= 0);
  const reviewItem = privatePlan.questionQueue.items[reviewIndex];
  assert.equal(reviewItem.bucketId, "correct_review");
  assert.equal(reviewItem.familyId, familyId);
  assert.equal(reviewItem.instructionalGrade, "G1");
  assert.equal(reviewItem.variantLevel, "context_change");
  assert.equal(reviewItem.seed, sourceSeed);
  assert.equal(reviewItem.source, "linked_independent_correct_context_review");

  const createdRun = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(createdRun.status, 201, JSON.stringify(createdRun.body));
  const runId = createdRun.body.run.id;
  const runAtReview = await completeCurrentUnitUntilReview({
    baseUrl,
    cookie: studentCookie,
    reviewIndex,
    runId,
  });
  assert.equal(runAtReview.currentUnitIndex, reviewIndex);
  assert.equal(runAtReview.currentStageIndex, 0);

  const delivered = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(runId)}/deliveries`, {
    method: "POST",
    cookie: studentCookie,
    body: {},
  });
  assert.equal(delivered.status, 201, JSON.stringify(delivered.body));
  assert.equal(delivered.body.delivery.question.variantLevel, "context_change");
  const recall = delivered.body.delivery.question.previousAttemptReference;
  assert.equal(recall.availableBeforeHints, true);
  assert.equal(recall.recallKind, "previous_independent_correct_attempt");
  assert.equal(recall.sourcePrompt, priorDelivery.privateCandidate.prompt);
  assert.equal(recall.studentAnswerDisplay, String(priorDelivery.attempts[0].answer));
  assert.equal(Object.hasOwn(recall, "studentAnswer"), false);
  assert.equal(Object.hasOwn(recall, "correctAnswer"), false);
  assert.equal(Object.hasOwn(recall, "sourceQuestionId"), false);
  assert.equal(Object.hasOwn(recall, "sourceDeliveryId"), false);
  assert.equal(JSON.stringify(delivered.body.delivery).includes("correctReviewSourceDeliveryId"), false);

  const storedReviewDelivery = database.getQuestionDelivery({ deliveryId: delivered.body.delivery.id });
  assert.equal(storedReviewDelivery.generationRequest.correctReviewSourceDeliveryId, priorDelivery.id);
  assert.equal(storedReviewDelivery.generationRequest.seed, sourceSeed);
  assert.equal(storedReviewDelivery.privateCandidate.answer, priorDelivery.privateCandidate.answer);
  assert.notEqual(storedReviewDelivery.privateCandidate.prompt, priorDelivery.privateCandidate.prompt);

  const reviewed = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(storedReviewDelivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId, answer: storedReviewDelivery.privateCandidate.answer },
  });
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.body));
  assert.equal(reviewed.body.result.isCorrect, true);
  assert.equal(Object.hasOwn(reviewed.body.behaviorEvent.payload, "correctReviewSourceDeliveryId"), false);

  const privateReviewEvent = database
    .listBehaviorEvents({ studentId, subjectId, limit: 200 })
    .find((event) => event.payload?.deliveryId === storedReviewDelivery.id);
  assert.equal(privateReviewEvent.payload.correctReviewSourceDeliveryId, priorDelivery.id);
  const reviewBehavior = analyzeLearningBehavior(
    database.listBehaviorEvents({ studentId, subjectId, limit: 200 }),
  );
  assert.equal(reviewBehavior.reportMetrics.correctReviewCount, 1);
  assert.equal(reviewBehavior.reportMetrics.correctReviewSuccessRate, 1);

  const publicEvents = await request(
    baseUrl,
    `/api/behavior-events/${encodeURIComponent(studentId)}?subjectId=${encodeURIComponent(subjectId)}`,
    { cookie: studentCookie },
  );
  assert.equal(publicEvents.status, 200, JSON.stringify(publicEvents.body));
  assert.equal(JSON.stringify(publicEvents.body.events).includes("correctReviewSourceDeliveryId"), false);

  console.log("correct-review-source-binding-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
