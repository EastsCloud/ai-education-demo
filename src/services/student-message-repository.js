import { createLocalApiClient } from "./local-api-client.js?v=observer-authoritative-1";

const STORAGE_KEY = "ai-education-student-messages-v1";

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readMessages(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createStudentMessageRepository({
  storage = getBrowserStorage(),
  apiClient = createLocalApiClient(),
  remoteEnabled = true,
} = {}) {
  let messages = readMessages(storage);

  function canUseRemote() {
    return typeof remoteEnabled === "function" ? Boolean(remoteEnabled()) : Boolean(remoteEnabled);
  }

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // The local API remains the durable prototype store when it is available.
    }
  }

  function list(studentId) {
    return messages
      .filter((message) => message.studentId === studentId)
      .slice()
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  }

  function add(message, { mirror = true } = {}) {
    messages = [message, ...messages.filter((item) => item.id !== message.id)];
    persist();
    if (mirror && canUseRemote()) apiClient.mirrorStudentMessage?.(message);
    return message;
  }

  async function hydrate(studentId, seedMessages = []) {
    const mergeMessages = (remoteMessages = []) => {
      const all = new Map(
        seedMessages.map((message) => [message.id, { ...message, studentId: message.toStudentId || studentId }]),
      );
      list(studentId).forEach((message) => all.set(message.id, message));
      remoteMessages.forEach((message) => all.set(message.id, message));
      messages = [...messages.filter((message) => message.studentId !== studentId), ...all.values()];
      persist();
      return list(studentId);
    };

    if (!canUseRemote()) return mergeMessages();
    try {
      const response = await apiClient.getStudentMessages?.({ studentId });
      const remoteMessages = Array.isArray(response?.messages) ? response.messages : [];
      return mergeMessages(remoteMessages);
    } catch {
      const existing = list(studentId);
      if (existing.length) return existing;
      return seedMessages.map((message) => ({ ...message, studentId: message.toStudentId || studentId }));
    }
  }

  return { add, hydrate, list };
}
