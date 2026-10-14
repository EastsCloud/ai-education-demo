import { createLocalApiClient } from "./local-api-client.js?v=observer-authoritative-1";

const STORAGE_KEY = "ai-education-observer-workspaces-v1";
const MODULE_CATALOG_VERSION = 3;

const ROLE_DEFAULTS = {
  parent: {
    enabledModules: ["progress", "behavior_summary", "ability_trend", "formal_test_evidence", "peer_trend", "curve_options", "messages"],
    displayName: "家长观察页",
  },
  teacher: {
    enabledModules: ["progress", "behavior_summary", "ability_trend", "formal_test_evidence", "peer_trend", "question_tag_evidence", "curve_options"],
    displayName: "老师观察页",
  },
};

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readRecords(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function createDefaultWorkspace({ actorUserId, studentId, role }) {
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.parent;
  const now = new Date().toISOString();
  return {
    id: `observer-workspace-${actorUserId}-${studentId}`,
    actorUserId,
    studentId,
    role,
    displayName: defaults.displayName,
    enabledModules: [...defaults.enabledModules],
    moduleCatalogVersion: MODULE_CATALOG_VERSION,
    updatedAt: now,
    createdAt: now,
  };
}

function normalizeWorkspaceModules(record, role) {
  if (!record) return record;
  const resolvedRole = record.role || role || "parent";
  const currentVersion = Math.max(1, Number(record.moduleCatalogVersion) || 1);
  const enabledModules = new Set(Array.isArray(record.enabledModules) ? record.enabledModules : []);

  // This module did not exist in older saved workspaces. Add it once so the
  // formal-test evidence is visible by default, while preserving later opt-out.
  if (currentVersion < MODULE_CATALOG_VERSION && ["parent", "teacher"].includes(resolvedRole)) {
    if (currentVersion < 2) enabledModules.add("formal_test_evidence");
    if (currentVersion < 3 && resolvedRole === "teacher") enabledModules.add("peer_trend");
  }

  return {
    ...record,
    role: resolvedRole,
    enabledModules: [...enabledModules],
    moduleCatalogVersion: MODULE_CATALOG_VERSION,
  };
}

function requiresModuleCatalogUpgrade(record, normalized) {
  if (!record || !normalized) return false;
  if (Number(record.moduleCatalogVersion) !== Number(normalized.moduleCatalogVersion)) return true;
  if (record.role !== normalized.role) return true;
  const original = Array.isArray(record.enabledModules) ? record.enabledModules : [];
  return original.length !== normalized.enabledModules.length || original.some((moduleId) => !normalized.enabledModules.includes(moduleId));
}

export function createObserverWorkspaceRepository({ storage = getBrowserStorage(), apiClient = createLocalApiClient() } = {}) {
  let records = readRecords(storage);

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Browser storage is a prototype cache. The local API mirrors durable data when available.
    }
  }

  function find({ actorUserId, studentId }) {
    return records.find((record) => record.actorUserId === actorUserId && record.studentId === studentId) || null;
  }

  function save(record, { mirror = true } = {}) {
    const saved = { ...normalizeWorkspaceModules(record, record?.role), updatedAt: new Date().toISOString() };
    records = [saved, ...records.filter((item) => item.id !== saved.id)];
    persist();
    if (mirror) apiClient.mirrorObserverWorkspace?.(saved);
    return saved;
  }

  function replace(record) {
    return save(record, { mirror: false });
  }

  function getOrCreate({ actorUserId, studentId, role, mirror = true }) {
    const existing = find({ actorUserId, studentId });
    if (!existing) return save(createDefaultWorkspace({ actorUserId, studentId, role }), { mirror });
    const normalized = normalizeWorkspaceModules(existing, role);
    return requiresModuleCatalogUpgrade(existing, normalized) ? save(normalized, { mirror }) : existing;
  }

  function toggleModule({ actorUserId, studentId, role, moduleId, mirror = true }) {
    const workspace = getOrCreate({ actorUserId, studentId, role, mirror });
    const enabled = new Set(workspace.enabledModules);
    if (enabled.has(moduleId)) enabled.delete(moduleId);
    else enabled.add(moduleId);
    return save({ ...workspace, enabledModules: Array.from(enabled) }, { mirror });
  }

  async function hydrate({ actorUserId, studentId, role }) {
    try {
      const response = await apiClient.getObserverWorkspace?.({ actorUserId, studentId });
      if (!response?.record) {
        const localWorkspace = find({ actorUserId, studentId }) || createDefaultWorkspace({ actorUserId, studentId, role });
        if (!find({ actorUserId, studentId })) {
          records = [localWorkspace, ...records];
          persist();
        }
        apiClient.mirrorObserverWorkspace?.(localWorkspace);
        return localWorkspace;
      }
      const record = normalizeWorkspaceModules(response.record, role);
      records = [record, ...records.filter((item) => item.id !== record.id)];
      persist();
      if (requiresModuleCatalogUpgrade(response.record, record)) {
        apiClient.mirrorObserverWorkspace?.(record);
      }
      return record;
    } catch {
      return getOrCreate({ actorUserId, studentId, role });
    }
  }

  return { getOrCreate, hydrate, replace, toggleModule };
}

export const observerModuleCatalog = [
  ["progress", "学习进度"],
  ["behavior_summary", "学习行为"],
  ["ability_trend", "能力趋势"],
  ["formal_test_evidence", "正式测试"],
  ["peer_trend", "同类参照"],
  ["question_tag_evidence", "题型证据"],
  ["curve_options", "学习参数"],
  ["messages", "给学生留言"],
];
