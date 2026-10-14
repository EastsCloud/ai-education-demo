export function createAppState({
  aiVersionProfiles,
  initialAiVersion = "semi_ai",
  initialOnboardingResponses = [],
  studentProfile,
}) {
  const listeners = new Set();
  const onboardingSteps = [
    "basic_info",
    "psychological_personality",
    "learning_personality",
    "subject_selection",
    "ability_test",
    "ability_map",
    "goal",
    "rhythm",
    "static_curve",
  ];
  const state = {
    aiVersion: initialAiVersion,
    currentRole: "student",
    selectedStudentId: studentProfile.id,
    onboardingStep: "basic_info",
    onboardingCompletedSteps: [],
    onboardingRecords: [],
    onboardingResponses: [...initialOnboardingResponses],
    onboardingStatus: "in_progress",
    currentSubjectId: "math",
    staticCurveConfirmed: false,
  };

  function notify() {
    listeners.forEach((listener) => listener(getSnapshot()));
  }

  function getAiVersionProfile() {
    return aiVersionProfiles.find((profile) => profile.id === state.aiVersion) || aiVersionProfiles[0];
  }

  function getSnapshot() {
    return {
      ...state,
      aiVersionProfile: getAiVersionProfile(),
      onboardingSteps: [...onboardingSteps],
    };
  }

  function setAiVersion(aiVersion) {
    if (!aiVersionProfiles.some((profile) => profile.id === aiVersion)) return;
    state.aiVersion = aiVersion;
    notify();
  }

  function setRole(role) {
    state.currentRole = role;
    notify();
  }

  function setOnboardingStep(step) {
    if (!onboardingSteps.includes(step)) return;
    state.onboardingStep = step;
    notify();
  }

  function advanceOnboarding() {
    const currentIndex = onboardingSteps.indexOf(state.onboardingStep);
    if (currentIndex < 0) return;

    if (!state.onboardingCompletedSteps.includes(state.onboardingStep)) {
      state.onboardingCompletedSteps = [...state.onboardingCompletedSteps, state.onboardingStep];
    }
    state.onboardingRecords = [
      ...state.onboardingRecords,
      {
        step: state.onboardingStep,
        action: "confirmed",
        actorRole: state.currentRole,
        createdAt: new Date().toISOString(),
      },
    ];

    const nextStep = onboardingSteps[currentIndex + 1];
    if (nextStep) {
      state.onboardingStep = nextStep;
    } else {
      state.onboardingStatus = "static_curve_ready";
      state.staticCurveConfirmed = true;
    }
    notify();
  }

  function recordOnboardingResponse({ step, questionId, answer, responseType, metadata = {}, isCorrect = null, responseTimeMs = null }) {
    if (!onboardingSteps.includes(step) || !questionId) return;

    const response = {
      step,
      questionId,
      answer,
      responseType,
      metadata,
      actorRole: state.currentRole,
      createdAt: new Date().toISOString(),
      ...(typeof isCorrect === "boolean" ? { isCorrect } : {}),
      ...(Number.isFinite(Number(responseTimeMs)) ? { responseTimeMs: Number(responseTimeMs) } : {}),
    };
    state.onboardingResponses = [
      ...state.onboardingResponses.filter((item) => !(item.step === step && item.questionId === questionId)),
      response,
    ];
    notify();
  }

  function confirmStaticCurve() {
    state.onboardingStep = "static_curve";
    state.staticCurveConfirmed = true;
    state.onboardingStatus = "static_curve_ready";
    if (!state.onboardingCompletedSteps.includes("static_curve")) {
      state.onboardingCompletedSteps = [...state.onboardingCompletedSteps, "static_curve"];
    }
    state.onboardingRecords = [
      ...state.onboardingRecords,
      {
        step: "static_curve",
        action: "curve_confirmed",
        actorRole: state.currentRole,
        createdAt: new Date().toISOString(),
      },
    ];
    notify();
  }

  function restoreOnboardingProgress({ completedSteps = [], currentStep = null, staticCurveConfirmed = false } = {}) {
    const confirmed = Boolean(staticCurveConfirmed);
    const normalizedCompleted = confirmed
      ? [...onboardingSteps]
      : onboardingSteps.filter((step) => completedSteps.includes(step));
    const firstIncomplete = onboardingSteps.find((step) => !normalizedCompleted.includes(step));
    const nextStep = confirmed
      ? "static_curve"
      : onboardingSteps.includes(currentStep) && !normalizedCompleted.includes(currentStep)
        ? currentStep
        : firstIncomplete || "static_curve";
    const nextStatus = confirmed ? "static_curve_ready" : "in_progress";
    const changed =
      state.staticCurveConfirmed !== confirmed ||
      state.onboardingStatus !== nextStatus ||
      state.onboardingStep !== nextStep ||
      state.onboardingCompletedSteps.join("|") !== normalizedCompleted.join("|");

    state.staticCurveConfirmed = confirmed;
    state.onboardingStatus = nextStatus;
    state.onboardingStep = nextStep;
    state.onboardingCompletedSteps = normalizedCompleted;
    if (changed) notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(getSnapshot());
    return () => listeners.delete(listener);
  }

  return {
    getSnapshot,
    advanceOnboarding,
    confirmStaticCurve,
    recordOnboardingResponse,
    restoreOnboardingProgress,
    setAiVersion,
    setOnboardingStep,
    setRole,
    subscribe,
  };
}
