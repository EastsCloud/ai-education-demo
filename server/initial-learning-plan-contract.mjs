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

async function completeInitialAssessment({ baseUrl, cookie }) {
  const created = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie,
    body: {
      request: {
        studentId: "student-001",
        subjectId: "math-linear-equations",
        targetGrade: "G4",
      },
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const privateSession = database.getAssessmentSessionById({ sessionId: created.body.session.id });
  const answersByQuestionId = new Map(privateSession.questionSnapshot.map((question) => [question.id, question.answer]));

  for (const question of created.body.session.presentationQuestions) {
    const response = await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(created.body.session.id)}/responses`, {
      method: "POST",
      cookie,
      body: {
        studentId: "student-001",
        questionId: question.id,
        answer: answersByQuestionId.get(question.id),
        responseTimeMs: 18000,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
}

async function completePersonalityAssessment({ baseUrl, cookie }) {
  const created = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie,
    body: {
      request: {
        studentId: "student-001",
        subjectId: "math-linear-equations",
      },
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  for (const [index, question] of created.body.session.presentationQuestions.entries()) {
    const response = await request(
      baseUrl,
      `/api/personality-assessment-runs/${encodeURIComponent(created.body.session.id)}/responses`,
      {
        method: "POST",
        cookie,
        body: {
          studentId: "student-001",
          questionId: question.id,
          answer: index % 4,
          responseTimeMs: 3000,
        },
      },
    );
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
}

const planRequest = {
  studentId: "student-001",
  subjectId: "math-linear-equations",
  practiceDate: "2026-07-14",
  learningGoal: {
    targetGrade: "G6",
    durationWeeks: 8,
    dailyStudyMinutes: 30,
    weeklyStudyDays: 5,
  },
  staticCurve: { source: "forged_browser_curve" },
};

try {
  database.saveStudentOnboardingPrefill({
    id: "prefill-student-001",
    studentId: "student-001",
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-07-14T00:00:00.000Z",
    subjectSelectionConfirmedByUserId: "user-student-001",
    confirmationStatus: "student_confirmed",
    updatedAt: "2026-07-14T00:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const anonymous = await request(baseUrl, "/api/initial-learning-plans", {
    method: "POST",
    body: { request: planRequest },
  });
  assert.equal(anonymous.status, 401);

  const beforeAssessment = await request(baseUrl, "/api/initial-learning-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(beforeAssessment.status, 409);
  assert.equal(beforeAssessment.body.error, "initial_learning_plan_requires_completed_initial_assessment");

  const beforePersonality = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        studentId: "student-001",
        subjectId: "math-linear-equations",
        targetGrade: "G4",
      },
    },
  });
  assert.equal(beforePersonality.status, 409);
  assert.equal(beforePersonality.body.error, "initial_assessment_requires_completed_personality_assessment");

  await completePersonalityAssessment({ baseUrl, cookie: studentCookie });
  await completeInitialAssessment({ baseUrl, cookie: studentCookie });

  const parentWrite = await request(baseUrl, "/api/initial-learning-plans", {
    method: "POST",
    cookie: parentCookie,
    body: { request: planRequest },
  });
  assert.equal(parentWrite.status, 403);

  const confirmed = await request(baseUrl, "/api/initial-learning-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: planRequest },
  });
  assert.equal(confirmed.status, 201, JSON.stringify(confirmed.body));
  assert.equal(confirmed.body.record.serverAuthoritative, true);
  assert.equal(confirmed.body.record.staticCurveConfirmedAt !== null, true);
  assert.equal(confirmed.body.record.staticCurve.source, "ability_map_goal_rhythm_cohort_baseline");
  assert.equal(confirmed.body.record.learningGoal.targetGrade, "G6");
  assert.equal(confirmed.body.record.learningPathVersion, "math-learning-path-v4");
  assert.equal(confirmed.body.record.learningPath.version, "math-learning-path-v4");
  assert.equal(Object.hasOwn(confirmed.body.record, "supportProfile"), false);
  const storedSupportProfile = database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" }).supportProfile;
  assert.equal(storedSupportProfile.responseCount, 12);
  assert.equal(storedSupportProfile.initialActionPolicy.version, "personality_support_action_policy_v1");
  assert.ok(storedSupportProfile.initialActionPolicy.appliedActions.length >= 5);
  assert.equal(confirmed.body.record.initialAssessment.responses, undefined);
  assert.equal(confirmed.body.record.initialAssessment.questionSnapshot, undefined);
  assert.equal(confirmed.body.goalDraft.confirmationStatus, "student_confirmed");

  const dailyPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        studentId: "student-001",
        subjectId: "math-linear-equations",
        practiceDate: "2026-07-14",
      },
    },
  });
  assert.equal(dailyPlan.status, 201, JSON.stringify(dailyPlan.body));
  assert.equal(
    database.getDailyPracticePlan({
      studentId: "student-001",
      subjectId: "math-linear-equations",
      practiceDate: "2026-07-14",
    }).learningPath.version,
    "math-learning-path-v4",
  );
  assert.equal(
    database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" }).supportProfile.initialActionPolicy.version,
    "personality_support_action_policy_v1",
  );

  // Older confirmed plans did not store learningPathVersion. Their recorded V2
  // route remains authoritative when a later daily plan is assembled.
  const savedPlan = database.getPlan({ studentId: "student-001", subjectId: "math-linear-equations" });
  const { learningPathVersion: ignoredLearningPathVersion, ...legacyPlan } = savedPlan;
  void ignoredLearningPathVersion;
  database.savePlan({
    ...legacyPlan,
    learningPath: { ...savedPlan.learningPath, version: "math-learning-path-v2" },
    updatedAt: "2026-07-15T00:00:00.000Z",
  });
  const legacyDailyPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        studentId: "student-001",
        subjectId: "math-linear-equations",
        practiceDate: "2026-07-15",
      },
    },
  });
  assert.equal(legacyDailyPlan.status, 201, JSON.stringify(legacyDailyPlan.body));
  assert.equal(
    database.getDailyPracticePlan({
      studentId: "student-001",
      subjectId: "math-linear-equations",
      practiceDate: "2026-07-15",
    }).learningPath.version,
    "math-learning-path-v2",
  );

  const clientOverwrite = await request(baseUrl, "/api/student-plans/student-001/math-linear-equations", {
    method: "PUT",
    cookie: studentCookie,
    body: { record: { ...confirmed.body.record, updatedAt: "2026-07-15T00:00:00.000Z" } },
  });
  assert.equal(clientOverwrite.status, 409);
  assert.equal(clientOverwrite.body.error, "server_authoritative_plan_managed_by_dedicated_api");

  const repeated = await request(baseUrl, "/api/initial-learning-plans", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        ...planRequest,
        learningGoal: { ...planRequest.learningGoal, targetGrade: "G1" },
      },
    },
  });
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.idempotent, true);
  assert.equal(repeated.body.record.learningGoal.targetGrade, "G6");

  console.log("initial-learning-plan-contract: passed");
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  database.close();
}
