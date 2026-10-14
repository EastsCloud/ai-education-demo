import { createLocalApiClient } from "./local-api-client.js?v=knowledge-atlas-exploration-2";

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

export function createKnowledgeAtlasExplorationRepository({ apiClient = createLocalApiClient(), remoteEnabled = true } = {}) {
  let remoteExplorationEnabled = Boolean(remoteEnabled && apiClient.enabled);

  async function start({ studentId, subjectId, familyId }) {
    if (!remoteExplorationEnabled) return null;
    try {
      const response = await apiClient.createKnowledgeAtlasExploration?.({ studentId, subjectId, familyId });
      return response?.delivery ? response : null;
    } catch (error) {
      if (canDisableRemote(error)) remoteExplorationEnabled = false;
      return null;
    }
  }

  async function startWrongRetry({ studentId, subjectId, questionId }) {
    if (!remoteExplorationEnabled) return null;
    try {
      const response = await apiClient.createKnowledgeAtlasWrongRetry?.({ studentId, subjectId, questionId });
      return response?.delivery ? response : null;
    } catch (error) {
      if (canDisableRemote(error)) remoteExplorationEnabled = false;
      return null;
    }
  }

  return {
    remoteAvailable: () => remoteExplorationEnabled,
    start,
    startWrongRetry,
  };
}
