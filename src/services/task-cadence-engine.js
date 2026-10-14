const WEEKDAY_SETS = {
  3: new Set([1, 3, 5]),
  4: new Set([1, 2, 4, 5]),
  5: new Set([1, 2, 3, 4, 5]),
  6: new Set([1, 2, 3, 4, 5, 6]),
  7: new Set([0, 1, 2, 3, 4, 5, 6]),
};

function toDate(value) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("invalid_task_cadence_date");
  return date;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function scheduledWeekdays(weeklyStudyDays) {
  return WEEKDAY_SETS[Math.max(3, Math.min(7, Number(weeklyStudyDays) || 5))] || WEEKDAY_SETS[5];
}

function completeTaskDates(sessions) {
  return new Set(
    sessions
      .filter((session) => session?.sessionStatus === "required_completed" && session.practiceDate)
      .map((session) => String(session.practiceDate).slice(0, 10)),
  );
}

function recoveredTaskDates(sessions) {
  return new Set(
    sessions
      .filter(
        (session) =>
          session?.sessionStatus === "required_completed" &&
          session.recoveredTaskDate &&
          session.practiceDate,
      )
      .map((session) => String(session.recoveredTaskDate).slice(0, 10)),
  );
}

function isScheduled(date, weekdays) {
  return weekdays.has(date.getDay());
}

export function createTaskCadence({
  today,
  sessions = [],
  weeklyStudyDays = 5,
  focus,
  estimatedMinutes = 30,
  planStartedAt = today,
}) {
  const todayDate = toDate(today);
  const weekdays = scheduledWeekdays(weeklyStudyDays);
  const completedDates = completeTaskDates(sessions);
  const recoveredDates = recoveredTaskDates(sessions);
  const historyStart = shiftDays(todayDate, -13);
  const trackingStart = toDate(planStartedAt);
  const effectiveHistoryStart = trackingStart > historyStart ? trackingStart : historyStart;
  const scheduledPastDates = [];

  for (let date = new Date(effectiveHistoryStart); date < todayDate; date = shiftDays(date, 1)) {
    if (isScheduled(date, weekdays)) scheduledPastDates.push(dateKey(date));
  }

  const missedDates = scheduledPastDates.filter((date) => !completedDates.has(date) && !recoveredDates.has(date));
  const missedLastSevenDays = missedDates.filter((date) => toDate(date) >= shiftDays(todayDate, -7));
  const recentMissedDate = missedDates.at(-1) || null;
  const observerReminder =
    missedDates.length >= 3
      ? {
          level: "rhythm_review",
          title: "一起重新看学习节奏",
          body: "近两周有多次未完成任务。先调整可完成的时长或频率，不用一次补回所有内容。",
        }
      : missedLastSevenDays.length >= 2
        ? {
            level: "gentle_check_in",
            title: "可以一起问问节奏是否合适",
            body: "最近出现连续未完成。建议先了解时间安排，再决定是否调整学习强度。",
          }
        : null;
  const makeUpTask = missedDates.length === 1 && recentMissedDate
    ? {
        date: recentMissedDate,
        focus,
        estimatedMinutes,
        studentMessage: "上一组练习还在等你。今天只补这一组，不会叠加新的任务。",
      }
    : null;
  const calendar = [];

  for (let offset = -6; offset <= 3; offset += 1) {
    const date = shiftDays(todayDate, offset);
    const key = dateKey(date);
    const scheduled = isScheduled(date, weekdays);
    const isToday = offset === 0;
    let status = scheduled ? "upcoming" : "rest";
    if (completedDates.has(key) || recoveredDates.has(key)) status = "completed";
    else if (offset < 0 && scheduled && date >= trackingStart) status = "missed";
    else if (isToday && makeUpTask) status = "make_up";
    else if (isToday && scheduled) status = "today";
    calendar.push({ date: key, status, scheduled, isToday });
  }

  return {
    source: "task_cadence_policy_v1",
    today: dateKey(todayDate),
    planStartedAt: dateKey(trackingStart),
    weeklyStudyDays: Number(weeklyStudyDays) || 5,
    makeUpTask,
    missedTaskCount: missedDates.length,
    missedLastSevenDays: missedLastSevenDays.length,
    observerReminder,
    calendar,
    guardrail:
      "One missed task becomes one make-up task. Repeated misses never stack into a backlog; they trigger a gentle adult rhythm check-in instead.",
  };
}
