const STORAGE_KEY = "ai-education-atlas-practice-resumes-v1";
const SUPPORTED_KINDS = new Set(["exploration", "wrong_retry"]);

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function normalizeRecord(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const deliveryId = String(value.deliveryId || "").trim();
  const kind = String(value.kind || "").trim();
  const familyId = String(value.familyId || "").trim() || null;
  if (!studentId || !subjectId || !deliveryId || !SUPPORTED_KINDS.has(kind)) return null;
  return {
    studentId,
    subjectId,
    deliveryId,
    familyId,
    kind,
    savedAt: String(value.savedAt || "").trim() || null,
  };
}

function readRecords(storage) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeRecord).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function createAtlasPracticeResumeRepository({ storage = getBrowserStorage() } = {}) {
  let records = readRecords(storage);

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The server-owned delivery remains the source of truth when browser storage is unavailable.
    }
  }

  function find({ studentId, subjectId }) {
    const normalizedStudentId = String(studentId || "").trim();
    const normalizedSubjectId = String(subjectId || "").trim();
    return (
      records.find(
        (record) => record.studentId === normalizedStudentId && record.subjectId === normalizedSubjectId,
      ) || null
    );
  }

  function save(record) {
    const normalized = normalizeRecord(record);
    if (!normalized) return null;
    const saved = {
      ...normalized,
      savedAt: new Date().toISOString(),
    };
    records = [
      saved,
      ...records.filter((item) => !(item.studentId === saved.studentId && item.subjectId === saved.subjectId)),
    ];
    persist();
    return saved;
  }

  function clear({ studentId, subjectId, deliveryId = null }) {
    const normalizedStudentId = String(studentId || "").trim();
    const normalizedSubjectId = String(subjectId || "").trim();
    const normalizedDeliveryId = deliveryId ? String(deliveryId).trim() : null;
    const previousCount = records.length;
    records = records.filter((record) => {
      if (record.studentId !== normalizedStudentId || record.subjectId !== normalizedSubjectId) return true;
      return normalizedDeliveryId ? record.deliveryId !== normalizedDeliveryId : false;
    });
    if (records.length !== previousCount) persist();
  }

  return { clear, find, save };
}
