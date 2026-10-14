import { escapeHtml } from "../core/html.js?v=content-safety-1";
import { createMathAnswerInput } from "../services/math-answer-input.js?v=math-answer-input-fraction-1";

function getActiveQuestion(session) {
  if (!session || session.status === "completed_verified" || session.status === "completed_needs_review") return null;
  const answeredIds = new Set((session.responses || []).map((response) => response.questionId));
  return (session.presentationQuestions || []).find((question) => !answeredIds.has(question.id)) || null;
}

function renderStageError(error) {
  return error ? `<p class="stage-test-error" role="status">${escapeHtml(error)}</p>` : "";
}

function renderStageAnswerInput(answerInput) {
  const definition = createMathAnswerInput({ kind: answerInput?.kind });
  const inputMode = definition.inputMode ? ` inputmode="${escapeHtml(definition.inputMode)}"` : "";
  const step = definition.step === null || definition.step === undefined ? "" : ` step="${escapeHtml(String(definition.step))}"`;
  return `
    <input
      id="stage-assessment-answer"
      type="${escapeHtml(definition.htmlInputType)}"
      ${step}
      autocomplete="off"
      placeholder="${escapeHtml(definition.placeholder)}"${inputMode}
    />
  `;
}

function renderWaitingState(cadence, error) {
  const waitingCopy =
    cadence?.status === "skipped"
      ? "今天先继续练习。完成下一组练习后，系统会再轻轻问你一次。"
      : cadence?.remainingPracticeDaysToSuggestion > 0
        ? `再完成 ${cadence.remainingPracticeDaysToSuggestion} 组学习日练习后，系统会邀请你安静地检查看看最近学会了什么。`
        : "系统会根据连续学习的证据，在合适的时候邀请你做一次阶段测试。";
  return `
    <div class="stage-test-intro stage-test-waiting">
      <div class="stage-test-orbit" aria-hidden="true"><i></i><b></b><em></em></div>
      <div>
        <span class="stage-test-kicker">阶段测试</span>
        <h3>先把今天这一组题做进去。</h3>
        <p>${waitingCopy}</p>
        ${renderStageError(error)}
      </div>
    </div>
  `;
}

function renderSuggestedState(error) {
  return `
    <div class="stage-test-intro">
      <div class="stage-test-orbit" aria-hidden="true"><i></i><b></b><em></em></div>
      <div>
        <span class="stage-test-kicker">阶段测试</span>
        <h3>用一次安静的检查看看最近学会了什么。</h3>
        <p>测试中不提供提示，也不会显示题目总数。完成后，系统才会校准学习曲线。</p>
        ${renderStageError(error)}
      </div>
      <div class="stage-test-actions">
        <button class="primary-action" type="button" id="start-stage-assessment">开始测试</button>
        <button class="secondary-action" type="button" id="skip-stage-assessment">今天先不测</button>
      </div>
    </div>
  `;
}

function renderMandatoryState(error) {
  return `
    <div class="stage-test-intro stage-test-mandatory">
      <div class="stage-test-orbit" aria-hidden="true"><i></i><b></b><em></em></div>
      <div>
        <span class="stage-test-kicker">阶段测试</span>
        <h3>该用一次测试校准接下来的学习曲线了。</h3>
        <p>它不会影响今天已经完成的练习；只会帮助系统更准确地安排之后的节奏。</p>
        ${renderStageError(error)}
      </div>
      <button class="primary-action" type="button" id="start-stage-assessment">开始测试</button>
    </div>
  `;
}

function renderReadyState(cadence, error) {
  if (cadence?.status === "mandatory") return renderMandatoryState(error);
  if (cadence?.status === "suggested") return renderSuggestedState(error);
  return renderWaitingState(cadence, error);
}

function renderInProgressState(session, cadence, error) {
  const question = getActiveQuestion(session);
  if (!question) return renderReadyState(cadence, error);
  const answeredCount = (session.responses || []).length;
  const totalCount = Math.max(1, (session.presentationQuestions || []).length);
  const fuzzyProgress = Math.min(0.92, 0.12 + (answeredCount / totalCount) * 0.78);

  return `
    <div class="stage-test-run" data-stage-test-session="${escapeHtml(session.id)}">
      <div class="stage-test-run-head">
        <span>保持自己的节奏</span>
        <div class="stage-test-progress" role="progressbar" aria-label="测试进展" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fuzzyProgress * 100)}">
          <i style="width: ${Math.round(fuzzyProgress * 100)}%"></i>
        </div>
      </div>
      <p class="stage-test-topic">${escapeHtml(question.knowledgePoint || "数学关系")}</p>
      <h3>${escapeHtml(question.prompt)}</h3>
      <div class="stage-test-answer-row">
        <label class="sr-only" for="stage-assessment-answer">你的答案</label>
        ${renderStageAnswerInput(question.answerInput)}
        <button class="primary-action" type="button" id="submit-stage-assessment-answer">继续</button>
      </div>
      <p class="stage-test-note">先自己作答，结果会在测试结束后一起呈现。</p>
      ${renderStageError(error)}
    </div>
  `;
}

function renderSelect(name, label, options, selected, formatOption) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">
        ${options
          .map(
            (option) => `<option value="${escapeHtml(option)}" ${Number(option) === Number(selected) ? "selected" : ""}>${escapeHtml(formatOption(option))}</option>`,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderCurvePreview(curve) {
  const values = Array.isArray(curve?.dynamicProgressCurve) ? curve.dynamicProgressCurve : [];
  if (values.length < 2) return "";

  const maxIndex = Math.max(values.length - 1, 1);
  const points = values.map((value, index) => {
    const progress = Math.max(0.05, Math.min(1.15, Number(value) || 0.05));
    return {
      x: 16 + (288 * index) / maxIndex,
      y: 128 - ((progress - 0.05) / 1.1) * 98,
    };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const lastPoint = points.at(-1);

  return `
    <svg class="student-curve-preview-graph" viewBox="0 0 320 144" role="img" aria-label="新的学习曲线预览">
      <path class="student-curve-preview-axis" d="M16 128 H304"></path>
      <path class="student-curve-preview-line" d="${path}"></path>
      <circle cx="${lastPoint.x.toFixed(1)}" cy="${lastPoint.y.toFixed(1)}" r="5"></circle>
    </svg>
  `;
}

function getStudentCurveModes(direction) {
  if (direction === "behind") {
    return [
      { id: "keep_study_intensity", title: "先稳住基础", copy: "按现在的时间，一步一步走稳" },
      { id: "keep_original_goal", title: "给自己多一点时间", copy: "把目标留着，慢慢把时间拉开" },
    ];
  }

  return [
    { id: "keep_study_intensity", title: "保持现在的节奏", copy: "按现在的时间继续走" },
    { id: "keep_original_goal", title: "更快到达现在的目标", copy: "把走得更快的部分用在时间上" },
  ];
}

function describeStudentCurveOutcome(curve, values) {
  const mode = values.curveAdjustmentMode;
  const originalTarget = Number(curve?.originalTargetProgress ?? curve?.targetProgress ?? 1);
  const expectedTerminal = Number(curve?.expectedTerminalProgress ?? originalTarget);
  const expectedCompletionWeeks = Number(curve?.expectedCompletionWeeks);
  const isBehind = curve?.updateEvidence?.direction === "behind";

  if (mode === "keep_original_goal") {
    if (expectedCompletionWeeks === 0) return "当前目标已经在眼前";
    if (Number.isFinite(expectedCompletionWeeks) && expectedCompletionWeeks <= values.durationWeeks) {
      return `预计约 ${expectedCompletionWeeks} 周到达当前目标`;
    }
    if (Number.isFinite(expectedCompletionWeeks)) return `给自己一点时间，预计约 ${expectedCompletionWeeks} 周到达当前目标`;
    return "先把基础走稳，再继续靠近当前目标";
  }

  if (isBehind) return "按这个节奏，先把基础走稳";
  if (expectedTerminal > originalTarget + 0.02) return "完成当前目标后，还会继续向前走";
  if (expectedTerminal < originalTarget - 0.02) return "先把基础走稳，再慢慢靠近当前目标";
  return "按这个节奏，稳稳走向当前目标";
}

function renderCurveAdjustment({ curve, draft, error, learningParameterConfig, testIntervalPracticeDays }) {
  if (!curve?.canUpdate || !learningParameterConfig) return "";

  const options = learningParameterConfig.options || {};
  const defaults = learningParameterConfig.defaults || {};
  const current = curve.adjustment?.parameters || curve.sourceInputs || {};
  const proposed = draft?.adjustment?.parameters || {};
  const values = {
    durationWeeks: proposed.durationWeeks || current.durationWeeks || defaults.durationWeeks,
    dailyStudyMinutes: proposed.dailyStudyMinutes || current.dailyStudyMinutes || defaults.dailyStudyMinutes,
    weeklyStudyDays: proposed.weeklyStudyDays || current.weeklyStudyDays || defaults.weeklyStudyDays,
    testIntervalPracticeDays:
      proposed.testIntervalPracticeDays || testIntervalPracticeDays || current.testIntervalPracticeDays || defaults.testIntervalPracticeDays,
    curveAdjustmentMode: proposed.curveAdjustmentMode || current.curveAdjustmentMode || defaults.curveAdjustmentMode,
  };
  const modes = getStudentCurveModes(curve.updateEvidence?.direction);
  const selectedMode = modes.some((mode) => mode.id === values.curveAdjustmentMode)
    ? values.curveAdjustmentMode
    : "keep_study_intensity";
  const confirmedCopy = curve.adjustment?.appliesFrom
    ? `<p class="student-curve-confirmed">现在的节奏会从下一学习日开始。</p>`
    : "";

  return `
    <details class="student-curve-adjustment" ${draft ? "open" : ""}>
      <summary>想调整接下来的学习节奏</summary>
      <p class="student-curve-adjustment-copy">今天已经完成的练习不会改变，新的节奏从下一学习日开始。</p>
      <form id="student-curve-adjustment-form">
        <div class="student-curve-selects">
          ${renderSelect("durationWeeks", "学习周期", options.durationWeeks || [], values.durationWeeks, (value) => `${value} 周`)}
          ${renderSelect("dailyStudyMinutes", "每天", options.dailyStudyMinutes || [], values.dailyStudyMinutes, (value) => `${value} 分钟`)}
          ${renderSelect("weeklyStudyDays", "每周", options.weeklyStudyDays || [], values.weeklyStudyDays, (value) => `${value} 天`)}
        </div>
        <input type="hidden" name="testIntervalPracticeDays" value="${values.testIntervalPracticeDays}" />
        <fieldset class="student-curve-modes">
          <legend>接下来想怎么走？</legend>
          <div>
            ${modes
              .map(
                (mode) => `
                  <label class="${selectedMode === mode.id ? "selected" : ""}">
                    <input type="radio" name="curveAdjustmentMode" value="${mode.id}" ${selectedMode === mode.id ? "checked" : ""} />
                    <strong>${mode.title}</strong>
                    <span>${mode.copy}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </fieldset>
        <button class="secondary-action" type="submit">看看新的曲线</button>
      </form>
      ${
        draft
          ? `
            <div class="student-curve-preview">
              <span>新的学习节奏</span>
              <strong>${escapeHtml(describeStudentCurveOutcome(draft, values))}</strong>
              <p>${values.durationWeeks} 周 · 每天 ${values.dailyStudyMinutes} 分钟 · 每周 ${values.weeklyStudyDays} 天</p>
              ${renderCurvePreview(draft)}
              <button class="primary-action" type="button" data-confirm-student-curve-adjustment>确认这个节奏</button>
            </div>
          `
          : confirmedCopy
      }
      ${error ? `<p class="student-curve-error">${escapeHtml(error)}</p>` : ""}
    </details>
  `;
}

function renderCompletedState(session, curveAdjustment) {
  const result = session.result || {};
  const curve = session.dynamicCurve || {};
  const correctCount = Math.max(0, Math.trunc(Number(result.correctCount) || 0));
  const accuracy = Math.max(0, Math.min(1, Number(result.accuracy) || 0));
  const transferAccuracy = Math.max(0, Math.min(1, Number(result.transferAccuracy) || 0));
  const directionCopy = {
    ahead: "比原计划走得更快一些",
    behind: "需要把接下来的节奏调得更稳一些",
    on_track: "正在按原来的节奏前进",
  };

  return `
    <div class="stage-test-result-wrap">
      <div class="stage-test-result">
        <div class="stage-test-result-mark" aria-hidden="true">✓</div>
        <div>
          <span class="stage-test-kicker">本次测试已完成</span>
          <h3>${directionCopy[curve.updateEvidence?.direction] || "结果已记录"}</h3>
          <p>正确完成 ${correctCount} 道。${curve.canUpdate ? "接下来的学习节奏已经更新。" : "这次的结果已经留好，之后会用来安排接下来的练习。"}</p>
        </div>
        <div class="stage-test-result-metrics" aria-label="测试摘要">
          <span><b>${Math.round(accuracy * 100)}%</b>正确率</span>
          <span><b>${Math.round(transferAccuracy * 100)}%</b>迁移表现</span>
        </div>
      </div>
      ${renderCurveAdjustment(curveAdjustment || {})}
    </div>
  `;
}

export function renderStageAssessment({
  container,
  session,
  cadence,
  error,
  curveAdjustment,
  onCurveAdjustmentPreview,
  onCurveAdjustmentConfirm,
}) {
  if (!container) return;

  if (!session || session.status === "ready") {
    container.innerHTML = renderReadyState(cadence, error);
    return;
  }

  if (
    (session.status === "completed_verified" || session.status === "completed_needs_review") &&
    Number(cadence?.practiceDaysSinceVerifiedTest || 0) > 0
  ) {
    container.innerHTML = renderReadyState(cadence, error);
    return;
  }

  if (session.status === "in_progress" || session.status === "ready_to_score") {
    container.innerHTML = renderInProgressState(session, cadence, error);
    return;
  }

  container.innerHTML = renderCompletedState(session, curveAdjustment);
  container.querySelector("#student-curve-adjustment-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    onCurveAdjustmentPreview?.({
      durationWeeks: Number(values.durationWeeks),
      dailyStudyMinutes: Number(values.dailyStudyMinutes),
      weeklyStudyDays: Number(values.weeklyStudyDays),
      testIntervalPracticeDays: Number(values.testIntervalPracticeDays),
      curveAdjustmentMode: String(values.curveAdjustmentMode || ""),
    });
  });
  container.querySelector("[data-confirm-student-curve-adjustment]")?.addEventListener("click", () => {
    onCurveAdjustmentConfirm?.();
  });
}
