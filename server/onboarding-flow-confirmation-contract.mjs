import assert from "node:assert/strict";
import { renderOnboardingFlow } from "../src/modules/onboarding-flow-view.js";

const originalDocument = globalThis.document;
let nextStepHandler = null;
const nextButton = {
  addEventListener(eventName, handler) {
    if (eventName === "click") nextStepHandler = handler;
  },
};
const panel = {
  innerHTML: "",
  querySelector(selector) {
    return selector === "#flow-next-step" ? nextButton : null;
  },
};
const onboarding = {
  dataset: {},
  querySelectorAll() {
    return [];
  },
};

globalThis.document = {
  querySelector(selector) {
    if (selector === "#onboarding-flow-panel") return panel;
    if (selector === "#onboarding") return onboarding;
    if (selector === "#stage-assessment-panel") return null;
    return null;
  },
};

try {
  let localConfirmationCount = 0;
  let serverConfirmationCount = 0;
  const appState = {
    getSnapshot() {
      return {
        onboardingStep: "static_curve",
        onboardingCompletedSteps: [
          "basic_info",
          "psychological_personality",
          "learning_personality",
          "subject_selection",
          "ability_test",
          "ability_map",
          "goal",
          "rhythm",
        ],
        staticCurveConfirmed: false,
      };
    },
    confirmStaticCurve() {
      localConfirmationCount += 1;
    },
    advanceOnboarding() {
      throw new Error("unexpected_non_final_advance");
    },
  };

  renderOnboardingFlow({
    appState,
    readiness: { canAdvance: true },
    onStaticCurveConfirmed: async () => {
      serverConfirmationCount += 1;
      return false;
    },
  });
  await nextStepHandler();
  assert.equal(serverConfirmationCount, 1);
  assert.equal(localConfirmationCount, 0);

  renderOnboardingFlow({
    appState,
    readiness: { canAdvance: true },
    staticCurveConfirming: true,
    staticCurveSaveError: "save failed",
  });
  assert.match(panel.innerHTML, /disabled/);
  assert.match(panel.innerHTML, /正在确认/);
  assert.match(panel.innerHTML, /save failed/);

  console.log("onboarding-flow-confirmation-contract: passed");
} finally {
  globalThis.document = originalDocument;
}
