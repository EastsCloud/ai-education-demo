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

function staticCurve() {
  return {
    id: "static-daily-contract",
    curveType: "static",
    progressCurve: [0.48, 0.6, 0.72, 0.86, 1],
    targetProgress: 1,
    currentPoint: { week: 1, progressTowardTarget: 0.48, remainingGap: 0.52 },
    sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
  };
}

const planRequest = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
  practiceDate: "2026-07-09",
};

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
    supportPlan: {
      challengePacing: "steady",
      guidedStructurePreferred: true,
      helpEntryStyle: "private_reassurance",
      hintDepthTarget: 1.5,
      reviewPromptStyle: "reflective",
    },
  },
  todayQuestionQueue: { instructionalGrade: "G5" },
  taskCadence: { planStartedAt: "2026-07-08" },
  updatedAt: "2026-07-01T00:00:00.000Z",
  });

  Array.from({ length: 6 }, (_, index) =>
    database.saveBehaviorEvent({
      eventId: `trusted-support-evidence-${index + 1}`,
      studentId: "student-001",
      subjectId: "math-linear-equations",
      sessionId: "support-evidence-session",
      eventType: "answer_submitted",
      timestamp: `2026-07-08T10:0${index}:00.000Z`,
      payload: {
        scoringSource: "server_authoritative",
        isCorrect: index < 3,
        hintsOpened: index < 3 ? 1 : 2,
        elapsedSeconds: index < 3 ? 8 : 30,
        questionFamilyId: "quantity_total_difference",
        variantLevel: index % 2 ? "change_one_number" : "original",
      },
    }),
  );

  Array.from({ length: 31 }, (_, index) =>
    database.saveBehaviorEvent({
      eventId: `older-support-evidence-${index + 1}`,
      studentId: "student-001",
      subjectId: "math-linear-equations",
      sessionId: "older-support-evidence-session",
      eventType: "answer_submitted",
      timestamp: `2026-07-07T10:${String(index).padStart(2, "0")}:00.000Z`,
      payload: {
        scoringSource: "server_authoritative",
        isCorrect: index < 15,
        hintsOpened: 2,
        elapsedSeconds: index < 15 ? 8 : 30,
        questionFamilyId: "quantity_total_difference",
        variantLevel: "original",
      },
    }),
  );

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const created = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(created.status, 201);
  const dailyPlan = created.body.plan;
  assert.equal(dailyPlan.source, "server_owned_daily_matching");
  assert.equal(dailyPlan.questionQueue.instructionalGrade, "G5");
  assert.ok(dailyPlan.questionQueue.items.length >= 3);
  assert.equal(JSON.stringify(dailyPlan).includes('"allocation"'), false);
  assert.equal(JSON.stringify(dailyPlan).includes('"behaviorAnalysis"'), false);
  assert.equal(JSON.stringify(dailyPlan).includes('"seed"'), false);
  assert.deepEqual(dailyPlan.supportPresentation, {
    guidedStructurePreferred: true,
    helpEntryStyle: "private_reassurance",
    reviewPromptStyle: "reflective",
  });
  assert.equal(JSON.stringify(dailyPlan).includes('"supportProfile"'), false);
  assert.equal(dailyPlan.questionQueue.items.every((item) => item.instructionalGrade === "G5"), true);
  assert.equal(dailyPlan.task.recovery.sourceDate, "2026-07-08");
  assert.equal(dailyPlan.taskCadence.makeUpTask.date, "2026-07-08");

  const privatePlan = database.getDailyPracticePlan(planRequest);
  assert.ok(privatePlan.allocation?.buckets);
  assert.ok(privatePlan.behaviorAnalysis);
  assert.equal(privatePlan.behaviorAnalysis.evidenceWindow.source, "recent_scored_answer_window");
  assert.equal(privatePlan.behaviorAnalysis.evidenceWindow.selectedAnswerCount, 36);
  assert.equal(privatePlan.behaviorAnalysis.evidenceWindow.totalAnswerCount, 37);
  assert.equal(privatePlan.supportProfile.supportMode.id, "guided_when_needed");
  assert.equal(privatePlan.supportProfile.behaviorEvidenceWindow.selectedAnswerCount, 36);
  assert.equal(privatePlan.questionQueue.supportPolicy.taskChunking, "short_recovery_chunks");
  assert.equal(privatePlan.questionQueue.recovery.sourceDate, "2026-07-08");
  assert.equal(privatePlan.questionQueue.items[0].bucketId, "light_makeup");
  const refinedStudentPlan = database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" });
  assert.equal(refinedStudentPlan.supportProfile.supportMode.id, "guided_when_needed");
  assert.equal(refinedStudentPlan.supportProfile.supportPlan.helpEntryStyle, "private_reassurance");
  assert.equal(refinedStudentPlan.supportProfile.supportPlan.guidedStructurePreferred, true);
  assert.equal(refinedStudentPlan.supportProfile.supportPlan.reviewPromptStyle, "reflective");

  const repeated = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.plan.id, dailyPlan.id);
  assert.deepEqual(repeated.body.plan.questionQueue.items, dailyPlan.questionQueue.items);

  const parentRead = await request(
    baseUrl,
    "/api/daily-practice-plans/student-001/math-linear-equations?practiceDate=2026-07-09",
    { cookie: parentCookie },
  );
  assert.equal(parentRead.status, 200);
  assert.equal(parentRead.body.plan.id, dailyPlan.id);

  const parentLatestRead = await request(
    baseUrl,
    "/api/daily-practice-plans/student-001/math-linear-equations/latest",
    { cookie: parentCookie },
  );
  assert.equal(parentLatestRead.status, 200);
  assert.equal(parentLatestRead.body.plan.id, dailyPlan.id);
  assert.equal(JSON.stringify(parentLatestRead.body.plan).includes('"seed"'), false);

  const parentWrite = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: parentCookie,
    body: { request: { ...planRequest, practiceDate: "2026-07-10" } },
  });
  assert.equal(parentWrite.status, 403);

  console.log("daily-practice-plan-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
