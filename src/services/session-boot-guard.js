export const DEFAULT_SESSION_BOOT_TIMEOUT_MS = 8_000;

export function waitForSession(promise, { timeoutMs = DEFAULT_SESSION_BOOT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error("session_boot_timeout")), timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}
