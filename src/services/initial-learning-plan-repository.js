import { createLocalApiClient } from "./local-api-client.js?v=initial-learning-plan-1";

export function createInitialLearningPlanRepository({ apiClient = createLocalApiClient(), remoteEnabled = true } = {}) {
  let remotePlansEnabled = Boolean(remoteEnabled && apiClient.enabled);

  async function confirm({ planRequest }) {
    if (!remotePlansEnabled) return null;
    try {
      const response = await apiClient.confirmInitialLearningPlan?.({ planRequest });
      return response?.record ? response : null;
    } catch {
      return null;
    }
  }

  return {
    confirm,
    remoteAvailable: () => remotePlansEnabled,
  };
}
