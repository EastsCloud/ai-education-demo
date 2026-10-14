const stepCopy = {
  basic_info: {
    label: "先认识你",
    title: "先确认几项开始信息。",
    body: "它们只用来让第一组题和学习节奏更合适，不是在判断你。",
  },
  psychological_personality: {
    label: "了解你的感受",
    title: "选一选更像你的情境。",
    body: "没有标准答案，按你平常的感觉选就好。",
  },
  learning_personality: {
    label: "了解你的学习方式",
    title: "看看你更喜欢怎样面对难题。",
    body: "这些选择会帮助系统决定什么时候提示、怎样安排练习。",
  },
  subject_selection: {
    label: "选择学科",
    title: "先从你现在最想学的开始。",
    body: "每门学科都有自己的起点、目标和学习曲线。",
  },
  ability_test: {
    label: "数学起点",
    title: "先做几道合适的数学题。",
    body: "不需要全会，认真写下你现在的想法就够了。",
  },
  ability_map: {
    label: "你的学习地图",
    title: "系统已经看见你的数学起点。",
    body: "接下来会从你真正需要的地方开始，不用从头重复。",
  },
  goal: {
    label: "定下目标",
    title: "想在多久后，走到哪里？",
    body: "你可以自己决定，也可以和家长一起看；之后还能根据正式测试重新调整。",
  },
  rhythm: {
    label: "找到舒服的节奏",
    title: "把学习放进你的日常。",
    body: "每天多一点还是少一点，都可以先从适合自己的安排开始。",
  },
  static_curve: {
    label: "准备开始",
    title: "这条学习曲线，会带你走到目标。",
    body: "每天的练习会变得更贴合你；正式测试会在合适的时候校准这条路。",
  },
};

const journey = [
  { label: "认识你", steps: ["basic_info"] },
  { label: "学习方式", steps: ["psychological_personality", "learning_personality"] },
  { label: "数学起点", steps: ["subject_selection", "ability_test", "ability_map"] },
  { label: "目标与节奏", steps: ["goal", "rhythm", "static_curve"] },
];

function journeyState(group, activeStep, completed) {
  const activeIndex = journey.findIndex((item) => item.steps.includes(activeStep));
  const groupIndex = journey.indexOf(group);
  if (group.steps.every((step) => completed.has(step))) return "done";
  if (groupIndex === activeIndex) return "active";
  return groupIndex < activeIndex ? "done" : "upcoming";
}

function setOnboardingSurface({ activeStep, complete }) {
  const onboarding = document.querySelector("#onboarding");
  const flow = document.querySelector("#onboarding-flow-panel");
  const stageAssessment = document.querySelector("#stage-assessment-panel");
  if (!onboarding) return;

  onboarding.dataset.onboardingStep = activeStep;
  if (flow) flow.hidden = complete;
  if (stageAssessment) stageAssessment.hidden = !complete;

  onboarding.querySelectorAll("[data-onboarding-stage]").forEach((section) => {
    const stages = String(section.dataset.onboardingStage || "")
      .split(/\s+/)
      .filter(Boolean);
    section.hidden = complete || !stages.includes(activeStep);
  });
}

export function renderOnboardingFlow({
  appState,
  onStaticCurveConfirmed,
  readiness = { canAdvance: true, currentBlockerCopy: "" },
  staticCurveConfirming = false,
  staticCurveSaveError = "",
}) {
  const panel = document.querySelector("#onboarding-flow-panel");
  if (!panel) return;

  const snapshot = appState.getSnapshot();
  const complete = Boolean(snapshot.staticCurveConfirmed);
  const activeStep = snapshot.onboardingStep;
  const copy = stepCopy[activeStep] || stepCopy.basic_info;
  const completed = new Set(snapshot.onboardingCompletedSteps);
  const isLast = activeStep === "static_curve";

  setOnboardingSurface({ activeStep, complete });
  if (complete) return;

  panel.innerHTML = `
    <div class="onboarding-journey" aria-label="入学进展">
      ${journey
        .map((group) => {
          const state = journeyState(group, activeStep, completed);
          return `<span class="${state}"><i aria-hidden="true"></i>${group.label}</span>`;
        })
        .join("")}
    </div>
    <div class="onboarding-now">
      <div class="onboarding-orbit" aria-hidden="true"><i></i><b></b><em></em></div>
      <div>
        <p class="label">${copy.label}</p>
        <h3>${copy.title}</h3>
        <p>${copy.body}</p>
      </div>
    </div>
    <div class="onboarding-flow-footer">
      ${
        readiness.canAdvance
          ? `<button class="primary-action" type="button" id="flow-next-step" ${
              isLast && staticCurveConfirming ? "disabled" : ""
            }>${isLast && staticCurveConfirming ? "正在确认..." : isLast ? "确认曲线，开始练习" : "继续"}</button>`
          : `<p class="flow-guidance">${readiness.currentBlockerCopy}</p>`
      }
      ${staticCurveSaveError ? `<p class="onboarding-flow-save-error" role="alert">${staticCurveSaveError}</p>` : ""}
    </div>
  `;

  panel.querySelector("#flow-next-step")?.addEventListener("click", async () => {
    if (!readiness.canAdvance) return;
    if (isLast) {
      await onStaticCurveConfirmed?.();
      return;
    }
    appState.advanceOnboarding();
  });
}
