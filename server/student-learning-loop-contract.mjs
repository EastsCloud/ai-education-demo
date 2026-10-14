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
const subjectId = "math-linear-equations";
const practiceDate = "2026-08-01";
const onboardingBasicInfo = {
  birthYear: 2015,
  birthMonth: 8,
  birthDay: 12,
  gradeLevelOptionId: "cn_primary_5",
  schoolCalendarStageOptionId: "semester_1",
  routinePreferenceOptionId: "routine_evening",
  attentionSpanBandOptionId: "attention_20_25",
  readingComfortOptionId: "reading_flexible",
  primaryDeviceOptionId: "device_tablet",
  curriculumSystemOptionId: "curriculum_cn_school",
};

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

async function completePersonalityAssessment({ baseUrl, cookie, studentId }) {
  const created = await request(baseUrl, "/api/personality-assessment-runs", {
    method: "POST",
    cookie,
    body: { request: { studentId, subjectId } },
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
        responseTimeMs: 2200 + index,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
}

async function completeInitialAssessment({ baseUrl, cookie, studentId }) {
  const created = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie,
    body: { request: { studentId, subjectId, targetGrade: "G5" } },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const privateSession = database.getAssessmentSessionById({ sessionId: created.body.session.id });
  const answerByQuestionId = new Map(privateSession.questionSnapshot.map((question) => [question.id, question.answer]));
  for (const question of created.body.session.presentationQuestions) {
    const response = await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(created.body.session.id)}/responses`, {
      method: "POST",
      cookie,
      body: {
        studentId,
        questionId: question.id,
        answer: answerByQuestionId.get(question.id),
        responseTimeMs: 1200,
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
  }
}

async function completeRequiredPractice({ baseUrl, cookie, run, studentId }) {
  let currentRun = run;
  let usedSupport = false;
  let attemptCount = 0;

  while (!currentRun.requiredPracticeCompleted) {
    assert.ok(attemptCount < 40, "required practice did not complete within its bounded progression");
    const deliveryResponse = await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(currentRun.id)}/deliveries`, {
      method: "POST",
      cookie,
      body: {},
    });
    assert.ok([200, 201].includes(deliveryResponse.status), JSON.stringify(deliveryResponse.body));
    const delivery = deliveryResponse.body.delivery;
    const started = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/start`, {
      method: "POST",
      cookie,
      body: { studentId },
    });
    assert.equal(started.status, 200, JSON.stringify(started.body));

    if (!usedSupport) {
      const hint = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/hints/next`, {
        method: "POST",
        cookie,
        body: { studentId },
      });
      assert.equal(hint.status, 200, JSON.stringify(hint.body));
      assert.equal(hint.body.behaviorEvent.eventType, "hint_opened");
      usedSupport = true;
    }

    const privateDelivery = database.getQuestionDelivery({ deliveryId: delivery.id });
    const scored = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/attempts`, {
      method: "POST",
      cookie,
      body: { studentId, answer: privateDelivery.privateCandidate.answer, elapsedSeconds: 2 },
    });
    assert.equal(scored.status, 200, JSON.stringify(scored.body));
    assert.equal(scored.body.result.isCorrect, true);
    assert.equal(scored.body.behaviorEvent.payload.scoringSource, "server_authoritative");
    currentRun = scored.body.practiceRun;
    attemptCount += 1;
  }

  assert.equal(usedSupport, true);
  return currentRun;
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const parent = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "learning.loop.parent",
      displayName: "学习家长",
      password: "LearningLoop2026",
      role: "parent",
    },
  });
  assert.equal(parent.status, 201, JSON.stringify(parent.body));

  const createdStudent = await request(baseUrl, "/api/managed-students", {
    method: "POST",
    cookie: parent.cookie,
    body: {
      student: {
        loginName: "learning.loop.student",
        displayName: "学习同学",
        password: "LearningLoop2026",
        gradeLabel: "小学五年级",
      },
    },
  });
  assert.equal(createdStudent.status, 201, JSON.stringify(createdStudent.body));
  const studentId = createdStudent.body.student.studentId;

  const studentSignIn = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "learning.loop.student", password: "LearningLoop2026" },
  });
  assert.equal(studentSignIn.status, 200);
  const studentCookie = studentSignIn.cookie;

  const prefill = await request(baseUrl, `/api/student-onboarding-prefills/${encodeURIComponent(studentId)}`, {
    method: "PUT",
    cookie: studentCookie,
    body: {
      prefill: {
        studentId,
        basicInfo: onboardingBasicInfo,
        subjectIds: [],
      },
    },
  });
  assert.equal(prefill.status, 200, JSON.stringify(prefill.body));

  const confirmedPrefill = await request(
    baseUrl,
    `/api/student-onboarding-prefills/${encodeURIComponent(studentId)}/confirm`,
    { method: "POST", cookie: studentCookie, body: {} },
  );
  assert.equal(confirmedPrefill.status, 200);
  assert.equal(confirmedPrefill.body.record.confirmationStatus, "student_confirmed");

  await completePersonalityAssessment({ baseUrl, cookie: studentCookie, studentId });
  const confirmedSubject = await request(baseUrl, `/api/student-onboarding-prefills/${encodeURIComponent(studentId)}`, {
    method: "PUT",
    cookie: studentCookie,
    body: {
      prefill: {
        studentId,
        basicInfo: onboardingBasicInfo,
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
        subjectId,
        practiceDate,
        learningGoal: {
          targetGrade: "G6",
          durationWeeks: 12,
          dailyStudyMinutes: 30,
          weeklyStudyDays: 5,
        },
      },
    },
  });
  assert.equal(plan.status, 201, JSON.stringify(plan.body));
  assert.equal(plan.body.record.serverAuthoritative, true);
  assert.equal(plan.body.record.staticCurve.source, "ability_map_goal_rhythm_cohort_baseline");

  const dailyPlan = await request(baseUrl, "/api/daily-practice-plans", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { studentId, subjectId, practiceDate } },
  });
  assert.equal(dailyPlan.status, 201, JSON.stringify(dailyPlan.body));
  assert.ok(dailyPlan.body.plan.questionQueue.items.length > 0);

  const createdRun = await request(baseUrl, "/api/daily-practice-runs", {
    method: "POST",
    cookie: studentCookie,
    body: { request: { studentId, subjectId, practiceDate } },
  });
  assert.equal(createdRun.status, 201, JSON.stringify(createdRun.body));
  const completedRun = await completeRequiredPractice({
    baseUrl,
    cookie: studentCookie,
    run: createdRun.body.run,
    studentId,
  });
  assert.equal(completedRun.requiredPracticeCompleted, true);

  const storedSession = database.getDailyPracticeSession({ studentId, subjectId, practiceDate });
  assert.equal(storedSession.sessionStatus, "required_completed");
  assert.equal(storedSession.completionSource, "server_owned_daily_practice_run");

  const studentReport = await request(baseUrl, `/api/learning-reports/${encodeURIComponent(studentId)}/${subjectId}`, {
    cookie: studentCookie,
  });
  assert.equal(studentReport.status, 200, JSON.stringify(studentReport.body));
  assert.equal(studentReport.body.report.audience, "student");
  assert.ok(studentReport.body.report.learning.answerCount > 0);
  assert.equal(studentReport.body.report.observerGuidance, null);

  const parentReport = await request(baseUrl, `/api/learning-reports/${encodeURIComponent(studentId)}/${subjectId}`, {
    cookie: parent.cookie,
  });
  assert.equal(parentReport.status, 200, JSON.stringify(parentReport.body));
  assert.equal(parentReport.body.report.audience, "parent");
  assert.ok(parentReport.body.report.observerGuidance);
  assert.equal(JSON.stringify(parentReport.body.report).includes("privateCandidate"), false);

  console.log("student-learning-loop-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
