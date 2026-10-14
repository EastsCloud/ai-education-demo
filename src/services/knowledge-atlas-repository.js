import { createLocalApiClient } from "./local-api-client.js?v=server-knowledge-atlas-1";

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

function keyFor({ studentId, subjectId }) {
  return `${studentId}|${subjectId}`;
}

export function createKnowledgeAtlasRepository({ apiClient = createLocalApiClient() } = {}) {
  const atlases = new Map();
  let remoteAtlasesEnabled = Boolean(apiClient.enabled);

  function find({ studentId, subjectId }) {
    return atlases.get(keyFor({ studentId, subjectId })) || null;
  }

  async function hydrate({ studentId, subjectId }) {
    if (!remoteAtlasesEnabled) return find({ studentId, subjectId });
    try {
      const response = await apiClient.getKnowledgeAtlas?.({ studentId, subjectId });
      if (!response?.atlas) return find({ studentId, subjectId });
      atlases.set(keyFor({ studentId, subjectId }), response.atlas);
      return response.atlas;
    } catch (error) {
      if (canDisableRemote(error)) remoteAtlasesEnabled = false;
      return find({ studentId, subjectId });
    }
  }

  return {
    find,
    hydrate,
    remoteAvailable: () => remoteAtlasesEnabled,
  };
}
