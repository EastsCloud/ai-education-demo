import { createLocalApiClient } from "./local-api-client.js?v=system-runtime-34";

const STORAGE_KEY = "ai-education-assessment-sessions-v1";

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

export function createAssessmentSessionRepository({
  storage = getBrowserStorage(),
  apiClient = createLocalApiClient(),
  allowLocalFallback = true,
  allowRemoteMirror = true,
} = {}) {
  let sessions = readSessions(storage);

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  function canUseRemoteMirror() {
    return typeof allowRemoteMirror === "function" ? Boolean(allowRemoteMirror()) : Boolean(allowRemoteMirror);
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Browser persistence is optional in the prototype; the active session remains in memory.
    }
  }

  function findLatest({ studentId, subjectId, assessmentType = "initial_onboarding" }) {
    return (
      sessions.find(
        (session) =>
          session.studentId === studentId && session.subjectId === subjectId && session.assessmentType === assessmentType,
      ) || null
    );
  }

  function recordResponse({ studentId, subjectId, response, questionMetadata = null, assessmentType = "initial_onboarding" }) {
    const existing = findLatest({ studentId, subjectId, assessmentType });
    const now = new Date().toISOString();
    const storedResponse = {
      ...response,
      questionMetadata,
      storedAt: now,
    };
    const responses = [
      ...(existing?.responses || []).filter(
        (item) => !(item.step === response.step && item.questionId === response.questionId),
      ),
      storedResponse,
    ];
    const session = {
      id: existing?.id || `assessment-${studentId}-${subjectId}-${assessmentType}`,
      studentId,
      subjectId,
      assessmentType,
      status: "in_progress",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      responses,
      responseCount: responses.length,
      persistence: "browser_local_record",
    };
    sessions = [session, ...sessions.filter((item) => item.id !== session.id)];
    persist();
    if (canUseRemoteMirror()) apiClient.mirrorAssessmentSession?.(session);
    return session;
  }

  function saveSession(session) {
    if (!session?.id || !session?.studentId || !session?.subjectId || !session?.assessmentType) {
      throw new Error("invalid_assessment_session");
    }
    const now = new Date().toISOString();
    const storedSession = {
      ...session,
      updatedAt: session.updatedAt || now,
      createdAt: session.createdAt || now,
      persistence: "browser_local_record",
    };
    sessions = [storedSession, ...sessions.filter((item) => item.id !== storedSession.id)];
    persist();
    if (canUseRemoteMirror()) apiClient.mirrorAssessmentSession?.(storedSession);
    return storedSession;
  }

  async function hydrateLatest({ studentId, subjectId, assessmentType = "initial_onboarding" }) {
    try {
      const response = await apiClient.getAssessmentSession?.({ studentId, subjectId, assessmentType });
      if (!response?.session) return canUseLocalFallback() ? findLatest({ studentId, subjectId, assessmentType }) : null;
      const session = response.session;
      sessions = [session, ...sessions.filter((item) => item.id !== session.id)];
      persist();
      return session;
    } catch {
      return canUseLocalFallback() ? findLatest({ studentId, subjectId, assessmentType }) : null;
    }
  }

  return {
    findLatest,
    hydrateLatest,
    recordResponse,
    saveSession,
  };
}
