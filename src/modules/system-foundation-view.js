import { summarizeMathLogicCoverage } from "./math-question-logic.js?v=math-logic-library-2";

function renderVersionCards({ aiVersionProfiles, activeVersionId, onVersionChange }) {
  return aiVersionProfiles
    .map(
      (profile) => `
        <button class="system-version-card ${profile.id === activeVersionId ? "active" : ""}" type="button" data-ai-version="${profile.id}">
          <strong>${profile.name}</strong>
          <span>${profile.id === "semi_ai" ? "规则生成 + 行为匹配" : "AI 候选 + 同一校验器"}</span>
        </button>
      `,
    )
    .join("");
}

function renderCoverageBars(itemFamilies) {
  const coverage = summarizeMathLogicCoverage(itemFamilies);
  const max = Math.max(...coverage.map((item) => item.itemFamilyCount));

  return coverage
    .map(
      (item) => `
        <article class="math-coverage-row">
          <div>
            <strong>${item.grade}</strong>
            <span>${item.itemFamilyCount} 类题型</span>
          </div>
          <i style="--coverage: ${(item.itemFamilyCount / max) * 100}%"></i>
          <p>${item.families.slice(0, 4).join(" / ")}${item.families.length > 4 ? " ..." : ""}</p>
        </article>
      `,
    )
    .join("");
}

function renderContract(contract) {
  return `
    <div class="delivery-contract">
      <strong>${contract.aiVersion === "full_ai_ready" ? "全 AI 出题边界" : "半 AI 出题边界"}</strong>
      <p>题源：${contract.sourceModes.join(" / ")}</p>
      <p>学生端只接收：${contract.studentPayload.join(" / ")}</p>
      <p>后台隐藏：${contract.hiddenBackendPayload.join(" / ")}</p>
    </div>
  `;
}

function renderAccountFoundation(accountContext) {
  if (!accountContext) return "";

  return `
    <div class="account-foundation">
      <strong>用户与权限底层</strong>
      <div class="account-foundation-grid">
        <article>
          <span>学生</span>
          <b>${accountContext.selectedStudent?.displayName || "未选择"}</b>
        </article>
        <article>
          <span>家长</span>
          <b>${accountContext.guardians.length} 个绑定</b>
        </article>
        <article>
          <span>老师</span>
          <b>${accountContext.teachers.length} 个绑定</b>
        </article>
        <article>
          <span>角色</span>
          <b>${accountContext.roleCount} 条记录</b>
        </article>
      </div>
      <p>学生端只保留头像、昵称、页面风格等轻设置；家长 / 老师端可配置报告模块和学习参数。</p>
    </div>
  `;
}

function renderStudentPlanRecord(studentPlanRecord) {
  if (!studentPlanRecord) {
    return `
      <div class="student-plan-record">
        <strong>学生计划记录</strong>
        <p>尚无已保存的学习计划。确认静态曲线或学习参数提案后，会生成可追溯记录。</p>
      </div>
    `;
  }

  return `
    <div class="student-plan-record">
      <strong>学生计划记录</strong>
      <div>
        <span>${studentPlanRecord.status === "active" ? "已激活" : "计划中"}</span>
        <b>${studentPlanRecord.curveProposalHistory.length} 次曲线提案确认</b>
      </div>
      <div>
        <span>正式测试</span>
        <b>${studentPlanRecord.stageAssessmentHistory?.length || 0} 次留痕 · ${studentPlanRecord.dynamicCurve?.canUpdate ? "动态曲线已校准" : "等待正式测试"}</b>
      </div>
      <p>${studentPlanRecord.persistence === "browser_local_record" ? "当前原型已保存到本机浏览器；后续会替换为云端学生计划表。" : "等待写入学生计划记录。"}</p>
    </div>
  `;
}

function renderLearningEvidence(learningEvidence) {
  if (!learningEvidence?.answerEventCount) {
    return `
      <div class="learning-evidence-ledger">
        <strong>题目学习证据</strong>
        <p>等待带标签的作答记录。每次正式作答都会同时写入能力维度、知识图鉴节点、变式等级和提示使用情况。</p>
      </div>
    `;
  }

  const observed = learningEvidence.dimensions
    .slice()
    .sort((a, b) => b.attempts - a.attempts || a.observedScore - b.observedScore)
    .slice(0, 3);

  return `
    <div class="learning-evidence-ledger">
      <strong>题目学习证据</strong>
      <span>${learningEvidence.answerEventCount} 次带标签作答 · 仅影响画像、报告和明日出题</span>
      ${observed
        .map(
          (item) => `
            <article>
              <b>${item.label}</b>
              <span>${item.attempts} 次证据 · 独立完成 ${item.independentCorrect} 次 · 观察分 ${Math.round(item.observedScore * 100)}%</span>
            </article>
          `,
        )
        .join("")}
      <p>${learningEvidence.guardrail}</p>
    </div>
  `;
}

function renderGeneratorComparison(generatorComparison = []) {
  if (!generatorComparison.length) return "";

  return `
    <div class="generator-comparison">
      <strong>两版出题路径</strong>
      ${generatorComparison
        .map(
          (version) => `
            <article>
              <span>${version.label}</span>
              <b>${version.validatedCount}/${version.totalCount} 通过校验</b>
              <p>${version.source}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderRoleReportConfigs(roleReportConfigSummary = []) {
  if (!roleReportConfigSummary.length) return "";

  return `
    <div class="role-report-configs">
      <strong>报告配置边界</strong>
      ${roleReportConfigSummary
        .map(
          (configuration) => `
            <article>
              <span>${configuration.role}</span>
              <b>${configuration.visibleCount} 个模块 · 首屏 ${configuration.firstScreenMetricLimit} 个指标</b>
              <p>隐藏：${configuration.protects}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderReportConfigRuntime(reportConfigSnapshot) {
  if (!reportConfigSnapshot?.activeConfig) return "";
  const config = reportConfigSnapshot.activeConfig;
  const moduleOptions = Array.from(
    new Set(reportConfigSnapshot.configs.flatMap((item) => [...item.visibleModules, ...item.hiddenModules])),
  );

  return `
    <div class="report-config-runtime">
      <div class="report-config-head">
        <strong>家长 / 老师报告配置</strong>
        <select id="report-config-role" aria-label="选择报告角色">
          ${reportConfigSnapshot.configs
            .map(
              (item) => `
                <option value="${item.role}" ${item.role === reportConfigSnapshot.activeRole ? "selected" : ""}>${item.role}</option>
              `,
            )
            .join("")}
        </select>
      </div>
      <div class="report-module-options">
        ${moduleOptions
          .map(
            (moduleId) => `
              <label>
                <input type="checkbox" data-report-module="${moduleId}" ${config.visibleModules.includes(moduleId) ? "checked" : ""} />
                <span>${moduleId}</span>
              </label>
            `,
          )
          .join("")}
      </div>
      <p>这个配置属于家长 / 老师观察端；学生端仍只看简化报告。</p>
    </div>
  `;
}

function renderObserverWorkspace({ abilityMap, assessmentSession, reportConfigSnapshot, studentPlanRecord }) {
  const config = reportConfigSnapshot?.activeConfig;
  if (!config || config.role === "student") return "";

  const strongest = abilityMap?.dimensions?.slice().sort((a, b) => b.score - a.score)[0];
  const weakest = abilityMap?.dimensions?.slice().sort((a, b) => a.score - b.score)[0];
  const roleLabel = config.role === "parent" ? "家长" : "老师";
  const roleAction =
    config.role === "parent"
      ? "关注节奏、独立完成和需要鼓励的地方。"
      : "关注能力证据、题型标签和下一轮教学切入点。";

  return `
    <div class="observer-workspace">
      <div class="report-config-head">
        <strong>${roleLabel}观察首屏</strong>
        <span>${config.visibleModules.length} 个已选模块</span>
      </div>
      <div class="observer-metric-grid">
        <article><span>当前起点</span><b>${Math.round((abilityMap?.overallLevel || 0) * 100)}%</b></article>
        <article><span>测试回答</span><b>${assessmentSession?.responseCount || 0} 条</b></article>
        <article><span>学习计划</span><b>${studentPlanRecord?.status === "active" ? "进行中" : "待确认"}</b></article>
      </div>
      <p><strong>最稳：</strong>${strongest?.name || "等待测试证据"}。<strong>优先关注：</strong>${weakest?.name || "等待测试证据"}。</p>
      <p>${roleAction}</p>
    </div>
  `;
}

function renderLearningParameterRuntime(parameterSnapshot, curveProposal) {
  if (!parameterSnapshot || !curveProposal) return "";
  const fields = [
    ["durationWeeks", "总周期"],
    ["dailyStudyMinutes", "每日分钟"],
    ["weeklyStudyDays", "每周天数"],
    ["testIntervalPracticeDays", "测试间隔"],
    ["curveAdjustmentMode", "曲线模式"],
  ];

  return `
    <div class="learning-parameter-runtime">
      <div class="report-config-head">
        <strong>学习参数配置</strong>
        <select id="learning-parameter-role" aria-label="选择学习参数角色">
          ${["parent", "teacher"]
            .map(
              (role) => `
                <option value="${role}" ${role === parameterSnapshot.selectedRole ? "selected" : ""}>${role}</option>
              `,
            )
            .join("")}
        </select>
      </div>
      <div class="learning-parameter-grid">
        ${fields
          .map(([key, label]) => {
            const options = parameterSnapshot.options[key] || [];
            return `
              <label>
                <span>${label}</span>
                <select data-learning-parameter="${key}">
                  ${options
                    .map(
                      (option) => `
                        <option value="${option}" ${String(option) === String(parameterSnapshot.values[key]) ? "selected" : ""}>${option}</option>
                      `,
                    )
                    .join("")}
                </select>
              </label>
            `;
          })
          .join("")}
      </div>
      <div class="curve-proposal-card">
        <span>${curveProposal.modeExplanation}</span>
        <strong>${Math.round(curveProposal.expectedTerminalLevel * 100)}%</strong>
        <p>预计 ${curveProposal.expectedWeeksToOriginalGoal} 周达到原目标。参数变更先形成曲线提案，再由确认动作落库。</p>
        <button class="primary-action" type="button" data-confirm-learning-proposal ${parameterSnapshot.editable ? "" : "disabled"}>确认这个曲线提案</button>
        ${
          parameterSnapshot.latestConfirmedProposal
            ? `<p class="proposal-confirmation">已确认 ${parameterSnapshot.confirmedProposals.length} 次。最近一次：${parameterSnapshot.latestConfirmedProposal.actorRole} 确认 ${Math.round(parameterSnapshot.latestConfirmedProposal.expectedTerminalLevel * 100)}% 目标结果。</p>`
            : '<p class="proposal-confirmation">尚未确认新的曲线提案。</p>'
        }
      </div>
    </div>
  `;
}

export function renderSystemFoundation({
  accountContext,
  appState,
  aiVersionProfiles,
  generatorComparison,
  itemFamilies,
  learningEvidence,
  learningParameterSnapshot,
  learningParameterProposal,
  onLearningParameterChange,
  onLearningParameterConfirm,
  onLearningParameterRoleChange,
  onReportConfigModuleToggle,
  onReportConfigRoleChange,
  questionSourceContract,
  research,
  reportConfigSnapshot,
  roleReportConfigSummary,
  assessmentSession,
  abilityMap,
  studentPlanRecord,
}) {
  const panel = document.querySelector("#system-foundation-panel");
  if (!panel) return;

  const snapshot = appState.getSnapshot();
  panel.innerHTML = `
    <div class="panel-heading compact-heading">
      <p class="label">后台数学逻辑库</p>
      <h3>上海小学数学 1-6 年级作为整体研究框架，不只做一个样题。</h3>
    </div>
    <div class="system-foundation-grid">
      <section>
        <div class="system-version-grid">
          ${renderVersionCards({
            aiVersionProfiles,
            activeVersionId: snapshot.aiVersion,
          })}
        </div>
        ${renderContract(questionSourceContract)}
        ${renderAccountFoundation(accountContext)}
        ${renderStudentPlanRecord(studentPlanRecord)}
        ${renderLearningEvidence(learningEvidence)}
        ${renderGeneratorComparison(generatorComparison)}
        ${renderRoleReportConfigs(roleReportConfigSummary)}
        ${renderReportConfigRuntime(reportConfigSnapshot)}
        ${renderObserverWorkspace({ abilityMap, assessmentSession, reportConfigSnapshot, studentPlanRecord })}
        ${renderLearningParameterRuntime(learningParameterSnapshot, learningParameterProposal)}
      </section>
      <section class="math-coverage-list">
        <strong>${research.scope}</strong>
        ${renderCoverageBars(itemFamilies)}
      </section>
    </div>
  `;

  panel.querySelectorAll("[data-ai-version]").forEach((button) => {
    button.addEventListener("click", () => appState.setAiVersion(button.dataset.aiVersion));
  });
  panel.querySelector("#report-config-role")?.addEventListener("change", (event) => {
    onReportConfigRoleChange?.(event.target.value);
  });
  panel.querySelectorAll("[data-report-module]").forEach((input) => {
    input.addEventListener("change", () => onReportConfigModuleToggle?.(input.dataset.reportModule));
  });
  panel.querySelector("#learning-parameter-role")?.addEventListener("change", (event) => {
    onLearningParameterRoleChange?.(event.target.value);
  });
  panel.querySelectorAll("[data-learning-parameter]").forEach((select) => {
    select.addEventListener("change", () => onLearningParameterChange?.(select.dataset.learningParameter, select.value));
  });
  panel.querySelector("[data-confirm-learning-proposal]")?.addEventListener("click", () => {
    onLearningParameterConfirm?.();
  });
}
