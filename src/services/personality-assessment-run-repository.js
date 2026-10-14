import { createLocalApiClient } from "./local-api-client.js?v=personality-assessment-run-1";

export function createPersonalityAssessmentRunRepository({ apiClient = createLocalApiClient() } = {}) {
  let remoteRunsEnabled = Boolean(apiClient.enabled);

  async function start({ runRequest }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.createPersonalityAssessmentRun?.({ runRequest });
      return response?.session ? response : null;
    } catch {
      return null;
    }
  }

  async function hydrate({ studentId, subjectId }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.getLatestPersonalityAssessmentRun?.({ studentId, subjectId });
      return response?.session || null;
    } catch {
      return null;
    }
  }

  async function submitResponse({ sessionId, studentId, questionId, answer, responseTimeMs }) {
    if (!remoteRunsEnabled) return null;
    try {
      const response = await apiClient.submitPersonalityAssessmentResponse?.({
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

  return {
    hydrate,
    remoteAvailable: () => remoteRunsEnabled,
    start,
    submitResponse,
  };
}
