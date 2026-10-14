const ALLOWED_ASSESSMENT_TYPES = new Set(["stage_test", "dynamic_calibration_test", "targeted_retest"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDirection(delta) {
  if (delta > 0.02) return "ahead";
  if (delta < -0.02) return "behind";
  return "on_track";
}

function createForwardCurve({ start, target, weeks }) {
  return Array.from({ length: weeks }, (_, index) => {
    if (index === 0) return start;
    const normalized = index / Math.max(1, weeks - 1);
    const ease = 1 - Math.pow(1 - normalized, 1.18);
    return clamp(start + (target - start) * ease, 0.05, 1.15);
  });
}

function createForwardCurveWithCompletion({ start, target, weeks, completionWeeks }) {
  if (!Number.isFinite(completionWeeks) || completionWeeks <= 0 || completionWeeks >= weeks) {
    return createForwardCurve({ start, target, weeks });
  }

  return [
    ...createForwardCurve({ start, target, weeks: completionWeeks }),
    ...Array.from({ length: weeks - completionWeeks }, () => target),
  ];
}

function getRemainingDurationWeeks(curve) {
  const values = curve?.dynamicProgressCurve || curve?.progressCurve || [];
  const currentWeek = Math.max(1, Math.floor(Number(curve?.currentPoint?.week) || 1));
  return Math.max(1, Number(curve?.remainingDurationWeeks) || values.length - currentWeek + 1 || 1);
}

function getExpectedTerminalProgress(curve, start, originalTargetProgress) {
  const values = curve?.dynamicProgressCurve || curve?.progressCurve || [];
  const lastProgress = values.at(-1);
  return clamp(
    Number(curve?.projectedTerminalProgress ?? curve?.expectedTerminalProgress ?? lastProgress ?? originalTargetProgress),
    start,
    1.15,
  );
}

function getExpectedCompletionWeeks({ start, target, weeklyGain }) {
  if (start >= target) return 0;
  if (weeklyGain <= 0) return null;
  return Math.max(1, Math.ceil((target - start) / weeklyGain));
}

export function createDynamicLearningCurve({ staticCurve, stageResult }) {
  const isAllowedEvidence =
    stageResult?.eligibleForCurveUpdate && ALLOWED_ASSESSMENT_TYPES.has(stageResult.assessmentType);

  if (!isAllowedEvidence) {
    return {
      canUpdate: false,
      source: "no_curve_update",
      progressCurve: staticCurve.progressCurve,
      targetProgress: staticCurve.targetProgress,
      dynamicProgressCurve: staticCurve.progressCurve,
      currentPoint: staticCurve.currentPoint,
      guardrail: "Daily practice and incomplete or supported tests cannot update the dynamic learning curve.",
    };
  }

  const totalWeeks = staticCurve.progressCurve.length;
  const anchorIndex = clamp(Number(stageResult.plannedWeek || 1) - 1, 0, totalWeeks - 1);
  const plannedProgress = staticCurve.progressCurve[anchorIndex];
  const observedProgress = clamp(stageResult.masteryScore, 0.05, 1.15);
  const delta = observedProgress - plannedProgress;
  const direction = getDirection(delta);
  const defaultAdjustmentMode = "keep_study_intensity";
  const terminalProgress = clamp(staticCurve.targetProgress + delta * 0.65, 0.55, 1.15);
  const remainingPlannedGain = Math.max(0.0001, staticCurve.targetProgress - plannedProgress);

  const dynamicProgressCurve = staticCurve.progressCurve.map((plannedValue, index) => {
    if (index < anchorIndex) return plannedValue;
    if (index === anchorIndex) return observedProgress;
    const normalizedRemainingGain = clamp((plannedValue - plannedProgress) / remainingPlannedGain, 0, 1);
    return clamp(observedProgress + (terminalProgress - observedProgress) * normalizedRemainingGain, 0.05, 1.15);
  });
  const gapCurve = dynamicProgressCurve.map((progress) => Math.max(0, staticCurve.targetProgress - progress));
  const remainingDurationWeeks = Math.max(1, totalWeeks - anchorIndex);
  const weeklyGain = Math.max(0, (terminalProgress - observedProgress) / remainingDurationWeeks);
  const expectedCompletionWeeks = getExpectedCompletionWeeks({
    start: observedProgress,
    target: staticCurve.targetProgress,
    weeklyGain,
  });

  return {
    id: `dynamic-curve-${stageResult.id}`,
    curveType: "dynamic",
    source: "verified_stage_assessment",
    sourceStaticCurveId: staticCurve.id,
    sourceAssessmentResultId: stageResult.id,
    canUpdate: true,
    defaultAdjustmentMode,
    progressCurve: staticCurve.progressCurve,
    targetProgress: staticCurve.targetProgress,
    originalTargetProgress: staticCurve.targetProgress,
    expectedTerminalProgress: terminalProgress,
    remainingDurationWeeks,
    sourceInputs: staticCurve.sourceInputs,
    dynamicProgressCurve,
    gapCurve,
    currentPoint: {
      week: anchorIndex + 1,
      progressTowardTarget: observedProgress,
      remainingGap: Math.max(0, staticCurve.targetProgress - observedProgress),
    },
    expectedCompletionWeeks,
    updateEvidence: {
      assessmentType: stageResult.assessmentType,
      masteryScore: stageResult.masteryScore,
      accuracy: stageResult.accuracy,
      controlledVariantAccuracy: stageResult.controlledVariantAccuracy,
      controlledVariantItemCount: stageResult.controlledVariantItemCount,
      transferAccuracy: stageResult.transferAccuracy,
      transferItemCount: stageResult.transferItemCount,
      plannedProgress,
      delta,
      direction,
    },
    options: [
      {
        id: "keep_study_intensity",
        isDefault: true,
        effect: "保持学习强度，按新的终点自然推进。",
      },
      {
        id: "keep_original_goal",
        isDefault: false,
        effect: "保持原目标，重新计算更短的预计达成时间。",
      },
      {
        id: "raise_target_level",
        isDefault: false,
        effect: "保持原计划时长，把多出的能力空间用于更高阶段目标。",
      },
    ],
    guardrail:
      "This dynamic curve is based on verified stage-test evidence. Daily practice can change tomorrow's questions but cannot modify this curve.",
  };
}

export function createAdjustedDynamicCurve({ baseCurve, learningGoal, parameters, actorRole, actorUserId }) {
  if (!baseCurve?.canUpdate || baseCurve.curveType !== "dynamic") {
    throw new Error("curve_adjustment_requires_verified_dynamic_curve");
  }

  const durationWeeks = Math.max(1, Number(parameters?.durationWeeks) || 1);
  const dailyStudyMinutes = Math.max(1, Number(parameters?.dailyStudyMinutes) || 1);
  const weeklyStudyDays = Math.max(1, Number(parameters?.weeklyStudyDays) || 1);
  const testIntervalPracticeDays = Math.max(1, Number(parameters?.testIntervalPracticeDays) || 1);
  const requestedMode = parameters?.curveAdjustmentMode || "keep_study_intensity";
  const curveAdjustmentMode = ["keep_study_intensity", "keep_original_goal", "raise_target_level"].includes(requestedMode)
    ? requestedMode
    : "keep_study_intensity";
  const start = clamp(baseCurve.currentPoint?.progressTowardTarget || 0.05, 0.05, 1.15);
  const sourceInputs = baseCurve.sourceInputs || {};
  const previousCapacity = Math.max(1, Number(sourceInputs.dailyStudyMinutes || 30) * Number(sourceInputs.weeklyStudyDays || 5));
  const nextCapacity = dailyStudyMinutes * weeklyStudyDays;
  const capacityRatio = nextCapacity / previousCapacity;
  const originalTargetProgress = clamp(Number(baseCurve.originalTargetProgress ?? baseCurve.targetProgress ?? 1), 0.05, 1.15);
  const baseExpectedTerminalProgress = getExpectedTerminalProgress(baseCurve, start, originalTargetProgress);
  const baselineRemainingWeeks = getRemainingDurationWeeks(baseCurve);
  const weeklyGain = Math.max(0, (baseExpectedTerminalProgress - start) / baselineRemainingWeeks) * capacityRatio;
  const naturalTerminalProgress = clamp(start + weeklyGain * durationWeeks, 0.05, 1.15);
  const expectedCompletionWeeks = getExpectedCompletionWeeks({
    start,
    target: originalTargetProgress,
    weeklyGain,
  });
  const curveGoalProgress =
    curveAdjustmentMode === "keep_original_goal"
      ? originalTargetProgress
      : curveAdjustmentMode === "raise_target_level"
        ? clamp(Math.max(naturalTerminalProgress, originalTargetProgress + 0.05), 0.05, 1.15)
        : naturalTerminalProgress;
  const expectedTerminalProgress =
    curveAdjustmentMode === "keep_original_goal"
      ? Math.min(originalTargetProgress, naturalTerminalProgress)
      : curveGoalProgress;
  const dynamicProgressCurve =
    curveAdjustmentMode === "keep_original_goal" &&
    expectedCompletionWeeks !== null &&
    expectedCompletionWeeks < durationWeeks
      ? createForwardCurveWithCompletion({
          start,
          target: originalTargetProgress,
          weeks: durationWeeks,
          completionWeeks: expectedCompletionWeeks,
        })
      : createForwardCurve({ start, target: expectedTerminalProgress, weeks: durationWeeks });
  const adjustmentId = `dynamic-adjustment-${baseCurve.id}-${curveAdjustmentMode}-${durationWeeks}w-${dailyStudyMinutes}m-${weeklyStudyDays}d`;

  return {
    ...baseCurve,
    id: adjustmentId,
    source: "verified_stage_assessment_with_confirmed_schedule_adjustment",
    sourceDynamicCurveId: baseCurve.id,
    sourceInputs: {
      ...sourceInputs,
      targetLevel: learningGoal?.targetLevel || sourceInputs.targetLevel || null,
      durationWeeks,
      dailyStudyMinutes,
      weeklyStudyDays,
      testIntervalPracticeDays,
    },
    targetProgress: originalTargetProgress,
    originalTargetProgress,
    expectedTerminalProgress,
    projectedTerminalProgress: naturalTerminalProgress,
    curveGoalProgress,
    remainingDurationWeeks: durationWeeks,
    expectedCompletionWeeks,
    dynamicProgressCurve,
    gapCurve: dynamicProgressCurve.map((progress) => Math.max(0, curveGoalProgress - progress)),
    currentPoint: {
      week: 1,
      progressTowardTarget: start,
      remainingGap: Math.max(0, curveGoalProgress - start),
    },
    adjustment: {
      actorRole,
      actorUserId,
      parameters: {
        durationWeeks,
        dailyStudyMinutes,
        weeklyStudyDays,
        testIntervalPracticeDays,
        curveAdjustmentMode,
      },
      capacityRatio,
      expectedCompletionWeeks,
      expectedTerminalProgress,
      originalTargetProgress,
      adjustedAt: new Date().toISOString(),
      appliesFrom: "next_learning_day",
    },
    guardrail:
      "This adjusted dynamic curve is based on verified formal-test evidence and a confirmed schedule change. It applies from the next learning day; daily practice still cannot modify it.",
  };
}
