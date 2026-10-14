const TARGETS = [
  { targetGrade: "G1", label: "小学 1 年级数学", targetLevel: 0.38 },
  { targetGrade: "G2", label: "小学 2 年级数学", targetLevel: 0.48 },
  { targetGrade: "G3", label: "小学 3 年级数学", targetLevel: 0.58 },
  { targetGrade: "G4", label: "小学 4 年级数学", targetLevel: 0.68 },
  { targetGrade: "G5", label: "小学 5 年级数学", targetLevel: 0.78 },
  { targetGrade: "G6", label: "小学 6 年级数学", targetLevel: 0.88 },
];

const RHYTHM_OPTIONS = {
  durationWeeks: [6, 8, 12, 16, 24],
  dailyStudyMinutes: [15, 20, 30, 40, 50],
  weeklyStudyDays: [3, 4, 5, 6],
};

function allowedNumber(value, options, fallback) {
  const numeric = Number(value);
  return options.includes(numeric) ? numeric : fallback;
}

export function getMathLearningGoalOptions() {
  return {
    targets: TARGETS.map((target) => ({ ...target })),
    rhythm: Object.fromEntries(Object.entries(RHYTHM_OPTIONS).map(([key, values]) => [key, [...values]])),
  };
}

export function createMathLearningGoalDraft({ existingGoal = {}, values = {} } = {}) {
  const targetGrade = String(values.targetGrade || existingGoal.targetGrade || "G6").toUpperCase();
  const target = TARGETS.find((item) => item.targetGrade === targetGrade) || TARGETS.at(-1);
  const durationWeeks = allowedNumber(
    values.durationWeeks,
    RHYTHM_OPTIONS.durationWeeks,
    allowedNumber(existingGoal.durationWeeks, RHYTHM_OPTIONS.durationWeeks, 8),
  );
  const dailyStudyMinutes = allowedNumber(
    values.dailyStudyMinutes,
    RHYTHM_OPTIONS.dailyStudyMinutes,
    allowedNumber(existingGoal.dailyStudyMinutes, RHYTHM_OPTIONS.dailyStudyMinutes, 30),
  );
  const weeklyStudyDays = allowedNumber(
    values.weeklyStudyDays,
    RHYTHM_OPTIONS.weeklyStudyDays,
    allowedNumber(existingGoal.weeklyStudyDays, RHYTHM_OPTIONS.weeklyStudyDays, 5),
  );
  const totalPlannedMinutes = durationWeeks * weeklyStudyDays * dailyStudyMinutes;

  return {
    ...existingGoal,
    goalId: `goal-math-${target.targetGrade.toLowerCase()}-${durationWeeks}w-${dailyStudyMinutes}m-${weeklyStudyDays}d`,
    subjectId: existingGoal.subjectId || "math-linear-equations",
    title: `${durationWeeks} 周迈向${target.label}`,
    targetType: "grade_level_equivalent",
    targetGrade: target.targetGrade,
    targetLevelDefinitionId: `cn-shanghai-math-${target.targetGrade.toLowerCase()}-v1`,
    targetDescription: `达到${target.label}的数学学习目标`,
    targetLevel: target.targetLevel,
    durationWeeks,
    dailyStudyMinutes,
    weeklyStudyDays,
    totalPlannedMinutes,
    selectedBy: existingGoal.selectedBy || ["student", "parent"],
    priority: existingGoal.priority || "先建立稳定理解，再逐步提高变式迁移。",
  };
}
