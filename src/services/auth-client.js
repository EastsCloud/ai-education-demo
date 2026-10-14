import { resolveApiBaseUrl as resolveBaseUrl } from "./api-base-url.js";

async function request(baseUrl, path, options = {}) {
  if (!baseUrl || typeof globalThis.fetch !== "function") return null;
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `auth_request_${response.status}`);
    error.code = body.error || "auth_request_failed";
    throw error;
  }
  return body;
}

export function createAuthClient({ baseUrl } = {}) {
  const resolvedBaseUrl = resolveBaseUrl(baseUrl);
  return {
    enabled: Boolean(resolvedBaseUrl),
    getSession() {
      return request(resolvedBaseUrl, "/auth/session");
    },
    signIn({ loginName, password }) {
      return request(resolvedBaseUrl, "/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ loginName, password }),
      });
    },
    register({ loginName, displayName, password, role, gradeLabel }) {
      return request(resolvedBaseUrl, "/auth/register", {
        method: "POST",
        body: JSON.stringify({ loginName, displayName, password, role, gradeLabel }),
      });
    },
    updateProfile({ displayName }) {
      return request(resolvedBaseUrl, "/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ displayName }),
      });
    },
    changePassword({ currentPassword, newPassword }) {
      return request(resolvedBaseUrl, "/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
    signOut() {
      return request(resolvedBaseUrl, "/auth/sign-out", { method: "POST", body: "{}" });
    },
  };
}
