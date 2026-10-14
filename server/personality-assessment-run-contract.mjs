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

const runRequest = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
};

try {
  database.saveStudentOnboardingPrefill({
    id: "prefill-student-001",
    studentId: "student-001",
    subjectIds: ["math"],
    confirmationStatus: "student_confirmed",
    updatedAt: "2026-07-14T00:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const anonymous = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    body: { request: runRequest },
  });
  assert.equal(anonymous.status, 401);

  const parentCreate = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie: parentCookie,
    body: { request: runRequest },
  });
  assert.equal(parentCreate.status, 403);

  const created = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  let session = created.body.session;
  assert.equal(session.serverAuthoritative, true);
  assert.equal(session.presentationQuestions.length, 12);
  assert.equal(JSON.stringify(session).includes("optionScores"), false);
  assert.equal(JSON.stringify(session).includes("questionSnapshot"), false);

  const privateSession = database.getAssessmentSessionById({ sessionId: session.id });
  assert.equal(privateSession.questionSnapshot.length, 12);
  assert.equal(privateSession.questionSnapshot.every((question) => Array.isArray(question.optionScores)), true);

  const repeated = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.idempotent, true);
  assert.equal(repeated.body.session.id, session.id);

  const parentAnswer = await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
    method: "POST",
    cookie: parentCookie,
    body: { studentId: "student-001", questionId: session.presentationQuestions[0].id, answer: 0, responseTimeMs: 3000 },
  });
  assert.equal(parentAnswer.status, 403);

  const outOfOrder = await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", questionId: session.presentationQuestions[1].id, answer: 0, responseTimeMs: 3000 },
  });
  assert.equal(outOfOrder.status, 409);

  const invalidAnswer = await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", questionId: session.presentationQuestions[0].id, answer: 9, responseTimeMs: 3000 },
  });
  assert.equal(invalidAnswer.status, 409);

  for (const [index, question] of session.presentationQuestions.entries()) {
    const response = await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId: "student-001",
        questionId: question.id,
        answer: index % 4,
        responseTimeMs: 3000 + index,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    session = response.body.session;
    assert.equal(JSON.stringify(session).includes("optionScores"), false);
    if (index === 5) {
      assert.equal(session.result.psychologicalComplete, true);
      assert.equal(session.result.learningComplete, false);
    }
  }

  assert.equal(session.status, "completed");
  assert.equal(session.result.complete, true);
  assert.ok(session.result.studentType?.id);
  assert.ok(session.result.supportProfile?.supportMode?.id);

  const parentRead = await request(
    baseUrl,
    "/api/personality-assessment-runs/student-001/math-linear-equations",
    { cookie: parentCookie },
  );
  assert.equal(parentRead.status, 200);
  assert.equal(parentRead.body.session.id, session.id);
  assert.equal(JSON.stringify(parentRead.body.session).includes("optionScores"), false);

  const genericRead = await request(
    baseUrl,
    "/api/assessment-sessions/student-001/math-linear-equations?assessmentType=onboarding_personality",
    { cookie: studentCookie },
  );
  assert.equal(genericRead.status, 200);
  assert.equal(genericRead.body.session.serverAuthoritative, true);
  assert.equal(JSON.stringify(genericRead.body.session).includes("optionScores"), false);

  console.log("personality-assessment-run-contract: passed");
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  database.close();
}
