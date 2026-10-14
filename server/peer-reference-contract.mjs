import assert from "node:assert/strict";
import { createEducationDatabase } from "./database.mjs";
import { buildServerLearningReport } from "./learning-report-service.mjs";

const database = createEducationDatabase(":memory:");
const subjectId = "math-linear-equations";

function savePlan({ studentId, progress }) {
  database.savePlan({
    id: `plan-${studentId}`,
    studentId,
    subjectId,
    status: "active",
    learningGoal: { targetGrade: "G5" },
    staticCurve: {
      id: `curve-${studentId}`,
      curveType: "static",
      targetProgress: 1,
      currentPoint: { week: 1, progressTowardTarget: progress, remainingGap: 1 - progress },
      sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    },
    updatedAt: "2026-07-20T00:00:00.000Z",
  });
}

function saveTrustedAnswers({ studentId, correctCount, outcomes = null }) {
  for (let index = 0; index < 4; index += 1) {
    database.saveBehaviorEvent({
      eventId: `peer-${studentId}-${index}`,
      eventType: "answer_submitted",
      studentId,
      subjectId,
      timestamp: `2026-07-2${index}T12:00:00.000Z`,
      payload: {
        subjectId,
        scoringSource: "server_authoritative",
        isCorrect: outcomes ? Boolean(outcomes[index]) : index < correctCount,
        elapsedSeconds: 24,
        hintsOpened: 0,
        variantLevel: index === 3 ? "change_one_number" : "original",
      },
    });
  }
}

try {
  const scores = [0.4, 0.5, 0.6, 0.7, 0.8];
  scores.forEach((progress, index) => {
    const studentId = `student-cohort-${index + 1}`;
    savePlan({ studentId, progress });
    saveTrustedAnswers({ studentId, correctCount: Math.min(4, Math.max(1, index - 1)) });
  });

  const report = buildServerLearningReport({
    audience: "student",
    database,
    studentId: "student-cohort-3",
    subjectId,
  });
  assert.equal(report.peerReference.availability, "available");
  assert.equal(report.peerReference.source, "anonymized_live_cohort_v1");
  assert.ok(report.peerReference.percentile > 0 && report.peerReference.percentile < 1);
  assert.equal(report.peerReference.trend.availability, "collecting");
  assert.equal(JSON.stringify(report.peerReference).includes("student-cohort-"), false);
  assert.equal(report.peerReference.label.length > 0, true);

  database.savePlan({
    id: "plan-student-rising-trend",
    studentId: "student-rising-trend",
    subjectId,
    status: "active",
    learningGoal: { targetGrade: "G5" },
    staticCurve: {
      id: "curve-student-rising-trend",
      curveType: "static",
      targetProgress: 1,
      currentPoint: { week: 1, progressTowardTarget: 0.62, remainingGap: 0.38 },
      sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    },
  });
  for (let index = 0; index < 6; index += 1) {
    database.saveBehaviorEvent({
      eventId: `trend-rising-${index}`,
      eventType: "answer_submitted",
      studentId: "student-rising-trend",
      subjectId,
      timestamp: `2026-07-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`,
      payload: {
        subjectId,
        scoringSource: "server_authoritative",
        isCorrect: index >= 3,
        elapsedSeconds: 24,
        hintsOpened: 0,
        variantLevel: "original",
      },
    });
  }
  const risingReport = buildServerLearningReport({
    audience: "student",
    database,
    studentId: "student-rising-trend",
    subjectId,
  });
  assert.equal(risingReport.peerReference.availability, "available");
  assert.equal(risingReport.peerReference.trend.availability, "available");
  assert.equal(risingReport.peerReference.trend.direction, "upward");
  assert.equal(JSON.stringify(risingReport.peerReference).includes("student-rising-trend"), false);

  database.savePlan({
    id: "plan-student-other-goal",
    studentId: "student-other-goal",
    subjectId,
    status: "active",
    learningGoal: { targetGrade: "G6" },
    staticCurve: {
      id: "curve-student-other-goal",
      curveType: "static",
      targetProgress: 1,
      currentPoint: { week: 1, progressTowardTarget: 0.55, remainingGap: 0.45 },
      sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    },
  });
  saveTrustedAnswers({ studentId: "student-other-goal", correctCount: 3 });
  const insufficientReport = buildServerLearningReport({
    audience: "student",
    database,
    studentId: "student-other-goal",
    subjectId,
  });
  assert.equal(insufficientReport.peerReference.availability, "calibrating");
  assert.equal(typeof insufficientReport.peerReference.percentile, "undefined");
  assert.equal(insufficientReport.peerReference.trend.availability, "collecting");

  console.log("peer-reference-contract: passed");
} finally {
  database.close();
}
