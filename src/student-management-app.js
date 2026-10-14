import { createAuthClient } from "./services/auth-client.js?v=student-management-2";
import { createLocalApiClient } from "./services/local-api-client.js?v=student-management-2";

const authClient = createAuthClient();
const apiClient = createLocalApiClient();
const form = document.querySelector("#student-management-form");
const status = document.querySelector("#student-management-status");
const result = document.querySelector("#student-management-result");
const submit = document.querySelector("#student-management-submit");
const returnLink = document.querySelector("#student-management-return");
const backLink = document.querySelector("#student-management-back");
const roleLabel = document.querySelector("#student-management-role");
const relationshipInviteForm = document.querySelector("#relationship-invite-form");
const relationshipInviteStudent = document.querySelector("#relationship-invite-student");
const relationshipInviteRole = document.querySelector("#relationship-invite-role");
const relationshipInviteStatus = document.querySelector("#relationship-invite-status");
const relationshipInviteSubmit = document.querySelector("#relationship-invite-submit");
const relationshipInviteEmpty = document.querySelector("#relationship-invite-empty");
const relationshipInviteResult = document.querySelector("#relationship-invite-result");
const relationshipInviteCode = document.querySelector("#relationship-invite-code");
const relationshipInviteCopy = document.querySelector("#relationship-invite-copy");
const relationshipAcceptForm = document.querySelector("#relationship-accept-form");
const relationshipAcceptStatus = document.querySelector("#relationship-accept-status");
const relationshipAcceptResult = document.querySelector("#relationship-accept-result");
const relationshipAcceptSubmit = document.querySelector("#relationship-accept-submit");
const studentLinkList = document.querySelector("#student-link-list");
const relationshipManageStatus = document.querySelector("#relationship-manage-status");

let signedInUser = null;
let linkedStudents = [];

function errorMessage(code) {
  if (code === "invalid_login_name") return "用户名或邮箱格式不正确。";
  if (code === "invalid_display_name") return "请使用 1 到 48 个字符的学生名称。";
  if (code === "password_policy_not_met") return "初始密码至少 12 个字符，并同时包含字母和数字。";
  if (code === "invalid_student_grade") return "请选择学生当前年级。";
  if (code === "login_name_taken") return "这个用户名或邮箱已经被使用。";
  return "暂时无法创建学生账号。";
}

function relationshipErrorMessage(code) {
  if (code === "invalid_relationship_role") return "请选择家长或老师身份。";
  if (code === "student_access_denied") return "你没有为这位学生创建关联的权限。";
  if (code === "relationship_invite_role_mismatch") return "这个关联码属于另一种身份。";
  if (code === "student_relationship_already_active") return "这位学生已经关联到你的空间。";
  if (code === "relationship_invite_unavailable") return "关联码无效、已使用或已过期。";
  return "暂时无法完成关联。";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function relationshipLabel(value) {
  return value === "teacher" ? "老师关联" : value === "guardian" ? "家长关联" : "观察关联";
}

function observerDestination() {
  return "./observer.html";
}

async function loadSession() {
  try {
    const response = await authClient.getSession();
    const user = response?.session?.user;
    if (!user || !["parent", "teacher", "admin"].includes(user.role)) {
      globalThis.location.assign(user?.role === "student" ? "./index.html" : "./signin.html");
      return false;
    }
    signedInUser = user;
    const roleName = user.role === "teacher" ? "老师" : user.role === "parent" ? "家长" : "管理员";
    if (roleLabel) roleLabel.textContent = `${roleName} · 学生账号`;
    if (returnLink) returnLink.href = observerDestination();
    if (backLink) backLink.href = observerDestination();
    return true;
  } catch {
    globalThis.location.assign("./signin.html");
    return false;
  }
}

function renderLinkedStudents({ selectedStudentId = null } = {}) {
  const hasStudents = linkedStudents.length > 0;
  if (relationshipInviteStudent) {
    relationshipInviteStudent.replaceChildren();
    linkedStudents.forEach((student) => {
      const suffix = student.gradeLabel ? ` · ${student.gradeLabel}` : "";
      const option = new Option(`${student.displayName || "学生"}${suffix}`, student.studentId);
      option.selected = student.studentId === selectedStudentId;
      relationshipInviteStudent.add(option);
    });
    relationshipInviteStudent.disabled = !hasStudents;
  }
  if (relationshipInviteRole) relationshipInviteRole.disabled = !hasStudents;
  if (relationshipInviteSubmit) relationshipInviteSubmit.disabled = !hasStudents;
  if (relationshipInviteEmpty) relationshipInviteEmpty.hidden = hasStudents;
  if (studentLinkList) {
    studentLinkList.innerHTML = hasStudents
      ? linkedStudents
          .map(
            (student) => `
              <article>
                <div>
                  <strong>${escapeHtml(student.displayName || "学生")}</strong>
                  <span>${escapeHtml(student.gradeLabel || "年级待确认")} · ${relationshipLabel(student.relationshipType)}</span>
                </div>
                <button class="text-action relationship-revoke" type="button" data-revoke-student-id="${escapeHtml(student.studentId)}" aria-label="解除与${escapeHtml(student.displayName || "学生")}的关联" title="解除我与这位学生的关联">解除</button>
              </article>
            `,
          )
          .join("")
      : `<p class="student-management-muted">你还没有关联学生。</p>`;
  }
}

async function loadLinkedStudents({ selectedStudentId = null } = {}) {
  try {
    const response = await apiClient.getLinkedStudents();
    linkedStudents = Array.isArray(response?.students) ? response.students.filter((student) => student?.studentId) : [];
  } catch {
    linkedStudents = [];
  }
  renderLinkedStudents({ selectedStudentId });
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!signedInUser) return;
  const values = new FormData(form);
  const password = String(values.get("password") || "");
  const confirmPassword = String(values.get("confirmPassword") || "");
  if (password !== confirmPassword) {
    status.textContent = "两次输入的密码不一致。";
    return;
  }

  submit.disabled = true;
  status.textContent = "正在创建学生账号...";
  if (result) result.hidden = true;
  try {
    const response = await apiClient.createManagedStudent({
      student: {
        displayName: String(values.get("displayName") || "").trim(),
        gradeLabel: String(values.get("gradeLabel") || ""),
        loginName: String(values.get("loginName") || "").trim(),
        password,
      },
    });
    try {
      globalThis.localStorage?.setItem(
        `ai-education-observer-selected-student-${signedInUser.userId}`,
        response.student.studentId,
      );
    } catch {
      // The observer can still select the new student when local preference storage is unavailable.
    }
    form.reset();
    status.textContent = "学生账号已创建。";
    if (result) {
      result.textContent = `${response.student.displayName} 已自动关联到你的观察空间。`;
      result.hidden = false;
    }
    await loadLinkedStudents({ selectedStudentId: response.student.studentId });
  } catch (error) {
    status.textContent = errorMessage(error?.code);
  } finally {
    submit.disabled = false;
  }
});

relationshipInviteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const studentId = relationshipInviteStudent?.value || "";
  const targetRole = relationshipInviteRole?.value || "";
  if (!studentId || !targetRole) return;
  relationshipInviteSubmit.disabled = true;
  relationshipInviteStatus.textContent = "正在生成关联码...";
  if (relationshipInviteResult) relationshipInviteResult.hidden = true;
  try {
    const response = await apiClient.createStudentRelationshipInvite({ studentId, targetRole });
    relationshipInviteStatus.textContent = "把关联码发给对方即可。";
    if (relationshipInviteCode) relationshipInviteCode.textContent = response.invite.code;
    if (relationshipInviteResult) relationshipInviteResult.hidden = false;
  } catch (error) {
    relationshipInviteStatus.textContent = relationshipErrorMessage(error?.code);
  } finally {
    relationshipInviteSubmit.disabled = false;
  }
});

relationshipInviteCopy?.addEventListener("click", async () => {
  const code = relationshipInviteCode?.textContent || "";
  if (!code) return;
  try {
    await globalThis.navigator?.clipboard?.writeText(code);
    relationshipInviteStatus.textContent = "关联码已复制。";
  } catch {
    relationshipInviteStatus.textContent = "请手动复制关联码。";
  }
});

relationshipAcceptForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = new FormData(relationshipAcceptForm);
  const code = String(values.get("code") || "").trim().toUpperCase();
  if (!code) return;
  relationshipAcceptSubmit.disabled = true;
  relationshipAcceptStatus.textContent = "正在关联学生...";
  if (relationshipAcceptResult) relationshipAcceptResult.hidden = true;
  try {
    const response = await apiClient.acceptStudentRelationshipInvite({ code });
    try {
      globalThis.localStorage?.setItem(
        `ai-education-observer-selected-student-${signedInUser.userId}`,
        response.student.studentId,
      );
    } catch {
      // The observer can still select the newly linked student manually.
    }
    relationshipAcceptForm.reset();
    relationshipAcceptStatus.textContent = "学生已关联。";
    if (relationshipAcceptResult) {
      relationshipAcceptResult.textContent = `${response.student.displayName} 已出现在你的观察空间。`;
      relationshipAcceptResult.hidden = false;
    }
    await loadLinkedStudents({ selectedStudentId: response.student.studentId });
  } catch (error) {
    relationshipAcceptStatus.textContent = relationshipErrorMessage(error?.code);
  } finally {
    relationshipAcceptSubmit.disabled = false;
  }
});

studentLinkList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-revoke-student-id]");
  if (!button || !signedInUser) return;
  const studentId = button.dataset.revokeStudentId;
  const student = linkedStudents.find((item) => item.studentId === studentId);
  if (!studentId || !student) return;
  const confirmed = globalThis.confirm?.(`解除你与“${student.displayName || "这位学生"}”的关联吗？学生账号和学习记录不会受到影响。`);
  if (!confirmed) return;

  button.disabled = true;
  if (relationshipManageStatus) relationshipManageStatus.textContent = "正在解除关联...";
  try {
    await apiClient.revokeOwnStudentRelationship({ studentId });
    if (relationshipManageStatus) relationshipManageStatus.textContent = "关联已解除。";
    await loadLinkedStudents();
  } catch (error) {
    if (relationshipManageStatus) {
      relationshipManageStatus.textContent =
        error?.code === "student_relationship_not_active" ? "这条关联已经失效。" : "暂时无法解除关联。";
    }
  } finally {
    button.disabled = false;
  }
});

async function initialize() {
  if (await loadSession()) await loadLinkedStudents();
}

void initialize();
