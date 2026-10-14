function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAvatar(preferences) {
  if (preferences.avatarDataUrl) {
    return `<img src="${escapeHtml(preferences.avatarDataUrl)}" alt="${escapeHtml(preferences.displayName)}的头像" />`;
  }
  return `<span>${escapeHtml(preferences.displayName?.slice(0, 1) || "我")}</span>`;
}

export function updateStudentProfileTrigger({ preferences }) {
  const trigger = document.querySelector("#student-profile-trigger");
  if (!trigger) return;
  trigger.innerHTML = renderAvatar(preferences);
  trigger.setAttribute("aria-label", `${preferences.displayName}的个人设置`);
}

export function renderStudentSettings({ container, preferences, open, onAvatarChange, onClose, onSave, saveState = "" }) {
  if (!container) return;
  container.hidden = !open;
  if (!open) return;
  const saveStateMarkup = saveState
    ? `<p class="student-settings-save-state" role="status">${escapeHtml(saveState)}</p>`
    : "";

  container.innerHTML = `
    <div class="student-settings-scrim" data-close-student-settings></div>
    <aside class="student-settings-drawer" role="dialog" aria-modal="true" aria-labelledby="student-settings-title">
      <div class="student-settings-head">
        <div>
          <p class="label">我的学习空间</p>
          <h2 id="student-settings-title">让这里更像你。</h2>
        </div>
        <button class="student-settings-close" type="button" data-close-student-settings aria-label="关闭个人设置">×</button>
      </div>
      <form id="student-settings-form">
        ${saveStateMarkup}
        <div class="student-avatar-editor">
          <label class="student-avatar-preview" for="student-avatar-input">${renderAvatar(preferences)}</label>
          <div>
            <label for="student-avatar-input">头像</label>
            <span>点一下可以换一张照片</span>
          </div>
          <input id="student-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" />
        </div>
        <label class="student-settings-field" for="student-display-name">
          <span>昵称</span>
          <input id="student-display-name" name="displayName" maxlength="20" value="${escapeHtml(preferences.displayName)}" />
        </label>
        <fieldset class="student-settings-field">
          <legend>页面感觉</legend>
          <div class="student-style-picker">
            <label class="warm ${preferences.pageStyle === "warm" ? "selected" : ""}">
              <input type="radio" name="pageStyle" value="warm" ${preferences.pageStyle === "warm" ? "checked" : ""} />
              <i></i><span>温和</span>
            </label>
            <label class="focus ${preferences.pageStyle === "focus" ? "selected" : ""}">
              <input type="radio" name="pageStyle" value="focus" ${preferences.pageStyle === "focus" ? "checked" : ""} />
              <i></i><span>专注</span>
            </label>
            <label class="lively ${preferences.pageStyle === "lively" ? "selected" : ""}">
              <input type="radio" name="pageStyle" value="lively" ${preferences.pageStyle === "lively" ? "checked" : ""} />
              <i></i><span>明亮</span>
            </label>
          </div>
        </fieldset>
        <fieldset class="student-settings-field">
          <legend>阅读密度</legend>
          <div class="student-density-picker">
            <label><input type="radio" name="informationDensity" value="relaxed" ${preferences.informationDensity === "relaxed" ? "checked" : ""} />舒展</label>
            <label><input type="radio" name="informationDensity" value="standard" ${preferences.informationDensity === "standard" ? "checked" : ""} />标准</label>
          </div>
        </fieldset>
        <button class="primary-action" type="submit">保存设置</button>
        <a class="student-switch-account" href="./account.html">账号与安全</a>
        <a class="student-switch-account" href="./signin.html" data-account-switch>切换账号</a>
      </form>
    </aside>
  `;

  container.querySelectorAll("[data-close-student-settings]").forEach((button) => {
    button.addEventListener("click", () => onClose?.());
  });
  container.querySelector("#student-avatar-input")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) onAvatarChange?.(file);
  });
  container.querySelector("#student-settings-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave?.({
      displayName: String(form.get("displayName") || "").trim(),
      pageStyle: String(form.get("pageStyle") || "warm"),
      informationDensity: String(form.get("informationDensity") || "standard"),
    });
  });
}
