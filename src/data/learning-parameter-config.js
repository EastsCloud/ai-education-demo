export const learningParameterConfig = {
  configId: "learning-parameter-default-math",
  editableByRoles: ["student", "parent", "teacher"],
  defaults: {
    durationWeeks: 6,
    dailyStudyMinutes: 30,
    weeklyStudyDays: 5,
    testIntervalPracticeDays: 3,
    curveAdjustmentMode: "keep_study_intensity",
  },
  options: {
    durationWeeks: [4, 6, 8, 12],
    dailyStudyMinutes: [15, 20, 30, 45],
    weeklyStudyDays: [3, 4, 5, 6],
    testIntervalPracticeDays: [3, 5, 7, 10],
    curveAdjustmentMode: ["keep_study_intensity", "keep_original_goal", "raise_target_level"],
  },
  guardrails: [
    "Changing parameters creates a new curve proposal, not an invisible change to the confirmed curve.",
    "Daily practice behavior does not update the dynamic curve. Stage tests do.",
    "If no one changes parameters after stronger test performance, default mode keeps study intensity and naturally raises expected terminal level.",
  ],
};

// Parent and teacher controls use a separate policy so a suggested check-in can
// stay gentle while the system still has a clear, bounded point for a formal test.
export const assessmentCadenceConfig = {
  defaults: {
    suggestedAfterPracticeDays: 3,
    mandatoryAfterPracticeDays: 10,
    minimumPracticeDaysBetweenSuggestionAndRequired: 2,
  },
  options: {
    suggestedAfterPracticeDays: [3, 5, 7, 10],
    mandatoryAfterPracticeDays: [5, 7, 10, 14],
  },
};
