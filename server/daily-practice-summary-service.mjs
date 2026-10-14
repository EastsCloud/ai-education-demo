import { summarizeWrongRetryAvailability } from "./wrong-retry-eligibility-service.mjs";

function isTrustedRunAnswer(event, run) {
  const payload = event?.payload || {};
  return Boolean(
    event?.eventType === "answer_submitted" &&
      payload.scoringSource === "server_authoritative" &&
      (payload.practiceRunId === run.id || event?.sessionId === run.id),
  );
}

function stageLabel(payload = {}) {
  if (typeof payload.stageLabel === "string" && payload.stageLabel.trim()) return payload.stageLabel;
  const labels = {
    original: "原题",
    change_one_number: "换一个数字",
    change_two_numbers: "换两个数字",
    context_change: "换一种表达",
    relationship_reframe: "换一种关系表达",
    question_order_variant: "换一种提问顺序",
    step_added_variant: "多一个整理步骤",
    two_steps_added_variant: "多两个整理步骤",
    reverse_question: "换一个未知量",
    multi_step_extension: "多一个实际步骤",
  };
  return labels[payload.variantLevel] || "今日练习";
}

function publicAnswerItem(event) {
  const payload = event?.payload || {};
  return {
    id: event.eventId || null,
    completedAt: event.timestamp || null,
    questionId: event.targetId || payload.deliveryId || null,
    prompt: payload.questionPrompt || "已完成的一道题。",
    stageLabel: stageLabel(payload),
    isCorrect: payload.isCorrect === true,
    hintsOpened: Math.max(0, Number(payload.hintsOpened || 0)),
    guidedStepsOpened: Math.max(0, Number(payload.guidedStepsOpened || 0)),
  };
}

// The completed-practice surface is derived from the trusted server event stream,
// rather than from a browser session snapshot. It intentionally returns neither
// answers nor private item-generation data.
export function buildDailyPracticeSummary({ database, run }) {
  if (!database || !run?.id || !run.studentId || !run.subjectId) return null;
  const items = database
    .listBehaviorEvents({ studentId: run.studentId, subjectId: run.subjectId, limit: 2000 })
    .filter((event) => isTrustedRunAnswer(event, run))
    .slice()
    .sort((left, right) => String(left.timestamp || "").localeCompare(String(right.timestamp || "")))
    .map(publicAnswerItem);
  const correctCount = items.filter((item) => item.isCorrect).length;
  const wrongRetry = summarizeWrongRetryAvailability({ database, run });

  return {
    schemaVersion: "server_daily_practice_summary_v1",
    source: "server_scored_daily_practice_evidence",
    practiceRunId: run.id,
    practiceDate: run.practiceDate,
    requiredPracticeCompleted: Boolean(run.requiredPracticeCompleted),
    total: items.length,
    correctCount,
    wrongCount: items.length - correctCount,
    wrongRetry,
    items,
    guardrail:
      "This summary contains only server-scored results from the current daily run. It never returns a raw answer, answer key, seed, or private generation record.",
  };
}
