import { createLocalApiClient } from "./local-api-client.js?v=student-preferences-3";

const STORAGE_KEY = "ai-education-student-preferences-v1";

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

export function createStudentPreferenceRepository({ storage = getBrowserStorage(), apiClient = createLocalApiClient() } = {}) {
  let records = readRecords(storage);

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // A local API mirror is used whenever the browser runtime is available.
    }
  }

  function find(studentId) {
    return records.find((record) => record.studentId === studentId) || null;
  }

  function save(record, { mirror = true } = {}) {
    const saved = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    records = [saved, ...records.filter((item) => item.studentId !== saved.studentId)];
    persist();
    if (mirror) apiClient.mirrorStudentPreferences?.(saved);
    return saved;
  }

  function replace(record) {
    return save(record, { mirror: false });
  }

  async function saveConfirmed(record) {
    if (!apiClient?.enabled || typeof apiClient.saveStudentPreferences !== "function") {
      return save(record, { mirror: false });
    }
    const response = await apiClient.saveStudentPreferences({ record });
    if (!response?.record) throw new Error("student_preferences_save_unconfirmed");
    return replace(response.record);
  }

  async function hydrate({ studentId, defaults }) {
    try {
      const response = await apiClient.getStudentPreferences?.({ studentId });
      if (response?.record) {
        records = [response.record, ...records.filter((item) => item.studentId !== studentId)];
        persist();
        return response.record;
      }
      const localRecord = find(studentId);
      if (localRecord) {
        apiClient.mirrorStudentPreferences?.(localRecord);
        return localRecord;
      }
    } catch {
      // Continue with the local preference record when the local API is unavailable.
    }
    return find(studentId) || save({ ...defaults, studentId });
  }

  return { find, hydrate, replace, save, saveConfirmed };
}
