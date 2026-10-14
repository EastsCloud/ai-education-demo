import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAdjustedDynamicCurve } from "../src/services/dynamic-learning-curve-engine.js";
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

function dynamicCurve() {
  return {
    id: "dynamic-curve-contract",
    curveType: "dynamic",
    canUpdate: true,
    targetProgress: 1,
    originalTargetProgress: 1,
    expectedTerminalProgress: 1.12,
    remainingDurationWeeks: 6,
    dynamicProgressCurve: [0.62, 0.74, 0.88, 1.02, 1.12],
    currentPoint: { week: 1, progressTowardTarget: 0.62, remainingGap: 0.38 },
    updateEvidence: { direction: "ahead" },
    sourceInputs: {
      durationWeeks: 6,
      dailyStudyMinutes: 30,
      weeklyStudyDays: 5,
      testIntervalPracticeDays: 3,
    },
  };
}

const studentAdjustment = {
  durationWeeks: 8,
  dailyStudyMinutes: 30,
  weeklyStudyDays: 5,
  testIntervalPracticeDays: 3,
  curveAdjustmentMode: "keep_study_intensity",
};

const parentAdjustment = {
  durationWeeks: 6,
  dailyStudyMinutes: 45,
  weeklyStudyDays: 5,
  testIntervalPracticeDays: 7,
  curveAdjustmentMode: "raise_target_level",
};

const directStudentProjection = createAdjustedDynamicCurve({
  baseCurve: dynamicCurve(),
  learningGoal: { targetLevel: "G6" },
  parameters: { ...studentAdjustment, durationWeeks: 6 },
  actorRole: "student",
  actorUserId: "student-001",
});
assert.equal(directStudentProjection.originalTargetProgress, 1);
assert.ok(directStudentProjection.expectedTerminalProgress > directStudentProjection.originalTargetProgress);
assert.equal(directStudentProjection.expectedCompletionWeeks, 5);

const directOriginalGoalProjection = createAdjustedDynamicCurve({
  baseCurve: dynamicCurve(),
  learningGoal: { targetLevel: "G6" },
  parameters: { ...studentAdjustment, durationWeeks: 6, curveAdjustmentMode: "keep_original_goal" },
  actorRole: "student",
  actorUserId: "student-001",
});
assert.equal(directOriginalGoalProjection.expectedTerminalProgress, 1);
assert.equal(directOriginalGoalProjection.expectedCompletionWeeks, 5);
assert.equal(directOriginalGoalProjection.dynamicProgressCurve.at(-1), 1);

const directBehindProjection = createAdjustedDynamicCurve({
  baseCurve: {
    ...dynamicCurve(),
    expectedTerminalProgress: 0.86,
    dynamicProgressCurve: [0.62, 0.68, 0.74, 0.8, 0.86],
    updateEvidence: { direction: "behind" },
  },
  learningGoal: { targetLevel: "G6" },
  parameters: { ...studentAdjustment, durationWeeks: 6, curveAdjustmentMode: "keep_original_goal" },
  actorRole: "student",
  actorUserId: "student-001",
});
assert.equal(directBehindProjection.expectedTerminalProgress, 0.86);
assert.equal(directBehindProjection.expectedCompletionWeeks, 10);
assert.ok(directBehindProjection.expectedCompletionWeeks > directBehindProjection.remainingDurationWeeks);

try {
  database.savePlan({
    id: "student-plan-student-001-math-linear-equations",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    status: "active",
    learningGoal: { targetLevel: "G6" },
    staticCurveConfirmedAt: "2026-07-20T00:00:00.000Z",
    dynamicCurve: dynamicCurve(),
    stageAssessmentHistory: [{ id: "verified-stage-result" }],
    assessmentCadence: { suggestedAfterPracticeDays: 3, mandatoryAfterPracticeDays: 10 },
    updatedAt: "2026-07-20T00:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const anonymous = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    body: { studentId: "student-001", subjectId: "math-linear-equations", parameters: studentAdjustment },
  });
  assert.equal(anonymous.status, 401);

  const invalid = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId: "student-001",
      subjectId: "math-linear-equations",
      parameters: { ...studentAdjustment, dailyStudyMinutes: 99 },
    },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, "invalid_curve_adjustment");

  const studentHigherTarget = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId: "student-001",
      subjectId: "math-linear-equations",
      parameters: { ...studentAdjustment, curveAdjustmentMode: "raise_target_level" },
    },
  });
  assert.equal(studentHigherTarget.status, 403);
  assert.equal(studentHigherTarget.body.error, "curve_adjustment_not_allowed_for_role");

  const studentChangesTestInterval = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId: "student-001",
      subjectId: "math-linear-equations",
      parameters: { ...studentAdjustment, testIntervalPracticeDays: 5 },
    },
  });
  assert.equal(studentChangesTestInterval.status, 403);
  assert.equal(studentChangesTestInterval.body.error, "curve_adjustment_not_allowed_for_role");

  const studentConfirmed = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", parameters: studentAdjustment },
  });
  assert.equal(studentConfirmed.status, 200, JSON.stringify(studentConfirmed.body));
  assert.equal(studentConfirmed.body.record.dynamicCurve.adjustment.actorRole, "student");
  assert.deepEqual(studentConfirmed.body.record.dynamicCurve.adjustment.parameters, studentAdjustment);
  assert.ok(
    studentConfirmed.body.record.dynamicCurve.expectedTerminalProgress >
      studentConfirmed.body.record.dynamicCurve.originalTargetProgress,
  );
  assert.equal(studentConfirmed.body.confirmation.appliesFrom, "next_learning_day");
  assert.equal(studentConfirmed.body.record.nextDynamicTask, null);
  assert.equal(studentConfirmed.body.record.curveAdjustmentHistory.length, 1);

  const studentKeepsOriginalGoal = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: studentCookie,
    body: {
      studentId: "student-001",
      subjectId: "math-linear-equations",
      parameters: { ...studentAdjustment, curveAdjustmentMode: "keep_original_goal" },
    },
  });
  assert.equal(studentKeepsOriginalGoal.status, 200, JSON.stringify(studentKeepsOriginalGoal.body));
  assert.equal(studentKeepsOriginalGoal.body.record.dynamicCurve.expectedTerminalProgress, 1);
  assert.ok(studentKeepsOriginalGoal.body.record.dynamicCurve.expectedCompletionWeeks < studentAdjustment.durationWeeks);
  assert.equal(studentKeepsOriginalGoal.body.record.dynamicCurve.dynamicProgressCurve.at(-1), 1);

  database.savePlan({
    ...database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" }),
    assessmentCadence: { suggestedAfterPracticeDays: 5, mandatoryAfterPracticeDays: 10 },
  });
  const studentUsesStaleInterval = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", parameters: studentAdjustment },
  });
  assert.equal(studentUsesStaleInterval.status, 403);
  assert.equal(studentUsesStaleInterval.body.error, "curve_adjustment_not_allowed_for_role");

  const parentConfirmed = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: parentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", parameters: parentAdjustment },
  });
  assert.equal(parentConfirmed.status, 200, JSON.stringify(parentConfirmed.body));
  assert.equal(parentConfirmed.body.record.dynamicCurve.adjustment.actorRole, "parent");
  assert.deepEqual(parentConfirmed.body.record.dynamicCurve.adjustment.parameters, parentAdjustment);
  assert.equal(parentConfirmed.body.record.assessmentCadence.suggestedAfterPracticeDays, 7);
  assert.equal(parentConfirmed.body.record.assessmentCadence.mandatoryAfterPracticeDays, 10);
  assert.equal(parentConfirmed.body.record.assessmentCadence.configuredByRole, "parent");
  assert.equal(parentConfirmed.body.record.assessmentCadence.updatedFrom, "curve_adjustment");
  assert.equal(parentConfirmed.body.record.curveAdjustmentHistory.length, 3);

  const latestPlan = database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" });
  database.savePlan({
    ...latestPlan,
    dynamicCurve: {
      ...latestPlan.dynamicCurve,
      updateEvidence: { direction: "behind" },
    },
  });
  const parentRaisesTargetWhenBehind = await request(baseUrl, "/api/curve-adjustments", {
    method: "POST",
    cookie: parentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", parameters: parentAdjustment },
  });
  assert.equal(parentRaisesTargetWhenBehind.status, 403);
  assert.equal(parentRaisesTargetWhenBehind.body.error, "curve_adjustment_not_allowed_for_role");

  console.log("curve-adjustment-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
