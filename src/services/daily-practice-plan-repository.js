import { createLocalApiClient } from "./local-api-client.js?v=daily-server-plan-1";

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

function isMandatoryStageAssessmentGate(error) {
  return error?.code === "mandatory_stage_assessment_required" && error?.payload?.assessmentCadence?.status === "mandatory";
}

export function createDailyPracticePlanRepository({
  apiClient = createLocalApiClient(),
  allowLocalFallback = true,
  remoteEnabled = true,
} = {}) {
  let remotePlansEnabled = Boolean(remoteEnabled && apiClient.enabled);
  let blockingState = null;

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  async function resolve({ planRequest }) {
    if (!remotePlansEnabled) return null;
    try {
      const response = await apiClient.resolveDailyPracticePlan?.({ planRequest });
      const plan = response?.plan ? response.plan : null;
      if (plan) blockingState = null;
      return plan;
    } catch (error) {
      if (isMandatoryStageAssessmentGate(error)) {
        blockingState = error.payload;
        return null;
      }
      if (canUseLocalFallback() && canDisableRemote(error)) remotePlansEnabled = false;
      return null;
    }
  }

  async function get({ studentId, subjectId, practiceDate }) {
    if (!remotePlansEnabled) return null;
    try {
      const response = await apiClient.getDailyPracticePlan?.({ studentId, subjectId, practiceDate });
      return response?.plan ? response.plan : null;
    } catch (error) {
      if (canUseLocalFallback() && canDisableRemote(error)) remotePlansEnabled = false;
      return null;
    }
  }

  return {
    clearBlockingState: () => {
      blockingState = null;
    },
    getBlockingState: () => blockingState,
    get,
    remoteAvailable: () => remotePlansEnabled,
    resolve,
  };
}
