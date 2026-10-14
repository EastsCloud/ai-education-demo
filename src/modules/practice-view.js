import { escapeHtml } from "../core/html.js?v=content-safety-1";
import { createMathAnswerInput } from "../services/math-answer-input.js?v=math-answer-input-fraction-1";

function answerInputLabel(kind) {
  if (kind === "clock_time") return "填写时刻";
  if (kind === "fraction") return "填写分数，例如 2/3";
  return "填写数字答案";
}

function answerInputMarkup(answerInput) {
  const definition = createMathAnswerInput({ kind: answerInput?.kind });
  const step = definition.step === null || definition.step === undefined ? "" : ` step="${escapeHtml(String(definition.step))}"`;
  const inputMode = definition.inputMode ? ` inputmode="${escapeHtml(definition.inputMode)}"` : "";
  return `type="${escapeHtml(definition.htmlInputType)}"${step}${inputMode} placeholder="${escapeHtml(definition.placeholder)}" aria-label="${escapeHtml(answerInputLabel(definition.kind))}"`;
}

export function renderQuestionView({
  activeQuestion,
  canAdvanceQuestion,
  currentQuestionIndex,
  nextQuestion,
  practiceSequenceLength,
  questionStage,
  questionText,
  fuzzyProgress,
  stepStrip,
  answerInput,
}) {
  questionText.textContent = activeQuestion.prompt;
  if (stepStrip) stepStrip.innerHTML = activeQuestion.steps.map((step) => `<span>${escapeHtml(step)}</span>`).join("");
  questionStage.textContent = activeQuestion.knowledgePoint || "先试一试";
  if (answerInput) {
    const definition = createMathAnswerInput({ kind: activeQuestion.answerInput?.kind });
    answerInput.type = definition.htmlInputType;
    answerInput.placeholder = definition.placeholder;
    answerInput.setAttribute("aria-label", answerInputLabel(definition.kind));
    if (definition.step === null || definition.step === undefined) answerInput.removeAttribute("step");
    else answerInput.setAttribute("step", String(definition.step));
    if (definition.inputMode) answerInput.setAttribute("inputmode", definition.inputMode);
    else answerInput.removeAttribute("inputmode");
  }
  if (fuzzyProgress) {
    const progress = Math.min(92, Math.max(8, Math.round(8 + ((currentQuestionIndex + 1) / practiceSequenceLength) * 82)));
    fuzzyProgress.setAttribute("aria-valuenow", String(progress));
    fuzzyProgress.querySelector("i").style.width = `${progress}%`;
  }
  nextQuestion.textContent =
    activeQuestion.atlasExploration
      ? "完成探索"
      : currentQuestionIndex >= practiceSequenceLength - 1
      ? activeQuestion.extraPracticeMode
        ? "完成这组加练"
        : "完成今日练习"
      : "下一题";
  nextQuestion.disabled = !canAdvanceQuestion;
  nextQuestion.hidden = !canAdvanceQuestion;
}

export function renderHintStack({
  activeQuestion,
  hintNote,
  hintStack,
  revealHint,
  revealedHints,
  supportCue,
  supportModeId,
  helpEntryStyle = "self_then_choose",
}) {
  hintStack.innerHTML = "";
  const hintCount = Number.isFinite(Number(activeQuestion.hintCount))
    ? Number(activeQuestion.hintCount)
    : activeQuestion.hints.length;

  activeQuestion.hints.slice(0, revealedHints).forEach((hint) => {
    const item = document.createElement("article");
    item.className = "hint";
    item.innerHTML = `<strong>${escapeHtml(hint.title)}</strong><span>${escapeHtml(hint.body)}</span>`;
    hintStack.appendChild(item);
  });

  hintNote.textContent =
    revealedHints === 0 && supportCue
      ? supportCue
      : revealedHints > 0
        ? "提示会留在这里，慢慢接着想。"
        : "先试一试，卡住再打开。";
  revealHint.disabled = revealedHints >= hintCount;
  revealHint.textContent =
    revealedHints >= hintCount
      ? "已打开全部提示"
      : revealedHints === 0 && helpEntryStyle === "private_reassurance"
        ? "需要时，自己打开第一层提示"
      : revealedHints === 0 && supportModeId === "independent_retry"
        ? "需要时打开第一层提示"
        : revealedHints === 0
          ? "给我一点提示"
          : "打开下一层提示";
}

export function renderPreviousAttempt({ activeQuestion, previousAttempt }) {
  if (!previousAttempt) return;

  const reference = activeQuestion.previousAttemptReference;
  if (!reference?.availableBeforeHints) {
    previousAttempt.innerHTML = "";
    return;
  }

  const isCorrectReview = reference.recallKind === "previous_independent_correct_attempt";
  const title = isCorrectReview ? "回忆之前做过的相近题" : "看上次原题和自己的答案";

  previousAttempt.innerHTML = `
    <button class="previous-attempt-button" type="button" id="open-previous-attempt">
      <span>先回忆</span>
      <strong>${escapeHtml(title)}</strong>
    </button>
    <div class="previous-attempt-detail" id="previous-attempt-detail" hidden>
      ${reference.intro ? `<span>${escapeHtml(reference.intro)}</span>` : ""}
      <p>${escapeHtml(reference.sourcePrompt)}</p>
      <b>你之前的答案：${escapeHtml(reference.studentAnswerDisplay ?? reference.studentAnswer)}</b>
    </div>
  `;
}

export function renderSupportModes({ activeQuestion, guidedStepIndex, guidedMode, strategyList, guidedStructurePreferred = false }) {
  if (strategyList) {
    const strategies = activeQuestion.solutionStrategies?.length
      ? activeQuestion.solutionStrategies
      : [
          {
            id: "generated_steps",
            name: "步骤法",
            bestFor: "适合按固定流程稳定解题。",
            steps: activeQuestion.steps,
          },
        ];

    strategyList.innerHTML = strategies
      .map((strategy) => {
        const strategyId = String(strategy.id || "").trim();
        const strategyAttribute = strategyId ? ` data-solution-strategy-id="${escapeHtml(strategyId)}"` : "";
        return `
          <details class="strategy-card"${strategyAttribute}>
            <summary>
              <strong>${escapeHtml(strategy.name)}</strong>
              <span>${escapeHtml(strategy.bestFor)}</span>
            </summary>
            <p>${strategy.steps.slice(0, 3).map(escapeHtml).join(" → ")}</p>
          </details>
        `;
      })
      .join("");
  }

  if (!guidedMode) return;

  const steps = activeQuestion.guidedMode?.steps || [];
  const totalStepCount = Number.isFinite(Number(activeQuestion.guidedStepCount))
    ? Number(activeQuestion.guidedStepCount)
    : steps.length;
  const serverGuided = Boolean(activeQuestion.serverAuthoritative);
  const visibleSteps = serverGuided ? steps : steps.slice(0, guidedStepIndex + 1);
  const currentStep = visibleSteps.at(-1) || null;
  const currentStepRecorded = currentStep?.responseStatus && currentStep.responseStatus !== "needs_retry";
  const canOpenNext = serverGuided
    ? steps.length < totalStepCount && (!currentStep || Boolean(currentStepRecorded))
    : guidedStepIndex < steps.length - 1;
  const guidedProcessComplete =
    serverGuided && visibleSteps.length === totalStepCount && currentStep?.responseStatus === "confirmed";

  function responseControl(step, index) {
    const isCurrentStep = index === visibleSteps.length - 1;
    if (step.responseStatus === "confirmed") return '<em class="guided-response-state">这一步核对完成。</em>';
    if (step.responseStatus === "recorded") return '<em class="guided-response-state">这一步已记录。</em>';
    if (!isCurrentStep) return "";

    const finalAnswer = step.responseType === "final_answer";
    const retryMessage =
      step.responseStatus === "needs_retry"
        ? '<em class="guided-response-state retry">再检查关系和计算，然后再试一次。</em>'
        : "";
    return `
      ${retryMessage}
      <div class="guided-response-control">
        <label for="guided-response-input">${finalAnswer ? "写下你算出的结果" : "写下这一小步的想法"}</label>
        <input
          id="guided-response-input"
          ${finalAnswer ? answerInputMarkup(step.answerInput) : 'type="text" maxlength="360"'}
        />
        <button class="secondary-action" type="button" id="guided-submit-step">完成这一步</button>
      </div>
    `;
  }

  guidedMode.innerHTML = `
    <div class="guided-head">
      <strong>${guidedStructurePreferred ? "按步骤想一想" : "分步引导模式"}</strong>
      <button class="secondary-action" type="button" id="guided-next-step" ${canOpenNext ? "" : "disabled"}>
        下一步
      </button>
    </div>
    <ol>
      ${visibleSteps
        .map(
          (step, index) => `
            <li>
              <span>${escapeHtml(step.prompt)}</span>
              ${
                serverGuided
                  ? responseControl(step, index)
                  : `<em>${escapeHtml(step.expected || "完成这一步后，再打开下一步。")}</em>`
              }
            </li>
          `,
        )
        .join("")}
    </ol>
    ${guidedProcessComplete ? '<button class="secondary-action" type="button" id="guided-export-process">导出过程</button>' : ""}
  `;
}
