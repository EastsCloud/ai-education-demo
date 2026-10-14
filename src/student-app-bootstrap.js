import { createAuthClient } from "./services/auth-client.js?v=auth-gate-2";
import { createSignInDestination, getEntryActionForUser } from "./services/app-entry-route-policy.js?v=auth-gate-1";
import { createLocalApiClient } from "./services/local-api-client.js?v=student-identity-1";
import {
  isLocalStudentDemo,
  resolveLocalDemoContext,
} from "./services/local-demo-entry-policy.js?v=shared-demo-session-1";
import { waitForSession } from "./services/session-boot-guard.js?v=session-boot-guard-1";

const authClient = createAuthClient();
const apiClient = createLocalApiClient();

function setLoadingCopy(copy) {
  const label = document.querySelector("#student-app-loading span");
  if (label) label.textContent = copy;
}

function returnToSignIn() {
  setLoadingCopy("暂时无法进入学习空间，正在回到登录页。");
  globalThis.location.replace(createSignInDestination());
}

function isLocalStudentDemoMode() {
  return isLocalStudentDemo();
}

async function loadStudentRuntime() {
  try {
    await import("./app.js?v=system-runtime-152");
    return true;
  } catch (error) {
    if (!isLocalStudentDemoMode()) throw error;
    document.documentElement.dataset.demoRuntimeError = String(error?.message || error || "unknown_runtime_error");
    setLoadingCopy("学习空间暂时没有准备好，正在恢复演示内容。");
    document.body?.classList.remove("app-booting");
    return false;
  }
}

async function prepareStudentIdentity(user) {
  let profile = null;
  if (user?.studentId) {
    try {
      const response = await apiClient.getStudentProfile({ studentId: user.studentId });
      profile = response?.profile || null;
    } catch {
      // The student app keeps the authenticated account id even when an optional profile read is delayed.
    }
  }
  globalThis.__AI_EDUCATION_ACTIVE_STUDENT__ = { profile, user };
}

async function switchAccount() {
  const demoContext = resolveLocalDemoContext();
  if (demoContext?.sessionId) {
    globalThis.location.assign(`./demo.html?session=${encodeURIComponent(demoContext.sessionId)}`);
    return;
  }
  try {
    await authClient.signOut();
  } finally {
    globalThis.location.replace("./signin.html");
  }
}

document.addEventListener(
  "click",
  (event) => {
    if (!event.target.closest("[data-account-switch]")) return;
    event.preventDefault();
    void switchAccount();
  },
  true,
);

async function bootStudentApp() {
  // The local demo intentionally avoids an authentication redirect cycle in embedded browsers.
  if (isLocalStudentDemoMode() || !authClient.enabled) {
    await loadStudentRuntime();
    return;
  }

  try {
    const response = await waitForSession(authClient.getSession());
    const user = response?.session?.user;
    const action = getEntryActionForUser(user);
    if (action === "student") {
      await prepareStudentIdentity(user);
      await loadStudentRuntime();
      return;
    }
    if (action === "observer") {
      globalThis.location.replace("./observer.html");
      return;
    }
  } catch {
    // An unavailable local runtime should not render a page that cannot keep its data protected.
  }

  returnToSignIn();
}

void bootStudentApp();
