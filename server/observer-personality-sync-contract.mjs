import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPersonalityAssessmentRunRepository } from "../src/services/personality-assessment-run-repository.js";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));
const studentId = "student-001";
const subjectId = "math-linear-equations";

async function request(baseUrl, path, { body, cookie, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.cookie;
}

try {
  database.saveStudentOnboardingPrefill({
    id: "observer-personality-prefill",
    studentId,
    subjectIds: ["math"],
    confirmationStatus: "student_confirmed",
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const started = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { studentId, subjectId } },
  });
  assert.equal(started.status, 201, JSON.stringify(started.body));
  let session = started.body.session;
  for (const [index, question] of session.presentationQuestions.entries()) {
    const submitted = await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId,
        questionId: question.id,
        answer: index % question.options.length,
        responseTimeMs: 2000 + index,
      },
    });
    assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
    session = submitted.body.session;
  }
  assert.equal(session.result.complete, true);

  const observerRepository = createPersonalityAssessmentRunRepository({
    apiClient: {
      enabled: true,
      async getLatestPersonalityAssessmentRun({ studentId: requestedStudentId, subjectId: requestedSubjectId }) {
        const response = await request(
          baseUrl,
          `/api/personality-assessment-runs/${encodeURIComponent(requestedStudentId)}/${encodeURIComponent(requestedSubjectId)}`,
          { cookie: parentCookie },
        );
        if (response.status !== 200) throw new Error("observer_personality_read_failed");
        return response.body;
      },
    },
  });
  const observerSession = await observerRepository.hydrate({ studentId, subjectId });
  assert.equal(observerSession.status, "completed");
  assert.equal(observerSession.responses.length, 12);
  assert.equal(observerSession.result.complete, true);
  assert.equal(JSON.stringify(observerSession).includes("optionScores"), false);
  assert.equal(JSON.stringify(observerSession).includes("questionSnapshot"), false);

  console.log("observer-personality-sync-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
