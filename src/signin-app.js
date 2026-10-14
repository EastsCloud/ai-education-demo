import { createAuthClient } from "./services/auth-client.js?v=auth-gate-2";
import { getPostSignInDestination } from "./services/app-entry-route-policy.js?v=auth-gate-1";

const authClient = createAuthClient();
const form = document.querySelector("#sign-in-form");
const status = document.querySelector("#sign-in-status");
const submit = form?.querySelector('button[type="submit"]');
const modeLabel = document.querySelector("#sign-in-mode-label");
const heading = document.querySelector("#sign-in-heading");
const note = document.querySelector("#sign-in-note");
const toggle = document.querySelector("#sign-in-toggle");
const registerOnlyFields = document.querySelectorAll(".sign-in-register-fields");
const displayNameInput = document.querySelector("#register-display-name");
const roleInput = document.querySelector("#register-role");
const studentFields = document.querySelector("#register-student-fields");
const gradeLabelInput = document.querySelector("#register-grade-label");
const passwordInput = document.querySelector("#sign-in-password");
const confirmPasswordInput = document.querySelector("#register-password-confirm-input");

let mode = "sign-in";

function destinationForUser(user) {
  const next = new URL(globalThis.location.href).searchParams.get("next");
  return getPostSignInDestination({ user, next });
}

async function continueWithSession() {
  try {
    const response = await authClient.getSession();
    if (response?.session?.user) {
      globalThis.location.assign(destinationForUser(response.session.user));
    }
  } catch {
    // The sign-in form remains available when the local runtime is not connected.
  }
}

function setMode(nextMode) {
  mode = nextMode;
  const isRegistration = mode === "register";
  const isStudentRegistration = isRegistration && roleInput?.value === "student";
  registerOnlyFields.forEach((field) => {
    field.hidden = !isRegistration;
  });
  if (studentFields) studentFields.hidden = !isStudentRegistration;
  if (modeLabel) modeLabel.textContent = isRegistration ? "创建账号" : "登录";
  if (heading) {
    heading.textContent = isRegistration
      ? isStudentRegistration
        ? "从自己的学习起点开始。"
        : "为支持学习留一个位置。"
      : "回到你的学习空间。";
  }
  if (submit) submit.textContent = isRegistration ? "创建并进入" : "登录";
  if (toggle) toggle.textContent = isRegistration ? "已有账号，去登录" : "创建账号";
  if (note) {
    note.textContent = isRegistration
      ? isStudentRegistration
        ? "你可以自己完成开始信息、测试和学习计划；家长或老师之后可以选择关联。"
        : "你可以创建学生账号，也可以在之后与已有学生选择关联。"
      : "学生可以自己创建账号并开始学习；家长和老师可以稍后选择加入。";
  }
  if (passwordInput) passwordInput.autocomplete = isRegistration ? "new-password" : "current-password";
  if (displayNameInput) displayNameInput.required = isRegistration;
  if (confirmPasswordInput) confirmPasswordInput.required = isRegistration;
  if (gradeLabelInput) gradeLabelInput.required = isStudentRegistration;
  if (status) status.textContent = "";
}

function registrationErrorMessage(code) {
  if (code === "invalid_login_name") return "用户名或邮箱格式不正确。";
  if (code === "invalid_display_name") return "请使用 1 到 48 个字符的显示名称。";
  if (code === "invalid_student_grade") return "请选择当前年级。";
  if (code === "password_policy_not_met") return "密码至少 12 个字符，并同时包含字母和数字。";
  if (code === "login_name_taken") return "这个用户名或邮箱已经被使用。";
  return "暂时无法创建账号，请稍后再试。";
}

toggle?.addEventListener("click", () => {
  setMode(mode === "sign-in" ? "register" : "sign-in");
});

roleInput?.addEventListener("change", () => {
  if (mode === "register") setMode("register");
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const loginName = String(values.get("loginName") || "").trim();
  const password = String(values.get("password") || "");
  if (!loginName || !password) return;

  const isRegistration = mode === "register";
  const displayName = String(values.get("displayName") || "").trim();
  const confirmPassword = String(values.get("confirmPassword") || "");
  const role = String(values.get("role") || "");
  const gradeLabel = String(values.get("gradeLabel") || "");
  if (isRegistration && password !== confirmPassword) {
    status.textContent = "两次输入的密码不一致。";
    return;
  }

  submit.disabled = true;
  status.textContent = isRegistration ? "正在创建账号..." : "正在进入学习空间...";
  try {
    const response = isRegistration
      ? await authClient.register({ loginName, displayName, password, role, gradeLabel })
      : await authClient.signIn({ loginName, password });
    globalThis.location.assign(destinationForUser(response.user));
  } catch (error) {
    status.textContent = isRegistration
      ? registrationErrorMessage(error?.code)
      : error?.code === "too_many_login_attempts"
        ? "尝试次数过多，请稍后再试。"
        : "用户名或密码不正确。";
    submit.disabled = false;
  }
});

setMode("sign-in");
void continueWithSession();
