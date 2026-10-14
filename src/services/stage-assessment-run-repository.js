import { createLocalApiClient } from "./local-api-client.js?v=stage-assessment-run-1";

export function createStageAssessmentRunRepository({ apiClient = createLocalApiClient(), allowLocalFallback = true } = {}) {
  let remoteRunsEnabled = Boolean(apiClient.enabled);

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  async function start({ runRequest }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.createStageAssessmentRun?.({ runRequest });
      return response?.session ? response : null;
    } catch {
      // Only the intentional offline prototype can continue through the local runtime.
      if (canUseLocalFallback()) remoteRunsEnabled = false;
      return null;
    }
  }

  async function submitResponse({ sessionId, studentId, questionId, answer, responseTimeMs }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.submitStageAssessmentResponse?.({
        sessionId,
        studentId,
        questionId,
        answer,
        responseTimeMs,
      });
      return response?.session ? response : null;
    } catch {
      return null;
    }
  }

  return { remoteAvailable: () => remoteRunsEnabled, start, submitResponse };
}
