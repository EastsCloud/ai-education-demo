function dateKey(value) {
  const normalized = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function completedPracticeDates(sessions) {
  return [...new Set(
    sessions
      .filter((session) => session?.sessionStatus === "required_completed")
      .map((session) => dateKey(session.practiceDate))
      .filter(Boolean),
  )].sort();
}

function latestVerifiedPracticeDate(stageAssessmentHistory, config) {
  const configuredDate = dateKey(config?.lastVerifiedPracticeDate);
  if (configuredDate) return configuredDate;

  const records = [...(stageAssessmentHistory || [])].reverse();
  const latest = records.find((record) => record?.status === "completed_verified");
  return dateKey(latest?.completedThroughPracticeDate);
}

function normalizedSettings(config = {}) {
  const suggested = Math.max(1, Number(config.suggestedAfterPracticeDays) || 3);
  const mandatory = Math.max(suggested, Number(config.mandatoryAfterPracticeDays) || 10);
  return {
    suggestedAfterPracticeDays: suggested,
    mandatoryAfterPracticeDays: mandatory,
  };
}

function hasActiveObserverRequest(config = {}) {
  const requestedAt = Date.parse(config?.observerRequestedAt || "");
  const acknowledgedAt = Date.parse(config?.observerRequestAcknowledgedAt || "");
  if (!Number.isFinite(requestedAt)) return false;
  return !Number.isFinite(acknowledgedAt) || acknowledgedAt < requestedAt;
}

export function createAssessmentCadence({ sessions = [], stageAssessmentHistory = [], config = {}, today = null } = {}) {
  const settings = normalizedSettings(config);
  const lastVerifiedPracticeDate = latestVerifiedPracticeDate(stageAssessmentHistory, config);
  const completedDates = completedPracticeDates(sessions);
  const practiceDatesSinceVerifiedTest = completedDates.filter(
    (date) => !lastVerifiedPracticeDate || date > lastVerifiedPracticeDate,
  );
  const practiceDaysSinceVerifiedTest = practiceDatesSinceVerifiedTest.length;
  const skippedAtPracticeCount = Number(config.lastSkippedAtPracticeCount || 0);
  const hasSkippedCurrentSuggestion =
    skippedAtPracticeCount > 0 && practiceDaysSinceVerifiedTest <= skippedAtPracticeCount;
  const isMandatory = practiceDaysSinceVerifiedTest >= settings.mandatoryAfterPracticeDays;
  const observerRequestActive = hasActiveObserverRequest(config);
  const suggestedByCadence =
    !isMandatory &&
    practiceDaysSinceVerifiedTest >= settings.suggestedAfterPracticeDays &&
    !hasSkippedCurrentSuggestion;
  const isSuggested = !isMandatory && (observerRequestActive || suggestedByCadence);
  const status = isMandatory ? "mandatory" : isSuggested ? "suggested" : hasSkippedCurrentSuggestion ? "skipped" : "waiting";
  const suggestionSource = isMandatory
    ? "mandatory_cadence"
    : observerRequestActive
      ? "observer_request"
      : suggestedByCadence
        ? "cadence"
        : null;

  return {
    source: "assessment_cadence_policy_v1",
    status,
    today: dateKey(today),
    suggestedAfterPracticeDays: settings.suggestedAfterPracticeDays,
    mandatoryAfterPracticeDays: settings.mandatoryAfterPracticeDays,
    practiceDaysSinceVerifiedTest,
    lastVerifiedPracticeDate,
    latestCompletedPracticeDate: practiceDatesSinceVerifiedTest.at(-1) || null,
    remainingPracticeDaysToSuggestion: Math.max(0, settings.suggestedAfterPracticeDays - practiceDaysSinceVerifiedTest),
    remainingPracticeDaysToMandatory: Math.max(0, settings.mandatoryAfterPracticeDays - practiceDaysSinceVerifiedTest),
    canStart: isSuggested || isMandatory,
    canSkip: isSuggested,
    observerRequestActive,
    suggestionSource,
    guardrail:
      "Daily practice can trigger a test invitation but never changes the curve itself. Only a completed verified stage test may update the dynamic curve.",
  };
}
