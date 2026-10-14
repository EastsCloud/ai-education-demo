export function createLearningParameterRuntime(parameterConfig) {
  let selectedRole = "parent";
  let values = { ...parameterConfig.defaults };
  const history = [];
  const confirmedProposals = [];

  function setRole(role) {
    selectedRole = role;
    return getSnapshot();
  }

  function updateParameter(key, value) {
    const numericValue = Number(value);
    const nextValue = Number.isNaN(numericValue) ? value : numericValue;
    values = {
      ...values,
      [key]: nextValue,
    };
    history.push({
      actorRole: selectedRole,
      key,
      value: nextValue,
      createdAt: new Date().toISOString(),
    });
    return getSnapshot();
  }

  function createCurveProposal({ currentCurve, learningGoal }) {
    const baseProgress = currentCurve?.currentPoint?.progressTowardTarget || learningGoal.currentBaseline || 0.5;
    const weeklyCapacity = (values.dailyStudyMinutes * values.weeklyStudyDays) / 150;
    const expectedLift = Math.min(0.42, values.durationWeeks * 0.045 * weeklyCapacity);
    const expectedTerminalLevel =
      values.curveAdjustmentMode === "keep_original_goal"
        ? learningGoal.targetLevel
        : Math.min(0.98, baseProgress + expectedLift);

    return {
      proposalId: `curve-proposal-${values.durationWeeks}w-${values.dailyStudyMinutes}m-${values.weeklyStudyDays}d`,
      actorRole: selectedRole,
      parameters: { ...values },
      expectedTerminalLevel,
      expectedWeeksToOriginalGoal:
        expectedTerminalLevel >= learningGoal.targetLevel
          ? Math.max(1, Math.ceil(values.durationWeeks * (learningGoal.targetLevel - baseProgress) / (expectedTerminalLevel - baseProgress || 1)))
          : values.durationWeeks,
      modeExplanation:
        values.curveAdjustmentMode === "keep_original_goal"
          ? "保持原目标，系统估计达到时间。"
          : values.curveAdjustmentMode === "raise_target_level"
            ? "保持时间，主动提高目标水平。"
            : "保持学习强度，终点水平自然变化。",
    };
  }

  function confirmCurveProposal({ currentCurve, learningGoal }) {
    if (!parameterConfig.editableByRoles.includes(selectedRole)) return getSnapshot();

    const proposal = createCurveProposal({ currentCurve, learningGoal });
    const confirmation = {
      confirmationId: `curve-confirmation-${confirmedProposals.length + 1}`,
      ...proposal,
      baseCurveId: currentCurve?.id || null,
      action: "curve_proposal_confirmed",
      confirmedAt: new Date().toISOString(),
    };

    confirmedProposals.push(confirmation);
    history.push({
      actorRole: selectedRole,
      action: "curve_proposal_confirmed",
      proposalId: proposal.proposalId,
      createdAt: confirmation.confirmedAt,
    });
    return getSnapshot();
  }

  function getSnapshot() {
    return {
      selectedRole,
      values,
      options: parameterConfig.options,
      editable: parameterConfig.editableByRoles.includes(selectedRole),
      guardrails: parameterConfig.guardrails,
      history,
      confirmedProposals,
      latestConfirmedProposal: confirmedProposals.at(-1) || null,
    };
  }

  return {
    createCurveProposal,
    confirmCurveProposal,
    getSnapshot,
    setRole,
    updateParameter,
  };
}
