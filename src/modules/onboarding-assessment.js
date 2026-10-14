import { escapeHtml } from "../core/html.js?v=content-safety-1";
import { renderAbilityDimensions, renderInitialAbilityResult } from "./ability-result.js?v=content-safety-1";
import { renderLearningCurveOverview } from "./learning-curve.js?v=content-safety-3";
import {
  generatePersonalityQuestionSets,
  scorePersonalityQuestionSets,
} from "../services/personality-assessment-engine.js?v=personality-runtime-5";
import {
  createMathAnswerInput,
  normalizeMathAnswerValue,
} from "../services/math-answer-input.js?v=math-answer-input-fraction-1";

function renderBasicInfoSelect(name, label, options, selected, disabled = false) {
  const isBirthdayPart = ["birthYear", "birthMonth", "birthDay"].includes(name);
  const selectionMissing = selected === null || selected === undefined || selected === "";
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}" required ${disabled ? "disabled" : ""}>
        <option value="" ${selectionMissing ? "selected" : ""}>请选择</option>
        ${options
          .map(
            (option) => {
              const value = isBirthdayPart ? option.value : option.id;
              return `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(option.label)}</option>`;
            },
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderBasicInfoEditor({ draft, options, saving = false }) {
  const values = draft?.basicInfo || {};
  return `
    <article class="onboarding-basic-info-editor">
      <form id="student-basic-info-form">
        <div class="onboarding-basic-info-fields">
          ${renderBasicInfoSelect("birthYear", "出生年份", options.birthYear, values.birthYear, saving)}
          ${renderBasicInfoSelect("birthMonth", "出生月份", options.birthMonth, values.birthMonth, saving)}
          ${renderBasicInfoSelect("birthDay", "出生日", options.birthDay, values.birthDay, saving)}
          ${renderBasicInfoSelect("gradeLevelOptionId", "当前年级", options.gradeLevel, values.gradeLevelOptionId, saving)}
          ${renderBasicInfoSelect("schoolCalendarStageOptionId", "当前阶段", options.schoolCalendarStage, values.schoolCalendarStageOptionId, saving)}
          ${renderBasicInfoSelect("routinePreferenceOptionId", "作息习惯", options.routinePreference, values.routinePreferenceOptionId, saving)}
          ${renderBasicInfoSelect("attentionSpanBandOptionId", "专注时长", options.attentionSpanBand, values.attentionSpanBandOptionId, saving)}
          ${renderBasicInfoSelect("readingComfortOptionId", "阅读舒适度", options.readingComfort, values.readingComfortOptionId, saving)}
          ${renderBasicInfoSelect("primaryDeviceOptionId", "主要设备", options.primaryDevice, values.primaryDeviceOptionId, saving)}
          ${renderBasicInfoSelect("curriculumSystemOptionId", "课程体系", options.curriculumSystem, values.curriculumSystemOptionId, saving)}
        </div>
        <div class="onboarding-basic-info-actions">
          <button class="secondary-action" type="button" data-cancel-basic-info-edit ${saving ? "disabled" : ""}>取消</button>
          <button class="primary-action" type="submit" ${saving ? "disabled" : ""}>${saving ? "正在保存..." : "确认这些信息"}</button>
        </div>
      </form>
    </article>
  `;
}

function renderSubjectSelection({ availableSubjects = [], onboardingPrefill, saving = false, error = "" }) {
  const target = document.querySelector("#onboarding-subject-selection");
  if (!target) return;

  const selectedSubjectIds = Array.isArray(onboardingPrefill?.subjectIds) ? onboardingPrefill.subjectIds : [];
  const confirmedAt = onboardingPrefill?.subjectSelectionConfirmedAt || null;
  const available = availableSubjects.filter((subject) => subject.status === "available");

  target.innerHTML = `
    <div class="onboarding-subject-grid">
      ${available
        .map((subject) => {
          const selected = selectedSubjectIds.includes(subject.id);
          const confirmed = selected && Boolean(confirmedAt);
          const action = confirmed ? "已选择" : selected ? "确认数学" : "选择数学";
          const cluster = subject.knowledgeClusters?.[0]?.name || "";
          return `
            <button
              class="onboarding-subject-choice ${confirmed ? "is-confirmed" : selected ? "is-suggested" : ""}"
              type="button"
              data-subject-select="${escapeHtml(subject.id)}"
              ${saving || confirmed ? "disabled" : ""}
            >
              <span class="subject-choice-orbit" aria-hidden="true"><i></i><b></b><em></em></span>
              <span class="subject-choice-copy"><strong>${escapeHtml(subject.name)}</strong><small>${escapeHtml(cluster)}</small></span>
              <span class="subject-choice-state">${saving ? "正在确认" : action}</span>
            </button>
          `;
        })
        .join("")}
    </div>
    ${error ? `<p class="onboarding-subject-save-error" role="alert">${escapeHtml(error)}</p>` : ""}
  `;
}

function getAbilityAssessmentStages({ abilityMap, assessmentModules, learningGoal, subjectSelection, percent }) {
  const activeModule = assessmentModules.find((module) => module.id === subjectSelection.assessmentModuleId);
  return [
    { step: "01", title: "确认学科", value: `${subjectSelection.subjectName} · ${subjectSelection.targetKnowledgeCluster}` },
    { step: "02", title: "进入测试模块", value: activeModule?.name || "学科能力测试模块" },
    {
      step: "03",
      title: "完成初始测试",
      value: "从当前年级的数学起点开始，按回答继续了解。",
    },
    {
      step: "04",
      title: "生成能力图",
      value: `起点 ${percent(abilityMap.overallLevel)} · 目标准备度 ${percent(abilityMap.targetReadiness)} · ${learningGoal.title}`,
    },
  ];
}

function responseFor(responses, step, questionId) {
  return responses.find((response) => response.step === step && response.questionId === questionId);
}

function renderAbilityAnswerInput(answerInput) {
  const definition = createMathAnswerInput({ kind: answerInput?.kind });
  const inputMode = definition.inputMode ? ` inputmode="${escapeHtml(definition.inputMode)}"` : "";
  const step = definition.step === null || definition.step === undefined ? "" : ` step="${escapeHtml(String(definition.step))}"`;
  return `
    <input
      data-ability-answer
      data-answer-input-kind="${escapeHtml(definition.kind)}"
      type="${escapeHtml(definition.htmlInputType)}"
      ${step}
      autocomplete="off"
      placeholder="${escapeHtml(definition.placeholder)}"${inputMode}
    />
  `;
}

function renderAbilityAssessmentRuntime({ questionSet, responses, locked = false, pending = false, pendingError = "" }) {
  if (locked) {
    return `
      <article class="ability-active-question ability-assessment-gate">
        <div>
          <small>下一步</small>
          <strong>完成前面的学习支持小问答后，再从数学起点开始。</strong>
          <p>系统会先了解你更适合怎样学习，再安排学科能力测试。</p>
        </div>
      </article>
    `;
  }

  if (pending || !questionSet.length) {
    return `
      <article class="ability-active-question ability-assessment-gate">
        <div>
          <small>${pendingError ? "暂时无法准备" : "数学起点小测试"}</small>
          <strong>${pendingError ? "这组题还没有准备好。" : "正在准备适合你的题目。"}</strong>
          <p>${pendingError ? escapeHtml(pendingError) : "题目会从同一套数学逻辑库中生成，并由后台完成校验。"}</p>
          ${pendingError ? '<button class="secondary-action" type="button" data-assessment-retry="initial">重试</button>' : ""}
        </div>
      </article>
    `;
  }

  const answeredQuestions = questionSet.filter((question) => responseFor(responses, "ability_test", question.id));
  const activeQuestion = questionSet.find((question) => !responseFor(responses, "ability_test", question.id));
  const progress = questionSet.length
    ? Math.min(100, Math.max(activeQuestion ? 8 : 100, Math.round((answeredQuestions.length / questionSet.length) * 100)))
    : 8;

  if (!activeQuestion) {
    return `
      <article class="ability-active-question ability-assessment-complete">
        <div class="assessment-fuzzy-progress" role="progressbar" aria-label="起点测试进展" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
          <i style="width: 100%"></i>
        </div>
        <div>
          <small>数学起点已记录</small>
          <strong>系统正在把这些回答整理成你的能力图。</strong>
          <p>之后的练习会从合适的起点开始，并继续根据真实表现调整。</p>
        </div>
      </article>
    `;
  }

  return `
    <article class="ability-active-question">
      <div class="assessment-fuzzy-progress" role="progressbar" aria-label="起点测试进展" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
        <i style="width: ${progress}%"></i>
      </div>
      <div>
        <small>数学起点小测试</small>
        <strong>${escapeHtml(activeQuestion.prompt)}</strong>
        <p>慢慢想，写下你现在认为的答案。</p>
        <div class="ability-answer-entry">
          ${renderAbilityAnswerInput(activeQuestion.answerInput)}
          <button
            class="secondary-action"
            type="button"
            data-ability-response
            data-assessment-step="ability_test"
            data-assessment-question-id="${escapeHtml(activeQuestion.id)}"
            data-assessment-dimension="${escapeHtml(activeQuestion.targetDimension)}"
          >提交</button>
          <button
            class="text-action ability-uncertain-action"
            type="button"
            data-ability-uncertain
            data-assessment-step="ability_test"
            data-assessment-question-id="${escapeHtml(activeQuestion.id)}"
            data-assessment-dimension="${escapeHtml(activeQuestion.targetDimension)}"
          >不确定，先跳过</button>
        </div>
        ${pendingError ? `<p class="onboarding-assessment-runtime-error" role="alert">${escapeHtml(pendingError)}</p>` : ""}
      </div>
    </article>
  `;
}

function renderQuestionCards({
  questions,
  targetSelector,
  includeAnchor = false,
  showDimension = false,
  responses = [],
  step,
  locked = false,
  pending = false,
  pendingError = "",
  retryAction = "",
  lockedCopy = "先完成前一组，再继续。",
}) {
  const list = document.querySelector(targetSelector);
  if (!list) return;

  if (pending) {
    list.innerHTML = `
      <article class="onboarding-question-gate">
        <span>${pendingError ? "暂时无法准备" : "正在准备"}</span>
        <strong>${pendingError ? "这组问题还没有准备好。" : "系统正在为你准备这一组问题。"}</strong>
        ${pendingError ? `<p>${escapeHtml(pendingError)}</p><button class="secondary-action" type="button" data-assessment-retry="${escapeHtml(retryAction)}">重试</button>` : ""}
      </article>
    `;
    return;
  }

  if (locked) {
    list.innerHTML = `<article class="onboarding-question-gate"><span>下一步</span><strong>${escapeHtml(lockedCopy)}</strong></article>`;
    return;
  }

  const prepared = questions.map((question, index) => ({
    ...question,
    questionId: question.id || `${step}-${index + 1}`,
  }));
  const answered = prepared.filter((question) => responseFor(responses, step, question.questionId));
  const activeQuestion = prepared.find((question) => !responseFor(responses, step, question.questionId));
  const progress = prepared.length
    ? Math.min(100, Math.max(activeQuestion ? 8 : 100, Math.round((answered.length / prepared.length) * 100)))
    : 8;

  if (!activeQuestion) {
    list.innerHTML = `
      <article class="onboarding-question-complete">
        <div class="assessment-fuzzy-progress" role="progressbar" aria-label="测试进展" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i style="width: 100%"></i></div>
        <strong>这一组回答已记录。</strong>
      </article>
    `;
    return;
  }

  list.innerHTML = `
    <article class="generated-question onboarding-question-runtime" data-question-id="${escapeHtml(activeQuestion.questionId)}">
      <div class="assessment-fuzzy-progress" role="progressbar" aria-label="测试进展" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width: ${progress}%"></i></div>
      ${showDimension && activeQuestion.dimension ? `<div class="question-meta"><strong>${escapeHtml(activeQuestion.dimension)}</strong></div>` : ""}
      <p>${escapeHtml(activeQuestion.prompt)}</p>
      <div class="option-list">
        ${(activeQuestion.options || [])
          .map(
            (option, optionIndex) => `
              <button
                type="button"
                data-assessment-response
                data-assessment-step="${escapeHtml(step)}"
                data-assessment-question-id="${escapeHtml(activeQuestion.questionId)}"
                data-assessment-answer-index="${optionIndex}"
                data-assessment-dimension="${escapeHtml(activeQuestion.dimension)}"
                data-assessment-template-id="${escapeHtml(activeQuestion.metadata?.templateId || "")}"
                data-assessment-logic-library-id="${escapeHtml(activeQuestion.metadata?.logicLibraryId || "")}"
              >${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</button>
            `,
          )
          .join("")}
      </div>
      ${pendingError ? `<p class="onboarding-assessment-runtime-error" role="alert">${escapeHtml(pendingError)}</p>` : ""}
      ${activeQuestion.inference ? `<em>${includeAnchor ? `${escapeHtml(activeQuestion.anchor)} · ` : ""}${escapeHtml(activeQuestion.inference)}</em>` : ""}
    </article>
  `;
}

export function renderOnboardingAssessment({
  abilityMap,
  assessmentModules,
  basicBioInfo,
  generatedAbilityQuestionSet,
  initialAssessmentError = "",
  generatedStaticCurve,
  initialAssessmentPending = false,
  initialAbilityQuestionSet,
  initialLearningCurve,
  learningGoal,
  learningGoalDraft,
  learningGoalOptions,
  basicInfoEditing = false,
  basicInfoSaveError = "",
  basicInfoSaving = false,
  availableSubjects = [],
  onboardingPrefillDraft,
  onboardingPrefillOptions,
  onboardingResponses = [],
  onboardingPrefill = null,
  onBasicInfoConfirm,
  onBasicInfoEditChange,
  onBasicInfoSave,
  onSubjectSelectionConfirm,
  onInitialAssessmentRetry,
  onLearningGoalDraftChange,
  onPersonalityAssessmentRetry,
  onResponseChange,
  personalityAssessmentError = "",
  personalityAssessmentPending = false,
  personalityQuestionSets: providedPersonalityQuestionSets = null,
  personalityResult: providedPersonalityResult = null,
  personalityLogicLibrary,
  percent,
  psychologicalPersonalityLibrary,
  statisticalBaseline,
  subjectSelection,
  subjectSelectionError = "",
  subjectSelectionSaving = false,
}) {
  const basicInfoGrid = document.querySelector("#basic-info-grid");
  if (basicInfoGrid) {
    const displayValue = (value) => (value === null || value === undefined || value === "" ? "待填写" : value);
    const hasConfirmedContext = onboardingPrefill?.confirmationStatus === "student_confirmed";
    basicInfoGrid.hidden = !hasConfirmedContext;
    basicInfoGrid.innerHTML = [
      ["生日", basicBioInfo.birthday],
      ["年龄", basicBioInfo.age === null || basicBioInfo.age === undefined ? null : `${basicBioInfo.age} 岁`],
      ["年级", basicBioInfo.grade],
      ["当前阶段", basicBioInfo.schoolCalendarStage],
      ["专注时长", basicBioInfo.attentionSpanMinutes ? `${basicBioInfo.attentionSpanMinutes} 分钟` : null],
      ["使用设备", basicBioInfo.primaryDevice],
    ]
      .map(
        ([label, value]) => `
          <article>
            <span>${label}</span>
            <strong>${escapeHtml(displayValue(value))}</strong>
          </article>
      `,
      )
      .join("");
  }

  const rationale = document.querySelector("#basic-info-rationale");
  if (rationale) {
    const source =
      onboardingPrefill?.sourceRole === "teacher"
        ? "老师"
        : onboardingPrefill?.sourceRole === "parent"
          ? "家长"
          : "你";
    const confirmation = onboardingPrefill
      ? onboardingPrefill.confirmationStatus === "student_confirmed"
        ? `
          <article class="onboarding-prefill-notice confirmed">
            <div>
              <strong>起点已准备好</strong>
              <span>接下来选一选更像你的学习方式。</span>
            </div>
            <button class="text-action" type="button" data-edit-basic-info ${basicInfoSaving ? "disabled" : ""}>调整</button>
          </article>
        `
        : `
          <article class="onboarding-prefill-notice">
            <div>
              <strong>${source === "你" ? "开始信息已填写" : `${source}已先填好`}</strong>
              <span>确认后开始测试；你也可以先调整再确认。</span>
            </div>
            <div class="onboarding-prefill-actions">
              <button class="text-action" type="button" data-edit-basic-info ${basicInfoSaving ? "disabled" : ""}>调整</button>
              <button id="confirm-basic-info" class="secondary-action" type="button" ${basicInfoSaving ? "disabled" : ""}>${basicInfoSaving ? "正在确认..." : "确认"}</button>
            </div>
          </article>
        `
      : `
        <article class="onboarding-prefill-notice">
          <div>
            <strong>先选几个和你有关的选项</strong>
            <span>它们只会帮系统安排第一组题和学习节奏。</span>
          </div>
          <button class="primary-action" type="button" data-edit-basic-info>开始填写</button>
        </article>
      `;
    const editor = basicInfoEditing && onboardingPrefillOptions ? renderBasicInfoEditor({ draft: onboardingPrefillDraft, options: onboardingPrefillOptions, saving: basicInfoSaving }) : "";
    const error = basicInfoSaveError
      ? `<p class="onboarding-basic-info-save-error" role="alert">${escapeHtml(basicInfoSaveError)}</p>`
      : "";
    rationale.innerHTML = `${confirmation}${editor}${error}`;
    rationale.querySelector("#confirm-basic-info")?.addEventListener("click", () => onBasicInfoConfirm?.());
    rationale.querySelector("[data-edit-basic-info]")?.addEventListener("click", () => onBasicInfoEditChange?.(true));
    rationale.querySelector("[data-cancel-basic-info-edit]")?.addEventListener("click", () => onBasicInfoEditChange?.(false));
    rationale.querySelector("#student-basic-info-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      onBasicInfoSave?.({
        ...values,
        birthYear: Number(values.birthYear),
        birthMonth: Number(values.birthMonth),
        birthDay: Number(values.birthDay),
      });
    });
  }

  renderSubjectSelection({
    availableSubjects,
    onboardingPrefill,
    saving: subjectSelectionSaving,
    error: subjectSelectionError,
  });
  document.querySelectorAll("[data-subject-select]").forEach((button) => {
    button.addEventListener("click", () => onSubjectSelectionConfirm?.(button.dataset.subjectSelect));
  });

  const personalityQuestionSets =
    providedPersonalityQuestionSets ||
    generatePersonalityQuestionSets({
      studentId: basicBioInfo?.studentId || "student",
      psychologicalLibrary: psychologicalPersonalityLibrary,
      learningLibrary: personalityLogicLibrary,
    });
  const personalityResult =
    providedPersonalityResult ||
    scorePersonalityQuestionSets({
      questionSets: personalityQuestionSets,
      responses: onboardingResponses,
      psychologicalLibrary: psychologicalPersonalityLibrary,
      learningLibrary: personalityLogicLibrary,
    });

  renderQuestionCards({
    targetSelector: "#psychological-personality-questions",
    questions: personalityQuestionSets.psychologicalQuestions,
    responses: onboardingResponses,
    step: "psychological_personality",
    pending: personalityAssessmentPending,
    pendingError: personalityAssessmentError,
    retryAction: "personality",
  });
  renderQuestionCards({
    targetSelector: "#generated-personality-questions",
    questions: personalityQuestionSets.learningQuestions,
    responses: onboardingResponses,
    step: "learning_personality",
    pending: personalityAssessmentPending,
    pendingError: personalityAssessmentError,
    retryAction: "personality",
    locked: !personalityResult.psychologicalComplete,
    lockedCopy: "先完成这一组小问答，系统再继续了解你学习时的选择。",
  });

  const studentTypeCards = document.querySelector("#student-type-cards");
  if (studentTypeCards) {
    const type = personalityResult.studentType;
    studentTypeCards.innerHTML = personalityResult.complete
      ? `
        <article class="student-type-card teal">
          <div class="type-visual" aria-label="${escapeHtml(type.name)}">
            <div class="type-orbit"><span>${escapeHtml(type.name)}</span><i style="--share: 72"></i></div>
            <div class="type-path">${type.steps.map((step) => `<b>${escapeHtml(step)}</b>`).join("")}</div>
          </div>
          <div>
            <strong>${escapeHtml(type.name)}</strong>
            <p>${escapeHtml(type.cue)}</p>
            <em>${escapeHtml(type.recommendation)}</em>
          </div>
        </article>
      `
      : `
        <article class="student-type-card teal">
          <div class="type-visual" aria-hidden="true"><div class="type-orbit"><span>...</span><i style="--share: 28"></i></div></div>
          <div><strong>正在了解你</strong><p>回答会慢慢连成一张学习地图。</p></div>
        </article>
      `;
  }

  const observerGuidanceCards = document.querySelector("#observer-guidance-cards");
  if (observerGuidanceCards) {
    const dimensions = [...personalityResult.psychologicalDimensions, ...personalityResult.learningDimensions].filter(
      (dimension) => dimension.score !== null,
    );
    const focus = dimensions.slice().sort((left, right) => left.score - right.score)[0];
    observerGuidanceCards.innerHTML = personalityResult.complete
      ? `
        <article class="observer-guidance-card">
          <div class="guidance-head"><span>起点</span><div><small>学习支持</small><strong>${escapeHtml(personalityResult.studentType.name)}</strong></div></div>
          <p>${escapeHtml(personalityResult.studentType.recommendation)}</p>
        </article>
        <article class="observer-guidance-card">
          <div class="guidance-head"><span>关注</span><div><small>先支持</small><strong>${escapeHtml(focus?.name || "真实练习表现")}</strong></div></div>
          <p>${escapeHtml(focus?.label || "后续由作答和复盘行为继续校正。")}</p>
        </article>
      `
      : "";
  }

  const abilityStageMap = document.querySelector("#ability-stage-map");
  if (abilityStageMap) {
    abilityStageMap.innerHTML = getAbilityAssessmentStages({
      abilityMap,
      assessmentModules,
      learningGoal,
      percent,
      subjectSelection,
    })
      .map(
        (stage) => `
          <article>
            <span>${escapeHtml(stage.step)}</span>
            <div>
              <strong>${escapeHtml(stage.title)}</strong>
              <p>${escapeHtml(stage.value)}</p>
            </div>
          </article>
        `,
      )
      .join("");
  }

  renderAbilityDimensions({ targetSelector: "#ability-dimension-map", abilityMap, percent });
  renderInitialAbilityResult({ abilityMap, learningGoal, percent });

  const abilityQuestionSet = document.querySelector("#ability-question-set");
  const activeAbilityQuestionSet = initialAssessmentPending
    ? []
    : generatedAbilityQuestionSet?.length
      ? generatedAbilityQuestionSet
      : initialAbilityQuestionSet;
  const abilityTestComplete =
    activeAbilityQuestionSet.length > 0 &&
    activeAbilityQuestionSet.every((question) => responseFor(onboardingResponses, "ability_test", question.id));
  if (abilityQuestionSet) {
    abilityQuestionSet.innerHTML = renderAbilityAssessmentRuntime({
      questionSet: activeAbilityQuestionSet,
      responses: onboardingResponses,
    locked: !personalityResult.complete,
    pending: initialAssessmentPending,
    pendingError: initialAssessmentError,
  });
  }

  document.querySelectorAll("[data-assessment-response]").forEach((button) => {
    button.addEventListener("click", () => {
      onResponseChange?.({
        step: button.dataset.assessmentStep,
        questionId: button.dataset.assessmentQuestionId,
        answer: Number(button.dataset.assessmentAnswerIndex),
        responseType: "choice",
        metadata: {
          dimension: button.dataset.assessmentDimension,
          templateId: button.dataset.assessmentTemplateId || null,
          logicLibraryId: button.dataset.assessmentLogicLibraryId || null,
        },
      });
    });
  });

  document.querySelectorAll("[data-ability-response]").forEach((button) => {
    button.addEventListener("click", () => {
      const questionId = button.dataset.assessmentQuestionId;
      const input = button.closest(".ability-active-question")?.querySelector("[data-ability-answer]");
      if (!input?.value) return;
      const answerInput = createMathAnswerInput({ kind: input.dataset.answerInputKind });
      if (normalizeMathAnswerValue({ answerInput, value: input.value }) === null) {
        input.focus();
        return;
      }
      onResponseChange?.({
        step: button.dataset.assessmentStep,
        questionId,
        answer: input.value,
        responseType: `${answerInput.kind}_answer`,
        metadata: { dimension: button.dataset.assessmentDimension, answerInputKind: answerInput.kind },
      });
    });
  });

  document.querySelectorAll("[data-ability-uncertain]").forEach((button) => {
    button.addEventListener("click", () => {
      onResponseChange?.({
        step: button.dataset.assessmentStep,
        questionId: button.dataset.assessmentQuestionId,
        answer: null,
        isUncertain: true,
        responseType: "uncertain_skip",
        metadata: { dimension: button.dataset.assessmentDimension },
      });
    });
  });

  document.querySelectorAll("[data-assessment-retry]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.assessmentRetry === "personality") onPersonalityAssessmentRetry?.();
      if (button.dataset.assessmentRetry === "initial") onInitialAssessmentRetry?.();
    });
  });

  renderLearningCurveOverview({
    canConfigureGoal: personalityResult.complete && abilityTestComplete,
    generatedStaticCurve,
    initialLearningCurve,
    learningGoal,
    learningGoalDraft,
    learningGoalOptions,
    onLearningGoalDraftChange,
    percent,
    statisticalBaseline,
  });
}
