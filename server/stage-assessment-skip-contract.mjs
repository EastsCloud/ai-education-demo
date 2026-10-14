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

const studentId = "student-001";
const subjectId = "math-linear-equations";

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

function saveCompletedPractice(practiceDate) {
  database.saveDailyPracticeSession({
    id: `stage-skip-session-${practiceDate}`,
    studentId,
    subjectId,
    practiceDate,
    sessionStatus: "required_completed",
    requiredPracticeCompleted: true,
    completedAt: `${practiceDate}T12:00:00.000Z`,
    updatedAt: `${practiceDate}T12:00:00.000Z`,
  });
}

try {
  database.savePlan({
    id: `student-plan-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    status: "active",
    staticCurveConfirmedAt: "2026-08-01T00:00:00.000Z",
    assessmentCadence: {
      suggestedAfterPracticeDays: 3,
      mandatoryAfterPracticeDays: 10,
    },
    updatedAt: "2026-08-01T00:00:00.000Z",
  });
  ["2026-08-01", "2026-08-02", "2026-08-03"].forEach(saveCompletedPractice);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const payload = { studentId, subjectId, practiceDate: "2026-08-03" };

  const anonymous = await request(baseUrl, "/api/stage-assessment-skips", { method: "POST", body: payload });
  assert.equal(anonymous.status, 401);

  const parentAttempt = await request(baseUrl, "/api/stage-assessment-skips", {
    method: "POST",
    cookie: parentCookie,
    body: payload,
  });
  assert.equal(parentAttempt.status, 403);

  const skipped = await request(baseUrl, "/api/stage-assessment-skips", {
    method: "POST",
    cookie: studentCookie,
    body: payload,
  });
  assert.equal(skipped.status, 200);
  assert.equal(skipped.body.record.assessmentCadence.lastSkippedAtPracticeCount, 3);
  assert.ok(skipped.body.record.assessmentCadence.lastSkippedAt);
  assert.equal(skipped.body.assessmentCadence.status, "skipped");
  assert.equal(skipped.body.assessmentCadence.canSkip, false);

  const repeatedSkip = await request(baseUrl, "/api/stage-assessment-skips", {
    method: "POST",
    cookie: studentCookie,
    body: payload,
  });
  assert.equal(repeatedSkip.status, 409);
  assert.equal(repeatedSkip.body.error, "stage_assessment_skip_not_available");

  ["2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10"].forEach(saveCompletedPractice);
  const mandatorySkip = await request(baseUrl, "/api/stage-assessment-skips", {
    method: "POST",
    cookie: studentCookie,
    body: { ...payload, practiceDate: "2026-08-10" },
  });
  assert.equal(mandatorySkip.status, 409);
  assert.equal(mandatorySkip.body.error, "stage_assessment_skip_not_available");
  assert.equal(mandatorySkip.body.assessmentCadence.status, "mandatory");
  assert.equal(mandatorySkip.body.assessmentCadence.canSkip, false);

  console.log("stage-assessment-skip-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
