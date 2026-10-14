import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const MINIMUM_PRACTICE_ANSWERS = 8;
const MINIMUM_WINDOW_ANSWERS = 4;
const MINIMUM_VERIFIED_STAGE_TESTS = 2;
const MEANINGFUL_DELTA = 0.15;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 2) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null;
}

function toTimestamp(value, fallback = 0) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function trustedAnswers(events = []) {
  return events
    .map((event, index) => ({ event, index }))
    .filter(
      ({ event }) =>
        event?.eventType === "answer_submitted" &&
        typeof event?.payload?.isCorrect === "boolean" &&
        event.payload?.scoringSource === "server_authoritative",
    )
    .sort(
      (left, right) =>
        toTimestamp(left.event?.timestamp, left.index) - toTimestamp(right.event?.timestamp, right.index) ||
        left.index - right.index,
    )
    .map(({ event }) => event);
}

function windowMetrics(events = [], isIndependentAnswer = () => false) {
  const answerCount = events.length;
  const correctCount = events.filter((event) => Boolean(event.payload?.isCorrect)).length;
  const independentCorrectCount = events.filter(
    (event) => Boolean(event.payload?.isCorrect) && isIndependentAnswer(event),
  ).length;
  const hintUsedCount = events.filter((event) => !isIndependentAnswer(event)).length;

  return {
    answerCount,
    correctRate: answerCount ? round(correctCount / answerCount) : null,
    // Keep overall correctness and independent completion separate. A correct
    // answer stays correct; this only describes how much support was used.
    independentCompletionRate: answerCount ? round(independentCorrectCount / answerCount) : null,
    hintUseRate: answerCount ? round(hintUsedCount / answerCount) : null,
  };
}

function practiceDirection({ earlier, recent }) {
  const independentDelta = round(recent.independentCompletionRate - earlier.independentCompletionRate);
  const accuracyDelta = round(recent.correctRate - earlier.correctRate);

  if (independentDelta >= MEANINGFUL_DELTA) return "growing_independence";
  if (accuracyDelta >= MEANINGFUL_DELTA) return "growing_accuracy";
  if (independentDelta <= -MEANINGFUL_DELTA && accuracyDelta <= -MEANINGFUL_DELTA) return "adapting";
  return "steady";
}

function practiceCopy(direction) {
  if (direction === "growing_independence") {
    return {
      student: "最近你更常能先自己找到第一步了。",
      observer: "近期独立完成比例提高。继续保留学生先说关系、再决定是否打开提示的入口。",
    };
  }
  if (direction === "growing_accuracy") {
    return {
      student: "最近的练习更顺了，继续按自己的节奏来。",
      observer: "近期正确表现提高，但仍应把独立完成和提示后的完成分开观察。",
    };
  }
  if (direction === "adapting") {
    return {
      student: "最近题目可能在变化，先把自己的方法走稳。",
      observer: "近期作答有波动。先看当前题型、提示路径和练习节奏，不据此调整正式目标。",
    };
  }
  return {
    student: "最近的练习节奏很稳定，一步一步继续就好。",
    observer: "近期表现保持稳定，可以继续收集变式中的独立完成证据。",
  };
}

function collectingPracticeTrend(answerCount) {
  return {
    availability: "collecting",
    direction: "collecting",
    trustedAnswerCount: answerCount,
    checkpoints: [],
    studentCopy: "再多完成几次练习，这里会慢慢连成你的变化轨迹。",
    observerCopy: "可信作答还不够形成练习趋势，暂不对短期波动下结论。",
  };
}

function buildPracticeTrend({ answerEvents = [], behaviorEvents = [] } = {}) {
  const events = trustedAnswers(answerEvents);
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents.length ? behaviorEvents : events);
  if (events.length < MINIMUM_PRACTICE_ANSWERS) return collectingPracticeTrend(events.length);

  const windowSize = Math.max(
    MINIMUM_WINDOW_ANSWERS,
    Math.min(8, Math.floor(events.length / 2)),
  );
  const recentEvents = events.slice(-windowSize);
  const earlierEvents = events.slice(-(windowSize * 2), -windowSize);
  if (earlierEvents.length < MINIMUM_WINDOW_ANSWERS || recentEvents.length < MINIMUM_WINDOW_ANSWERS) {
    return collectingPracticeTrend(events.length);
  }

  const earlier = { id: "earlier", label: "前一段", ...windowMetrics(earlierEvents, isIndependentAnswer) };
  const recent = { id: "recent", label: "最近", ...windowMetrics(recentEvents, isIndependentAnswer) };
  const direction = practiceDirection({ earlier, recent });
  const copy = practiceCopy(direction);

  return {
    availability: "observed",
    direction,
    trustedAnswerCount: events.length,
    comparedAnswerCount: earlier.answerCount + recent.answerCount,
    checkpoints: [earlier, recent],
    studentCopy: copy.student,
    observerCopy: copy.observer,
  };
}

function verifiedStageTests(results = []) {
  return (Array.isArray(results) ? results : [])
    .filter((result) => result?.status === "completed_verified" || Boolean(result?.eligibleForCurveUpdate))
    .map((result, index) => ({ result, index }))
    .sort(
      (left, right) =>
        toTimestamp(left.result?.completedAt || left.result?.createdAt, left.index) -
          toTimestamp(right.result?.completedAt || right.result?.createdAt, right.index) ||
        left.index - right.index,
    )
    .map(({ result }) => result);
}

function formalMeasure(result = {}) {
  const mastery = Number(result.masteryScore);
  if (Number.isFinite(mastery)) return clamp(mastery);
  const accuracy = Number(result.accuracy);
  return Number.isFinite(accuracy) ? clamp(accuracy) : null;
}

function buildFormalTrend(stageAssessmentHistory = []) {
  const tests = verifiedStageTests(stageAssessmentHistory);
  if (tests.length < MINIMUM_VERIFIED_STAGE_TESTS) {
    return {
      availability: "collecting",
      verifiedTestCount: tests.length,
      direction: "collecting",
      studentCopy: "每次正式测试都会帮助确认新的位置。",
      observerCopy: "需要至少两次已验证正式测试，才形成测试变化趋势。",
    };
  }

  const earlier = tests.at(-2);
  const recent = tests.at(-1);
  const earlierMeasure = formalMeasure(earlier);
  const recentMeasure = formalMeasure(recent);
  const delta =
    earlierMeasure !== null && recentMeasure !== null ? round(recentMeasure - earlierMeasure) : null;
  const direction =
    delta === null ? "steady" : delta >= MEANINGFUL_DELTA ? "upward" : delta <= -MEANINGFUL_DELTA ? "regrouping" : "steady";
  const copy =
    direction === "upward"
      ? {
          student: "正式测试也确认了新的进步。",
          observer: "最近两次已验证正式测试显示目标相关证据增加；曲线仍仅以已保存的测试校准结果为准。",
        }
      : direction === "regrouping"
        ? {
            student: "正式测试帮我们找到下一段要走稳的地方。",
            observer: "最近正式测试的目标相关证据有波动。先稳定基础与节奏，再观察下一次正式测试。",
          }
        : {
            student: "正式测试正在帮你把进步慢慢确认下来。",
            observer: "最近两次已验证正式测试保持接近，继续收集范围和迁移证据。",
          };

  return {
    availability: "observed",
    verifiedTestCount: tests.length,
    direction,
    delta,
    checkpoints: [
      { id: "earlier_formal", measure: earlierMeasure },
      { id: "recent_formal", measure: recentMeasure },
    ],
    studentCopy: copy.student,
    observerCopy: copy.observer,
  };
}

// This is a report-only trend summary. It deliberately separates daily
// practice behavior from verified formal-test evidence so neither can silently
// stand in for the other.
export function buildLearningProgressTrend({ answerEvents = [], behaviorEvents = [], stageAssessmentHistory = [] } = {}) {
  const practice = buildPracticeTrend({ answerEvents, behaviorEvents });
  const formal = buildFormalTrend(stageAssessmentHistory);
  const availability = practice.availability === "observed" || formal.availability === "observed" ? "observed" : "collecting";
  const primary = formal.availability === "observed" ? formal : practice;

  return {
    version: "learning_progress_trend_v1",
    source: "trusted_practice_and_verified_formal_evidence",
    availability,
    primarySignal: formal.availability === "observed" ? "verified_formal_test" : "practice_behavior",
    practice,
    formal,
    studentCopy: primary.studentCopy,
    observerCopy: primary.observerCopy,
    guardrail:
      "Practice trend compares bounded windows of server-scored answers; formal trend uses verified tests only. It does not relabel answers, infer a level, rank a student, or update a dynamic learning curve.",
  };
}
