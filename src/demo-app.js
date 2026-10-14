import {
  createLocalDemoSessionId,
  normalizeLocalDemoSessionId,
} from "./services/local-demo-entry-policy.js?v=shared-demo-session-1";

const DEMO_SESSION_STORAGE_KEY = "ai-education-shared-demo-session-v1";

const DEMO_IDENTITIES = {
  student: {
    entering: "正在进入学生学习空间...",
  },
  parent: {
    entering: "正在进入家长观察空间...",
  },
  teacher: {
    entering: "正在进入老师观察空间...",
  },
};

const buttons = [...document.querySelectorAll("[data-demo-role]")];
const status = document.querySelector("#experience-status");

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function resolveSharedDemoSessionId() {
  const storage = getBrowserStorage();
  const requested = normalizeLocalDemoSessionId(new URLSearchParams(globalThis.location.search).get("session"));
  const remembered = normalizeLocalDemoSessionId(storage?.getItem(DEMO_SESSION_STORAGE_KEY));
  const sessionId = requested || remembered || createLocalDemoSessionId();
  try {
    storage?.setItem(DEMO_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // The URL still carries the shared session when browser storage is unavailable.
  }
  return sessionId;
}

function createDestination(role, sessionId) {
  const parameters = new URLSearchParams({ demo: role, session: sessionId });
  if (role === "student") parameters.set("entry", "onboarding");
  return `${role === "student" ? "./index.html" : "./observer.html"}?${parameters.toString()}`;
}

async function enterExperience(role) {
  const identity = DEMO_IDENTITIES[role];
  if (!identity) {
    if (status) status.textContent = "体验服务正在连接，请稍后再试。";
    return;
  }

  buttons.forEach((button) => {
    button.disabled = true;
  });
  if (status) status.textContent = identity.entering;
  const sessionId = resolveSharedDemoSessionId();
  globalThis.location.assign(createDestination(role, sessionId));
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    void enterExperience(button.dataset.demoRole);
  });
});
