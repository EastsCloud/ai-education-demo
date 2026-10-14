import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";
import { createAssessmentCadence } from "../src/services/assessment-cadence-engine.js";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

function completedPracticeSessions(count) {
  return Array.from({ length: count }, (_, index) => ({
    sessionStatus: "required_completed",
    practiceDate: `2026-07-${String(index + 1).padStart(2, "0")}`,
  }));
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
    id: "student-plan-student-001-math-linear-equations",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    status: "active",
    staticCurveConfirmedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    assessmentCadence: {
      suggestedAfterPracticeDays: 3,
      mandatoryAfterPracticeDays: 10,
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");

  const requested = await request(baseUrl, "/api/stage-assessment-requests", {
    method: "POST",
    cookie: parentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations" },
  });
  assert.equal(requested.status, 200);
  assert.equal(requested.body.record.assessmentCadence.observerRequestStatus, "requested");
  assert.equal(requested.body.record.assessmentCadence.observerRequestedByRole, "parent");

  const studentPlan = await request(baseUrl, "/api/student-plans/student-001/math-linear-equations", {
    cookie: studentCookie,
  });
  assert.equal(studentPlan.status, 200);
  assert.equal(studentPlan.body.record.assessmentCadence.observerRequestStatus, "requested");

  const invitation = createAssessmentCadence({
    sessions: [],
    config: studentPlan.body.record.assessmentCadence,
  });
  assert.equal(invitation.status, "suggested");
  assert.equal(invitation.suggestionSource, "observer_request");
  assert.equal(invitation.canSkip, true);

  const acknowledged = createAssessmentCadence({
    sessions: [],
    config: {
      ...studentPlan.body.record.assessmentCadence,
      observerRequestAcknowledgedAt: new Date(Date.now() + 1).toISOString(),
      observerRequestStatus: "skipped",
    },
  });
  assert.equal(acknowledged.status, "waiting");

  const mandatory = createAssessmentCadence({
    sessions: completedPracticeSessions(10),
    config: studentPlan.body.record.assessmentCadence,
  });
  assert.equal(mandatory.status, "mandatory");
  assert.equal(mandatory.suggestionSource, "mandatory_cadence");

  console.log("assessment-request-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
