import { createLocalApiClient } from "./local-api-client.js?v=learning-goal-draft-1";

const STORAGE_KEY = "ai-education-student-learning-goal-drafts-v1";

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
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function createStudentLearningGoalDraftRepository({
  storage = getBrowserStorage(),
  apiClient = createLocalApiClient(),
  allowLocalFallback = true,
} = {}) {
  let records = readRecords(storage);

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Browser storage is only an offline fallback for the local API record.
    }
  }

  function find({ studentId, subjectId }) {
    const record = records.find((item) => item.studentId === studentId && item.subjectId === subjectId) || null;
    if (!record) return null;
    if (canUseLocalFallback() || record.persistence === "server_authoritative") return record;
    return null;
  }

  function store(record, { source = "local" } = {}) {
    if (!record?.studentId || !record?.subjectId || !record?.learningGoal) return null;
    const storedRecord = {
      ...record,
      persistence: source === "server" ? "server_authoritative" : "browser_local_fallback",
    };
    records = [
      storedRecord,
      ...records.filter((item) => !(item.studentId === storedRecord.studentId && item.subjectId === storedRecord.subjectId)),
    ];
    persist();
    return storedRecord;
  }

  async function hydrate({ studentId, subjectId }) {
    try {
      const response = await apiClient.getStudentLearningGoalDraft?.({ studentId, subjectId });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return canUseLocalFallback() ? find({ studentId, subjectId }) : null;
  }

  async function saveByObserver({ studentId, subjectId, learningGoal, actorRole = "parent" }) {
    const existing = find({ studentId, subjectId });
    const updatedAt = new Date().toISOString();
    const record = {
      ...existing,
      id: existing?.id || `learning-goal-draft-${studentId}-${subjectId}`,
      studentId,
      subjectId,
      learningGoal,
      sourceRole: existing?.sourceRole || actorRole,
      lastUpdatedByRole: actorRole,
      confirmationStatus: "prefilled",
      updatedAt,
    };
    try {
      const response = await apiClient.saveStudentLearningGoalDraft?.({ studentId, subjectId, draft: record });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return canUseLocalFallback() ? store(record, { source: "local" }) : null;
  }

  async function confirmByStudent({ studentId, subjectId, learningGoal }) {
    const existing = find({ studentId, subjectId });
    const updatedAt = new Date().toISOString();
    const record = {
      ...existing,
      id: existing?.id || `learning-goal-draft-${studentId}-${subjectId}`,
      studentId,
      subjectId,
      learningGoal,
      sourceRole: existing?.sourceRole || "student",
      lastUpdatedByRole: "student",
      confirmationStatus: "student_confirmed",
      confirmedAt: updatedAt,
      updatedAt,
    };
    try {
      const response = await apiClient.confirmStudentLearningGoalDraft?.({ studentId, subjectId, draft: record });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return canUseLocalFallback() ? store(record, { source: "local" }) : null;
  }

  return { confirmByStudent, find, hydrate, saveByObserver, store };
}
