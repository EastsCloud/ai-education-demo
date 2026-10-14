import { createLocalApiClient } from "./local-api-client.js?v=initial-assessment-run-2";

export function createInitialAssessmentRunRepository({ apiClient = createLocalApiClient(), allowLocalFallback = true } = {}) {
  let remoteRunsEnabled = Boolean(apiClient.enabled);

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  async function start({ runRequest }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.createInitialAssessmentRun?.({ runRequest });
      return response?.session ? response : null;
    } catch {
      // Only the intentional offline prototype can continue with a local assessment.
      if (canUseLocalFallback()) remoteRunsEnabled = false;
      return null;
    }
  }

  async function submitResponse({ sessionId, studentId, questionId, answer, isUncertain = false, responseTimeMs }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.submitInitialAssessmentResponse?.({
        sessionId,
        studentId,
        questionId,
        answer,
        isUncertain,
        responseTimeMs,
      });
      return response?.session ? response : null;
    } catch {
      return null;
    }
  }

  function remoteAvailable() {
    return remoteRunsEnabled;
  }

  return { remoteAvailable, start, submitResponse };
}
