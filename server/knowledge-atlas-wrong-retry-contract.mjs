import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";
import { createQuestionDeliveryRecord, recordQuestionDeliveryAttempt } from "../src/services/question-delivery-runtime.js";
import { formatMathAnswerValue } from "../src/services/math-answer-input.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

const studentId = "student-001";
const subjectId = "math-linear-equations";
const familyId = "time_elapsed_simple";
const sourceSeed = 731;

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

function createOriginalWrongDelivery() {
  const family = shanghaiMathItemFamilies.find((item) => item.id === familyId);
  const candidate = validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      aiVersion: "semi_ai",
      family,
      seed: sourceSeed,
      instructionalGrade: "G1",
      variantLevel: "reverse_question",
    }),
  );
  assert.equal(candidate.qualityStatus, "system_validated");
  assert.equal(candidate.answerInput.kind, "clock_time");

  const original = createQuestionDeliveryRecord({
    candidate,
    deliveryId: "atlas-wrong-time-original",
    request: {
      studentId,
      subjectId,
      mode: "practice",
      familyId,
      instructionalGrade: "G1",
      variantLevel: "reverse_question",
      aiVersion: "semi_ai",
      seed: sourceSeed,
      queueItemId: "atlas-wrong-time-source",
      sessionId: "atlas-wrong-time-source-session",
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
    createdAt: "2026-09-05T09:00:00.000Z",
  });
  const wrongMinutes = (Number(candidate.answer) + 60) % (24 * 60);
  const wrongAnswer = formatMathAnswerValue({ answerInput: candidate.answerInput, value: wrongMinutes });
  const scored = recordQuestionDeliveryAttempt({
    delivery: original,
    answer: wrongAnswer,
    elapsedSeconds: 12,
    submittedAt: "2026-09-05T09:02:00.000Z",
  });
  assert.equal(scored.result.isCorrect, false);
  return { candidate, delivery: scored.delivery, wrongAnswer };
}

try {
  const source = createOriginalWrongDelivery();
  database.saveQuestionDelivery(source.delivery);
  database.saveBehaviorEvent({
    eventId: "atlas-wrong-time-evidence",
    studentId,
    subjectId,
    sessionId: "atlas-wrong-time-source-session",
    eventType: "answer_submitted",
    timestamp: "2026-09-05T09:02:00.000Z",
    targetId: source.candidate.id,
    payload: {
      scoringSource: "server_authoritative",
      isCorrect: false,
      hintsOpened: 0,
      elapsedSeconds: 12,
      questionPrompt: source.candidate.prompt,
      questionFamilyId: familyId,
      abilityTags: source.candidate.metadataTags.abilityTags,
      atlasNodeIds: source.candidate.metadataTags.atlasNodeIds,
      variantLevel: "reverse_question",
      deliveryId: source.delivery.id,
      subjectId,
    },
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const atlas = await request(baseUrl, `/api/knowledge-atlases/${studentId}/${subjectId}`, { cookie: studentCookie });
  assert.equal(atlas.status, 200, JSON.stringify(atlas.body));
  const wrongItem = atlas.body.atlas.wrongQuestionSet.find((item) => item.questionId === source.candidate.id);
  assert.ok(wrongItem);
  assert.equal(wrongItem.retryState, "needs_original_retry");
  assert.equal(JSON.stringify(atlas.body.atlas).includes('"correctAnswer"'), false);

  const parentDenied = await request(baseUrl, "/api/knowledge-atlas-reviews", {
    method: "POST",
    cookie: parentCookie,
    body: { studentId, subjectId, questionId: source.candidate.id },
  });
  assert.equal(parentDenied.status, 403);

  const unavailable = await request(baseUrl, "/api/knowledge-atlas-reviews", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId, subjectId, questionId: "not-a-student-question" },
  });
  assert.equal(unavailable.status, 409);

  const replay = await request(baseUrl, "/api/knowledge-atlas-reviews", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId, subjectId, questionId: source.candidate.id },
  });
  assert.equal(replay.status, 201, JSON.stringify(replay.body));
  assert.equal(replay.body.delivery.question.prompt, source.candidate.prompt);
  assert.equal(replay.body.delivery.question.answerInput.kind, "clock_time");
  assert.equal(JSON.stringify(replay.body.delivery).includes('"answer"'), false);
  assert.equal(JSON.stringify(replay.body.delivery).includes("retrySourceDeliveryId"), false);
  const recall = replay.body.delivery.question.previousAttemptReference;
  assert.equal(recall.recallKind, "previous_wrong_attempt");
  assert.equal(recall.sourcePrompt, source.candidate.prompt);
  assert.equal(recall.studentAnswerDisplay, source.wrongAnswer);
  assert.equal(Object.hasOwn(recall, "studentAnswer"), false);
  assert.equal(Object.hasOwn(recall, "correctAnswer"), false);
  assert.equal(Object.hasOwn(recall, "sourceDeliveryId"), false);

  const replayDelivery = database.getQuestionDelivery({ deliveryId: replay.body.delivery.id });
  assert.equal(replayDelivery.generationRequest.practiceMode, "atlas_wrong_retry");
  assert.equal(replayDelivery.generationRequest.retrySourceDeliveryId, source.delivery.id);
  assert.equal(replayDelivery.generationRequest.seed, sourceSeed);
  assert.equal(replayDelivery.privateCandidate.prompt, source.candidate.prompt);

  const started = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(replayDelivery.id)}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId },
  });
  assert.equal(started.status, 200, JSON.stringify(started.body));

  const correctAnswer = formatMathAnswerValue({ answerInput: source.candidate.answerInput, value: source.candidate.answer });
  const completed = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(replayDelivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId, answer: correctAnswer, elapsedSeconds: 18 },
  });
  assert.equal(completed.status, 200, JSON.stringify(completed.body));
  assert.equal(completed.body.result.isCorrect, true);
  assert.equal(completed.body.behaviorEvent.payload.extraPracticeMode, "atlas_wrong_retry");
  assert.equal(Object.hasOwn(completed.body.behaviorEvent.payload, "retrySourceDeliveryId"), false);

  const resolved = await request(baseUrl, "/api/knowledge-atlas-reviews", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId, subjectId, questionId: source.candidate.id },
  });
  assert.equal(resolved.status, 409);

  console.log("knowledge-atlas-wrong-retry-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
