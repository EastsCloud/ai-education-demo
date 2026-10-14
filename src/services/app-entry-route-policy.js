const STUDENT_ROLES = new Set(["student", "admin"]);
const OBSERVER_ROLES = new Set(["parent", "teacher"]);
const SAFE_ORIGIN = "https://ai-education.local";

function normalizeInternalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;

  try {
    const url = new URL(value, SAFE_ORIGIN);
    if (url.origin !== SAFE_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function isStudentPath(path) {
  const pathname = new URL(path, SAFE_ORIGIN).pathname;
  return pathname === "/" || pathname === "/index.html";
}

function isObserverPath(path) {
  return new URL(path, SAFE_ORIGIN).pathname === "/observer.html";
}

export function getEntryActionForUser(user) {
  if (!user?.role) return "sign_in";
  if (STUDENT_ROLES.has(user.role)) return "student";
  if (OBSERVER_ROLES.has(user.role)) return "observer";
  return "sign_in";
}

export function getPostSignInDestination({ user, next = null } = {}) {
  const action = getEntryActionForUser(user);
  const internalPath = normalizeInternalPath(next);

  if (action === "student") return internalPath && isStudentPath(internalPath) ? internalPath : "./index.html";
  if (action === "observer") return internalPath && isObserverPath(internalPath) ? internalPath : "./observer.html";
  return "./signin.html";
}

export function createSignInDestination(locationLike = globalThis.location) {
  const signInUrl = new URL("./signin.html", locationLike.href);
  const next = `${locationLike.pathname || "/index.html"}${locationLike.search || ""}${locationLike.hash || ""}`;
  signInUrl.searchParams.set("next", next);
  return signInUrl.toString();
}
