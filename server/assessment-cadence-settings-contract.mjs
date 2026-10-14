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

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const teacherCookie = await signIn(baseUrl, "teacher.wang", "teacher-demo-2026");
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");

  const parentUpdate = await request(baseUrl, "/api/assessment-cadence", {
    method: "POST",
    cookie: parentCookie,
    body: {
      studentId,
      subjectId,
      suggestedAfterPracticeDays: 5,
      mandatoryAfterPracticeDays: 10,
    },
  });
  assert.equal(parentUpdate.status, 200);
  assert.equal(parentUpdate.body.record.assessmentCadence.suggestedAfterPracticeDays, 5);
  assert.equal(parentUpdate.body.record.assessmentCadence.mandatoryAfterPracticeDays, 10);
  assert.equal(parentUpdate.body.record.assessmentCadence.configuredByRole, "parent");
  assert.equal(parentUpdate.body.record.assessmentCadence.policyVersion, "guardian_configurable_assessment_cadence_v1");

  const invalidRange = await request(baseUrl, "/api/assessment-cadence", {
    method: "POST",
    cookie: parentCookie,
    body: {
      studentId,
      subjectId,
      suggestedAfterPracticeDays: 7,
      mandatoryAfterPracticeDays: 7,
    },
  });
  assert.equal(invalidRange.status, 400);
  assert.equal(invalidRange.body.error, "invalid_assessment_cadence");
  assert.equal(database.getPlan({ studentId, subjectId }).assessmentCadence.suggestedAfterPracticeDays, 5);

  const studentUpdate = await request(baseUrl, "/api/assessment-cadence", {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId,
      subjectId,
      suggestedAfterPracticeDays: 3,
      mandatoryAfterPracticeDays: 7,
    },
  });
  assert.equal(studentUpdate.status, 403);
  assert.equal(studentUpdate.body.error, "write_access_denied");

  const teacherUpdate = await request(baseUrl, "/api/assessment-cadence", {
    method: "POST",
    cookie: teacherCookie,
    body: {
      studentId,
      subjectId,
      suggestedAfterPracticeDays: 7,
      mandatoryAfterPracticeDays: 14,
    },
  });
  assert.equal(teacherUpdate.status, 200);
  assert.equal(teacherUpdate.body.record.assessmentCadence.suggestedAfterPracticeDays, 7);
  assert.equal(teacherUpdate.body.record.assessmentCadence.mandatoryAfterPracticeDays, 14);
  assert.equal(teacherUpdate.body.record.assessmentCadence.configuredByRole, "teacher");

  const studentView = await request(baseUrl, `/api/student-plans/${studentId}/${subjectId}`, {
    cookie: studentCookie,
  });
  assert.equal(studentView.status, 200);
  assert.equal(studentView.body.record.assessmentCadence.suggestedAfterPracticeDays, 7);
  assert.equal(studentView.body.record.assessmentCadence.mandatoryAfterPracticeDays, 14);

  console.log("assessment-cadence-settings-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
