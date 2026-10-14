import { createLocalApiClient } from "./local-api-client.js?v=system-runtime-36";

const STORAGE_KEY = "ai-education-behavior-events-v1";
const MAX_EVENTS_PER_STUDENT = 2000;
const MAX_PENDING_SYNC_PER_HYDRATION = 80;

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readEvents(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function subjectIdForEvent(event) {
  return event?.subjectId || event?.payload?.subjectId || null;
}

function matchesSubject(event, subjectId) {
  if (!subjectId) return true;
  const eventSubjectId = subjectIdForEvent(event);
  // Older one-subject prototype records have no subject marker. Keep them readable
  // during migration, while all new events remain strictly scoped.
  return !eventSubjectId || eventSubjectId === subjectId;
}

function canRecoverToServer(event) {
  // Answer correctness belongs to server-owned question delivery. Local copies of
  // answers can support an offline demo, but must never be used to recreate a
  // server result after reconnecting.
  return Boolean(event?.eventId && event?.studentId && event?.eventType && event.eventType !== "answer_submitted");
}

export function createBehaviorEventRepository({ storage = getBrowserStorage(), apiClient = createLocalApiClient() } = {}) {
  let events = readEvents(storage);

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // The prototype keeps behavior events in memory when browser storage is unavailable.
    }
  }

  function listByStudent(studentId, subjectId = null) {
    return events.filter((event) => event.studentId === studentId && matchesSubject(event, subjectId));
  }

  function append(event, { mirror = true } = {}) {
    const studentEvents = listByStudent(event.studentId);
    const retained = studentEvents.slice(-(MAX_EVENTS_PER_STUDENT - 1));
    events = [...events.filter((item) => item.studentId !== event.studentId), ...retained, event];
    persist();
    if (mirror) apiClient.mirrorBehaviorEvent?.(event);
    return event;
  }

  async function recoverPendingClientEvents({ studentId, subjectId, localEvents, remoteEvents }) {
    if (typeof apiClient.syncBehaviorEvent !== "function") return remoteEvents;
    const knownEventIds = new Set(remoteEvents.map((event) => event?.eventId).filter(Boolean));
    const pending = localEvents
      .filter(canRecoverToServer)
      .filter((event) => !knownEventIds.has(event.eventId))
      .slice(-MAX_PENDING_SYNC_PER_HYDRATION);
    if (!pending.length) return remoteEvents;

    const recovered = [];
    for (const event of pending) {
      try {
        const response = await apiClient.syncBehaviorEvent(event);
        const saved = response?.event;
        if (!saved?.eventId || knownEventIds.has(saved.eventId)) continue;
        knownEventIds.add(saved.eventId);
        recovered.push(saved);
      } catch {
        // Keep the event locally. A later authenticated visit can retry it.
      }
    }
    return [...remoteEvents, ...recovered];
  }

  async function hydrateByStudent(studentId, subjectId = null) {
    try {
      const response = await apiClient.getBehaviorEvents?.({ studentId, subjectId, limit: MAX_EVENTS_PER_STUDENT });
      const remoteEvents = Array.isArray(response?.events) ? response.events : [];
      const localEvents = listByStudent(studentId, subjectId);
      const recoveredEvents = await recoverPendingClientEvents({
        studentId,
        subjectId,
        localEvents,
        remoteEvents,
      });
      if (!recoveredEvents.length) return localEvents;

      const merged = new Map(localEvents.map((event) => [event.eventId, event]));
      recoveredEvents.forEach((event) => merged.set(event.eventId, event));
      const retained = [...merged.values()]
        .sort((left, right) => String(left.timestamp).localeCompare(String(right.timestamp)))
        .slice(-MAX_EVENTS_PER_STUDENT);
      events = [
        ...events.filter((item) => item.studentId !== studentId || !matchesSubject(item, subjectId)),
        ...retained,
      ];
      persist();
      return retained;
    } catch {
      return listByStudent(studentId, subjectId);
    }
  }

  return {
    append,
    hydrateByStudent,
    listByStudent,
  };
}
