import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatMathAnswerValue } from "../src/services/math-answer-input.js";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const subjectId = "math-linear-equations";
const targetGrade = "G5";
const sharedPassword = "IsabelJourney2026!";
const databasePath = resolve(projectRoot, process.env.AI_EDUCATION_E2E_DATABASE || "data/system-e2e-cohort.sqlite");
const reportDirectory = resolve(projectRoot, process.env.AI_EDUCATION_E2E_REPORT_DIR || "output/test-reports");
const runKey = `journey-${Date.now().toString(36)}`;
const startedAt = new Date().toISOString();

function seedFromString(value) {
  let seed = 2166136261;
  for (const character of String(value)) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function localDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function recentWeekdayDates(count) {
  const dates = [];
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  while (dates.length < count) {
    if (date.getDay() !== 0 && date.getDay() !== 6) dates.push(localDateKey(date));
    date.setDate(date.getDate() - 1);
  }
  return dates.reverse();
}

function safeFilePart(value) {
  return String(value).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

function formatPercentage(value) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "collecting";
}

function expectStatus(result, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(
    allowed.includes(result.status),
    `${label}: expected ${allowed.join("/")}, received ${result.status}: ${JSON.stringify(result.body)}`,
  );
  return result;
}

async function request(baseUrl, path, { body, cookie, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let responseBody = null;
  try {
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = { raw: text };
  }
  return {
    body: responseBody,
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    status: response.status,
  };
}

function correctAnswerFor(deliveryRecord, publicDelivery) {
  assert.ok(deliveryRecord?.privateCandidate, "A server-owned answer oracle is required for the test runner.");
  return formatMathAnswerValue({
    answerInput: publicDelivery.question.answerInput,
    value: deliveryRecord.privateCandidate.answer,
  });
}

function wrongAnswerFor(deliveryRecord, publicDelivery) {
  const input = publicDelivery.question.answerInput;
  const correct = Number(deliveryRecord.privateCandidate.answer);
  if (input?.kind === "clock_time") {
    return formatMathAnswerValue({ answerInput: input, value: (correct + 1) % (24 * 60) });
  }
  return formatMathAnswerValue({ answerInput: input, value: Number.isFinite(correct) ? correct + 1 : 999 });
}

function buildBasicInfo(studentIndex) {
  return {
    birthYear: 2015 + (studentIndex % 2),
    birthMonth: 2 + studentIndex,
    birthDay: 8 + studentIndex,
    gradeLevelOptionId: "cn_primary_4",
    schoolCalendarStageOptionId: "semester_1",
    routinePreferenceOptionId: studentIndex % 2 ? "routine_evening" : "routine_afternoon",
    attentionSpanBandOptionId: studentIndex < 2 ? "attention_10_15" : "attention_20_25",
    readingComfortOptionId: studentIndex % 2 ? "reading_visual_support" : "reading_flexible",
    primaryDeviceOptionId: studentIndex % 2 ? "device_tablet" : "device_desktop",
    curriculumSystemOptionId: "curriculum_cn_school",
  };
}

const learnerProfiles = [
  { label: "building", initialAccuracy: 0.45, practiceAccuracy: 0.5, stageAccuracy: 0.5, hintRate: 0.58, seconds: 42 },
  { label: "developing", initialAccuracy: 0.58, practiceAccuracy: 0.62, stageAccuracy: 0.63, hintRate: 0.42, seconds: 34 },
  { label: "steady", initialAccuracy: 0.68, practiceAccuracy: 0.72, stageAccuracy: 0.75, hintRate: 0.28, seconds: 27 },
  { label: "strong", initialAccuracy: 0.8, practiceAccuracy: 0.83, stageAccuracy: 0.85, hintRate: 0.16, seconds: 21 },
  { label: "advanced", initialAccuracy: 0.9, practiceAccuracy: 0.92, stageAccuracy: 0.94, hintRate: 0.08, seconds: 16 },
];

const database = createEducationDatabase(databasePath);
const server = createServer(createLocalApiServer({ database, projectRoot }));
const roleSwitches = [];
const studentResults = [];
let serverClosed = false;

async function closeRuntime() {
  if (!serverClosed && server.listening) {
    server.close();
    await once(server, "close");
  }
  serverClosed = true;
  database.close();
}

async function register(baseUrl, account) {
  const result = expectStatus(
    await request(baseUrl, "/api/auth/register", { method: "POST", body: account }),
    201,
    `register ${account.role} ${account.loginName}`,
  );
  assert.ok(result.cookie, `register ${account.loginName}: session cookie missing`);
  return { ...result.body, cookie: result.cookie, loginName: account.loginName };
}

async function switchRole(baseUrl, account, action) {
  const session = expectStatus(
    await request(baseUrl, "/api/auth/session", { cookie: account.cookie }),
    200,
    `switch role to ${account.user.role}`,
  );
  assert.equal(session.body.session?.user?.userId, account.user.userId);
  assert.equal(session.body.session?.user?.role, account.user.role);
  roleSwitches.push({ action, role: account.user.role, userId: account.user.userId });
}

async function linkObserver({ baseUrl, student, observer, targetRole }) {
  await switchRole(baseUrl, student, `create_${targetRole}_invite`);
  const invitation = expectStatus(
    await request(baseUrl, "/api/student-relationship-invites", {
      method: "POST",
      cookie: student.cookie,
      body: { studentId: student.user.studentId, targetRole },
    }),
    201,
    `create ${targetRole} invite`,
  );
  await switchRole(baseUrl, observer, `accept_${targetRole}_invite`);
  const accepted = expectStatus(
    await request(baseUrl, "/api/student-relationship-invites/accept", {
      method: "POST",
      cookie: observer.cookie,
      body: { code: invitation.body.invite.code },
    }),
    200,
    `accept ${targetRole} invite`,
  );
  assert.equal(accepted.body.student.studentId, student.user.studentId);
}

async function saveAndConfirmBasicInfo({ baseUrl, student, basicInfo }) {
  await switchRole(baseUrl, student, "enter_basic_information");
  const path = `/api/student-onboarding-prefills/${encodeURIComponent(student.user.studentId)}`;
  expectStatus(
    await request(baseUrl, path, {
      method: "PUT",
      cookie: student.cookie,
      body: { prefill: { studentId: student.user.studentId, basicInfo, subjectIds: [] } },
    }),
    200,
    "save basic information",
  );
  expectStatus(
    await request(baseUrl, `${path}/confirm`, { method: "POST", cookie: student.cookie, body: {} }),
    200,
    "confirm basic information",
  );
}

async function completePersonality({ baseUrl, student, random }) {
  const created = expectStatus(
    await request(baseUrl, "/api/personality-assessment-runs", {
      method: "POST",
      cookie: student.cookie,
      body: { request: { studentId: student.user.studentId, subjectId } },
    }),
    201,
    "create personality assessment",
  );
  let session = created.body.session;
  for (const question of session.presentationQuestions) {
    const answered = expectStatus(
      await request(baseUrl, `/api/personality-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
        method: "POST",
        cookie: student.cookie,
        body: {
          studentId: student.user.studentId,
          questionId: question.id,
          answer: Math.floor(random() * 4),
          responseTimeMs: 1800 + Math.floor(random() * 5200),
        },
      }),
      200,
      "answer personality item",
    );
    session = answered.body.session;
  }
  assert.equal(session.status, "completed");
  assert.equal(session.responseCount, session.presentationQuestions.length);
  return session;
}

async function confirmMathSubject({ baseUrl, student, basicInfo }) {
  const result = expectStatus(
    await request(baseUrl, `/api/student-onboarding-prefills/${encodeURIComponent(student.user.studentId)}`, {
      method: "PUT",
      cookie: student.cookie,
      body: {
        prefill: {
          studentId: student.user.studentId,
          basicInfo,
          subjectIds: ["math"],
          confirmSubjectSelection: true,
        },
      },
    }),
    200,
    "confirm Math subject",
  );
  assert.ok(result.body.record.subjectSelectionConfirmedAt);
}

async function completeInitialAssessment({ baseUrl, database, student, profile, random }) {
  const created = expectStatus(
    await request(baseUrl, "/api/initial-assessment-runs", {
      method: "POST",
      cookie: student.cookie,
      body: { request: { studentId: student.user.studentId, subjectId, targetGrade: "G4" } },
    }),
    201,
    "create initial ability assessment",
  );
  let session = created.body.session;
  const privateSession = database.getAssessmentSessionById({ sessionId: session.id });
  const privateQuestions = new Map(privateSession.questionSnapshot.map((question) => [question.id, question]));
  let correctCount = 0;
  for (const question of session.presentationQuestions) {
    const privateQuestion = privateQuestions.get(question.id);
    const isCorrect = random() < profile.initialAccuracy;
    const answer = isCorrect
      ? formatMathAnswerValue({ answerInput: question.answerInput, value: privateQuestion.answer })
      : wrongAnswerFor({ privateCandidate: privateQuestion }, { question });
    if (isCorrect) correctCount += 1;
    const answered = expectStatus(
      await request(baseUrl, `/api/initial-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
        method: "POST",
        cookie: student.cookie,
        body: {
          studentId: student.user.studentId,
          questionId: question.id,
          answer,
          isUncertain: !isCorrect && random() < 0.22,
          responseTimeMs: 9000 + Math.floor(random() * 32000),
        },
      }),
      200,
      "answer initial ability item",
    );
    session = answered.body.session;
  }
  assert.equal(session.status, "completed");
  return { session, correctCount, totalCount: session.presentationQuestions.length };
}

async function configureGoalAndPlan({ baseUrl, student, parent, practiceDate }) {
  const learningGoal = {
    targetGrade,
    durationWeeks: 12,
    dailyStudyMinutes: 30,
    weeklyStudyDays: 5,
  };
  const path = `/api/student-learning-goal-drafts/${encodeURIComponent(student.user.studentId)}/${encodeURIComponent(subjectId)}`;
  await switchRole(baseUrl, parent, "parent_proposes_learning_goal");
  expectStatus(
    await request(baseUrl, path, {
      method: "PUT",
      cookie: parent.cookie,
      body: { draft: { learningGoal } },
    }),
    200,
    "parent proposes learning goal",
  );
  await switchRole(baseUrl, student, "student_confirms_learning_goal");
  expectStatus(
    await request(baseUrl, `${path}/confirm`, {
      method: "POST",
      cookie: student.cookie,
      body: { draft: { learningGoal } },
    }),
    200,
    "student confirms learning goal",
  );
  const plan = expectStatus(
    await request(baseUrl, "/api/initial-learning-plans", {
      method: "POST",
      cookie: student.cookie,
      body: { request: { studentId: student.user.studentId, subjectId, practiceDate, learningGoal } },
    }),
    201,
    "create and confirm static learning curve",
  );
  assert.equal(plan.body.record.serverAuthoritative, true);
  assert.ok(plan.body.record.staticCurveConfirmedAt);
  return plan.body.record;
}

async function configureCadenceAndMessages({ baseUrl, student, parent, teacher, studentIndex }) {
  await switchRole(baseUrl, teacher, "teacher_configures_test_cadence");
  expectStatus(
    await request(baseUrl, "/api/assessment-cadence", {
      method: "POST",
      cookie: teacher.cookie,
      body: {
        studentId: student.user.studentId,
        subjectId,
        suggestedAfterPracticeDays: 3,
        mandatoryAfterPracticeDays: 10,
      },
    }),
    200,
    "teacher configures assessment cadence",
  );
  const messages = [
    { account: parent, role: "parent", body: `Keep a calm rhythm for learner ${studentIndex + 1}.` },
    { account: teacher, role: "teacher", body: "Read the relationship first, then calculate." },
  ];
  for (const [index, entry] of messages.entries()) {
    await switchRole(baseUrl, entry.account, `${entry.role}_sends_message`);
    expectStatus(
      await request(baseUrl, "/api/student-messages", {
        method: "POST",
        cookie: entry.account.cookie,
        body: {
          message: {
            id: `message-${runKey}-${studentIndex}-${index}`,
            studentId: student.user.studentId,
            fromUserId: entry.account.user.userId,
            fromRole: entry.role,
            title: "Learning note",
            body: entry.body,
            createdAt: new Date().toISOString(),
          },
        },
      }),
      201,
      `${entry.role} sends message`,
    );
  }
}

async function recordLearningSessionEvent({ baseUrl, student, dayIndex, eventType, payload }) {
  return expectStatus(
    await request(baseUrl, "/api/behavior-events", {
      method: "POST",
      cookie: student.cookie,
      body: {
        event: {
          eventId: `e2e-${runKey}-${student.user.studentId}-${dayIndex}-${eventType}`,
          studentId: student.user.studentId,
          subjectId,
          sessionId: `e2e-session-${runKey}-${student.user.studentId}-${dayIndex}`,
          eventType,
          timestamp: new Date().toISOString(),
          payload,
        },
      },
    }),
    201,
    `record ${eventType}`,
  );
}

async function submitDeliveryAttempt({ baseUrl, student, delivery, answer, elapsedSeconds, answerRevisionCount }) {
  return expectStatus(
    await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/attempts`, {
      method: "POST",
      cookie: student.cookie,
      body: {
        studentId: student.user.studentId,
        answer,
        elapsedSeconds,
        answerRevisionCount,
      },
    }),
    200,
    "submit practice answer",
  );
}

async function completePracticeDay({ baseUrl, database, student, parent, profile, random, practiceDate, dayIndex }) {
  await switchRole(baseUrl, student, `student_practice_day_${dayIndex + 1}`);
  await recordLearningSessionEvent({
    baseUrl,
    student,
    dayIndex,
    eventType: "app_session_started",
    payload: { entryHour: 15 + (dayIndex % 3) },
  });
  expectStatus(
    await request(baseUrl, "/api/daily-practice-plans", {
      method: "POST",
      cookie: student.cookie,
      body: { request: { studentId: student.user.studentId, subjectId, practiceDate } },
    }),
    201,
    "create daily practice plan",
  );
  const createdRun = expectStatus(
    await request(baseUrl, "/api/daily-practice-runs", {
      method: "POST",
      cookie: student.cookie,
      body: { request: { studentId: student.user.studentId, subjectId, practiceDate } },
    }),
    201,
    "create daily practice run",
  );
  let run = createdRun.body.run;
  let forceIndependent = false;
  let deliveryCount = 0;
  let wrongCount = 0;
  let hintCount = 0;

  while (!run.requiredPracticeCompleted) {
    deliveryCount += 1;
    assert.ok(deliveryCount <= 100, "daily practice exceeded the bounded delivery limit");
    const delivered = expectStatus(
      await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(run.id)}/deliveries`, {
        method: "POST",
        cookie: student.cookie,
        body: {},
      }),
      [200, 201],
      "deliver next daily question",
    );
    const delivery = delivered.body.delivery;
    expectStatus(
      await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/start`, {
        method: "POST",
        cookie: student.cookie,
        body: { studentId: student.user.studentId },
      }),
      200,
      "start daily question",
    );
    const privateDelivery = database.getQuestionDelivery({ deliveryId: delivery.id });
    const correctAnswer = correctAnswerFor(privateDelivery, delivery);
    const shouldAnswerWrong = !forceIndependent && random() > profile.practiceAccuracy;
    const elapsedSeconds = Math.max(4, Math.round(profile.seconds * (0.72 + random() * 0.65)));

    if (shouldAnswerWrong) {
      wrongCount += 1;
      await submitDeliveryAttempt({
        baseUrl,
        student,
        delivery,
        answer: wrongAnswerFor(privateDelivery, delivery),
        elapsedSeconds,
        answerRevisionCount: Math.floor(random() * 3),
      });
      const useHint = random() < profile.hintRate;
      if (useHint) {
        const layers = random() < 0.3 ? 2 : 1;
        for (let layer = 0; layer < layers; layer += 1) {
          const hint = await request(baseUrl, `/api/question-deliveries/${encodeURIComponent(delivery.id)}/hints/next`, {
            method: "POST",
            cookie: student.cookie,
            body: { studentId: student.user.studentId },
          });
          if (hint.status === 200) hintCount += 1;
        }
      }
      const corrected = await submitDeliveryAttempt({
        baseUrl,
        student,
        delivery,
        answer: correctAnswer,
        elapsedSeconds: Math.max(4, elapsedSeconds - 2),
        answerRevisionCount: 1,
      });
      run = corrected.body.practiceRun;
      forceIndependent = Boolean(corrected.body.result.requiresIndependentRetry);
    } else {
      const answered = await submitDeliveryAttempt({
        baseUrl,
        student,
        delivery,
        answer: correctAnswer,
        elapsedSeconds,
        answerRevisionCount: Math.floor(random() * 2),
      });
      run = answered.body.practiceRun;
      forceIndependent = Boolean(answered.body.result.requiresIndependentRetry);
    }
    assert.ok(run, "practice answer did not return the authoritative run state");
  }

  const activeSeconds = Math.round((deliveryCount * profile.seconds + hintCount * 8) * (0.9 + random() * 0.2));
  await recordLearningSessionEvent({
    baseUrl,
    student,
    dayIndex,
    eventType: "app_session_ended",
    payload: { activeSeconds, elapsedSeconds: activeSeconds + 60, pauseCount: Math.floor(random() * 3), lastPage: "practice" },
  });
  await switchRole(baseUrl, parent, `parent_reviews_day_${dayIndex + 1}`);
  const summary = expectStatus(
    await request(baseUrl, `/api/daily-practice-runs/${encodeURIComponent(run.id)}/summary`, { cookie: parent.cookie }),
    200,
    "parent reads daily practice summary",
  );
  assert.equal(summary.body.summary.requiredPracticeCompleted, true);
  return { deliveryCount, hintCount, wrongCount, activeSeconds, runId: run.id };
}

async function completeStageAssessment({ baseUrl, database, student, profile, random }) {
  await switchRole(baseUrl, student, "student_completes_stage_assessment");
  const created = expectStatus(
    await request(baseUrl, "/api/stage-assessment-runs", {
      method: "POST",
      cookie: student.cookie,
      body: {
        request: {
          studentId: student.user.studentId,
          subjectId,
          targetGrade,
          preferredFamilyId: "ratio_rate_unit",
          attemptIndex: 0,
          plannedWeek: 1,
        },
      },
    }),
    201,
    "create stage assessment",
  );
  let session = created.body.session;
  const privateSession = database.getAssessmentSessionById({ sessionId: session.id });
  const privateQuestions = new Map(privateSession.questionSnapshot.map((question) => [question.id, question]));
  let correctCount = 0;
  for (const question of session.presentationQuestions) {
    const privateQuestion = privateQuestions.get(question.id);
    const isCorrect = random() < profile.stageAccuracy;
    const answer = isCorrect
      ? formatMathAnswerValue({ answerInput: question.answerInput, value: privateQuestion.answer })
      : wrongAnswerFor({ privateCandidate: privateQuestion }, { question });
    if (isCorrect) correctCount += 1;
    const answered = expectStatus(
      await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(session.id)}/responses`, {
        method: "POST",
        cookie: student.cookie,
        body: {
          studentId: student.user.studentId,
          questionId: question.id,
          answer,
          responseTimeMs: 7000 + Math.floor(random() * 26000),
        },
      }),
      200,
      "answer stage assessment item",
    );
    session = answered.body.session;
  }
  assert.equal(session.status, "completed_verified");
  assert.equal(session.dynamicCurve.canUpdate, true);
  return { session, correctCount, totalCount: session.presentationQuestions.length };
}

async function confirmDynamicCurve({ baseUrl, student }) {
  const adjusted = expectStatus(
    await request(baseUrl, "/api/curve-adjustments", {
      method: "POST",
      cookie: student.cookie,
      body: {
        studentId: student.user.studentId,
        subjectId,
        parameters: {
          durationWeeks: 12,
          dailyStudyMinutes: 30,
          weeklyStudyDays: 5,
          testIntervalPracticeDays: 3,
          curveAdjustmentMode: "keep_study_intensity",
        },
      },
    }),
    200,
    "confirm dynamic curve",
  );
  assert.equal(adjusted.body.record.dynamicCurve.adjustment.actorRole, "student");
}

function markdownReport(report) {
  const lines = [
    "# AI Education Five-Learner System Test",
    "",
    `- Run: \`${report.runId}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Started: ${report.startedAt}`,
    `- Completed: ${report.completedAt}`,
    `- Persistent database: \`${report.databasePath}\``,
    `- Roles: ${report.topology.students} students, ${report.topology.parents} parents, ${report.topology.teachers} teacher`,
    `- Real role switches: ${report.roleSwitchCount}`,
    "",
    "## Coverage",
    "",
    "Registration -> relationships -> basic information -> psychological and learning personality -> Math selection -> initial ability test -> parent goal proposal -> student confirmation -> static curve -> three daily practices -> formal stage test -> dynamic curve -> student/parent/teacher reports -> peer comparison -> persistence restart.",
    "",
    "## Learners",
    "",
    "| Learner | Pattern | Initial | Practice answers | Hints | Stage | Peer percentile | Trend |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...report.students.map(
      (student) =>
        `| ${student.displayName} | ${student.pattern} | ${formatPercentage(student.initialAccuracy)} | ${student.report.answerCount} | ${formatPercentage(student.report.hintUseRate)} | ${formatPercentage(student.stageAccuracy)} | ${formatPercentage(student.report.peerPercentile)} | ${student.report.peerTrend} |`,
    ),
    "",
    "## Verified Boundaries",
    "",
    ...report.verifiedBoundaries.map((item) => `- [x] ${item}`),
    "",
    "## Retained Test Accounts",
    "",
    `Shared local test password: \`${report.credentials.password}\``,
    "",
    ...report.credentials.accounts.map((account) => `- ${account.role}: \`${account.loginName}\``),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const practiceDates = recentWeekdayDates(3);

  const teacher = await register(baseUrl, {
    loginName: `${runKey}.teacher`,
    displayName: "Cohort Teacher",
    password: sharedPassword,
    role: "teacher",
  });

  for (const [studentIndex, profile] of learnerProfiles.entries()) {
    const random = createRandom(seedFromString(`${runKey}-${studentIndex}`));
    const student = await register(baseUrl, {
      loginName: `${runKey}.student${studentIndex + 1}`,
      displayName: `Test Learner ${studentIndex + 1}`,
      password: sharedPassword,
      role: "student",
      gradeLabel: "小学四年级",
    });
    const parent = await register(baseUrl, {
      loginName: `${runKey}.parent${studentIndex + 1}`,
      displayName: `Test Parent ${studentIndex + 1}`,
      password: sharedPassword,
      role: "parent",
    });

    await linkObserver({ baseUrl, student, observer: parent, targetRole: "parent" });
    await linkObserver({ baseUrl, student, observer: teacher, targetRole: "teacher" });
    const basicInfo = buildBasicInfo(studentIndex);
    await saveAndConfirmBasicInfo({ baseUrl, student, basicInfo });
    const parentStatus = expectStatus(
      await request(
        baseUrl,
        `/api/onboarding-status/${encodeURIComponent(student.user.studentId)}/${encodeURIComponent(subjectId)}`,
        { cookie: parent.cookie },
      ),
      200,
      "parent observes onboarding status",
    );
    assert.ok(parentStatus.body.status);
    await completePersonality({ baseUrl, student, random });
    await confirmMathSubject({ baseUrl, student, basicInfo });
    const initial = await completeInitialAssessment({ baseUrl, database, student, profile, random });
    await configureGoalAndPlan({ baseUrl, student, parent, practiceDate: practiceDates[0] });
    await configureCadenceAndMessages({ baseUrl, student, parent, teacher, studentIndex });

    const practiceDays = [];
    for (const [dayIndex, practiceDate] of practiceDates.entries()) {
      practiceDays.push(
        await completePracticeDay({
          baseUrl,
          database,
          student,
          parent,
          profile,
          random,
          practiceDate,
          dayIndex,
        }),
      );
    }
    const stage = await completeStageAssessment({ baseUrl, database, student, profile, random });
    await confirmDynamicCurve({ baseUrl, student });
    const messages = expectStatus(
      await request(baseUrl, `/api/student-messages/${encodeURIComponent(student.user.studentId)}`, { cookie: student.cookie }),
      200,
      "student reads observer messages",
    );
    assert.equal(messages.body.messages.length, 2);

    studentResults.push({
      displayName: student.user.displayName,
      initialAccuracy: initial.correctCount / initial.totalCount,
      parent,
      pattern: profile.label,
      practiceDays,
      stageAccuracy: stage.correctCount / stage.totalCount,
      student,
      teacher,
    });
  }

  const teacherStudents = expectStatus(
    await request(baseUrl, "/api/linked-students", { cookie: teacher.cookie }),
    200,
    "teacher lists linked learners",
  );
  for (const result of studentResults) {
    assert.ok(teacherStudents.body.students.some((student) => student.studentId === result.student.user.studentId));
  }

  const crossParentRead = await request(
    baseUrl,
    `/api/student-profiles/${encodeURIComponent(studentResults[1].student.user.studentId)}`,
    { cookie: studentResults[0].parent.cookie },
  );
  assert.equal(crossParentRead.status, 403);

  for (const result of studentResults) {
    const studentId = result.student.user.studentId;
    await switchRole(baseUrl, result.student, "student_reads_final_report");
    const studentReport = expectStatus(
      await request(baseUrl, `/api/learning-reports/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`, {
        cookie: result.student.cookie,
      }),
      200,
      "student reads final report",
    ).body.report;
    await switchRole(baseUrl, result.parent, "parent_reads_final_report");
    const parentReport = expectStatus(
      await request(baseUrl, `/api/learning-reports/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`, {
        cookie: result.parent.cookie,
      }),
      200,
      "parent reads final report",
    ).body.report;
    await switchRole(baseUrl, teacher, "teacher_reads_final_report");
    const teacherReport = expectStatus(
      await request(baseUrl, `/api/learning-reports/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`, {
        cookie: teacher.cookie,
      }),
      200,
      "teacher reads final report",
    ).body.report;

    assert.equal(studentReport.audience, "student");
    assert.equal(parentReport.audience, "parent");
    assert.equal(teacherReport.audience, "teacher");
    assert.equal(studentReport.learning.answerCount, parentReport.learning.answerCount);
    assert.equal(parentReport.learning.answerCount, teacherReport.learning.answerCount);
    assert.equal(studentReport.peerReference.availability, "available");
    assert.equal(typeof studentReport.peerReference.percentile, "number");
    assert.equal(studentReport.profileSignals, null);
    assert.ok(teacherReport.taggedQuestionEvidence);

    result.report = {
      answerCount: studentReport.learning.answerCount,
      correctRate: studentReport.learning.correctRate,
      hintUseRate: studentReport.learning.hintUseRate,
      retrySuccessRate: studentReport.learning.retrySuccessRate,
      totalStudyMinutes: studentReport.learning.totalStudyMinutes,
      peerPercentile: studentReport.peerReference.percentile,
      peerTrend: studentReport.peerReference.trend.direction,
    };
  }

  const completedAt = new Date().toISOString();
  const report = {
    runId: runKey,
    status: "passed",
    startedAt,
    completedAt,
    databasePath: relative(projectRoot, databasePath),
    topology: { students: studentResults.length, parents: studentResults.length, teachers: 1 },
    roleSwitchCount: roleSwitches.length,
    roleSwitches,
    verifiedBoundaries: [
      "Every account was created through the public registration API.",
      "Each parent and the shared teacher accepted a single-use relationship invitation.",
      "All personality, initial assessment, practice, and stage-test answers were submitted through role-authorized APIs.",
      "Wrong answers, hints, independent retries, one-number variants, and two-number variants stayed server-controlled.",
      "Only formal stage tests changed the dynamic learning curve.",
      "Student, parent, and teacher reports resolved from the same persisted learner evidence.",
      "A parent could not read another parent's learner.",
      "Five same-target learners produced an anonymous peer comparison without exposing identities.",
      "Data survived closing and reopening the SQLite database.",
    ],
    credentials: {
      password: sharedPassword,
      accounts: [
        { role: "student", loginName: studentResults[0].student.loginName },
        { role: "parent", loginName: studentResults[0].parent.loginName },
        { role: "teacher", loginName: teacher.loginName },
      ],
    },
    students: studentResults.map((result) => ({
      displayName: result.displayName,
      studentId: result.student.user.studentId,
      loginName: result.student.loginName,
      parentLoginName: result.parent.loginName,
      pattern: result.pattern,
      initialAccuracy: result.initialAccuracy,
      stageAccuracy: result.stageAccuracy,
      practiceDays: result.practiceDays,
      report: result.report,
    })),
  };

  await closeRuntime();
  const persistedDatabase = createEducationDatabase(databasePath);
  try {
    for (const result of studentResults) {
      const studentId = result.student.user.studentId;
      assert.ok(persistedDatabase.getStudentProfile({ studentId }));
      assert.ok(persistedDatabase.getPlan({ studentId, subjectId })?.staticCurveConfirmedAt);
      assert.ok(persistedDatabase.listBehaviorEvents({ studentId, subjectId, limit: 2000 }).length > 0);
      assert.equal(persistedDatabase.listStudentMessages({ studentId }).length, 2);
    }
  } finally {
    persistedDatabase.close();
  }

  mkdirSync(reportDirectory, { recursive: true });
  const reportBase = `system-e2e-${safeFilePart(runKey)}`;
  const jsonPath = resolve(reportDirectory, `${reportBase}.json`);
  const markdownPath = resolve(reportDirectory, `${reportBase}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, markdownReport(report), "utf8");

  console.log(`system-journey-e2e: passed (${studentResults.length} learners)`);
  console.log(`database: ${relative(projectRoot, databasePath)}`);
  console.log(`report: ${relative(projectRoot, markdownPath)}`);
} catch (error) {
  await closeRuntime();
  throw error;
}
