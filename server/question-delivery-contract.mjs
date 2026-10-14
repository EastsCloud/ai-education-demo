import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { formatMathAnswerValue } from "../src/services/math-answer-input.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

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
  assert.ok(response.cookie);
  return response.cookie;
}

function deliveryRequest({ mode = "practice", seed = 31, variantLevel = "original" } = {}) {
  return {
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode,
    familyId: "part_whole_add_subtract",
    instructionalGrade: "G1",
    variantLevel,
    aiVersion: "semi_ai",
    seed,
    queueItemId: "contract-queue-item",
    source: "contract_test",
  };
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  database.savePlan({
    id: "strategy-preference-plan",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    supportProfile: {
      strategyPreference: {
        orderedStrategyIds: ["quantity_relation_table"],
      },
    },
    updatedAt: "2026-09-06T00:00:00.000Z",
  });

  const practiceRequest = deliveryRequest();
  const created = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: { request: practiceRequest },
  });
  assert.equal(created.status, 201);
  const delivery = created.body.delivery;
  assert.equal(delivery.mode, "practice");
  assert.equal(delivery.question.support.allowed, true);
  assert.ok(delivery.question.support.hintCount >= 2);
  assert.equal(delivery.question.solutionStrategies.length, 3);
  assert.equal(delivery.question.solutionStrategies[0].id, "quantity_relation_table");
  assert.equal(delivery.question.solutionStrategies.every((strategy) => strategy.steps.length >= 3), true);
  assert.equal(JSON.stringify(delivery.question.solutionStrategies).includes('"answer"'), false);
  assert.equal(Object.hasOwn(delivery.question, "answer"), false);
  assert.equal(Object.hasOwn(delivery.question, "answerRule"), false);
  assert.equal(Object.hasOwn(delivery.question, "solutionDerivation"), false);
  assert.equal(Object.hasOwn(delivery.question.metadata, "logicModel"), false);
  assert.equal(Object.hasOwn(delivery.question, "hintLayers"), false);
  assert.equal(Object.hasOwn(delivery.question, "validatorTrace"), false);
  assert.equal(JSON.stringify(delivery).includes("contextTemplateId"), false);
  assert.equal(JSON.stringify(delivery).includes("applicationContext"), false);
  assert.equal(JSON.stringify(delivery).toLowerCase().includes("seed"), false);
  assert.ok(database.getQuestionDelivery({ deliveryId: delivery.id }).privateCandidate.metadataTags.featureSignature.matchingKeys.length);

  const questionFirstDelivery = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: { request: deliveryRequest({ seed: 32, variantLevel: "question_order_variant" }) },
  });
  assert.equal(questionFirstDelivery.status, 201);
  assert.equal(questionFirstDelivery.body.delivery.question.variantLevel, "question_order_variant");
  assert.ok(questionFirstDelivery.body.delivery.question.prompt.startsWith("问题："));
  assert.equal(JSON.stringify(questionFirstDelivery.body.delivery).includes('"answer"'), false);

  const clockTimeDelivery = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        ...deliveryRequest({ seed: 34, variantLevel: "reverse_question" }),
        familyId: "time_elapsed_simple",
        instructionalGrade: "G3",
      },
    },
  });
  assert.equal(clockTimeDelivery.status, 201);
  assert.equal(clockTimeDelivery.body.delivery.question.answerInput.kind, "clock_time");
  assert.equal(JSON.stringify(clockTimeDelivery.body.delivery).includes('"answer"'), false);
  const privateClockTimeDelivery = database.getQuestionDelivery({ deliveryId: clockTimeDelivery.body.delivery.id });
  const clockStart = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(clockTimeDelivery.body.delivery.id)}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(clockStart.status, 200);
  const invalidClockAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(clockTimeDelivery.body.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: String(privateClockTimeDelivery.privateCandidate.answer) },
  });
  assert.equal(invalidClockAttempt.status, 400);
  const clockAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(clockTimeDelivery.body.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId: "student-001",
      answer: formatMathAnswerValue({
        answerInput: privateClockTimeDelivery.privateCandidate.answerInput,
        value: privateClockTimeDelivery.privateCandidate.answer,
      }),
    },
  });
  assert.equal(clockAttempt.status, 200);
  assert.equal(clockAttempt.body.result.isCorrect, true);
  assert.equal(
    database.getQuestionDelivery({ deliveryId: clockTimeDelivery.body.delivery.id }).attempts[0].answer,
    privateClockTimeDelivery.privateCandidate.answer,
  );

  const fractionDelivery = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        ...deliveryRequest({ seed: 2 }),
        familyId: "fraction_add_same_denominator",
        instructionalGrade: "G4",
      },
    },
  });
  assert.equal(fractionDelivery.status, 201);
  assert.equal(fractionDelivery.body.delivery.question.answerInput.kind, "fraction");
  assert.equal(JSON.stringify(fractionDelivery.body.delivery).includes('"answer"'), false);
  const privateFractionDelivery = database.getQuestionDelivery({ deliveryId: fractionDelivery.body.delivery.id });
  assert.equal(privateFractionDelivery.privateCandidate.answer, 0.5);
  const fractionStart = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(fractionDelivery.body.delivery.id)}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(fractionStart.status, 200);
  const invalidFractionAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(fractionDelivery.body.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: "0.5" },
  });
  assert.equal(invalidFractionAttempt.status, 400);
  const fractionAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(fractionDelivery.body.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: "3/6" },
  });
  assert.equal(fractionAttempt.status, 200);
  assert.equal(fractionAttempt.body.result.isCorrect, true);
  assert.equal(database.getQuestionDelivery({ deliveryId: fractionDelivery.body.delivery.id }).attempts[0].answer, 0.5);

  const twoStepsAddedDelivery = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: { request: deliveryRequest({ seed: 33, variantLevel: "two_steps_added_variant" }) },
  });
  assert.equal(twoStepsAddedDelivery.status, 201);
  assert.equal(twoStepsAddedDelivery.body.delivery.question.variantLevel, "two_steps_added_variant");
  assert.ok(twoStepsAddedDelivery.body.delivery.question.prompt.includes("再写出从已知条件到答案的计算顺序"));
  assert.equal(twoStepsAddedDelivery.body.delivery.question.support.guidedStepCount, 6);
  assert.deepEqual(twoStepsAddedDelivery.body.delivery.question.learningPath, ["读题翻译", "找关系", "整理信息", "规划步骤", "计算", "检查"]);
  assert.equal(JSON.stringify(twoStepsAddedDelivery.body.delivery).includes('"answer"'), false);
  const privateTwoStepsAddedDelivery = database.getQuestionDelivery({ deliveryId: twoStepsAddedDelivery.body.delivery.id });
  assert.equal(privateTwoStepsAddedDelivery.privateCandidate.metadataTags.structuralVariant.effect, "bounded_two_step_organization_extension");
  assert.ok(privateTwoStepsAddedDelivery.privateCandidate.solutionSteps.length >= 6);
  const startedTwoStepsAdded = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(twoStepsAddedDelivery.body.delivery.id)}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(startedTwoStepsAdded.status, 200);
  const twoStepGuidedPhases = ["read_translate", "relationship", "organize", "plan", "calculation", "check"];
  for (const [index, phase] of twoStepGuidedPhases.entries()) {
    const opened = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(twoStepsAddedDelivery.body.delivery.id)}/guided-steps/next`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001" },
    });
    assert.equal(opened.status, 200);
    assert.equal(opened.body.step.level, index + 1);
    assert.equal(opened.body.step.phase, phase);
    const isFinalStep = index === twoStepGuidedPhases.length - 1;
    const response = await request(
      baseUrl,
      `/api/question-deliveries/${encodeURIComponent(twoStepsAddedDelivery.body.delivery.id)}/guided-steps/responses`,
      {
        method: "POST",
        cookie: studentCookie,
        body: {
          studentId: "student-001",
          level: index + 1,
          response: isFinalStep ? privateTwoStepsAddedDelivery.privateCandidate.answer : "写下这一小步的想法。",
        },
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.body.behaviorEvent.payload.guidedStepPhase, phase);
    assert.equal(response.body.response.status, isFinalStep ? "confirmed" : "recorded");
  }
  const twoStepsAddedProcess = await request(
    baseUrl,
    `/api/question-deliveries/${encodeURIComponent(twoStepsAddedDelivery.body.delivery.id)}/guided-process`,
    { cookie: studentCookie },
  );
  assert.equal(twoStepsAddedProcess.status, 200);
  assert.deepEqual(twoStepsAddedProcess.body.process.steps.map((step) => step.phase), twoStepGuidedPhases);

  const unavailableFullAi = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        ...practiceRequest,
        aiVersion: "full_ai_ready",
        seed: 32,
      },
    },
  });
  assert.equal(unavailableFullAi.status, 400);
  assert.equal(unavailableFullAi.body.error, "ai_candidate_provider_required");

  const fetched = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}`, {
    cookie: studentCookie,
  });
  assert.equal(fetched.status, 200);
  assert.equal(Object.hasOwn(fetched.body.delivery.question, "answer"), false);

  const started = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(started.status, 200);
  assert.ok(database.getQuestionDelivery({ deliveryId: delivery.id }).startedAt);

  const parentAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/attempts`, {
    method: "POST",
    cookie: parentCookie,
    body: { studentId: "student-001", answer: 1, elapsedSeconds: 12 },
  });
  assert.equal(parentAttempt.status, 403);

  const wrongAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: -1, elapsedSeconds: 12, answerRevisionCount: 3 },
  });
  assert.equal(wrongAttempt.status, 200);
  assert.equal(wrongAttempt.body.result.isCorrect, false);
  assert.equal(Object.hasOwn(wrongAttempt.body.result, "correctAnswer"), false);
  assert.equal(wrongAttempt.body.result.feedbackCode, "retry_or_open_next_hint");
  assert.equal(wrongAttempt.body.behaviorEvent.eventType, "answer_submitted");
  assert.equal(wrongAttempt.body.behaviorEvent.payload.scoringSource, "server_authoritative");
  assert.equal(wrongAttempt.body.behaviorEvent.payload.timingSource, "server_started_at");
  assert.equal(wrongAttempt.body.behaviorEvent.payload.answerRevisionCount, 3);
  assert.equal(wrongAttempt.body.behaviorEvent.payload.interactionMetadataSource, "client_observed_count");
  assert.ok(wrongAttempt.body.behaviorEvent.payload.questionFeatureKeys.length);
  assert.equal(JSON.stringify(wrongAttempt.body.behaviorEvent).includes('"answer"'), false);
  assert.equal(JSON.stringify(wrongAttempt.body.behaviorEvent).includes("answerDraftValue"), false);

  const spoofedAnswerEvent = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: {
        eventId: "spoofed-answer-event",
        studentId: "student-001",
        eventType: "answer_submitted",
        timestamp: new Date().toISOString(),
        payload: { isCorrect: true },
      },
    },
  });
  assert.equal(spoofedAnswerEvent.status, 403);

  const hint = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/hints/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(hint.status, 200);
  assert.equal(hint.body.hint.level, 1);
  assert.equal(hint.body.hint.title, "读题翻译");
  assert.equal(hint.body.behaviorEvent.eventType, "hint_opened");
  assert.equal(hint.body.behaviorEvent.payload.hintLevel, 1);
  assert.equal(hint.body.behaviorEvent.payload.interactionSource, "server_authoritative_support");
  assert.equal(JSON.stringify(hint.body.behaviorEvent).includes("answer"), false);

  const guidedStep = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(guidedStep.status, 200);
  assert.equal(guidedStep.body.step.phase, "read_translate");
  assert.match(guidedStep.body.step.prompt, /^读题翻译：/);
  assert.equal(Object.hasOwn(guidedStep.body.step, "expected"), false);
  assert.equal(guidedStep.body.behaviorEvent.eventType, "guided_step_opened");
  assert.equal(guidedStep.body.behaviorEvent.payload.guidedStepIndex, 0);
  assert.equal(guidedStep.body.behaviorEvent.payload.interactionSource, "server_authoritative_support");

  const blockedGuidedStep = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(blockedGuidedStep.status, 409);
  assert.equal(blockedGuidedStep.body.error, "guided_response_required");

  const firstGuidedResponse = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", level: 1, response: "先找出已知量、问题和它们的单位。" },
  });
  assert.equal(firstGuidedResponse.status, 200);
  assert.equal(firstGuidedResponse.body.response.status, "recorded");
  assert.equal(firstGuidedResponse.body.result.feedbackCode, "guided_reasoning_recorded");
  assert.equal(firstGuidedResponse.body.behaviorEvent.eventType, "guided_step_response_recorded");
  assert.equal(firstGuidedResponse.body.behaviorEvent.payload.guidedStepPhase, "read_translate");
  assert.equal(firstGuidedResponse.body.behaviorEvent.payload.guidedResponseType, "short_reasoning");
  assert.equal(JSON.stringify(firstGuidedResponse.body).includes("已知量、问题"), false);

  for (const expectedLevel of [2, 3]) {
    const nextGuidedStep = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/next`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001" },
    });
    assert.equal(nextGuidedStep.status, 200);
    assert.equal(nextGuidedStep.body.step.level, expectedLevel);
    const guidedResponse = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/responses`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001", level: expectedLevel, response: "根据题意写出这一步的关系。" },
    });
    assert.equal(guidedResponse.status, 200);
    assert.equal(guidedResponse.body.response.status, "recorded");
  }

  const finalGuidedStep = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(finalGuidedStep.status, 200);
  assert.equal(finalGuidedStep.body.step.level, 4);
  assert.equal(finalGuidedStep.body.step.responseType, "final_answer");

  const wrongGuidedFinal = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", level: 4, response: -1 },
  });
  assert.equal(wrongGuidedFinal.status, 200);
  assert.equal(wrongGuidedFinal.body.response.status, "needs_retry");
  assert.equal(wrongGuidedFinal.body.result.feedbackCode, "guided_final_retry");
  assert.equal(Object.hasOwn(wrongGuidedFinal.body.result, "correctAnswer"), false);

  const guidedAnswer = database.getQuestionDelivery({ deliveryId: delivery.id }).privateCandidate.answer;
  const correctGuidedFinal = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-steps/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", level: 4, response: guidedAnswer },
  });
  assert.equal(correctGuidedFinal.status, 200);
  assert.equal(correctGuidedFinal.body.response.status, "confirmed");
  assert.equal(correctGuidedFinal.body.result.feedbackCode, "guided_final_confirmed");
  assert.equal(JSON.stringify(correctGuidedFinal.body).includes(`"numericResponse":${guidedAnswer}`), false);
  assert.equal(correctGuidedFinal.body.delivery.question.support.guidedResponseStates.at(-1).status, "confirmed");

  const parentGuidedProcess = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-process`, {
    cookie: parentCookie,
  });
  assert.equal(parentGuidedProcess.status, 403);

  const studentGuidedProcess = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/guided-process`, {
    cookie: studentCookie,
  });
  assert.equal(studentGuidedProcess.status, 200);
  assert.equal(studentGuidedProcess.body.process.steps.length, 4);
  assert.equal(studentGuidedProcess.body.process.steps[0].response, "先找出已知量、问题和它们的单位。");
  assert.equal(studentGuidedProcess.body.process.steps.at(-1).response, String(guidedAnswer));
  assert.equal(Object.hasOwn(studentGuidedProcess.body.process, "answerRule"), false);
  assert.equal(JSON.stringify(studentGuidedProcess.body.process).includes("expected"), false);

  const family = shanghaiMathItemFamilies.find((item) => item.id === practiceRequest.familyId);
  const expectedCandidate = validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      aiVersion: practiceRequest.aiVersion,
      family,
      seed: practiceRequest.seed,
      instructionalGrade: practiceRequest.instructionalGrade,
      variantLevel: practiceRequest.variantLevel,
    }),
  );
  const correctAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: expectedCandidate.answer, elapsedSeconds: 18, answerRevisionCount: 999 },
  });
  assert.equal(correctAttempt.status, 200);
  assert.equal(correctAttempt.body.result.isCorrect, true);
  assert.equal(correctAttempt.body.result.status, "completed");
  assert.equal(correctAttempt.body.behaviorEvent.payload.answerRevisionCount, 25);
  const trustedAnswerEvents = database
    .listBehaviorEvents({ studentId: "student-001" })
    .filter((event) => event.eventType === "answer_submitted");
  assert.equal(trustedAnswerEvents.length, 4);
  assert.equal(trustedAnswerEvents.every((event) => event.payload?.scoringSource === "server_authoritative"), true);

  const formal = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: { request: deliveryRequest({ mode: "formal_assessment", seed: 41 }) },
  });
  assert.equal(formal.status, 201);
  assert.equal(formal.body.delivery.question.support.allowed, false);
  assert.equal(formal.body.delivery.question.support.hintCount, 0);
  assert.equal(formal.body.delivery.question.solutionStrategies.length, 0);

  const formalHint = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(formal.body.delivery.id)}/hints/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(formalHint.status, 409);
  assert.equal(formalHint.body.error, "support_not_available");

  console.log("question-delivery-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
