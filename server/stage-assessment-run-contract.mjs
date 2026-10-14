import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { assembleStageAssessment } from "../src/services/stage-assessment-assembly.js";
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

function staticCurve() {
  return {
    id: "static-stage-contract",
    curveType: "static",
    progressCurve: [0.45, 0.56, 0.67, 0.78, 0.9, 1],
    targetProgress: 1,
    currentPoint: { week: 1, progressTowardTarget: 0.45, remainingGap: 0.55 },
    sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
  };
}

const runRequest = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
  targetGrade: "G5",
  preferredFamilyId: "ratio_rate_unit",
  attemptIndex: 0,
  plannedWeek: 2,
};

try {
  database.savePlan({
    id: "student-plan-student-001-math-linear-equations",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    status: "active",
    staticCurveConfirmedAt: "2026-07-01T00:00:00.000Z",
    staticCurve: staticCurve(),
    learningGoal: { targetGrade: "G5" },
    stageAssessmentHistory: [],
    assessmentCadence: { suggestedAfterPracticeDays: 3, mandatoryAfterPracticeDays: 10 },
    updatedAt: "2026-07-01T00:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const premature = await request(baseUrl, "/api/stage-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(premature.status, 409);
  assert.equal(premature.body.error, "stage_assessment_not_available");
  assert.equal(premature.body.assessmentCadence.status, "waiting");

  ["2026-07-08", "2026-07-09", "2026-07-10"].forEach((practiceDate) => {
    database.saveDailyPracticeSession({
      id: `stage-contract-practice-${practiceDate}`,
      studentId: "student-001",
      subjectId: "math-linear-equations",
      practiceDate,
      sessionStatus: "required_completed",
      requiredPracticeCompleted: true,
      completedAt: `${practiceDate}T12:00:00.000Z`,
      updatedAt: `${practiceDate}T12:00:00.000Z`,
    });
  });

  const created = await request(baseUrl, "/api/stage-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(created.status, 201);
  let session = created.body.session;
  assert.equal(session.plannedWeek, 1);
  assert.equal(session.assessmentBlueprint.attemptIndex, 0);
  assert.equal(session.serverAuthoritative, true);
  assert.ok(session.presentationQuestions.length >= 6);
  assert.ok(session.presentationQuestions.every((question) => question.answerInput?.kind === "numeric"));
  assert.equal(JSON.stringify(session).includes('"answer"'), false);
  assert.equal(JSON.stringify(session).includes("questionSnapshot"), false);
  assert.equal(JSON.stringify(session).includes("contextTemplateId"), false);
  assert.equal(JSON.stringify(session).includes("applicationContext"), false);

  const repeatedStart = await request(baseUrl, "/api/stage-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: runRequest },
  });
  assert.equal(repeatedStart.status, 200);
  assert.equal(repeatedStart.body.idempotent, true);
  assert.equal(repeatedStart.body.session.id, session.id);
  assert.deepEqual(repeatedStart.body.session.presentationQuestions, session.presentationQuestions);

  const privateSession = database.getAssessmentSessionById({ sessionId: session.id });
  assert.ok(privateSession.questionSnapshot.every((question) => Number.isFinite(question.answer)));
  assert.ok(privateSession.questionSnapshot.every((question) => question.answerInput?.kind === "numeric"));

  const parentResponse = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
    method: "POST",
    cookie: parentCookie,
    body: {
      studentId: "student-001",
      questionId: session.presentationQuestions[0].id,
      answer: 1,
      responseTimeMs: 500,
    },
  });
  assert.equal(parentResponse.status, 403);

  const expectedBlueprint = assembleStageAssessment({
    aiVersion: "semi_ai",
    attemptIndex: runRequest.attemptIndex,
    families: shanghaiMathItemFamilies,
    maxQuestions: 8,
    minQuestions: 6,
    preferredFamilyId: runRequest.preferredFamilyId,
    subjectId: runRequest.subjectId,
    targetGrade: runRequest.targetGrade,
  });
  assert.equal(expectedBlueprint.coverage.transferVariantLevel, "context_change");
  const secondBlueprint = assembleStageAssessment({
    aiVersion: "semi_ai",
    attemptIndex: 1,
    families: shanghaiMathItemFamilies,
    maxQuestions: 8,
    minQuestions: 6,
    preferredFamilyId: runRequest.preferredFamilyId,
    subjectId: runRequest.subjectId,
    targetGrade: runRequest.targetGrade,
  });
  assert.equal(secondBlueprint.coverage.transferVariantLevel, "relationship_reframe");
  assert.ok(secondBlueprint.questions.some((question) => question.metadataTags.variantLevel === "relationship_reframe"));
  const expectedAnswerById = new Map(expectedBlueprint.questions.map((question) => [question.id, question.answer]));

  for (const question of session.presentationQuestions) {
    const response = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
      method: "POST",
      cookie: studentCookie,
      body: {
        studentId: "student-001",
        questionId: question.id,
        answer: expectedAnswerById.get(question.id),
        responseTimeMs: 900,
      },
    });
    assert.equal(response.status, 200);
    session = response.body.session;
  }

  assert.equal(session.status, "completed_verified");
  assert.equal(session.result.eligibleForCurveUpdate, true);
  assert.equal(session.result.controlledVariantItemCount, 2);
  assert.equal(session.result.controlledVariantAccuracy, 1);
  assert.ok(session.result.transferItemCount >= 1);
  assert.equal(session.result.transferAccuracy, 1);
  assert.equal(session.result.masteryScore, 1);
  assert.equal(session.dynamicCurve.canUpdate, true);
  assert.equal(JSON.stringify(session).includes('"answer"'), false);
  assert.equal(JSON.stringify(session).includes("contextTemplateId"), false);
  assert.equal(JSON.stringify(session).includes("applicationContext"), false);

  const storedPlan = database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" });
  assert.equal(storedPlan.stageAssessmentHistory.length, 1);
  assert.equal(storedPlan.dynamicCurve.canUpdate, true);
  assert.equal(storedPlan.assessmentCadence.lastVerifiedPracticeDate, "2026-07-10");
  assert.equal(storedPlan.stageAssessmentHistory[0].completedThroughPracticeDate, "2026-07-10");

  const targetMismatch = await request(baseUrl, "/api/stage-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { ...runRequest, targetGrade: "G6" } },
  });
  assert.equal(targetMismatch.status, 409);
  assert.equal(targetMismatch.body.error, "stage_assessment_target_mismatch");

  ["2026-07-11", "2026-07-12", "2026-07-13"].forEach((practiceDate) => {
    database.saveDailyPracticeSession({
      id: `stage-contract-next-${practiceDate}`,
      studentId: "student-001",
      subjectId: "math-linear-equations",
      practiceDate,
      sessionStatus: "required_completed",
      requiredPracticeCompleted: true,
      completedAt: `${practiceDate}T12:00:00.000Z`,
      updatedAt: `${practiceDate}T12:00:00.000Z`,
    });
  });
  const serverRotated = await request(baseUrl, "/api/stage-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { ...runRequest, attemptIndex: 999, plannedWeek: 999 } },
  });
  assert.equal(serverRotated.status, 201);
  assert.equal(serverRotated.body.session.assessmentBlueprint.attemptIndex, 1);
  assert.equal(serverRotated.body.session.assessmentBlueprint.coverage.transferVariantLevel, "relationship_reframe");

  const hydrated = await request(
    baseUrl,
    "/api/assessment-sessions/student-001/math-linear-equations?assessmentType=stage_test",
    { cookie: studentCookie },
  );
  assert.equal(hydrated.status, 200);
  assert.equal(hydrated.body.session.serverAuthoritative, true);
  assert.equal(JSON.stringify(hydrated.body.session).includes('"answer"'), false);

  console.log("stage-assessment-run-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
