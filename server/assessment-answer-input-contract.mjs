import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { formatMathAnswerValue } from "../src/services/math-answer-input.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { createStageAssessmentRun } from "../src/services/stage-assessment-runtime.js";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));
const subjectId = "math-linear-equations";

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

function createClockCandidate(seed) {
  const family = shanghaiMathItemFamilies.find((item) => item.id === "time_elapsed_simple");
  assert.ok(family);
  return validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      family,
      instructionalGrade: "G3",
      seed,
      variantLevel: "reverse_question",
    }),
  );
}

function createFractionCandidate() {
  const family = shanghaiMathItemFamilies.find((item) => item.id === "fraction_add_same_denominator");
  assert.ok(family);
  const candidate = Array.from({ length: 21 }, (_, seed) =>
    validateMathQuestionCandidate(
      generateMathQuestionCandidate({
        family,
        instructionalGrade: "G4",
        seed,
        variantLevel: "original",
      }),
    ),
  ).find((item) => Math.abs(item.answer - 0.5) < 1e-9);
  assert.ok(candidate);
  return candidate;
}

function replaceFirstInitialQuestion(session, candidate) {
  const firstSnapshot = session.questionSnapshot[0];
  const firstPresentation = session.presentationQuestions[0];
  return {
    ...session,
    responses: [],
    responseCount: 0,
    status: "in_progress",
    questionSnapshot: [
      {
        ...firstSnapshot,
        id: candidate.id,
        answer: candidate.answer,
        answerInput: candidate.answerInput,
        familyId: candidate.familyId,
        targetDimension: candidate.targetDimension,
        qualityStatus: candidate.qualityStatus,
      },
      ...session.questionSnapshot.slice(1),
    ],
    presentationQuestions: [
      {
        ...firstPresentation,
        id: candidate.id,
        prompt: candidate.prompt,
        answerInput: candidate.answerInput,
        familyId: candidate.familyId,
        targetDimension: candidate.targetDimension,
      },
      ...session.presentationQuestions.slice(1),
    ],
  };
}

try {
  database.saveStudentOnboardingPrefill({
    id: "prefill-student-001",
    studentId: "student-001",
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
    subjectSelectionConfirmedByUserId: "user-student-001",
    confirmationStatus: "student_confirmed",
    updatedAt: "2026-09-06T00:00:00.000Z",
  });
  database.saveAssessmentSession({
    id: "personality-student-001",
    studentId: "student-001",
    subjectId,
    assessmentType: "onboarding_personality",
    status: "completed",
    serverAuthoritative: true,
    responses: [],
    updatedAt: "2026-09-06T00:00:00.000Z",
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const signIn = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "lin.an", password: "student-demo-2026" },
  });
  assert.equal(signIn.status, 200);
  const cookie = signIn.cookie;
  const candidate = createClockCandidate(7);
  const expectedClock = formatMathAnswerValue({ answerInput: candidate.answerInput, value: candidate.answer });

  const createdInitial = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie,
    body: { request: { studentId: "student-001", subjectId, targetGrade: "G3" } },
  });
  assert.equal(createdInitial.status, 201);
  const privateInitial = database.getAssessmentSessionById({ sessionId: createdInitial.body.session.id });
  const clockInitial = database.saveAssessmentSession(replaceFirstInitialQuestion(privateInitial, candidate));
  const publicInitialQuestion = clockInitial.presentationQuestions[0];
  assert.equal(publicInitialQuestion.answerInput.kind, "clock_time");
  assert.equal(Object.hasOwn(publicInitialQuestion, "answer"), false);

  const rejectedInitial = await request(
    baseUrl,
    `/api/initial-assessment-runs/${encodeURIComponent(clockInitial.id)}/responses`,
    {
      method: "POST",
      cookie,
      body: {
        studentId: "student-001",
        questionId: candidate.id,
        answer: String(candidate.answer),
        responseTimeMs: 1000,
      },
    },
  );
  assert.equal(rejectedInitial.status, 409);
  assert.equal(rejectedInitial.body.error, "invalid_initial_assessment_answer");

  const acceptedInitial = await request(
    baseUrl,
    `/api/initial-assessment-runs/${encodeURIComponent(clockInitial.id)}/responses`,
    {
      method: "POST",
      cookie,
      body: {
        studentId: "student-001",
        questionId: candidate.id,
        answer: expectedClock,
        responseTimeMs: 1000,
      },
    },
  );
  assert.equal(acceptedInitial.status, 200);
  assert.equal(acceptedInitial.body.session.responses[0].responseType, "clock_time_answer");
  assert.equal(JSON.stringify(acceptedInitial.body.session).includes('"answer"'), false);
  assert.equal(database.getAssessmentSessionById({ sessionId: clockInitial.id }).responses[0].answer, candidate.answer);

  const nextCandidate = createClockCandidate(8);
  const stageRun = {
    ...createStageAssessmentRun({
      studentId: "student-001",
      subjectId,
      questions: [candidate, nextCandidate],
      minimumQuestions: 2,
      attemptId: "clock-input-api",
    }),
    serverAuthoritative: true,
  };
  database.saveAssessmentSession(stageRun);
  assert.equal(stageRun.presentationQuestions[0].answerInput.kind, "clock_time");
  assert.equal(Object.hasOwn(stageRun.presentationQuestions[0], "answer"), false);

  const rejectedStage = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(stageRun.id)}/responses`, {
    method: "POST",
    cookie,
    body: {
      studentId: "student-001",
      questionId: candidate.id,
      answer: String(candidate.answer),
      responseTimeMs: 1000,
    },
  });
  assert.equal(rejectedStage.status, 400);
  assert.equal(rejectedStage.body.error, "invalid_stage_assessment_answer");

  const acceptedStage = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(stageRun.id)}/responses`, {
    method: "POST",
    cookie,
    body: {
      studentId: "student-001",
      questionId: candidate.id,
      answer: expectedClock,
      responseTimeMs: 1000,
    },
  });
  assert.equal(acceptedStage.status, 200);
  assert.equal(acceptedStage.body.session.status, "in_progress");
  assert.equal(JSON.stringify(acceptedStage.body.session).includes('"answer"'), false);
  assert.equal(database.getAssessmentSessionById({ sessionId: stageRun.id }).responses[0].answer, candidate.answer);

  const fractionCandidate = createFractionCandidate();
  const createdFractionInitial = await request(baseUrl, "/api/initial-assessment-runs", {
    method: "POST",
    cookie,
    body: { request: { studentId: "student-001", subjectId, targetGrade: "G4" } },
  });
  assert.equal(createdFractionInitial.status, 201);
  const privateFractionInitial = database.getAssessmentSessionById({ sessionId: createdFractionInitial.body.session.id });
  const fractionInitial = database.saveAssessmentSession(replaceFirstInitialQuestion(privateFractionInitial, fractionCandidate));
  assert.equal(fractionInitial.presentationQuestions[0].answerInput.kind, "fraction");
  assert.equal(Object.hasOwn(fractionInitial.presentationQuestions[0], "answer"), false);

  const rejectedFractionInitial = await request(
    baseUrl,
    `/api/initial-assessment-runs/${encodeURIComponent(fractionInitial.id)}/responses`,
    {
      method: "POST",
      cookie,
      body: {
        studentId: "student-001",
        questionId: fractionCandidate.id,
        answer: "0.5",
        responseTimeMs: 1000,
      },
    },
  );
  assert.equal(rejectedFractionInitial.status, 409);
  assert.equal(rejectedFractionInitial.body.error, "invalid_initial_assessment_answer");

  const acceptedFractionInitial = await request(
    baseUrl,
    `/api/initial-assessment-runs/${encodeURIComponent(fractionInitial.id)}/responses`,
    {
      method: "POST",
      cookie,
      body: {
        studentId: "student-001",
        questionId: fractionCandidate.id,
        answer: "3/6",
        responseTimeMs: 1000,
      },
    },
  );
  assert.equal(acceptedFractionInitial.status, 200);
  assert.equal(acceptedFractionInitial.body.session.responses[0].responseType, "fraction_answer");
  assert.equal(JSON.stringify(acceptedFractionInitial.body.session).includes('"answer"'), false);
  assert.equal(database.getAssessmentSessionById({ sessionId: fractionInitial.id }).responses[0].answer, 0.5);

  const fractionStageRun = {
    ...createStageAssessmentRun({
      studentId: "student-001",
      subjectId,
      questions: [fractionCandidate, nextCandidate],
      minimumQuestions: 2,
      attemptId: "fraction-input-api",
    }),
    serverAuthoritative: true,
  };
  database.saveAssessmentSession(fractionStageRun);
  assert.equal(fractionStageRun.presentationQuestions[0].answerInput.kind, "fraction");

  const rejectedFractionStage = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(fractionStageRun.id)}/responses`, {
    method: "POST",
    cookie,
    body: {
      studentId: "student-001",
      questionId: fractionCandidate.id,
      answer: "0.5",
      responseTimeMs: 1000,
    },
  });
  assert.equal(rejectedFractionStage.status, 400);
  assert.equal(rejectedFractionStage.body.error, "invalid_stage_assessment_answer");

  const acceptedFractionStage = await request(baseUrl, `/api/stage-assessment-runs/${encodeURIComponent(fractionStageRun.id)}/responses`, {
    method: "POST",
    cookie,
    body: {
      studentId: "student-001",
      questionId: fractionCandidate.id,
      answer: "3/6",
      responseTimeMs: 1000,
    },
  });
  assert.equal(acceptedFractionStage.status, 200, JSON.stringify(acceptedFractionStage.body));
  assert.equal(JSON.stringify(acceptedFractionStage.body.session).includes('"answer"'), false);
  assert.equal(database.getAssessmentSessionById({ sessionId: fractionStageRun.id }).responses[0].answer, 0.5);

  console.log("assessment-answer-input-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
