import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
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

function deliveryRequest() {
  return {
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode: "practice",
    familyId: "part_whole_add_subtract",
    instructionalGrade: "G1",
    variantLevel: "original",
    aiVersion: "semi_ai",
    seed: 77,
    queueItemId: "report-contract-queue-item",
    sessionId: "report-contract-session",
    source: "report_contract",
  };
}

function staticCurve() {
  return {
    id: "static-report-contract",
    curveType: "static",
    currentPoint: { progressTowardTarget: 0.42, remainingGap: 0.58 },
  };
}

try {
  database.savePlan({
    id: "student-plan-student-001-math-linear-equations",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    status: "active",
    staticCurveConfirmedAt: "2026-07-01T00:00:00.000Z",
    staticCurve: staticCurve(),
    learningGoal: { targetGrade: "G5" },
    todayTask: { focus: "加减关系" },
    nextPracticeAllocation: {
      topPriority: {
        id: "retain_brief_final_check",
        label: "下一次保留一个简短核对点",
        rationale: "完成列式后会先回看数量关系和计算，再继续下一题。",
      },
    },
    stageAssessmentHistory: [
      {
        id: "stage-report-contract",
        status: "completed_verified",
        completedAt: "2026-07-12T10:00:00.000Z",
        accuracy: 0.8,
        masteryScore: 0.78,
        transferAccuracy: 0.75,
        assessmentScope: { transferVariantLevel: "relationship_reframe" },
        questionResults: [
          { questionId: "stage-original", familyId: "part_whole_add_subtract", variantLevel: "original", isCorrect: true },
          { questionId: "stage-reframe", familyId: "part_whole_add_subtract", variantLevel: "relationship_reframe", isCorrect: true },
          { questionId: "stage-order", familyId: "part_whole_add_subtract", variantLevel: "question_order_variant", isCorrect: false },
        ],
      },
    ],
    updatedAt: "2026-07-12T10:00:00.000Z",
  });
  database.saveAssessmentSession({
    id: "initial-report-contract",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    assessmentType: "initial_onboarding",
    targetGrade: "G5",
    status: "completed",
    serverAuthoritative: true,
    responseCount: 1,
    questionSnapshot: [
      {
        id: "initial-report-question",
        answer: 12,
        metadata: {
          abilityTags: ["read_context"],
          atlasNodeIds: ["more_less"],
        },
      },
    ],
    responses: [
      {
        questionId: "initial-report-question",
        answer: 12,
        isCorrect: true,
        submittedAt: "2026-07-01T10:00:00.000Z",
        metadata: {
          tags: {
            abilityTags: ["read_context"],
            atlasNodeIds: ["more_less"],
          },
        },
      },
    ],
    result: {
      accuracy: 1,
      completedQuestionCount: 1,
      requiredQuestionCount: 1,
      uncertainCount: 1,
      uncertaintyRate: 1,
      skippedCount: 0,
      allItemsQualityPassed: true,
    },
    updatedAt: "2026-07-01T10:00:00.000Z",
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const teacherCookie = await signIn(baseUrl, "teacher.wang", "teacher-demo-2026");
  const now = new Date().toISOString();

  const anonymous = await request(baseUrl, "/api/learning-reports/student-001/math-linear-equations");
  assert.equal(anonymous.status, 401);

  for (const event of [
    {
      eventId: "report-visit-start",
      studentId: "student-001",
      subjectId: "math-linear-equations",
      sessionId: "report-contract-session",
      eventType: "app_session_started",
      timestamp: now,
      payload: { entryHour: 16 },
    },
    {
      eventId: "report-visit-end",
      studentId: "student-001",
      subjectId: "math-linear-equations",
      sessionId: "report-contract-session",
      eventType: "app_session_ended",
      timestamp: now,
      payload: { activeSeconds: 120 },
    },
  ]) {
    const stored = await request(baseUrl, "/api/behavior-events", {
      method: "POST",
      cookie: studentCookie,
      body: { event },
    });
    assert.equal(stored.status, 201);
  }

  const created = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: { request: deliveryRequest() },
  });
  assert.equal(created.status, 201);
  const deliveryId = created.body.delivery.id;
  const started = await request(baseUrl, `/api/question-deliveries/${deliveryId}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(started.status, 200);

  const wrong = await request(baseUrl, `/api/question-deliveries/${deliveryId}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: -1, elapsedSeconds: 1, answerRevisionCount: 2 },
  });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.result.isCorrect, false);

  const retryEvent = await request(baseUrl, "/api/behavior-events", {
    method: "POST",
    cookie: studentCookie,
    body: {
      event: {
        eventId: "report-retry",
        studentId: "student-001",
        subjectId: "math-linear-equations",
        sessionId: "report-contract-session",
        eventType: "retry_clicked",
        timestamp: new Date().toISOString(),
        targetId: database.getQuestionDelivery({ deliveryId }).privateCandidate.id,
        payload: {},
      },
    },
  });
  assert.equal(retryEvent.status, 201);

  const hint = await request(baseUrl, `/api/question-deliveries/${deliveryId}/hints/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(hint.status, 200);

  const guidedStep = await request(baseUrl, `/api/question-deliveries/${deliveryId}/guided-steps/next`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(guidedStep.status, 200);
  const guidedResponse = await request(baseUrl, `/api/question-deliveries/${deliveryId}/guided-steps/responses`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", level: 1, response: "Identify what is known and what needs to be found." },
  });
  assert.equal(guidedResponse.status, 200);
  assert.equal(JSON.stringify(guidedResponse.body).includes("Identify what is known"), false);

  const family = shanghaiMathItemFamilies.find((item) => item.id === "part_whole_add_subtract");
  const candidate = validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      aiVersion: "semi_ai",
      family,
      instructionalGrade: "G1",
      seed: 77,
      variantLevel: "original",
    }),
  );
  const correct = await request(baseUrl, `/api/question-deliveries/${deliveryId}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: candidate.answer, elapsedSeconds: 1, answerRevisionCount: 0 },
  });
  assert.equal(correct.status, 200);
  assert.equal(correct.body.result.isCorrect, true);
  const storedGuidedCorrect = database
    .listBehaviorEvents({ studentId: "student-001", subjectId: "math-linear-equations", limit: 20 })
    .find((event) => event?.eventType === "answer_submitted" && event?.payload?.isCorrect === true);
  assert.equal(storedGuidedCorrect?.payload?.guidedStepsOpened, 1);

  database.saveBehaviorEvent({
    eventId: "report-untrusted-answer",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    eventType: "answer_submitted",
    timestamp: new Date().toISOString(),
    payload: { isCorrect: true, scoringSource: "browser_claimed" },
  });
  database.saveBehaviorEvent({
    eventId: "report-other-subject-answer",
    studentId: "student-001",
    subjectId: "english",
    eventType: "answer_submitted",
    timestamp: new Date().toISOString(),
    payload: { isCorrect: true, scoringSource: "server_authoritative" },
  });

  const parentReport = await request(baseUrl, "/api/learning-reports/student-001/math-linear-equations", {
    cookie: parentCookie,
  });
  assert.equal(parentReport.status, 200);
  const report = parentReport.body.report;
  assert.equal(report.audience, "parent");
  assert.equal(report.evidence.trustedAnswerCount, 2);
  assert.equal(report.evidence.excludedUntrustedAnswerCount, 1);
  assert.equal(report.learning.answerCount, 2);
  assert.equal(report.learning.correctRate, 0.5);
  assert.equal(report.learning.hintUseRate, 0.5);
  assert.equal(report.learning.answerRevisionEvidenceCount, 2);
  assert.equal(report.learning.answerRevisionItemCount, 1);
  assert.equal(report.learning.answerRevisionRate, 0.5);
  assert.equal(report.learning.averageAnswerRevisionCount, 1);
  assert.equal(report.learning.guidedResponseDeliveryCount, 1);
  assert.equal(report.learning.guidedReasoningResponseCount, 1);
  assert.deepEqual(report.learning.guidedReasoningPhaseCounts, { read_translate: 1 });
  assert.equal(report.learning.guidedFinalCheckCount, 0);
  assert.equal(report.learning.retryCount, 1);
  assert.equal(report.learning.retrySuccessRate, 0);
  assert.equal(report.learning.totalStudyMinutes, 2);
  assert.equal(report.abilityEvidence.answerEventCount, 2);
  assert.equal(report.abilityMap.serverAuthoritative, true);
  assert.equal(report.abilityMap.source, "server_initial_and_trusted_practice_evidence");
  assert.equal(report.curve.type, "static");
  assert.equal(report.curve.targetGrade, "G5");
  assert.equal(report.nextStep.source, "server_matching_priority");
  assert.equal(report.nextStep.focus, "下一次保留一个简短核对点");
  assert.equal(report.learningTrend.source, "trusted_practice_and_verified_formal_evidence");
  assert.equal(report.learningTrend.availability, "collecting");
  assert.equal(report.learningTrend.practice.trustedAnswerCount, 2);
  assert.equal(report.learningTrend.formal.verifiedTestCount, 1);
  assert.equal(report.testHistory.length, 2);
  assert.equal(report.testHistory.find((item) => item.type === "stage")?.transferVariantLevel, "relationship_reframe");
  assert.equal(report.formalTransferEvidence.source, "verified_formal_stage_transfer_evidence_v1");
  assert.equal(report.formalTransferEvidence.evidenceStatus, "observed");
  assert.equal(report.formalTransferEvidence.verifiedStageTestCount, 1);
  assert.equal(report.formalTransferEvidence.transferItemCount, 2);
  assert.equal(report.formalTransferEvidence.correctTransferItemCount, 1);
  assert.equal(report.formalTransferEvidence.transferAccuracy, 0.5);
  assert.equal(report.formalTransferEvidence.variants.find((item) => item.variantLevel === "relationship_reframe")?.correctRate, 1);
  assert.equal(report.formalTransferEvidence.variants.find((item) => item.variantLevel === "question_order_variant")?.correctRate, 0);
  assert.equal(report.levelAttainment.source, "level_attainment_report_v1");
  assert.equal(report.levelAttainment.targetGrade, "G5");
  assert.equal(report.levelAttainment.officiallyReached, false);
  assert.equal(report.levelAttainment.studentCopy.label, "G5 目标正在起步");
  assert.equal(report.profileSignals.source, "trusted_learning_behavior_evidence");
  assert.equal(report.profileSignals.evidenceStatus, "collecting");
  assert.equal(report.taggedQuestionEvidence, null);
  assert.equal(report.testHistory.find((item) => item.type === "initial")?.uncertainCount, 1);
  assert.equal(report.testHistory.find((item) => item.type === "initial")?.uncertaintyRate, 1);
  assert.equal(report.testHistory.find((item) => item.type === "initial")?.skippedCount, 0);
  assert.equal(report.observerGuidance.evidenceStatus, "collecting");
  assert.ok(report.observerGuidance.actions.some((item) => item.id === "collect_more_evidence"));
  assert.equal(JSON.stringify(report).includes("privateCandidate"), false);
  assert.equal(JSON.stringify(report).includes(`"answer":${candidate.answer}`), false);
  assert.equal(JSON.stringify(report.formalTransferEvidence).includes("questionId"), false);
  assert.equal(JSON.stringify(report.levelAttainment).includes("questionId"), false);
  assert.equal(JSON.stringify(report.levelAttainment).includes("familyId"), false);

  const teacherReport = await request(baseUrl, "/api/learning-reports/student-001/math-linear-equations", {
    cookie: teacherCookie,
  });
  assert.equal(teacherReport.status, 200);
  assert.equal(teacherReport.body.report.audience, "teacher");
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.source, "server_scored_item_tag_evidence_v1");
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.totalTaggedAttemptCount, 2);
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.familyCount, 1);
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.families[0]?.familyId, "part_whole_add_subtract");
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.families[0]?.attemptCount, 2);
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.families[0]?.independentAttemptCount, 1);
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.families[0]?.independentCorrectRate, 0);
  assert.equal(teacherReport.body.report.taggedQuestionEvidence.families[0]?.knowledgePointCount > 0, true);
  assert.equal(JSON.stringify(teacherReport.body.report.taggedQuestionEvidence).includes(`"answer":${candidate.answer}`), false);

  const studentReport = await request(baseUrl, "/api/learning-reports/student-001/math-linear-equations", {
    cookie: studentCookie,
  });
  assert.equal(studentReport.status, 200);
  assert.equal(studentReport.body.report.audience, "student");
  assert.equal(studentReport.body.report.observerGuidance, null);
  assert.equal(studentReport.body.report.profileSignals, null);

  console.log("learning-report-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
