import { resolveApiBaseUrl as resolveBaseUrl } from "./api-base-url.js";

async function request(baseUrl, path, options = {}) {
  if (!baseUrl || typeof globalThis.fetch !== "function") return null;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const error = new Error(`local_api_${response.status}`);
    error.code = payload?.error || null;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function ignoreSyncFailure(action) {
  Promise.resolve(action()).catch(() => undefined);
}

function sendExitBehaviorBeacon(baseUrl, event) {
  if (!baseUrl || event?.eventType !== "app_session_ended") return false;
  const sendBeacon = globalThis.navigator?.sendBeacon;
  if (typeof sendBeacon !== "function" || typeof Blob !== "function") return false;
  try {
    return sendBeacon.call(
      globalThis.navigator,
      `${baseUrl}/behavior-events`,
      new Blob([JSON.stringify({ event })], { type: "application/json" }),
    );
  } catch {
    return false;
  }
}

function postBehaviorEvent(baseUrl, event, { keepalive = false } = {}) {
  return request(baseUrl, "/behavior-events", {
    method: "POST",
    body: JSON.stringify({ event }),
    keepalive,
  });
}

export function createLocalApiClient({ baseUrl } = {}) {
  const resolvedBaseUrl = resolveBaseUrl(baseUrl);

  return {
    enabled: Boolean(resolvedBaseUrl),
    getLinkedStudents() {
      return request(resolvedBaseUrl, "/linked-students");
    },
    revokeOwnStudentRelationship({ studentId }) {
      return request(resolvedBaseUrl, `/linked-students/${encodeURIComponent(studentId)}`, {
        method: "DELETE",
      });
    },
    createManagedStudent({ student }) {
      return request(resolvedBaseUrl, "/managed-students", {
        method: "POST",
        body: JSON.stringify({ student }),
      });
    },
    createStudentRelationshipInvite({ studentId, targetRole }) {
      return request(resolvedBaseUrl, "/student-relationship-invites", {
        method: "POST",
        body: JSON.stringify({ studentId, targetRole }),
      });
    },
    acceptStudentRelationshipInvite({ code }) {
      return request(resolvedBaseUrl, "/student-relationship-invites/accept", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },
    getStudentProfile({ studentId }) {
      return request(resolvedBaseUrl, `/student-profiles/${encodeURIComponent(studentId)}`);
    },
    getStudentOnboardingPrefill({ studentId }) {
      return request(resolvedBaseUrl, `/student-onboarding-prefills/${encodeURIComponent(studentId)}`);
    },
    saveStudentOnboardingPrefill({ studentId, prefill }) {
      return request(resolvedBaseUrl, `/student-onboarding-prefills/${encodeURIComponent(studentId)}`, {
        method: "PUT",
        body: JSON.stringify({ prefill }),
      });
    },
    confirmStudentOnboardingPrefill({ studentId }) {
      return request(resolvedBaseUrl, `/student-onboarding-prefills/${encodeURIComponent(studentId)}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    getStudentLearningGoalDraft({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/student-learning-goal-drafts/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
      );
    },
    getStudentOnboardingStatus({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/onboarding-status/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
      );
    },
    saveStudentLearningGoalDraft({ studentId, subjectId, draft }) {
      return request(
        resolvedBaseUrl,
        `/student-learning-goal-drafts/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
        { method: "PUT", body: JSON.stringify({ draft }) },
      );
    },
    confirmStudentLearningGoalDraft({ studentId, subjectId, draft }) {
      return request(
        resolvedBaseUrl,
        `/student-learning-goal-drafts/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}/confirm`,
        { method: "POST", body: JSON.stringify({ draft }) },
      );
    },
    confirmInitialLearningPlan({ planRequest }) {
      return request(resolvedBaseUrl, "/initial-learning-plans", {
        method: "POST",
        body: JSON.stringify({ request: planRequest }),
      });
    },
    confirmCurveAdjustment({ studentId, subjectId, parameters }) {
      return request(resolvedBaseUrl, "/curve-adjustments", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectId, parameters }),
      });
    },
    updateAssessmentCadence({ studentId, subjectId, suggestedAfterPracticeDays, mandatoryAfterPracticeDays }) {
      return request(resolvedBaseUrl, "/assessment-cadence", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectId, suggestedAfterPracticeDays, mandatoryAfterPracticeDays }),
      });
    },
    skipStageAssessment({ studentId, subjectId, practiceDate }) {
      return request(resolvedBaseUrl, "/stage-assessment-skips", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectId, practiceDate }),
      });
    },
    requestStageAssessment({ studentId, subjectId }) {
      return request(resolvedBaseUrl, "/stage-assessment-requests", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectId }),
      });
    },
    createInitialAssessmentRun({ runRequest }) {
      return request(resolvedBaseUrl, "/initial-assessment-runs", {
        method: "POST",
        body: JSON.stringify({ request: runRequest }),
      });
    },
    getInitialAssessmentRun({ sessionId }) {
      return request(resolvedBaseUrl, `/initial-assessment-runs/${encodeURIComponent(sessionId)}`);
    },
    submitInitialAssessmentResponse({ sessionId, studentId, questionId, answer, isUncertain = false, responseTimeMs }) {
      return request(resolvedBaseUrl, `/initial-assessment-runs/${encodeURIComponent(sessionId)}/responses`, {
        method: "POST",
        body: JSON.stringify({ studentId, questionId, answer, isUncertain: Boolean(isUncertain), responseTimeMs }),
      });
    },
    createPersonalityAssessmentRun({ runRequest }) {
      return request(resolvedBaseUrl, "/personality-assessment-runs", {
        method: "POST",
        body: JSON.stringify({ request: runRequest }),
      });
    },
    getPersonalityAssessmentRun({ sessionId }) {
      return request(resolvedBaseUrl, `/personality-assessment-runs/${encodeURIComponent(sessionId)}`);
    },
    getLatestPersonalityAssessmentRun({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/personality-assessment-runs/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
      );
    },
    submitPersonalityAssessmentResponse({ sessionId, studentId, questionId, answer, responseTimeMs }) {
      return request(resolvedBaseUrl, `/personality-assessment-runs/${encodeURIComponent(sessionId)}/responses`, {
        method: "POST",
        body: JSON.stringify({ studentId, questionId, answer, responseTimeMs }),
      });
    },
    createStageAssessmentRun({ runRequest }) {
      return request(resolvedBaseUrl, "/stage-assessment-runs", {
        method: "POST",
        body: JSON.stringify({ request: runRequest }),
      });
    },
    getStageAssessmentRun({ sessionId }) {
      return request(resolvedBaseUrl, `/stage-assessment-runs/${encodeURIComponent(sessionId)}`);
    },
    submitStageAssessmentResponse({ sessionId, studentId, questionId, answer, responseTimeMs }) {
      return request(resolvedBaseUrl, `/stage-assessment-runs/${encodeURIComponent(sessionId)}/responses`, {
        method: "POST",
        body: JSON.stringify({ studentId, questionId, answer, responseTimeMs }),
      });
    },
    createQuestionDelivery({ deliveryRequest }) {
      return request(resolvedBaseUrl, "/question-deliveries", {
        method: "POST",
        body: JSON.stringify({ request: deliveryRequest }),
      });
    },
    getQuestionDelivery({ deliveryId }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}`);
    },
    markQuestionDeliveryStarted({ deliveryId, studentId }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}/start`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
    },
    submitQuestionDeliveryAttempt({ deliveryId, studentId, answer, elapsedSeconds, answerRevisionCount = 0 }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}/attempts`, {
        method: "POST",
        body: JSON.stringify({ studentId, answer, elapsedSeconds, answerRevisionCount }),
      });
    },
    revealQuestionDeliveryHint({ deliveryId, studentId }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}/hints/next`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
    },
    revealQuestionDeliveryGuidedStep({ deliveryId, studentId }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}/guided-steps/next`, {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
    },
    submitQuestionDeliveryGuidedStepResponse({ deliveryId, studentId, level, response }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}/guided-steps/responses`, {
        method: "POST",
        body: JSON.stringify({ studentId, level, response }),
      });
    },
    getQuestionDeliveryGuidedProcess({ deliveryId }) {
      return request(resolvedBaseUrl, `/question-deliveries/${encodeURIComponent(deliveryId)}/guided-process`);
    },
    getAssessmentSession({ studentId, subjectId, assessmentType = "initial_onboarding" }) {
      return request(
        resolvedBaseUrl,
        `/assessment-sessions/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}?assessmentType=${encodeURIComponent(assessmentType)}`,
      );
    },
    getBehaviorEvents({ studentId, subjectId = null, limit = 2000 }) {
      const subjectQuery = subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : "";
      return request(resolvedBaseUrl, `/behavior-events/${encodeURIComponent(studentId)}?limit=${limit}${subjectQuery}`);
    },
    getLearningReport({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/learning-reports/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
      );
    },
    getQuestionTypeBenchmark({ studentId, subjectId, familyId }) {
      return request(
        resolvedBaseUrl,
        `/question-type-benchmarks/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}?familyId=${encodeURIComponent(familyId)}`,
      );
    },
    getKnowledgeAtlas({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/knowledge-atlases/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
      );
    },
    getKnowledgeGraph({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/knowledge-graphs/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`,
      );
    },
    createKnowledgeAtlasExploration({ studentId, subjectId, familyId }) {
      return request(resolvedBaseUrl, "/knowledge-atlas-explorations", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectId, familyId }),
      });
    },
    createKnowledgeAtlasWrongRetry({ studentId, subjectId, questionId }) {
      return request(resolvedBaseUrl, "/knowledge-atlas-reviews", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectId, questionId }),
      });
    },
    getPlan({ studentId, subjectId }) {
      return request(resolvedBaseUrl, `/student-plans/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}`);
    },
    getDailyPracticeSession({ studentId, subjectId, practiceDate }) {
      return request(
        resolvedBaseUrl,
        `/daily-practice-sessions/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}?practiceDate=${encodeURIComponent(practiceDate)}`,
      );
    },
    getDailyPracticeHistory({ studentId, subjectId, limit = 30 }) {
      return request(
        resolvedBaseUrl,
        `/daily-practice-history/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}?limit=${encodeURIComponent(limit)}`,
      );
    },
    getDailyPracticePlan({ studentId, subjectId, practiceDate }) {
      return request(
        resolvedBaseUrl,
        `/daily-practice-plans/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}?practiceDate=${encodeURIComponent(practiceDate)}`,
      );
    },
    getLatestDailyPracticePlan({ studentId, subjectId }) {
      return request(
        resolvedBaseUrl,
        `/daily-practice-plans/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}/latest`,
      );
    },
    resolveDailyPracticePlan({ planRequest }) {
      return request(resolvedBaseUrl, "/daily-practice-plans", {
        method: "POST",
        body: JSON.stringify({ request: planRequest }),
      });
    },
    getDailyPracticeRun({ studentId, subjectId, practiceDate }) {
      return request(
        resolvedBaseUrl,
        `/daily-practice-runs/${encodeURIComponent(studentId)}/${encodeURIComponent(subjectId)}?practiceDate=${encodeURIComponent(practiceDate)}`,
      );
    },
    getDailyPracticeRunSummary({ runId }) {
      return request(resolvedBaseUrl, `/daily-practice-runs/${encodeURIComponent(runId)}/summary`);
    },
    resolveDailyPracticeRun({ runRequest }) {
      return request(resolvedBaseUrl, "/daily-practice-runs", {
        method: "POST",
        body: JSON.stringify({ request: runRequest }),
      });
    },
    ensureDailyPracticeRunDelivery({ runId }) {
      return request(resolvedBaseUrl, `/daily-practice-runs/${encodeURIComponent(runId)}/deliveries`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    createOptionalDailyPractice({ runId, options }) {
      return request(resolvedBaseUrl, `/daily-practice-runs/${encodeURIComponent(runId)}/optional-practice`, {
        method: "POST",
        body: JSON.stringify(options || {}),
      });
    },
    ensureOptionalDailyPracticeDelivery({ runId }) {
      return request(resolvedBaseUrl, `/daily-practice-runs/${encodeURIComponent(runId)}/optional-practice/deliveries`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    getObserverWorkspace({ actorUserId, studentId }) {
      return request(
        resolvedBaseUrl,
        `/observer-workspaces/${encodeURIComponent(actorUserId)}/${encodeURIComponent(studentId)}`,
      );
    },
    saveObserverWorkspace({ record }) {
      return request(
        resolvedBaseUrl,
        `/observer-workspaces/${encodeURIComponent(record.actorUserId)}/${encodeURIComponent(record.studentId)}`,
        { method: "PUT", body: JSON.stringify({ record }) },
      );
    },
    getStudentMessages({ studentId, limit = 50 }) {
      return request(resolvedBaseUrl, `/student-messages/${encodeURIComponent(studentId)}?limit=${limit}`);
    },
    saveStudentMessage({ message }) {
      return request(resolvedBaseUrl, "/student-messages", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },
    getStudentPreferences({ studentId }) {
      return request(resolvedBaseUrl, `/student-preferences/${encodeURIComponent(studentId)}`);
    },
    saveStudentPreferences({ record }) {
      return request(resolvedBaseUrl, `/student-preferences/${encodeURIComponent(record.studentId)}`, {
        method: "PUT",
        body: JSON.stringify({ record }),
      });
    },
    mirrorAssessmentSession(session) {
      ignoreSyncFailure(() => request(resolvedBaseUrl, "/assessment-sessions", { method: "POST", body: JSON.stringify({ session }) }));
    },
    syncBehaviorEvent(event, { keepalive = false } = {}) {
      return postBehaviorEvent(resolvedBaseUrl, event, { keepalive });
    },
    mirrorBehaviorEvent(event) {
      // The final active-time snapshot is produced while a tab is closing.
      // Prefer a beacon so the server still receives it after the page unloads.
      if (sendExitBehaviorBeacon(resolvedBaseUrl, event)) return;
      ignoreSyncFailure(() =>
        postBehaviorEvent(resolvedBaseUrl, event, { keepalive: event?.eventType === "app_session_ended" }),
      );
    },
    mirrorPlan(record) {
      ignoreSyncFailure(() =>
        request(
          resolvedBaseUrl,
          `/student-plans/${encodeURIComponent(record.studentId)}/${encodeURIComponent(record.subjectId)}`,
          { method: "PUT", body: JSON.stringify({ record }) },
        ),
      );
    },
    savePlan(record) {
      return request(
        resolvedBaseUrl,
        `/student-plans/${encodeURIComponent(record.studentId)}/${encodeURIComponent(record.subjectId)}`,
        { method: "PUT", body: JSON.stringify({ record }) },
      );
    },
    mirrorDailyPracticeSession(session) {
      ignoreSyncFailure(() =>
        request(resolvedBaseUrl, "/daily-practice-sessions", { method: "POST", body: JSON.stringify({ session }) }),
      );
    },
    mirrorObserverWorkspace(record) {
      ignoreSyncFailure(() =>
        request(
          resolvedBaseUrl,
          `/observer-workspaces/${encodeURIComponent(record.actorUserId)}/${encodeURIComponent(record.studentId)}`,
          { method: "PUT", body: JSON.stringify({ record }) },
        ),
      );
    },
    mirrorStudentMessage(message) {
      ignoreSyncFailure(() =>
        request(resolvedBaseUrl, "/student-messages", { method: "POST", body: JSON.stringify({ message }) }),
      );
    },
    mirrorStudentPreferences(record) {
      ignoreSyncFailure(() =>
        request(
          resolvedBaseUrl,
          `/student-preferences/${encodeURIComponent(record.studentId)}`,
          { method: "PUT", body: JSON.stringify({ record }) },
        ),
      );
    },
  };
}
