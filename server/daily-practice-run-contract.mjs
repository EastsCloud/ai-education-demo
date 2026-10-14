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

const planRequest = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
  practiceDate: "2026-07-09",
};

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

function staticCurve() {
  return {
    id: "static-daily-run-contract",
    curveType: "static",
    progressCurve: [0.48, 0.6, 0.72, 0.86, 1],
    targetProgress: 1,
    currentPoint: { week: 1, progressTowardTarget: 0.48, remainingGap: 0.52 },
    sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
  };
}

async function startDelivery(baseUrl, cookie, runId) {
  const created = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(runId)}/deliveries`, {
    method: "POST",
    cookie,
    body: {},
  });
  assert.ok([200, 201].includes(created.status));
  const started = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(created.body.delivery.id)}/start`, {
    method: "POST",
    cookie,
    body: { studentId: "student-001" },
  });
  assert.equal(started.status, 200);
  return created.body;
}

try {
  database.savePlan({
    id: "student-plan-student-001-math-linear-equations",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    status: "active",
    staticCurveConfirmedAt: "2026-07-01T00:00:00.000Z",
    staticCurve: staticCurve(),
    learningGoal: { targetGrade: "G5", dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    supportProfile: {
      confidence: 0.62,
      responseCount: 12,
      supportMode: {
        id: "try_then_light_hint",
        label: "先尝试，再给轻提示",
        hintDepthTarget: 1.5,
      },
      taskChunking: "standard_short_chunks",
    },
    todayQuestionQueue: { instructionalGrade: "G5" },
    updatedAt: "2026-07-01T00:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const forgedSession = await request(baseUrl, "/api/daily-practice-sessions", {
    method: "POST",
    cookie: studentCookie,
    body: {
      session: {
        id: "forged-daily-practice-session",
        studentId: "student-001",
        subjectId: "math-linear-equations",
        practiceDate: planRequest.practiceDate,
        sessionStatus: "required_completed",
        requiredPracticeCompleted: true,
      },
    },
  });
  assert.equal(forgedSession.status, 409);
  assert.equal(forgedSession.body.error, "daily_practice_session_server_managed");
  assert.equal(database.getDailyPracticeSession(planRequest), null);

  const beforePlan = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(beforePlan.status, 409);
  assert.equal(beforePlan.body.error, "daily_practice_run_requires_daily_plan");

  const dailyPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(dailyPlan.status, 201, JSON.stringify(dailyPlan.body));

  const createdRun = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(createdRun.status, 201);
  let run = createdRun.body.run;
  assert.equal(run.currentStep.variantLevel, "original");
  assert.equal(run.requiredPracticeCompleted, false);
  assert.equal(JSON.stringify(run).includes("seed"), false);

  const parentRead = await request(
    baseUrl,
    "/api/daily-practice-runs/student-001/math-linear-equations?practiceDate=2026-07-09",
    { cookie: parentCookie },
  );
  assert.equal(parentRead.status, 200);
  assert.equal(parentRead.body.run.id, run.id);

  const parentWrite = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(run.id)}/deliveries`, {
    method: "POST",
    cookie: parentCookie,
    body: {},
  });
  assert.equal(parentWrite.status, 403);

  let current = await startDelivery(baseUrl, studentCookie, run.id);
  assert.equal(current.delivery.question.variantLevel, "original");
  const repeatedDelivery = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(run.id)}/deliveries`, {
    method: "POST",
    cookie: studentCookie,
    body: {},
  });
  assert.equal(repeatedDelivery.status, 200);
  assert.equal(repeatedDelivery.body.delivery.id, current.delivery.id);

  const wrong = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(current.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: -1, elapsedSeconds: 2 },
  });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.result.isCorrect, false);
  assert.equal(wrong.body.practiceRun.currentStep.variantLevel, "original");
  assert.equal(wrong.body.practiceRun.activeDeliveryId, current.delivery.id);

  const directDelivery = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        studentId: "student-001",
        subjectId: "math-linear-equations",
        mode: "practice",
        familyId: "part_whole_add_subtract",
        instructionalGrade: "G1",
        variantLevel: "change_two_numbers",
        aiVersion: "semi_ai",
        seed: 1,
        queueItemId: "unrelated-queue-item",
        practiceRunId: run.id,
        progressionUnitIndex: 0,
        progressionStageIndex: 2,
      },
    },
  });
  assert.equal(directDelivery.status, 201);
  const stillActive = await request(
    baseUrl,
    "/api/daily-practice-runs/student-001/math-linear-equations?practiceDate=2026-07-09",
    { cookie: studentCookie },
  );
  assert.equal(stillActive.body.run.activeDeliveryId, current.delivery.id);
  assert.equal(stillActive.body.run.currentStep.variantLevel, "original");

  const firstAnswer = database.getQuestionDelivery({ deliveryId: current.delivery.id }).privateCandidate.answer;
  const originalCorrect = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(current.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: firstAnswer, elapsedSeconds: 2 },
  });
  assert.equal(originalCorrect.status, 200);
  run = originalCorrect.body.practiceRun;
  assert.equal(run.currentStep.variantLevel, "change_one_number");
  assert.equal(run.activeDeliveryId, null);
  const duplicateAttempt = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(current.delivery.id)}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: firstAnswer, elapsedSeconds: 2 },
  });
  assert.equal(duplicateAttempt.status, 400);

  for (const expectedVariant of ["change_one_number", "change_two_numbers"]) {
    current = await startDelivery(baseUrl, studentCookie, run.id);
    assert.equal(current.delivery.question.variantLevel, expectedVariant);
    const answer = database.getQuestionDelivery({ deliveryId: current.delivery.id }).privateCandidate.answer;
    const scored = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(current.delivery.id)}/attempts`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001", answer, elapsedSeconds: 2 },
    });
    assert.equal(scored.status, 200);
    run = scored.body.practiceRun;
  }

  assert.equal(run.currentStep.unitIndex, 1);
  assert.equal(run.currentStep.stageIndex, 0);
  assert.equal(run.currentStep.variantLevel, "original");
  assert.equal(run.requiredPracticeCompleted, false);
  assert.equal(JSON.stringify(run).includes('"answer":'), false);

  while (!run.requiredPracticeCompleted) {
    current = await startDelivery(baseUrl, studentCookie, run.id);
    const answer = database.getQuestionDelivery({ deliveryId: current.delivery.id }).privateCandidate.answer;
    const scored = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(current.delivery.id)}/attempts`, {
      method: "POST",
      cookie: studentCookie,
      body: { studentId: "student-001", answer, elapsedSeconds: 2 },
    });
    assert.equal(scored.status, 200);
    run = scored.body.practiceRun;
  }

  const completedSession = database.getDailyPracticeSession(planRequest);
  assert.equal(completedSession.sessionStatus, "required_completed");
  assert.equal(completedSession.requiredPracticeCompleted, true);
  assert.equal(completedSession.serverPracticeRunId, run.id);
  assert.equal(completedSession.completionSource, "server_owned_daily_practice_run");
  const refinedPlan = database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" });
  assert.equal(refinedPlan.supportProfile.source, "onboarding_seed_plus_behavior_evidence");
  assert.equal(refinedPlan.supportProfile.supportMode.id, "independent_retry");

  console.log("daily-practice-run-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
