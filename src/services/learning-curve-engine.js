function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveCohortBaseline(statisticalBaseline = {}) {
  return {
    baselineId: statisticalBaseline.baselineId || "math-primary-default-v1",
    referenceWeeklyMinutes: Math.max(1, Number(statisticalBaseline.referenceWeeklyMinutes) || 150),
    referenceCycleWeeks: Math.max(1, Number(statisticalBaseline.referenceCycleWeeks) || 6),
    referenceLevelGain: clamp(Number(statisticalBaseline.referenceLevelGain) || 0.3, 0.05, 0.6),
    expectedWeeklyGrowth:
      Array.isArray(statisticalBaseline.expectedWeeklyGrowth) && statisticalBaseline.expectedWeeklyGrowth.length
        ? statisticalBaseline.expectedWeeklyGrowth.map((value) => Math.max(0.01, Number(value) || 0.01))
        : [1, 1, 1, 1, 1, 1],
  };
}

function createGrowthWeights({ weeks, expectedWeeklyGrowth }) {
  const patternLength = expectedWeeklyGrowth.length;
  const rawWeights = Array.from({ length: weeks }, (_, index) => {
    const cycle = Math.floor(index / patternLength);
    const withinCycle = expectedWeeklyGrowth[index % patternLength];
    return withinCycle * Math.pow(0.92, cycle);
  });
  const total = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  return rawWeights.map((value) => value / total);
}

function getFeasibility({ achievableLevel, requiredLevelGain, targetLevel, totalPlannedMinutes, weeklyMinutes }) {
  const shortfall = Math.max(0, targetLevel - achievableLevel);
  const status = shortfall <= 0.02 ? "feasible" : shortfall <= 0.08 ? "tight" : "needs_adjustment";
  const statusCopy = {
    feasible: "这个节奏可以支撑当前目标",
    tight: "这个目标可以尝试，但时间会比较紧",
    needs_adjustment: "当前时间更适合先稳住一段，再调整目标或节奏",
  };
  const requiredMinutes = Math.max(0, Math.ceil((requiredLevelGain / 0.3) * 900 - 0.000001));
  const recommendedWeeks = weeklyMinutes > 0 ? Math.max(1, Math.ceil(requiredMinutes / weeklyMinutes)) : null;

  return {
    status,
    statusCopy: statusCopy[status],
    shortfall,
    requiredMinutes,
    totalPlannedMinutes,
    recommendedWeeks,
    recommendation:
      status === "feasible"
        ? "按这个节奏开始，之后用阶段测试校准。"
        : `可优先把周期调整到约 ${recommendedWeeks} 周，或提高每周投入，再生成新的曲线。`,
  };
}

export function createStaticLearningCurve({
  abilityMap,
  learningGoal,
  statisticalBaseline = {},
  weeks = learningGoal.durationWeeks,
}) {
  const baseline = resolveCohortBaseline(statisticalBaseline);
  const durationWeeks = Math.max(1, Number(weeks) || baseline.referenceCycleWeeks);
  const startLevel = clamp(Number(abilityMap?.overallLevel) || 0.35, 0.05, 0.98);
  const targetLevel = clamp(Number(learningGoal?.targetLevel) || 0.88, 0.05, 1);
  const dailyStudyMinutes = Math.max(1, Number(learningGoal?.dailyStudyMinutes) || 30);
  const weeklyStudyDays = Math.max(1, Number(learningGoal?.weeklyStudyDays) || 5);
  const weeklyMinutes = dailyStudyMinutes * weeklyStudyDays;
  const totalPlannedMinutes = durationWeeks * weeklyMinutes;
  const expectedGainPerMinute = baseline.referenceLevelGain / (baseline.referenceCycleWeeks * baseline.referenceWeeklyMinutes);
  const requiredLevelGain = Math.max(0, targetLevel - startLevel);
  const achievableLevel = clamp(startLevel + totalPlannedMinutes * expectedGainPerMinute, startLevel, 1);
  const feasibility = getFeasibility({
    achievableLevel,
    requiredLevelGain,
    targetLevel,
    totalPlannedMinutes,
    weeklyMinutes,
  });
  const terminalLevel = feasibility.status === "feasible" ? targetLevel : Math.min(targetLevel, achievableLevel);
  const startProgress = targetLevel > 0 ? clamp(startLevel / targetLevel, 0, 1) : 0;
  const terminalProgress = targetLevel > 0 ? clamp(terminalLevel / targetLevel, 0, 1) : 1;
  const weights = createGrowthWeights({ weeks: durationWeeks, expectedWeeklyGrowth: baseline.expectedWeeklyGrowth });
  let accumulatedWeight = 0;
  const progressCurve = weights.map((weight, index) => {
    accumulatedWeight += weight;
    if (index === weights.length - 1) return terminalProgress;
    return clamp(startProgress + (terminalProgress - startProgress) * accumulatedWeight, 0, 1);
  });
  const gapCurve = progressCurve.map((progress) => Math.max(0, 1 - progress));

  return {
    id: `static-curve-${learningGoal.targetGrade || learningGoal.targetLevel}-${durationWeeks}w-${dailyStudyMinutes}m-${weeklyStudyDays}d`,
    curveType: "static",
    source: "ability_map_goal_rhythm_cohort_baseline",
    sourceInputs: {
      abilityMapId: abilityMap?.id || null,
      baselineId: baseline.baselineId,
      startLevel,
      targetLevel,
      targetLevelDefinitionId: learningGoal?.targetLevelDefinitionId || null,
      durationWeeks,
      dailyStudyMinutes,
      weeklyStudyDays,
      weeklyMinutes,
      totalPlannedMinutes,
      referenceWeeklyMinutes: baseline.referenceWeeklyMinutes,
      referenceLevelGain: baseline.referenceLevelGain,
    },
    startLevel,
    targetLevel,
    achievableLevel,
    requiredLevelGain,
    startProgress,
    targetProgress: 1,
    terminalProgress,
    weeklyLift: (terminalProgress - startProgress) / durationWeeks,
    progressCurve,
    gapCurve,
    feasibility,
    currentPoint: {
      week: 1,
      level: startLevel,
      progressTowardTarget: startProgress,
      remainingGap: Math.max(0, 1 - startProgress),
    },
    guardrail:
      "This is the first planning path from current evidence, agreed rhythm, and a cohort baseline. Only verified stage tests can update the dynamic curve.",
  };
}

function getAllocationForCurve(curve) {
  const direction = curve.updateEvidence?.direction;
  if (direction === "ahead") {
    return {
      wrongRetry: 0.2,
      correctCheck: 0.2,
      currentFocus: 0.4,
      lightChallenge: 0.2,
    };
  }
  if (direction === "behind") {
    return {
      wrongRetry: 0.4,
      correctCheck: 0.25,
      currentFocus: 0.25,
      lightChallenge: 0.1,
    };
  }
  return {
    wrongRetry: 0.3,
    correctCheck: 0.2,
    currentFocus: 0.35,
    lightChallenge: 0.15,
  };
}

export function createTodayTaskFromLearningCurve({ curve, date, focus = "数学关系与问题解决" }) {
  const currentProgress = curve.currentPoint.progressTowardTarget;
  const remainingGap = curve.currentPoint.remainingGap;
  const intensity = curve.sourceInputs.dailyStudyMinutes >= 30 ? "standard" : "light";
  const isDynamic = curve.curveType === "dynamic" && curve.canUpdate;

  return {
    id: `daily-task-${date}-${isDynamic ? "dynamic" : "static"}`,
    date,
    generatedFromCurveId: curve.id,
    focus,
    estimatedMinutes: curve.sourceInputs.dailyStudyMinutes,
    intensity,
    rationale: [
      `当前目标达成约 ${Math.round(currentProgress * 100)}%`,
      `剩余差距约 ${Math.round(remainingGap * 100)}%`,
      isDynamic ? "今日任务由最近一次正式测试校准后的动态曲线派发" : "今日任务从静态曲线和能力图分解而来",
    ],
    studentVisibleAction: "开始做题",
    internalAllocation: getAllocationForCurve(curve),
    curveType: isDynamic ? "dynamic" : "static",
    guardrail: isDynamic
      ? "This task is derived from verified stage-test evidence. Daily responses can only refine the next question queue."
      : "This task is derived from the confirmed static learning curve.",
  };
}

export const createTodayTaskFromStaticCurve = createTodayTaskFromLearningCurve;
