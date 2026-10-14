import { createLocalApiClient } from "./local-api-client.js?v=knowledge-graph-1";

function canDisableRemote(error) {
  return /local_api_(401|403|404)/.test(String(error?.message || ""));
}

function keyFor({ studentId, subjectId }) {
  return `${studentId}|${subjectId}`;
}

export function createKnowledgeGraphRepository({ apiClient = createLocalApiClient() } = {}) {
  const graphs = new Map();
  let remoteGraphsEnabled = Boolean(apiClient.enabled);

  function find({ studentId, subjectId }) {
    return graphs.get(keyFor({ studentId, subjectId })) || null;
  }

  async function hydrate({ studentId, subjectId }) {
    if (!remoteGraphsEnabled) return find({ studentId, subjectId });
    try {
      const response = await apiClient.getKnowledgeGraph?.({ studentId, subjectId });
      const graph = response?.graph || response?.knowledgeGraph || null;
      if (!graph) return find({ studentId, subjectId });
      graphs.set(keyFor({ studentId, subjectId }), graph);
      return graph;
    } catch (error) {
      if (canDisableRemote(error)) remoteGraphsEnabled = false;
      return find({ studentId, subjectId });
    }
  }

  return {
    find,
    hydrate,
    remoteAvailable: () => remoteGraphsEnabled,
  };
}
