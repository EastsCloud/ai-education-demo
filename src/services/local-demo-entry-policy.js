import { publicDemo } from "../runtime-config.js";

const LOCAL_DEMO_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const LOCAL_DEMO_ROLES = new Set(["student", "parent", "teacher"]);

export function normalizeLocalDemoSessionId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 48);
}

export function createLocalDemoSessionId({ now = Date.now, random = Math.random } = {}) {
  return `demo-${now().toString(36)}-${random().toString(36).slice(2, 10)}`;
}

export function resolveLocalDemoContext({
  hostname = globalThis.location?.hostname,
  search = globalThis.location?.search,
} = {}) {
  if (!LOCAL_DEMO_HOSTS.has(hostname) && !publicDemo) return null;
  const parameters = new URLSearchParams(search || "");
  const role = parameters.get("demo");
  const sessionId = normalizeLocalDemoSessionId(parameters.get("session"));
  if (!LOCAL_DEMO_ROLES.has(role)) return null;
  return {
    role,
    sessionId,
    studentId: sessionId ? `student-onboarding-${sessionId}` : null,
  };
}

// All local student demo links begin with a clean onboarding path. This keeps
// the demonstration aligned with a newly registered student's first visit.
export function isLocalStudentDemo({ hostname = globalThis.location?.hostname, search = globalThis.location?.search } = {}) {
  return resolveLocalDemoContext({ hostname, search })?.role === "student";
}

export function isLocalObserverDemo(options = {}) {
  const context = resolveLocalDemoContext(options);
  return Boolean(context?.studentId && ["parent", "teacher"].includes(context.role));
}
