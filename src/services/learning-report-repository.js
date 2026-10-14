import { createLocalApiClient } from "./local-api-client.js?v=server-report-1";

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

function keyFor({ studentId, subjectId }) {
  return `${studentId}|${subjectId}`;
}

export function createLearningReportRepository({ apiClient = createLocalApiClient() } = {}) {
  const reports = new Map();
  let remoteReportsEnabled = Boolean(apiClient.enabled);

  function find({ studentId, subjectId }) {
    return reports.get(keyFor({ studentId, subjectId })) || null;
  }

  async function hydrate({ studentId, subjectId }) {
    if (!remoteReportsEnabled) return find({ studentId, subjectId });
    try {
      const response = await apiClient.getLearningReport?.({ studentId, subjectId });
      if (!response?.report) return find({ studentId, subjectId });
      reports.set(keyFor({ studentId, subjectId }), response.report);
      return response.report;
    } catch (error) {
      if (canDisableRemote(error)) remoteReportsEnabled = false;
      return find({ studentId, subjectId });
    }
  }

  return {
    find,
    hydrate,
    remoteAvailable: () => remoteReportsEnabled,
  };
}
