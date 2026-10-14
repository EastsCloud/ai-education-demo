import { createLocalApiClient } from "./local-api-client.js?v=onboarding-prefill-1";

const STORAGE_KEY = "ai-education-student-onboarding-prefills-v1";

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
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeSubjectIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((subjectId) => subjectId === "math"))];
}

function sameSubjectIds(left, right) {
  return JSON.stringify(normalizeSubjectIds(left)) === JSON.stringify(normalizeSubjectIds(right));
}

function resolveLocalSubjectSelection({ existing, prefill, now, confirmedByStudent = false }) {
  const subjectIds = normalizeSubjectIds(prefill?.subjectIds);
  const mathSelected = subjectIds.includes("math");
  const selectionUnchanged = sameSubjectIds(existing?.subjectIds, subjectIds);
  const confirmsMath = confirmedByStudent && prefill?.confirmSubjectSelection === true && mathSelected;
  const subjectSelectionConfirmedAt = mathSelected
    ? confirmsMath
      ? now
      : selectionUnchanged
        ? existing?.subjectSelectionConfirmedAt || null
        : null
    : null;

  return {
    subjectIds,
    ...(subjectSelectionConfirmedAt ? { subjectSelectionConfirmedAt } : {}),
  };
}

export function createStudentOnboardingPrefillRepository({
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
      // The local record remains in memory when browser storage is unavailable.
    }
  }

  function find(studentId) {
    const record = records.find((item) => item.studentId === studentId) || null;
    if (!record) return null;
    if (canUseLocalFallback() || record.persistence === "server_authoritative") return record;
    return null;
  }

  function store(record, { source = "local" } = {}) {
    if (!record?.studentId) return null;
    const storedRecord = {
      ...record,
      persistence: source === "server" ? "server_authoritative" : "browser_local_fallback",
    };
    records = [storedRecord, ...records.filter((item) => item.studentId !== storedRecord.studentId)];
    persist();
    return storedRecord;
  }

  async function hydrate({ studentId }) {
    try {
      const response = await apiClient.getStudentOnboardingPrefill?.({ studentId });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return canUseLocalFallback() ? find(studentId) : null;
  }

  async function saveByObserver({ studentId, prefill }) {
    const now = new Date().toISOString();
    const existing = find(studentId);
    const { confirmSubjectSelection, subjectSelectionConfirmedAt, subjectSelectionConfirmedByUserId, ...safePrefill } = prefill || {};
    const record = {
      ...safePrefill,
      studentId,
      ...resolveLocalSubjectSelection({ existing, prefill, now }),
      confirmationStatus: "prefilled",
      updatedAt: now,
    };
    try {
      const response = await apiClient.saveStudentOnboardingPrefill?.({ studentId, prefill: record });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return canUseLocalFallback() ? store(record, { source: "local" }) : null;
  }

  async function saveByStudent({ studentId, prefill }) {
    const now = new Date().toISOString();
    const existing = find(studentId);
    const { confirmSubjectSelection, subjectSelectionConfirmedAt, subjectSelectionConfirmedByUserId, ...safePrefill } = prefill || {};
    const record = {
      ...safePrefill,
      studentId,
      ...resolveLocalSubjectSelection({ existing, prefill, now, confirmedByStudent: true }),
      confirmationStatus: "student_confirmed",
      confirmedAt: now,
      updatedAt: now,
    };
    try {
      const response = await apiClient.saveStudentOnboardingPrefill?.({
        studentId,
        prefill: {
          ...record,
          ...(prefill?.confirmSubjectSelection === true ? { confirmSubjectSelection: true } : {}),
        },
      });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return canUseLocalFallback() ? store(record, { source: "local" }) : null;
  }

  async function confirmByStudent({ studentId }) {
    const localRecord = find(studentId);
    const now = new Date().toISOString();
    const optimistic = localRecord
      ? {
          ...localRecord,
          confirmationStatus: "student_confirmed",
          confirmedAt: now,
          updatedAt: now,
        }
      : null;
    try {
      const response = await apiClient.confirmStudentOnboardingPrefill?.({ studentId });
      if (response?.record) return store(response.record, { source: "server" });
    } catch {
      // The caller decides whether this is an offline prototype or an authenticated runtime.
    }
    return optimistic && canUseLocalFallback() ? store(optimistic, { source: "local" }) : null;
  }

  return { confirmByStudent, find, hydrate, saveByObserver, saveByStudent };
}
