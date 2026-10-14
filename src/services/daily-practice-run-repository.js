import { createLocalApiClient } from "./local-api-client.js?v=optional-practice-run-3";

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

function isMandatoryStageAssessmentGate(error) {
  return error?.code === "mandatory_stage_assessment_required" && error?.payload?.assessmentCadence?.status === "mandatory";
}

function keyFor({ studentId, subjectId, practiceDate }) {
  return `${studentId}|${subjectId}|${practiceDate}`;
}

export function createDailyPracticeRunRepository({
  apiClient = createLocalApiClient(),
  allowLocalFallback = true,
  remoteEnabled = true,
} = {}) {
  const runs = new Map();
  const summaries = new Map();
  let remoteRunsEnabled = Boolean(remoteEnabled && apiClient.enabled);
  let blockingState = null;

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  function remember(run) {
    if (!run?.studentId || !run?.subjectId || !run?.practiceDate) return null;
    runs.set(keyFor(run), run);
    return run;
  }

  function find({ studentId, subjectId, practiceDate }) {
    return runs.get(keyFor({ studentId, subjectId, practiceDate })) || null;
  }

  async function resolve({ runRequest }) {
    if (!remoteRunsEnabled) return find(runRequest);
    try {
      const response = await apiClient.resolveDailyPracticeRun?.({ runRequest });
      const run = response?.run ? remember(response.run) : find(runRequest);
      if (run) blockingState = null;
      return run;
    } catch (error) {
      if (isMandatoryStageAssessmentGate(error)) {
        blockingState = error.payload;
        return null;
      }
      if (canUseLocalFallback() && canDisableRemote(error)) remoteRunsEnabled = false;
      return find(runRequest);
    }
  }

  async function get({ studentId, subjectId, practiceDate }) {
    if (!remoteRunsEnabled) return find({ studentId, subjectId, practiceDate });
    try {
      const response = await apiClient.getDailyPracticeRun?.({ studentId, subjectId, practiceDate });
      return response?.run ? remember(response.run) : find({ studentId, subjectId, practiceDate });
    } catch (error) {
      if (canUseLocalFallback() && canDisableRemote(error)) remoteRunsEnabled = false;
      return find({ studentId, subjectId, practiceDate });
    }
  }

  async function getSummary({ runId }) {
    if (!remoteRunsEnabled || !runId) return summaries.get(runId) || null;
    try {
      const response = await apiClient.getDailyPracticeRunSummary?.({ runId });
      const summary = response?.summary || summaries.get(runId) || null;
      if (summary?.practiceRunId === runId) summaries.set(runId, summary);
      return summary;
    } catch (error) {
      if (canUseLocalFallback() && canDisableRemote(error)) remoteRunsEnabled = false;
      return summaries.get(runId) || null;
    }
  }

  async function ensureDelivery({ runId }) {
    if (!remoteRunsEnabled || !runId) return null;
    try {
      const response = await apiClient.ensureDailyPracticeRunDelivery?.({ runId });
      if (response?.run) remember(response.run);
      return response?.delivery && response?.run ? response : null;
    } catch (error) {
      if (canUseLocalFallback() && canDisableRemote(error)) remoteRunsEnabled = false;
      return null;
    }
  }

  async function startOptionalPractice({ runId, mode, count, source }) {
    if (!remoteRunsEnabled || !runId) return null;
    try {
      const response = await apiClient.createOptionalDailyPractice?.({
        runId,
        options: { mode, count, source },
      });
      return response?.run ? remember(response.run) : null;
    } catch (error) {
      if (canUseLocalFallback() && canDisableRemote(error)) remoteRunsEnabled = false;
      return null;
    }
  }

  async function ensureOptionalDelivery({ runId }) {
    if (!remoteRunsEnabled || !runId) return null;
    try {
      const response = await apiClient.ensureOptionalDailyPracticeDelivery?.({ runId });
      if (response?.run) remember(response.run);
      return response?.delivery && response?.run ? response : null;
    } catch (error) {
      if (canUseLocalFallback() && canDisableRemote(error)) remoteRunsEnabled = false;
      return null;
    }
  }

  return {
    clearBlockingState: () => {
      blockingState = null;
    },
    ensureDelivery,
    ensureOptionalDelivery,
    find,
    get,
    getSummary,
    getBlockingState: () => blockingState,
    remember,
    remoteAvailable: () => remoteRunsEnabled,
    resolve,
    startOptionalPractice,
  };
}
