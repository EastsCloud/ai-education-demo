import { buildLearningReport } from "../src/services/learning-report-engine.js";

const MINIMUM_COHORT_SIZE = 5;
const MINIMUM_TRUSTED_ANSWERS = 3;
const MINIMUM_TREND_ANSWERS = 6;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null;
}

function isSubjectEvent(event, subjectId) {
  const eventSubjectId = event?.subjectId || event?.payload?.subjectId || null;
  return !eventSubjectId || eventSubjectId === subjectId;
}

function isTrustedAnswerEvent(event) {
  return event?.eventType === "answer_submitted" && event?.payload?.scoringSource === "server_authoritative";
}

function activeCurve(plan) {
  return plan?.dynamicCurve?.canUpdate ? plan.dynamicCurve : plan?.staticCurve || null;
}

function targetGrade(plan) {
  return String(plan?.learningGoal?.targetGrade || "").trim().toUpperCase() || null;
}

function cohortDescription(plan, subjectId) {
  const grade = targetGrade(plan);
  if (subjectId === "math-linear-equations" && grade) return `同目标 ${grade} 数学学习者`;
  return "同目标、同阶段学习者";
}

function scopedReportEvents({ database, studentId, subjectId }) {
  return database
    .listBehaviorEvents({ studentId, subjectId, limit: 2000 })
    .filter((event) => isSubjectEvent(event, subjectId))
    .filter((event) => event?.eventType !== "answer_submitted" || isTrustedAnswerEvent(event))
    .sort((left, right) => Date.parse(left?.timestamp || "") - Date.parse(right?.timestamp || ""));
}

function collectingTrend() {
  return {
    availability: "collecting",
    direction: "collecting",
    label: "趋势正在形成",
    studentCopy: "再多完成几次练习，系统会更清楚地看见你的变化。",
    observerCopy: "可信作答还不够形成趋势，不对短期波动作结论。",
    guardrail: "Trend waits for repeated server-scored practice and never changes a learning curve by itself.",
  };
}

function buildLearningMomentum(events = []) {
  const answers = events.filter(isTrustedAnswerEvent);
  if (answers.length < MINIMUM_TREND_ANSWERS) return collectingTrend();

  const windowSize = Math.max(3, Math.min(4, Math.floor(answers.length / 2)));
  const earlier = answers.slice(-(windowSize * 2), -windowSize);
  const recent = answers.slice(-windowSize);
  if (earlier.length < 3 || recent.length < 3) return collectingTrend();

  const accuracy = (window) => window.filter((event) => event?.payload?.isCorrect).length / window.length;
  const delta = accuracy(recent) - accuracy(earlier);
  if (delta >= 0.15) {
    return {
      availability: "available",
      direction: "upward",
      label: "最近更顺了",
      studentCopy: "最近几次练习比前一段更顺，继续保持自己的节奏。",
      observerCopy: "最近几次可信作答比前一段更稳，先保持当前方法，不急着增加压力。",
      guardrail: "Trend compares two bounded windows of server-scored practice; it is not a rank or a curve update.",
    };
  }
  if (delta <= -0.15) {
    return {
      availability: "available",
      direction: "regrouping",
      label: "正在适应新变化",
      studentCopy: "最近的题目可能在变化，先把方法走稳，就会更清楚。",
      observerCopy: "近期可信作答有波动，先看题型和提示路径，不急着改变目标或加量。",
      guardrail: "Trend compares two bounded windows of server-scored practice; it is not a rank or a curve update.",
    };
  }
  return {
    availability: "available",
    direction: "steady",
    label: "最近很稳定",
    studentCopy: "最近的练习节奏很稳定，继续一步一步来。",
    observerCopy: "近期可信作答保持稳定，继续观察是否能在变式中维持独立完成。",
    guardrail: "Trend compares two bounded windows of server-scored practice; it is not a rank or a curve update.",
  };
}

function belongsToCohort(candidate, referencePlan) {
  return (
    candidate?.status === "active" &&
    candidate?.studentId &&
    targetGrade(candidate) &&
    targetGrade(candidate) === targetGrade(referencePlan)
  );
}

function participantSnapshot({ database, plan, subjectId }) {
  const reportEvents = scopedReportEvents({ database, studentId: plan.studentId, subjectId });
  const trustedAnswerCount = reportEvents.filter(isTrustedAnswerEvent).length;
  const curve = activeCurve(plan);
  if (!curve || trustedAnswerCount < MINIMUM_TRUSTED_ANSWERS) return null;

  const learning = buildLearningReport({ behaviorEvents: reportEvents });
  const progress = clamp(Number(curve.currentPoint?.progressTowardTarget) || 0);
  const accuracy = typeof learning.correctRate === "number" ? clamp(learning.correctRate) : progress;

  return {
    studentId: plan.studentId,
    score: round(progress * 0.6 + accuracy * 0.4, 4),
    momentum: buildLearningMomentum(reportEvents),
  };
}

function percentile(score, snapshots) {
  if (!snapshots.length) return null;
  const lowerCount = snapshots.filter((snapshot) => snapshot.score < score - 0.0001).length;
  const equalCount = snapshots.filter((snapshot) => Math.abs(snapshot.score - score) <= 0.0001).length;
  return round(clamp((lowerCount + equalCount * 0.5) / snapshots.length), 2);
}

function labelForPercentile(value) {
  if (value < 0.34) return "正在建立自己的方法";
  if (value < 0.67) return "正在稳步前进";
  return "正在走得更快";
}

function calibratingReference({ plan, subjectId, reason, trend = collectingTrend() }) {
  return {
    availability: "calibrating",
    source: "anonymized_live_cohort_v1",
    groupDescription: cohortDescription(plan, subjectId),
    label: "同类参考正在建立",
    studentCopy:
      reason === "needs_learning_evidence"
        ? "多完成几次练习后，这里会出现更贴近你的同类学习参照。"
        : "等有足够多匿名的同类学习记录后，这里会显示温和的参考带。",
    observerCopy: "样本不足时不产生排名或比较结论。",
    trend,
    guardrail: "Peer reference is hidden until an anonymized cohort has enough trusted learning evidence.",
  };
}

export function buildPeerReference({ database, studentId, subjectId, plan = null }) {
  const referencePlan = plan || database.getPlan({ studentId, subjectId });
  const studentMomentum = buildLearningMomentum(scopedReportEvents({ database, studentId, subjectId }));
  if (!referencePlan || !targetGrade(referencePlan)) {
    return calibratingReference({ plan: referencePlan, subjectId, reason: "needs_learning_evidence", trend: studentMomentum });
  }

  const candidatePlans = database
    .listPlansBySubject({ subjectId })
    .filter((candidate) => belongsToCohort(candidate, referencePlan));
  const snapshots = candidatePlans
    .map((candidate) => participantSnapshot({ database, plan: candidate, subjectId }))
    .filter(Boolean);
  const current = snapshots.find((snapshot) => snapshot.studentId === studentId);

  if (!current) {
    return calibratingReference({ plan: referencePlan, subjectId, reason: "needs_learning_evidence", trend: studentMomentum });
  }
  if (snapshots.length < MINIMUM_COHORT_SIZE) {
    return calibratingReference({ plan: referencePlan, subjectId, reason: "cohort_too_small", trend: current.momentum });
  }

  const peerPercentile = percentile(current.score, snapshots);
  return {
    availability: "available",
    source: "anonymized_live_cohort_v1",
    groupDescription: cohortDescription(referencePlan, subjectId),
    label: labelForPercentile(peerPercentile),
    percentile: peerPercentile,
    studentCopy: "把它当作一个温和的参考，最重要的是看自己一步一步的变化。",
    observerCopy: "来自足够规模的匿名同目标学习记录，只用于判断节奏和支持方式，不显示排名或其他学生数据。",
    trend: current.momentum,
    guardrail: "Peer reference is aggregate-only and uses no peer identities, answers, or raw learning traces.",
  };
}
