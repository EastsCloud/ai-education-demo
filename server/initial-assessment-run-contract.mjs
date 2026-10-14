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
  assert.ok(response.cookie);
  return response.cookie;
}

const runRequest = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
  targetGrade: "G5",
};

try {
  database.saveStudentOnboardingPrefill({
    id: "prefill-student-001",
    studentId: "student-001",
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
    subjectSelectionConfirmedByUserId: "user-student-001",
    confirmationStatus: "student_confirmed",
    updatedAt: "2026-09-06T00:00:00.000Z",
  });
  database.saveAssessmentSession({
    id: "personality-student-001",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    assessmentType: "onboarding_personality",
    status: "completed",
    serverAuthoritative: true,
    responses: [],
    updatedAt: "2026-09-06T00:00:00.000Z",
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const created = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(created.status, 201);
  let session = created.body.session;
  assert.equal(session.serverAuthoritative, true);
  assert.ok(session.presentationQuestions.length >= 4);
  assert.ok(session.presentationQuestions.every((question) => question.answerInput?.kind === "numeric"));
  assert.equal(JSON.stringify(session).includes('"answer"'), false);
  assert.equal(JSON.stringify(session).includes("questionSnapshot"), false);
  assert.equal(JSON.stringify(session).includes("generationTags"), false);
  assert.equal(JSON.stringify(session).includes("contextTemplateId"), false);
  assert.equal(JSON.stringify(session).includes("applicationContext"), false);
  assert.equal(JSON.stringify(session).includes("requestedSeed"), false);

  const repeatedStart = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(repeatedStart.status, 200);
  assert.equal(repeatedStart.body.idempotent, true);
  assert.equal(repeatedStart.body.session.id, session.id);
  assert.deepEqual(repeatedStart.body.session.presentationQuestions, session.presentationQuestions);

  const privateSession = database.getAssessmentSessionById({ sessionId: session.id });
  assert.ok(Number.isInteger(privateSession.assessmentSeed));
  assert.ok(privateSession.assessmentSeed > 0);
  assert.ok(privateSession.questionSnapshot.every((question) => Number.isFinite(question.answer)));
  assert.ok(privateSession.questionSnapshot.every((question) => question.answerInput?.kind === "numeric"));
  assert.ok(
    privateSession.questionSnapshot.some((question) =>
      ["context_change", "relationship_reframe", "question_order_variant"].includes(question.metadata?.variantLevel),
    ),
  );
  assert.ok(session.coverage.controlledTransferQuestionCount >= 1);
  assert.equal(JSON.stringify(session).includes("assessmentSeed"), false);

  const parentAttempt = await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
    method: "POST",
    cookie: parentCookie,
    body: {
      studentId: "student-001",
      questionId: session.presentationQuestions[0].id,
      answer: 1,
      responseTimeMs: 500,
    },
  });
  assert.equal(parentAttempt.status, 403);

  const outOfOrderAttempt = await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId: "student-001",
      questionId: session.presentationQuestions[1].id,
      answer: 1,
      responseTimeMs: 500,
    },
  });
  assert.equal(outOfOrderAttempt.status, 409);

  const answerById = new Map(privateSession.questionSnapshot.map((question) => [question.id, question.answer]));
  for (const question of session.presentationQuestions) {
    const response = await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId: "student-001",
        questionId: question.id,
        answer: answerById.get(question.id),
        responseTimeMs: 900,
      },
    });
    assert.equal(response.status, 200);
    session = response.body.session;
    assert.equal(JSON.stringify(session).includes('"answer"'), false);
    assert.equal(JSON.stringify(session).includes('"isCorrect"'), false);
    assert.equal(JSON.stringify(session).includes("contextTemplateId"), false);
    assert.equal(JSON.stringify(session).includes("applicationContext"), false);
  }

  assert.equal(session.status, "completed");
  assert.equal(session.result.accuracy, 1);
  assert.equal(session.result.abilityMap.serverAuthoritative, true);
  assert.equal(session.result.abilityMap.source, "server_initial_assessment_evidence");
  assert.ok(session.result.abilityMap.dimensions.length > 0);
  assert.ok(session.result.abilityMap.dimensions.some((dimension) => dimension.id === "transfer"));
  assert.equal(session.result.uncertainCount, 0);
  assert.equal(session.responses.some((response) => "isCorrect" in response), false);
  assert.equal(JSON.stringify(session).includes('"answer"'), false);
  assert.equal(JSON.stringify(session).includes('"isCorrect"'), false);
  assert.equal(JSON.stringify(session).includes("generationTags"), false);
  assert.equal(JSON.stringify(session).includes("contextTemplateId"), false);
  assert.equal(JSON.stringify(session).includes("applicationContext"), false);
  assert.equal(JSON.stringify(session).includes("requestedSeed"), false);

  const completedPrivateSession = database.getAssessmentSessionById({ sessionId: session.id });
  assert.equal(completedPrivateSession.responses.every((response) => response.isCorrect), true);

  const hydrated = await request(
    baseUrl,
    "/api/assessment-sessions/student-001/math-linear-equations?assessmentType=initial_onboarding",
    { cookie: studentCookie },
  );
  assert.equal(hydrated.status, 200);
  assert.equal(hydrated.body.session.serverAuthoritative, true);
  assert.equal(JSON.stringify(hydrated.body.session).includes('"answer"'), false);
  assert.equal(JSON.stringify(hydrated.body.session).includes("assessmentSeed"), false);
  assert.equal(JSON.stringify(hydrated.body.session).includes('"isCorrect"'), false);

  const overwriteAttempt = await request(baseUrl, "/api/assessment-sessions", {
    method: "POST",
    cookie: studentCookie,
    body: { session: privateSession },
  });
  assert.equal(overwriteAttempt.status, 409);
  assert.equal(overwriteAttempt.body.error, "assessment_session_server_managed");

  const browserDeclaredAssessment = await request(baseUrl, "/api/assessment-sessions", {
    method: "POST",
    cookie: studentCookie,
    body: {
      session: {
        id: "browser-declared-assessment",
        studentId: "student-001",
        subjectId: "math-linear-equations",
        assessmentType: "initial_onboarding",
        status: "completed",
      },
    },
  });
  assert.equal(browserDeclaredAssessment.status, 409);
  assert.equal(browserDeclaredAssessment.body.error, "assessment_session_server_managed");

  const uncertainRun = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { ...runRequest, targetGrade: "G6" } },
  });
  assert.equal(uncertainRun.status, 201);
  assert.equal(JSON.stringify(uncertainRun.body.session).includes("requestedSeed"), false);

  const uncertainResponse = await request(
    baseUrl,
    `/api/initial-assessment-runs/${encodeURIComponent(uncertainRun.body.session.id)}/responses`,
    {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId: "student-001",
        questionId: uncertainRun.body.session.presentationQuestions[0].id,
        answer: null,
        isUncertain: true,
        responseTimeMs: 640,
      },
    },
  );
  assert.equal(uncertainResponse.status, 200);
  assert.equal(uncertainResponse.body.session.responses[0].responseType, "uncertain_skip");
  assert.equal(uncertainResponse.body.session.responses[0].isUncertain, true);
  assert.equal(JSON.stringify(uncertainResponse.body.session).includes('"isCorrect"'), false);
  const uncertainPrivateSession = database.getAssessmentSessionById({ sessionId: uncertainRun.body.session.id });
  assert.equal(uncertainPrivateSession.responses[0].answer, null);
  assert.equal(uncertainPrivateSession.responses[0].isCorrect, false);
  assert.equal(uncertainPrivateSession.responses[0].isUncertain, true);

  console.log("initial-assessment-run-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
