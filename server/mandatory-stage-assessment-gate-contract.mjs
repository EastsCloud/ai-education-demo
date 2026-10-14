import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createDailyPracticeRun } from "./daily-practice-run-service.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

const studentId = "student-001";
const subjectId = "math-linear-equations";
const practiceDate = "2026-07-21";
const planRequest = { studentId, subjectId, practiceDate };

function staticCurve() {
  return {
    id: "static-mandatory-gate-contract",
    curveType: "static",
    progressCurve: [0.42, 0.58, 0.74, 0.88, 1],
    targetProgress: 1,
    currentPoint: { week: 1, progressTowardTarget: 0.42, remainingGap: 0.58 },
    sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
  };
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

async function signIn(baseUrl) {
  const response = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "lin.an", password: "student-demo-2026" },
  });
  assert.equal(response.status, 200);
  assert.ok(response.cookie);
  return response.cookie;
}

function saveCompletedPractice(practiceDateValue) {
  database.saveDailyPracticeSession({
    id: `mandatory-gate-session-${practiceDateValue}`,
    studentId,
    subjectId,
    practiceDate: practiceDateValue,
    sessionStatus: "required_completed",
    requiredPracticeCompleted: true,
    completedAt: `${practiceDateValue}T12:00:00.000Z`,
    updatedAt: `${practiceDateValue}T12:00:00.000Z`,
  });
}

try {
  database.savePlan({
    id: `student-plan-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    status: "active",
    staticCurveConfirmedAt: "2026-07-01T00:00:00.000Z",
    staticCurve: staticCurve(),
    learningGoal: { targetGrade: "G1", dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    supportProfile: { supportPlan: { challengePacing: "steady", hintDepthTarget: 1 } },
    taskCadence: { planStartedAt: "2026-07-01" },
    assessmentCadence: {
      suggestedAfterPracticeDays: 2,
      mandatoryAfterPracticeDays: 3,
    },
    updatedAt: "2026-07-01T00:00:00.000Z",
  });
  saveCompletedPractice("2026-07-18");
  saveCompletedPractice("2026-07-19");
  saveCompletedPractice("2026-07-20");

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl);

  const blockedPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(blockedPlan.status, 409);
  assert.equal(blockedPlan.body.error, "mandatory_stage_assessment_required");
  assert.equal(blockedPlan.body.assessmentCadence.status, "mandatory");
  assert.equal(blockedPlan.body.assessmentCadence.canStart, true);
  assert.equal(blockedPlan.body.assessmentCadence.canSkip, false);
  assert.equal(database.getDailyPracticePlan(planRequest), null);

  const preexistingDailyPlan = {
    id: `daily-practice-plan-${studentId}-${subjectId}-${practiceDate}`,
    ...planRequest,
    questionQueue: {
      id: "mandatory-gate-queue",
      items: [
        {
          id: "mandatory-gate-item-1",
          familyId: "part_whole_add_subtract",
          instructionalGrade: "G1",
          seed: 19,
        },
      ],
    },
    createdAt: "2026-07-21T08:00:00.000Z",
    updatedAt: "2026-07-21T08:00:00.000Z",
  };
  database.saveDailyPracticePlan(preexistingDailyPlan);

  const blockedRun = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(blockedRun.status, 409);
  assert.equal(blockedRun.body.error, "mandatory_stage_assessment_required");
  assert.equal(blockedRun.body.assessmentCadence.status, "mandatory");
  assert.equal(database.getDailyPracticeRun(planRequest), null);

  const inProgressRun = createDailyPracticeRun({
    dailyPlan: preexistingDailyPlan,
    studentId,
    subjectId,
    practiceDate,
  });
  database.saveDailyPracticeRun(inProgressRun);
  const resumedRun = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(resumedRun.status, 200);
  assert.equal(resumedRun.body.run.id, inProgressRun.id);

  const resumedDelivery = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(inProgressRun.id)}/deliveries`, {
    method: "POST",
    cookie: studentCookie,
    body: {},
  });
  assert.equal(resumedDelivery.status, 201);
  assert.equal(resumedDelivery.body.run.id, inProgressRun.id);

  const stageTest = await request(baseUrl, "/api/stage-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        studentId,
        subjectId,
        targetGrade: "G1",
        preferredFamilyId: "part_whole_add_subtract",
        attemptIndex: 0,
        plannedWeek: 1,
      },
    },
  });
  assert.equal(stageTest.status, 201);
  let stageSession = stageTest.body.session;
  assert.equal(stageSession.status, "in_progress");
  const privateStageSession = database.getAssessmentSessionById({ sessionId: stageSession.id });
  const answerByQuestionId = new Map(privateStageSession.questionSnapshot.map((question) => [question.id, question.answer]));
  for (const question of stageSession.presentationQuestions) {
    const answered = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(stageSession.id)}/responses`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId,
        questionId: question.id,
        answer: answerByQuestionId.get(question.id),
        responseTimeMs: 900,
      },
    });
    assert.equal(answered.status, 200);
    stageSession = answered.body.session;
  }
  assert.equal(stageSession.status, "completed_verified");
  assert.equal(
    database.getPlan({ studentId, subjectId }).assessmentCadence.lastVerifiedPracticeDate,
    "2026-07-20",
  );

  const releasedPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { ...planRequest, practiceDate: "2026-07-22" } },
  });
  assert.equal(releasedPlan.status, 201);
  assert.ok(releasedPlan.body.plan?.id);

  console.log("mandatory-stage-assessment-gate-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
