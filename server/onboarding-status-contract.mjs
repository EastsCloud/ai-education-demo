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

function stageState(snapshot, id) {
  return snapshot.stages.find((stage) => stage.id === id)?.state;
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const anonymous = await request(baseUrl, `/api/onboarding-status/${studentId}/${subjectId}`);
  assert.equal(anonymous.status, 401);

  const empty = await request(baseUrl, `/api/onboarding-status/${studentId}/${subjectId}`, { cookie: parentCookie });
  assert.equal(empty.status, 200, JSON.stringify(empty.body));
  assert.equal(empty.body.status.nextStageId, "start_context");
  assert.equal(empty.body.status.readyForPractice, false);
  assert.equal(stageState(empty.body.status, "start_context"), "not_started");
  assert.equal(JSON.stringify(empty.body.status).includes("basicInfo"), false);
  assert.equal(JSON.stringify(empty.body.status).includes("responses"), false);

  database.saveStudentOnboardingPrefill({
    id: "onboarding-status-prefill",
    studentId,
    subjectIds: ["math"],
    confirmationStatus: "prefilled",
    basicInfo: { birthYear: 2015 },
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  const awaitingStart = await request(baseUrl, `/api/onboarding-status/${studentId}/${subjectId}`, { cookie: parentCookie });
  assert.equal(stageState(awaitingStart.body.status, "start_context"), "awaiting_student_confirmation");

  database.saveStudentOnboardingPrefill({
    id: "onboarding-status-prefill",
    studentId,
    subjectIds: ["math"],
    confirmationStatus: "student_confirmed",
    basicInfo: { birthYear: 2015 },
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  database.saveAssessmentSession({
    id: "onboarding-status-personality",
    studentId,
    subjectId,
    assessmentType: "onboarding_personality",
    status: "completed",
    serverAuthoritative: true,
    responses: [{ answer: 3 }],
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  const awaitingSubjectSelection = await request(baseUrl, `/api/onboarding-status/${studentId}/${subjectId}`, { cookie: parentCookie });
  assert.equal(stageState(awaitingSubjectSelection.body.status, "start_context"), "completed");
  assert.equal(stageState(awaitingSubjectSelection.body.status, "personality"), "completed");
  assert.equal(stageState(awaitingSubjectSelection.body.status, "math_ability"), "awaiting_subject_selection");

  database.saveStudentOnboardingPrefill({
    id: "onboarding-status-prefill",
    studentId,
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-09-04T00:00:00.000Z",
    subjectSelectionConfirmedByUserId: "user-student-001",
    confirmationStatus: "student_confirmed",
    basicInfo: { birthYear: 2015 },
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  database.saveAssessmentSession({
    id: "onboarding-status-math",
    studentId,
    subjectId,
    assessmentType: "initial_onboarding",
    status: "completed",
    serverAuthoritative: true,
    responses: [{ answer: 42 }],
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  database.saveStudentLearningGoalDraft({
    id: "onboarding-status-goal",
    studentId,
    subjectId,
    confirmationStatus: "student_confirmed",
    learningGoal: { targetGrade: "G6" },
    updatedAt: "2026-09-04T00:00:00.000Z",
  });
  database.savePlan({
    id: "onboarding-status-plan",
    studentId,
    subjectId,
    serverAuthoritative: true,
    staticCurve: { id: "curve" },
    staticCurveConfirmedAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  });

  const complete = await request(baseUrl, `/api/onboarding-status/${studentId}/${subjectId}`, { cookie: parentCookie });
  assert.equal(complete.status, 200, JSON.stringify(complete.body));
  assert.equal(complete.body.status.complete, true);
  assert.equal(complete.body.status.nextStageId, null);
  assert.equal(complete.body.status.readyForPractice, true);
  complete.body.status.stages.forEach((stage) => assert.equal(stage.state, "completed"));
  assert.equal(JSON.stringify(complete.body.status).includes("42"), false);

  console.log("onboarding-status-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
