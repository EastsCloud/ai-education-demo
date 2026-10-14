import { createAuthClient } from "./services/auth-client.js?v=account-1";
import { createLocalApiClient } from "./services/local-api-client.js?v=student-optional-link-1";

const authClient = createAuthClient();
const apiClient = createLocalApiClient();
const profileForm = document.querySelector("#account-profile-form");
const passwordForm = document.querySelector("#account-password-form");
const profileStatus = document.querySelector("#account-profile-status");
const passwordStatus = document.querySelector("#account-password-status");
const signOutButton = document.querySelector("#account-sign-out");
const displayNameInput = document.querySelector("#account-display-name");
const relationshipSection = document.querySelector("#account-relationship-section");
const relationshipForm = document.querySelector("#account-relationship-form");
const relationshipStatus = document.querySelector("#account-relationship-status");
const relationshipResult = document.querySelector("#account-relationship-result");
const relationshipCode = document.querySelector("#account-relationship-code");
const relationshipCopy = document.querySelector("#account-relationship-copy");
const relationshipSubmit = document.querySelector("#account-relationship-submit");

let currentUser = null;

function destinationForRole(role) {
  return role === "student" ? "./index.html" : "./observer.html";
}

function renderUser(user) {
  currentUser = user;
  document.querySelector("#account-name").textContent = user.displayName;
  document.querySelector("#account-login-name").textContent = user.loginName;
  document.querySelector("#account-role-label").textContent = user.role === "student" ? "学生学习空间" : user.role === "teacher" ? "老师观察空间" : "家长观察空间";
  document.querySelector("#account-return").setAttribute("href", destinationForRole(user.role));
  displayNameInput.value = user.displayName;
  if (relationshipSection) relationshipSection.hidden = user.role !== "student" || !user.studentId;
}

function profileErrorMessage(code) {
  if (code === "invalid_display_name") return "请使用 1 到 48 个字符的显示名称。";
  return "暂时无法保存名称。";
}

function passwordErrorMessage(code) {
  if (code === "current_password_incorrect") return "当前密码不正确。";
  if (code === "password_policy_not_met") return "新密码至少 12 个字符，并同时包含字母和数字。";
  return "暂时无法更新密码。";
}

function relationshipErrorMessage(code) {
  if (code === "invalid_relationship_role") return "请选择家长或老师身份。";
  if (code === "student_access_denied") return "暂时无法为这个账号生成关联码。";
  return "暂时无法生成关联码。";
}

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const displayName = String(new FormData(profileForm).get("displayName") || "").trim();
  profileStatus.textContent = "正在保存...";
  try {
    const response = await authClient.updateProfile({ displayName });
    renderUser(response.user);
    profileStatus.textContent = "名称已保存。";
  } catch (error) {
    profileStatus.textContent = profileErrorMessage(error?.code);
  }
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(passwordForm);
  const currentPassword = String(values.get("currentPassword") || "");
  const newPassword = String(values.get("newPassword") || "");
  const confirmPassword = String(values.get("confirmPassword") || "");
  if (newPassword !== confirmPassword) {
    passwordStatus.textContent = "两次输入的新密码不一致。";
    return;
  }
  passwordStatus.textContent = "正在更新...";
  try {
    await authClient.changePassword({ currentPassword, newPassword });
    passwordForm.reset();
    passwordStatus.textContent = "密码已更新，其他已登录设备已退出。";
  } catch (error) {
    passwordStatus.textContent = passwordErrorMessage(error?.code);
  }
});

relationshipForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser?.studentId) return;
  const targetRole = String(new FormData(relationshipForm).get("targetRole") || "");
  if (!targetRole) return;
  if (relationshipSubmit) relationshipSubmit.disabled = true;
  if (relationshipResult) relationshipResult.hidden = true;
  if (relationshipStatus) relationshipStatus.textContent = "正在生成关联码...";
  try {
    const response = await apiClient.createStudentRelationshipInvite({
      studentId: currentUser.studentId,
      targetRole,
    });
    if (relationshipCode) relationshipCode.textContent = response.invite.code;
    if (relationshipResult) relationshipResult.hidden = false;
    if (relationshipStatus) relationshipStatus.textContent = "把关联码发给对方即可。";
  } catch (error) {
    if (relationshipStatus) relationshipStatus.textContent = relationshipErrorMessage(error?.code);
  } finally {
    if (relationshipSubmit) relationshipSubmit.disabled = false;
  }
});

relationshipCopy?.addEventListener("click", async () => {
  const code = relationshipCode?.textContent || "";
  if (!code) return;
  try {
    await globalThis.navigator?.clipboard?.writeText(code);
    if (relationshipStatus) relationshipStatus.textContent = "关联码已复制。";
  } catch {
    if (relationshipStatus) relationshipStatus.textContent = "请手动复制关联码。";
  }
});

signOutButton?.addEventListener("click", async () => {
  try {
    await authClient.signOut();
  } finally {
    globalThis.location.assign("./signin.html");
  }
});

try {
  const response = await authClient.getSession();
  if (!response?.session?.user) {
    globalThis.location.assign("./signin.html");
  } else {
    renderUser(response.session.user);
  }
} catch {
  globalThis.location.assign("./signin.html");
}
