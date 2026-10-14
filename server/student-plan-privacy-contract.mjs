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
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
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

try {
  database.savePlan({
    id: `student-plan-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    status: "active",
    serverAuthoritative: true,
    learningGoal: { targetGrade: "G4", dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    staticCurve: { id: "static-curve", progressCurve: [0.4, 0.7, 1], currentPoint: { week: 1, progressTowardTarget: 0.4 } },
    staticCurveConfirmedAt: "2026-09-04T00:00:00.000Z",
    initialAbilityMap: { overallLevel: 0.4, dimensions: [{ id: "calculation", score: 0.5 }] },
    learningPath: { version: "math-learning-path-v4", instructionalGrade: "G3", focusFamilyId: "part_whole_add_subtract" },
    assessmentCadence: {
      suggestedAfterPracticeDays: 3,
      mandatoryAfterPracticeDays: 10,
      configuredByUserId: "teacher-001",
      observerRequestStatus: "requested",
    },
    todayQuestionQueue: {
      instructionalGrade: "G3",
      items: [{ id: "queue-1", familyId: "part_whole_add_subtract", familyName: "part and whole", seed: 778, retrySourceDeliveryId: "private-wrong-source" }],
    },
    nextQuestionQueue: {
      items: [{ id: "next-queue-1", familyId: "part_whole_add_subtract", seed: 779, correctReviewSourceDeliveryId: "private-correct-source" }],
    },
    supportProfile: { supportMode: { id: "guided_when_needed" }, curiosity: 0.78 },
    dailyAllocation: { buckets: { wrong_retry: 0.4, correct_review: 0.25 } },
    nextPracticeAllocation: { behaviorAnalysis: { fastGuessRate: 0.3 } },
    behaviorAnalysis: { observations: ["private analysis"] },
    updatedAt: "2026-09-04T00:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const studentPlan = await request(baseUrl, `/api/student-plans/${studentId}/${subjectId}`, { cookie: studentCookie });
  assert.equal(studentPlan.status, 200, JSON.stringify(studentPlan.body));
  assert.equal(studentPlan.body.record.learningGoal.targetGrade, "G4");
  assert.equal(studentPlan.body.record.initialAbilityMap.overallLevel, 0.4);
  assert.equal(studentPlan.body.record.todayQuestionQueue.items[0].familyId, "part_whole_add_subtract");
  assert.equal(Object.hasOwn(studentPlan.body.record, "supportProfile"), false);
  assert.equal(Object.hasOwn(studentPlan.body.record, "dailyAllocation"), false);
  assert.equal(Object.hasOwn(studentPlan.body.record, "nextPracticeAllocation"), false);
  assert.equal(Object.hasOwn(studentPlan.body.record, "behaviorAnalysis"), false);
  assert.equal(Object.hasOwn(studentPlan.body.record, "nextQuestionQueue"), false);
  assert.equal(JSON.stringify(studentPlan.body.record).includes('"seed"'), false);
  assert.equal(JSON.stringify(studentPlan.body.record).includes("private-wrong-source"), false);
  assert.equal(JSON.stringify(studentPlan.body.record).includes("private-correct-source"), false);
  assert.equal(Object.hasOwn(studentPlan.body.record.assessmentCadence, "configuredByUserId"), false);

  const parentPlan = await request(baseUrl, `/api/student-plans/${studentId}/${subjectId}`, { cookie: parentCookie });
  assert.equal(parentPlan.status, 200, JSON.stringify(parentPlan.body));
  assert.equal(parentPlan.body.record.supportProfile.supportMode.id, "guided_when_needed");
  assert.equal(parentPlan.body.record.behaviorAnalysis.observations[0], "private analysis");
  assert.equal(Object.hasOwn(parentPlan.body.record, "dailyAllocation"), false);
  assert.equal(Object.hasOwn(parentPlan.body.record, "nextPracticeAllocation"), false);
  assert.equal(Object.hasOwn(parentPlan.body.record, "nextQuestionQueue"), false);
  assert.equal(JSON.stringify(parentPlan.body.record).includes('"seed"'), false);
  assert.equal(JSON.stringify(parentPlan.body.record).includes("private-wrong-source"), false);
  assert.equal(JSON.stringify(parentPlan.body.record).includes("private-correct-source"), false);
  assert.equal(Object.hasOwn(parentPlan.body.record.assessmentCadence, "configuredByUserId"), false);

  console.log("student-plan-privacy-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
