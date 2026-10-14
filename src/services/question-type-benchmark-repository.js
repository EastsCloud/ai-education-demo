import { createLocalApiClient } from "./local-api-client.js?v=peer-question-benchmark-1";

function keyFor({ studentId, subjectId, familyId }) {
  return `${studentId}|${subjectId}|${familyId}`;
}

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

export function createQuestionTypeBenchmarkRepository({ apiClient = createLocalApiClient() } = {}) {
  const records = new Map();
  const prototypeFallback = !apiClient.enabled;
  let remoteEnabled = Boolean(apiClient.enabled);

  async function hydrate({ studentId, subjectId, familyId }) {
    const key = keyFor({ studentId, subjectId, familyId });
    if (!remoteEnabled || !familyId) return records.get(key) || null;
    try {
      const response = await apiClient.getQuestionTypeBenchmark?.({ studentId, subjectId, familyId });
      if (!response?.benchmark) return records.get(key) || null;
      records.set(key, response.benchmark);
      return response.benchmark;
    } catch (error) {
      if (canDisableRemote(error)) remoteEnabled = false;
      return records.get(key) || null;
    }
  }

  return {
    hydrate,
    usesPrototypeFallback: () => prototypeFallback,
    remoteAvailable: () => remoteEnabled,
  };
}
