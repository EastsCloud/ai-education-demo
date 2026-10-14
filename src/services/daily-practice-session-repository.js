import { createLocalApiClient } from "./local-api-client.js?v=system-runtime-35";

const STORAGE_KEY = "ai-education-daily-practice-sessions-v1";

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readSessions(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createDailyPracticeSessionRepository({
  storage = getBrowserStorage(),
  apiClient = createLocalApiClient(),
  allowLocalFallback = true,
  allowRemoteMirror = true,
  remoteEnabled = true,
} = {}) {
  let sessions = readSessions(storage);
  const canUseRemote = Boolean(remoteEnabled && apiClient.enabled !== false);

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // The active practice session stays in memory if storage is not available.
    }
  }

  function find({ studentId, subjectId, practiceDate }) {
    return (
      sessions.find(
        (session) =>
          session.studentId === studentId && session.subjectId === subjectId && session.practiceDate === practiceDate,
      ) || null
    );
  }

  function listByStudent({ studentId, subjectId }) {
    return sessions
      .filter((session) => session.studentId === studentId && session.subjectId === subjectId)
      .sort((left, right) => String(right.practiceDate).localeCompare(String(left.practiceDate)));
  }

  function save(session) {
    if (!session?.id || !session?.studentId || !session?.subjectId || !session?.practiceDate) {
      throw new Error("invalid_daily_practice_session");
    }
    const now = new Date().toISOString();
    const storedSession = {
      ...session,
      createdAt: session.createdAt || now,
      updatedAt: now,
      persistence: "browser_local_record",
    };
    sessions = [storedSession, ...sessions.filter((item) => item.id !== storedSession.id)];
    persist();
    if (canUseRemote && allowRemoteMirror) apiClient.mirrorDailyPracticeSession?.(storedSession);
    return storedSession;
  }

  async function hydrate({ studentId, subjectId, practiceDate }) {
    if (!canUseRemote) return canUseLocalFallback() ? find({ studentId, subjectId, practiceDate }) : null;
    try {
      const response = await apiClient.getDailyPracticeSession?.({ studentId, subjectId, practiceDate });
      if (!response?.session) return canUseLocalFallback() ? find({ studentId, subjectId, practiceDate }) : null;
      const session = response.session;
      sessions = [session, ...sessions.filter((item) => item.id !== session.id)];
      persist();
      return session;
    } catch {
      return canUseLocalFallback() ? find({ studentId, subjectId, practiceDate }) : null;
    }
  }

  async function hydrateHistory({ studentId, subjectId, limit = 30 }) {
    if (!canUseRemote) return canUseLocalFallback() ? listByStudent({ studentId, subjectId }) : [];
    try {
      const response = await apiClient.getDailyPracticeHistory?.({ studentId, subjectId, limit });
      if (!Array.isArray(response?.sessions)) return canUseLocalFallback() ? listByStudent({ studentId, subjectId }) : [];
      const remoteIds = new Set(response.sessions.map((session) => session.id));
      sessions = [
        ...response.sessions,
        ...sessions.filter((session) => {
          if (session.studentId !== studentId || session.subjectId !== subjectId) return true;
          return canUseLocalFallback() && !remoteIds.has(session.id);
        }),
      ];
      persist();
      return listByStudent({ studentId, subjectId });
    } catch {
      return canUseLocalFallback() ? listByStudent({ studentId, subjectId }) : [];
    }
  }

  return { find, hydrate, hydrateHistory, listByStudent, save };
}
