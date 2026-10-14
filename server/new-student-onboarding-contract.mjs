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
const basicInfo = {
  birthYear: 2016,
  birthMonth: 5,
  birthDay: 9,
  gradeLevelOptionId: "cn_primary_4",
  schoolCalendarStageOptionId: "semester_1",
  routinePreferenceOptionId: "routine_evening",
  attentionSpanBandOptionId: "attention_20_25",
  readingComfortOptionId: "reading_flexible",
  primaryDeviceOptionId: "device_tablet",
  curriculumSystemOptionId: "curriculum_cn_school",
};

async function request(baseUrl, path, { body, cookie, method = "GET" } = {}) {
  const response = await fetch(baseUrl + path, {
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

async function completePersonalityAssessment({ baseUrl, cookie, studentId }) {
  const created = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie,
    body: { request: { studentId, subjectId: "math-linear-equations" } },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  for (const [index, question] of created.body.session.presentationQuestions.entries()) {
    const response = await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(created.body.session.id)}/responses`, {
      method: "POST",
      cookie,
      body: {
        studentId,
        questionId: question.id,
        answer: index % 4,
        responseTimeMs: 2600 + index,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
}

async function completeInitialAssessment({ baseUrl, cookie, studentId }) {
  const created = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie,
    body: { request: { studentId, subjectId: "math-linear-equations", targetGrade: "G4" } },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const privateSession = database.getAssessmentSessionById({ sessionId: created.body.session.id });
  const answers = new Map(privateSession.questionSnapshot.map((question) => [question.id, question.answer]));
  for (const question of created.body.session.presentationQuestions) {
    const response = await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(created.body.session.id)}/responses`, {
      method: "POST",
      cookie,
      body: {
        studentId,
        questionId: question.id,
        answer: answers.get(question.id),
        responseTimeMs: 900,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const studentRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "zhou.ning",
      displayName: "周宁",
      password: "StudentStart2026",
      role: "student",
      gradeLabel: "小学四年级",
    },
  });
  assert.equal(studentRegistration.status, 201, JSON.stringify(studentRegistration.body));
  assert.equal(studentRegistration.body.user.role, "student");
  assert.equal(studentRegistration.body.student.relationshipType, "self");
  const studentId = studentRegistration.body.user.studentId;
  const studentCookie = studentRegistration.cookie;
  assert.ok(studentId);
  assert.ok(studentCookie);

  const profile = await request(baseUrl, `/api/student-profiles/${encodeURIComponent(studentId)}`, { cookie: studentCookie });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.profile.displayName, "周宁");
  assert.equal(profile.body.profile.gradeLabel, "小学四年级");

  const savedPrefill = await request(baseUrl, `/api/student-onboarding-prefills/${encodeURIComponent(studentId)}`, {
    method: "PUT",
    cookie: studentCookie,
    body: {
      prefill: {
        studentId,
        basicInfo,
        subjectIds: [],
      },
    },
  });
  assert.equal(savedPrefill.status, 200, JSON.stringify(savedPrefill.body));
  assert.equal(savedPrefill.body.record.studentId, studentId);

  const confirmedPrefill = await request(
    baseUrl,
    `/api/student-onboarding-prefills/${encodeURIComponent(studentId)}/confirm`,
    { method: "POST", cookie: studentCookie, body: {} },
  );
  assert.equal(confirmedPrefill.status, 200);
  assert.equal(confirmedPrefill.body.record.confirmationStatus, "student_confirmed");

  await completePersonalityAssessment({ baseUrl, cookie: studentCookie, studentId });

  const initialBeforeSubjectSelection = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { studentId, subjectId: "math-linear-equations", targetGrade: "G4" } },
  });
  assert.equal(initialBeforeSubjectSelection.status, 409);
  assert.equal(initialBeforeSubjectSelection.body.error, "initial_assessment_requires_confirmed_math_subject_selection");

  const confirmedSubject = await request(baseUrl, `/api/student-onboarding-prefills/${encodeURIComponent(studentId)}`, {
    method: "PUT",
    cookie: studentCookie,
    body: {
      prefill: {
        studentId,
        basicInfo,
        subjectIds: ["math"],
        confirmSubjectSelection: true,
      },
    },
  });
  assert.equal(confirmedSubject.status, 200, JSON.stringify(confirmedSubject.body));
  assert.ok(confirmedSubject.body.record.subjectSelectionConfirmedAt);

  await completeInitialAssessment({ baseUrl, cookie: studentCookie, studentId });

  const plan = await request(baseUrl, "/api/initial-learning-plans", {
    method: "POST",
    cookie: studentCookie,
    body: {
      request: {
        studentId,
        subjectId: "math-linear-equations",
        practiceDate: "2026-07-22",
        learningGoal: {
          targetGrade: "G5",
          durationWeeks: 12,
          dailyStudyMinutes: 30,
          weeklyStudyDays: 5,
        },
      },
    },
  });
  assert.equal(plan.status, 201, JSON.stringify(plan.body));
  assert.equal(plan.body.record.studentId, studentId);
  assert.equal(plan.body.record.serverAuthoritative, true);
  assert.equal(plan.body.record.initialAbilityMap.serverAuthoritative, true);
  assert.equal(plan.body.record.initialAbilityMap.evidenceSummary.responseCount > 0, true);
  assert.equal(plan.body.record.learningPathVersion, "math-learning-path-v4");

  const dailyPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { studentId, subjectId: "math-linear-equations", practiceDate: "2026-07-22" } },
  });
  assert.equal(dailyPlan.status, 201, JSON.stringify(dailyPlan.body));
  assert.equal(dailyPlan.body.plan.studentId, studentId);
  assert.equal(
    database.getDailyPracticePlan({
      studentId,
      subjectId: "math-linear-equations",
      practiceDate: "2026-07-22",
    }).learningPath.version,
    "math-learning-path-v4",
  );
  assert.ok(dailyPlan.body.plan.questionQueue.items.length > 0);
  assert.equal(JSON.stringify(dailyPlan.body.plan).includes("student-001"), false);

  console.log("new-student-onboarding-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
