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

const run = {
  id: "optional-practice-run-student-001-math",
  studentId: "student-001",
  subjectId: "math-linear-equations",
  practiceDate: "2026-07-14",
  dailyPlanId: "optional-practice-plan",
  status: "required_completed",
  queueItems: [
    {
      id: "optional-practice-base-item",
      familyId: "part_whole_add_subtract",
      instructionalGrade: "G1",
      seed: 41,
      order: 0,
    },
  ],
  currentUnitIndex: 1,
  currentStageIndex: 0,
  activeDeliveryId: null,
  completedStages: [
    {
      queueItemId: "optional-practice-base-item",
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
};

try {
  database.saveDailyPracticeRun(run);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const parentCreate = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: parentCookie,
    body: { mode: "same_type", count: 3 },
  });
  assert.equal(parentCreate.status, 403);

  const created = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: studentCookie,
    body: { mode: "same_type", count: 3, source: "practice_summary" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  let publicRun = created.body.run;
  assert.equal(publicRun.requiredPracticeCompleted, true);
  assert.equal(publicRun.optionalPractice.mode, "same_type");
  assert.equal(publicRun.optionalPractice.requestedCount, 3);
  assert.equal(publicRun.optionalPractice.currentStep.variantLevel, "original");
  assert.equal(JSON.stringify(publicRun).includes("seed"), false);

  const duplicate = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: studentCookie,
    body: { mode: "harder", count: 2 },
  });
  assert.equal(duplicate.status, 409);

  const expectedVariants = ["original", "change_one_number", "change_two_numbers"];
  for (let index = 0; index < expectedVariants.length; index += 1) {
    const delivered = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`, {
      method: "POST",
      cookie: studentCookie,
      body: {},
    });
    assert.ok([200, 201].includes(delivered.status), JSON.stringify(delivered.body));
    assert.equal(delivered.body.delivery.question.variantLevel, expectedVariants[index]);
    assert.equal(JSON.stringify(delivered.body.delivery).includes('"answer"'), false);

    const started = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/start`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001" },
    });
    assert.equal(started.status, 200);

    if (index === 0) {
      const wrong = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/attempts`, {
        method: "POST",
        cookie: studentCookie,
        body: { studentId: "student-001", answer: -1, elapsedSeconds: 2 },
      });
      assert.equal(wrong.status, 200);
      assert.equal(wrong.body.result.isCorrect, false);
      assert.equal(wrong.body.practiceRun.optionalPractice.currentStep.index, 0);

      const hint = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/hints/next`, {
        method: "POST",
        cookie: studentCookie,
        body: { studentId: "student-001" },
      });
      assert.equal(hint.status, 200);

      const assistedAnswer = database.getQuestionDelivery({ deliveryId: delivered.body.delivery.id }).privateCandidate.answer;
      const assisted = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/attempts`, {
        method: "POST",
        cookie: studentCookie,
        body: { studentId: "student-001", answer: assistedAnswer, elapsedSeconds: 2 },
      });
      assert.equal(assisted.status, 200);
      assert.equal(assisted.body.result.requiresIndependentRetry, true);
      assert.equal(assisted.body.practiceRun.optionalPractice.currentStep.index, 0);
      assert.equal(assisted.body.practiceRun.optionalPractice.independentRetryRequired, true);

      const independentDelivery = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`, {
        method: "POST",
        cookie: studentCookie,
        body: {},
      });
      assert.ok([200, 201].includes(independentDelivery.status), JSON.stringify(independentDelivery.body));
      assert.notEqual(independentDelivery.body.delivery.id, delivered.body.delivery.id);
      assert.equal(independentDelivery.body.delivery.question.variantLevel, "original");
      assert.equal(independentDelivery.body.delivery.question.prompt, delivered.body.delivery.question.prompt);
      assert.equal(independentDelivery.body.delivery.question.support.allowed, false);
      assert.equal(JSON.stringify(independentDelivery.body.delivery).includes('"answer"'), false);

      const independentStarted = await request(baseUrl, `/api/question-deliveries/${independentDelivery.body.delivery.id}/start`, {
        method: "POST",
        cookie: studentCookie,
        body: { studentId: "student-001" },
      });
      assert.equal(independentStarted.status, 200);
      const independentAnswer = database.getQuestionDelivery({ deliveryId: independentDelivery.body.delivery.id }).privateCandidate.answer;
      const independentlyScored = await request(baseUrl, `/api/question-deliveries/${independentDelivery.body.delivery.id}/attempts`, {
        method: "POST",
        cookie: studentCookie,
        body: { studentId: "student-001", answer: independentAnswer, elapsedSeconds: 2 },
      });
      assert.equal(independentlyScored.status, 200);
      publicRun = independentlyScored.body.practiceRun;
      assert.equal(publicRun.optionalPractice.currentStep.index, 1);
      continue;
    }

    const answer = database.getQuestionDelivery({ deliveryId: delivered.body.delivery.id }).privateCandidate.answer;
    const scored = await request(baseUrl, `/api/question-deliveries/${delivered.body.delivery.id}/attempts`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001", answer, elapsedSeconds: 2 },
    });
    assert.equal(scored.status, 200);
    publicRun = scored.body.practiceRun;
    if (index < expectedVariants.length - 1) {
      assert.equal(publicRun.optionalPractice.currentStep.index, index + 1);
    }
  }

  assert.equal(publicRun.optionalPractice, null);
  const completedSession = publicRun.optionalPracticeHistory.at(-1);
  assert.equal(completedSession.status, "completed");
  assert.equal(completedSession.completedCount, 3);
  assert.equal(JSON.stringify(publicRun).includes("seed"), false);

  const parentRead = await request(
    baseUrl,
    "/api/daily-practice-runs/student-001/math-linear-equations?practiceDate=2026-07-14",
    { cookie: parentCookie },
  );
  assert.equal(parentRead.status, 200);
  assert.equal(parentRead.body.run.optionalPracticeHistory.at(-1).status, "completed");

  const harderFallback = await request(baseUrl, `/api/daily-practice-runs/${run.id}/optional-practice`, {
    method: "POST",
    cookie: studentCookie,
    body: { mode: "harder", count: 4, source: "practice_summary" },
  });
  assert.equal(harderFallback.status, 201, JSON.stringify(harderFallback.body));
  assert.equal(harderFallback.body.run.optionalPractice.mode, "harder");
  assert.equal(harderFallback.body.run.optionalPractice.familyId, "part_whole_add_subtract");
  assert.equal(harderFallback.body.run.optionalPractice.challengeRoute, "same_family_deeper_variant");
  assert.equal(harderFallback.body.run.optionalPractice.currentStep.variantLevel, "step_added_variant");

  const harderDelivery = await request(
    baseUrl,
    `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`,
    { method: "POST", cookie: studentCookie, body: {} },
  );
  assert.ok([200, 201].includes(harderDelivery.status), JSON.stringify(harderDelivery.body));
  assert.equal(harderDelivery.body.delivery.question.variantLevel, "step_added_variant");
  assert.equal(harderDelivery.body.delivery.question.support.guidedStepCount, 5);
  const harderPrivateCandidate = database.getQuestionDelivery({ deliveryId: harderDelivery.body.delivery.id }).privateCandidate;
  assert.equal(harderPrivateCandidate.metadataTags.variantLevel, "step_added_variant");
  assert.equal(harderPrivateCandidate.metadataTags.structuralVariant.effect, "bounded_intermediate_organization_step");
  assert.ok(harderPrivateCandidate.solutionSteps.length >= 5);
  assert.ok(harderPrivateCandidate.prompt.includes("先把已知量、要求量和它们的关系整理成一条算式或小表"));

  const firstHarderAnswer = harderPrivateCandidate.answer;
  const firstHarderScored = await request(baseUrl, `/api/question-deliveries/${harderDelivery.body.delivery.id}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: firstHarderAnswer, elapsedSeconds: 2 },
  });
  assert.equal(firstHarderScored.status, 200, JSON.stringify(firstHarderScored.body));
  assert.equal(firstHarderScored.body.practiceRun.optionalPractice.currentStep.variantLevel, "two_steps_added_variant");

  const secondHarderDelivery = await request(
    baseUrl,
    `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`,
    { method: "POST", cookie: studentCookie, body: {} },
  );
  assert.ok([200, 201].includes(secondHarderDelivery.status), JSON.stringify(secondHarderDelivery.body));
  assert.equal(secondHarderDelivery.body.delivery.question.variantLevel, "two_steps_added_variant");
  assert.equal(secondHarderDelivery.body.delivery.question.support.guidedStepCount, 6);
  assert.deepEqual(secondHarderDelivery.body.delivery.question.learningPath, ["读题翻译", "找关系", "整理信息", "规划步骤", "计算", "检查"]);
  const secondHarderPrivateCandidate = database.getQuestionDelivery({ deliveryId: secondHarderDelivery.body.delivery.id }).privateCandidate;
  assert.equal(secondHarderPrivateCandidate.metadataTags.structuralVariant.effect, "bounded_two_step_organization_extension");
  assert.ok(secondHarderPrivateCandidate.solutionSteps.length >= 6);
  assert.ok(secondHarderPrivateCandidate.prompt.includes("再写出从已知条件到答案的计算顺序"));

  const secondHarderScored = await request(baseUrl, `/api/question-deliveries/${secondHarderDelivery.body.delivery.id}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: secondHarderPrivateCandidate.answer, elapsedSeconds: 2 },
  });
  assert.equal(secondHarderScored.status, 200, JSON.stringify(secondHarderScored.body));
  assert.equal(secondHarderScored.body.practiceRun.optionalPractice.currentStep.variantLevel, "reverse_question");

  const reverseHarderDelivery = await request(
    baseUrl,
    `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`,
    { method: "POST", cookie: studentCookie, body: {} },
  );
  assert.ok([200, 201].includes(reverseHarderDelivery.status), JSON.stringify(reverseHarderDelivery.body));
  assert.equal(reverseHarderDelivery.body.delivery.question.variantLevel, "reverse_question");
  assert.equal(reverseHarderDelivery.body.delivery.question.support.guidedStepCount, 4);
  const reverseHarderPrivateCandidate = database.getQuestionDelivery({ deliveryId: reverseHarderDelivery.body.delivery.id }).privateCandidate;
  assert.equal(reverseHarderPrivateCandidate.metadataTags.structuralVariant.effect, "bounded_inverse_question");
  assert.equal(reverseHarderPrivateCandidate.metadataTags.itemTags.practiceTags.repeatRole, "bounded_inverse_transfer");

  const reverseHarderScored = await request(
    baseUrl,
    `/api/question-deliveries/${reverseHarderDelivery.body.delivery.id}/attempts`,
    {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001", answer: reverseHarderPrivateCandidate.answer, elapsedSeconds: 2 },
    },
  );
  assert.equal(reverseHarderScored.status, 200, JSON.stringify(reverseHarderScored.body));
  assert.equal(reverseHarderScored.body.practiceRun.optionalPractice.currentStep.variantLevel, "multi_step_extension");

  const multiStepHarderDelivery = await request(
    baseUrl,
    `/api/daily-practice-runs/${run.id}/optional-practice/deliveries`,
    { method: "POST", cookie: studentCookie, body: {} },
  );
  assert.ok([200, 201].includes(multiStepHarderDelivery.status), JSON.stringify(multiStepHarderDelivery.body));
  assert.equal(multiStepHarderDelivery.body.delivery.question.variantLevel, "multi_step_extension");
  assert.equal(multiStepHarderDelivery.body.delivery.question.support.guidedStepCount, 4);
  const multiStepHarderPrivateCandidate = database.getQuestionDelivery({ deliveryId: multiStepHarderDelivery.body.delivery.id }).privateCandidate;
  assert.equal(multiStepHarderPrivateCandidate.metadataTags.structuralVariant.effect, "bounded_multi_step_question");
  assert.equal(multiStepHarderPrivateCandidate.metadataTags.itemTags.practiceTags.repeatRole, "bounded_multi_step_transfer");
  assert.ok(multiStepHarderPrivateCandidate.answerRule.includes("+"));

  console.log("optional-practice-run-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
