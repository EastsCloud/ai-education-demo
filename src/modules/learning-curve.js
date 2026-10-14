import { escapeHtml } from "../core/html.js?v=content-safety-1";

function boundedProgress(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(1.15, Math.max(0, numeric)) : 0;
}

function getProgressCurvePoints(curve) {
  const dynamicCurve = curve.dynamicProgressCurve || curve.progressCurve;
  const gapCurve = curve.gapCurve || curve.progressCurve.map((progress) => 1 - progress);

  return curve.progressCurve.map((progress, index) => ({
    week: index + 1,
    staticProgress: boundedProgress(progress),
    dynamicProgress: boundedProgress(dynamicCurve[index]),
    gap: gapCurve[index],
    staticLabel: `${Math.round(progress * 100)}%`,
    dynamicLabel: `${Math.round(dynamicCurve[index] * 100)}%`,
  }));
}

function renderGoalSelect({ name, label, options, selected, formatOption = (value) => value }) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">
        ${options
          .map((option) => {
            const value = typeof option === "object" ? option.targetGrade : option;
            const copy = typeof option === "object" ? option.label : formatOption(option);
            return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(copy)}</option>`;
          })
          .join("")}
      </select>
    </label>
  `;
}

function renderLearningGoalEditor({ learningGoal, learningGoalDraft, learningGoalOptions, canConfigureGoal }) {
  if (!canConfigureGoal) {
    return `
      <article class="learning-goal-gate">
        <span>下一步</span>
        <strong>完成数学起点测试后，再一起定下目标和学习节奏。</strong>
      </article>
    `;
  }

  const options = learningGoalOptions || { targets: [], rhythm: {} };
  const collaborationCopy =
    learningGoalDraft?.confirmationStatus === "prefilled"
      ? "家长或老师先给了一个建议；你可以一起调整，再确认曲线。"
      : learningGoalDraft?.confirmationStatus === "student_confirmed"
        ? "这组目标和节奏已经由你确认。"
        : "自己定下目标与节奏；有家长建议时，也可以一起确认。";
  return `
    <form class="learning-goal-form" id="learning-goal-rhythm-form">
      <div class="learning-goal-form-heading">
        <span>确认</span>
        <strong>目标和节奏</strong>
      </div>
      <p class="learning-goal-collaboration">${collaborationCopy}</p>
      <div class="learning-goal-fields">
        ${renderGoalSelect({
          name: "targetGrade",
          label: "目标水平",
          options: options.targets,
          selected: learningGoal.targetGrade,
        })}
        ${renderGoalSelect({
          name: "durationWeeks",
          label: "学习周期",
          options: options.rhythm?.durationWeeks || [],
          selected: learningGoal.durationWeeks,
          formatOption: (value) => `${value} 周`,
        })}
        ${renderGoalSelect({
          name: "dailyStudyMinutes",
          label: "每天",
          options: options.rhythm?.dailyStudyMinutes || [],
          selected: learningGoal.dailyStudyMinutes,
          formatOption: (value) => `${value} 分钟`,
        })}
        ${renderGoalSelect({
          name: "weeklyStudyDays",
          label: "每周",
          options: options.rhythm?.weeklyStudyDays || [],
          selected: learningGoal.weeklyStudyDays,
          formatOption: (value) => `${value} 天`,
        })}
      </div>
      <p>改动后，右侧曲线会立刻按新的目标和节奏重算；确认曲线前不会改写今天的任务。</p>
    </form>
  `;
}

export function renderLearningCurveOverview({
  canConfigureGoal = false,
  generatedStaticCurve,
  initialLearningCurve,
  learningGoal,
  learningGoalDraft,
  learningGoalOptions,
  onLearningGoalDraftChange,
  percent,
  statisticalBaseline,
}) {
  const activeCurve = generatedStaticCurve || initialLearningCurve;
  const goalSummary = document.querySelector("#goal-summary");
  if (goalSummary) {
    const feasibility = activeCurve.feasibility || {
      status: "feasible",
      statusCopy: "系统正在根据当前信息生成这条曲线",
      recommendation: "之后由阶段测试继续校准。",
    };
    goalSummary.innerHTML = `
      <article>
        <span>目标</span>
        <strong>${escapeHtml(learningGoal.targetDescription)}</strong>
      </article>
      <article>
        <span>目标达成</span>
        <strong>${percent(activeCurve.currentPoint.progressTowardTarget)}</strong>
      </article>
      <article>
        <span>学习参数</span>
        <strong>${learningGoal.durationWeeks} 周 · 每天 ${learningGoal.dailyStudyMinutes} 分钟 · 每周 ${learningGoal.weeklyStudyDays} 天</strong>
      </article>
      <article class="curve-feasibility ${escapeHtml(feasibility.status)}">
        <span>这条曲线</span>
        <strong>${escapeHtml(feasibility.statusCopy)}</strong>
        <p>${escapeHtml(feasibility.recommendation)}</p>
      </article>
      ${renderLearningGoalEditor({ learningGoal, learningGoalDraft, learningGoalOptions, canConfigureGoal })}
      <p>${escapeHtml(statisticalBaseline.commonRecoveryPattern)}</p>
      <p>${escapeHtml(activeCurve.guardrail || initialLearningCurve.updatePolicy.reason)}</p>
    `;
    goalSummary.querySelector("#learning-goal-rhythm-form")?.addEventListener("change", (event) => {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      onLearningGoalDraftChange?.({
        targetGrade: values.targetGrade,
        durationWeeks: Number(values.durationWeeks),
        dailyStudyMinutes: Number(values.dailyStudyMinutes),
        weeklyStudyDays: Number(values.weeklyStudyDays),
      });
    });
  }

  const progressCurveMap = document.querySelector("#progress-curve-map");
  if (progressCurveMap) {
    progressCurveMap.innerHTML = `
      <div class="curve-legend">
        <span><i class="static-dot"></i>静态曲线</span>
        <span><i class="dynamic-dot"></i>动态曲线</span>
      </div>
      ${getProgressCurvePoints(activeCurve)
        .map(
          (point) => `
            <article style="--static-progress: ${point.staticProgress}; --dynamic-progress: ${point.dynamicProgress}">
              <i class="static-point" aria-label="第 ${point.week} 周静态 ${point.staticLabel}"></i>
              <i class="dynamic-point" aria-label="第 ${point.week} 周动态 ${point.dynamicLabel}"></i>
              <strong>第 ${point.week} 周</strong>
              <span>${point.dynamicLabel}</span>
            </article>
          `,
        )
        .join("")}
    `;
  }

  const curveOptionGrid = document.querySelector("#curve-option-grid");
  if (curveOptionGrid) {
    curveOptionGrid.innerHTML = initialLearningCurve.aheadOfPlanOptions
      .map(
        (option) => `
          <article class="${option.isDefault ? "default-option" : ""}">
            <span>${escapeHtml(option.title)}${option.isDefault ? " · 默认" : ""}</span>
            <strong>${escapeHtml(option.result)}</strong>
            <p>${escapeHtml(option.description)}</p>
          </article>
        `,
      )
      .join("");
  }

  const testCadenceGrid = document.querySelector("#test-cadence-grid");
  if (testCadenceGrid) {
    const cadence = initialLearningCurve.updatePolicy.assessmentCadence;
    testCadenceGrid.innerHTML = `
      <article>
        <span>建议测试</span>
        <strong>${cadence.suggestedAfterPracticeDays} 天后</strong>
        <p>${escapeHtml(cadence.nextSuggestedTest)}，学生可以选择接受或跳过。</p>
      </article>
      <article>
        <span>必须测试</span>
        <strong>${cadence.mandatoryAfterPracticeDays} 天内</strong>
        <p>${escapeHtml(cadence.nextMandatoryTest)}，否则动态曲线不再继续校准。</p>
      </article>
      <article>
        <span>测试间隔</span>
        <strong>系统默认节奏</strong>
        <p>默认每 ${cadence.defaultIntervalDays} 天一次；已关联家长或老师可以按学科和目标调整。</p>
      </article>
    `;
  }
}
