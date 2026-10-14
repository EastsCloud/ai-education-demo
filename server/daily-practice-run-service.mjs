const PROGRESSION_VARIANTS = ["original", "change_one_number", "change_two_numbers"];
const CONTEXT_REVIEW_PROGRESSION_VARIANTS = ["context_change", "change_one_number", "change_two_numbers"];
const OPTIONAL_PRACTICE_MODES = new Set(["same_type", "harder", "wrong_retry"]);
const OPTIONAL_CHALLENGE_ROUTES = new Set(["same_family_deeper_variant", "knowledge_graph_successor"]);

function cleanOptionalSourceDeliveryId(value) {
  const id = String(value || "").trim();
  return id ? id.slice(0, 160) : null;
}

function cleanOptionalChallengeRoute(value) {
  return OPTIONAL_CHALLENGE_ROUTES.has(value) ? value : null;
}

function cleanOptionalItem(item, index) {
  if (!item?.id || !item?.familyId || !item?.instructionalGrade || !item?.variantLevel || !Number.isFinite(Number(item.seed))) {
    return null;
  }
  return {
    id: item.id,
    familyId: item.familyId,
    instructionalGrade: item.instructionalGrade,
    variantLevel: item.variantLevel,
    seed: Number(item.seed),
    aiVersion: item.aiVersion === "full_ai_ready" ? "full_ai_ready" : "semi_ai",
    retrySourceDeliveryId: cleanOptionalSourceDeliveryId(item.retrySourceDeliveryId),
    correctReviewSourceDeliveryId: cleanOptionalSourceDeliveryId(item.correctReviewSourceDeliveryId),
    challengeRoute: cleanOptionalChallengeRoute(item.challengeRoute),
    advancesFromFamilyId: cleanOptionalSourceDeliveryId(item.advancesFromFamilyId),
    order: index,
  };
}

function cleanQueueItem(item, index) {
  if (!item?.id || !item?.familyId || !item?.instructionalGrade || !Number.isFinite(Number(item.seed))) return null;
  return {
    id: item.id,
    familyId: item.familyId,
    instructionalGrade: item.instructionalGrade,
    seed: Number(item.seed),
    retrySourceDeliveryId: cleanOptionalSourceDeliveryId(item.retrySourceDeliveryId),
    correctReviewSourceDeliveryId: cleanOptionalSourceDeliveryId(item.correctReviewSourceDeliveryId),
    order: index,
  };
}

function progressionVariantsForQueueItem(queueItem) {
  return queueItem?.correctReviewSourceDeliveryId
    ? CONTEXT_REVIEW_PROGRESSION_VARIANTS
    : PROGRESSION_VARIANTS;
}

function currentStep(run) {
  if (!run || run.status === "required_completed") return null;
  const queueItem = run.queueItems?.[run.currentUnitIndex];
  const variantLevel = progressionVariantsForQueueItem(queueItem)[run.currentStageIndex];
  if (!queueItem || !variantLevel) return null;
  return {
    queueItem,
    unitIndex: run.currentUnitIndex,
    stageIndex: run.currentStageIndex,
    variantLevel,
  };
}

function activeOptionalSession(run) {
  return [...(run?.optionalPracticeSessions || [])].reverse().find((session) => session.status === "in_progress") || null;
}

function optionalStep(run) {
  const session = activeOptionalSession(run);
  const item = session?.items?.[session.currentIndex];
  if (!session || !item) return null;
  return { item, session };
}

function optionalIndependentRetryRequired({ session, item }) {
  const retry = session?.independentRetry;
  return Boolean(
    retry &&
      retry.itemId === item?.id &&
      Number(retry.index) === Number(session.currentIndex) &&
      retry.variantLevel === item?.variantLevel,
  );
}

function publicOptionalSession(session) {
  if (!session) return null;
  const currentItem = session.status === "in_progress" ? session.items?.[session.currentIndex] || null : null;
  return {
    id: session.id,
    mode: session.mode,
    source: session.source || null,
    status: session.status,
    requestedCount: session.items?.length || 0,
    completedCount: session.completedItemIds?.length || 0,
    familyId: session.familyId || null,
    instructionalGrade: session.instructionalGrade || null,
    challengeRoute: session.challengeRoute || null,
    independentRetryRequired: currentItem ? optionalIndependentRetryRequired({ session, item: currentItem }) : false,
    currentStep: currentItem
      ? {
          itemId: currentItem.id,
          index: session.currentIndex,
          familyId: currentItem.familyId,
          instructionalGrade: currentItem.instructionalGrade,
          variantLevel: currentItem.variantLevel,
          challengeRoute: currentItem.challengeRoute || null,
        }
      : null,
    updatedAt: session.updatedAt,
  };
}

function nowIso() {
  return new Date().toISOString();
}

export function createDailyPracticeRun({ dailyPlan, studentId, subjectId, practiceDate }) {
  const queueItems = (dailyPlan?.questionQueue?.items || []).map(cleanQueueItem).filter(Boolean);
  if (!studentId || !subjectId || !practiceDate || !dailyPlan?.id || !queueItems.length) return null;
  const now = nowIso();
  return {
    id: `daily-practice-run-${studentId}-${subjectId}-${practiceDate}`,
    studentId,
    subjectId,
    practiceDate,
    dailyPlanId: dailyPlan.id,
    status: "in_progress",
    queueItems,
    currentUnitIndex: 0,
    currentStageIndex: 0,
    activeDeliveryId: null,
    independentRetry: null,
    completedStages: [],
    optionalPracticeSessions: [],
    requiredPracticeCompleted: false,
    createdAt: now,
    updatedAt: now,
    guardrail:
      "The required daily progression is server-owned: original, one-number change, then two-number change. A later stage is released only after the active stage is scored correct.",
  };
}

export function getDailyPracticeRunStep(run) {
  return currentStep(run);
}

export function getActiveOptionalPracticeStep(run) {
  return optionalStep(run);
}

export function createOptionalPracticeSession({ run, items, mode, source = "practice_summary", createdAt = nowIso() }) {
  if (!run?.requiredPracticeCompleted || !OPTIONAL_PRACTICE_MODES.has(mode) || activeOptionalSession(run)) return null;
  const normalizedItems = (items || []).map(cleanOptionalItem).filter(Boolean);
  if (!normalizedItems.length) return null;
  const familyId = normalizedItems[0].familyId;
  const instructionalGrade = normalizedItems[0].instructionalGrade;
  const isMixedReplay = mode === "wrong_retry";
  if (!isMixedReplay && normalizedItems.some((item) => item.familyId !== familyId || item.instructionalGrade !== instructionalGrade)) {
    return null;
  }

  const session = {
    id: `optional-practice-${run.id}-${(run.optionalPracticeSessions || []).length + 1}-${Date.now()}`,
    mode,
    source,
    status: "in_progress",
    familyId: isMixedReplay && normalizedItems.some((item) => item.familyId !== familyId) ? null : familyId,
    instructionalGrade:
      isMixedReplay && normalizedItems.some((item) => item.instructionalGrade !== instructionalGrade)
        ? null
        : instructionalGrade,
    challengeRoute:
      mode === "harder" && normalizedItems.every((item) => item.challengeRoute === normalizedItems[0].challengeRoute)
        ? normalizedItems[0].challengeRoute || "same_family_deeper_variant"
        : null,
    advancesFromFamilyId:
      mode === "harder" && normalizedItems.every((item) => item.advancesFromFamilyId === normalizedItems[0].advancesFromFamilyId)
        ? normalizedItems[0].advancesFromFamilyId || null
        : null,
    items: normalizedItems,
    sourceDeliveryIds: normalizedItems.map((item) => item.retrySourceDeliveryId).filter(Boolean),
    currentIndex: 0,
    activeDeliveryId: null,
    independentRetry: null,
    completedItemIds: [],
    createdAt,
    updatedAt: createdAt,
  };
  return {
    ...run,
    optionalPracticeSessions: [...(run.optionalPracticeSessions || []), session],
    updatedAt: createdAt,
  };
}

export function attachOptionalPracticeDelivery({ deliveryId, run, updatedAt = nowIso() }) {
  const step = optionalStep(run);
  if (!step || !deliveryId || step.session.activeDeliveryId) return null;
  const sessions = (run.optionalPracticeSessions || []).map((session) =>
    session.id === step.session.id ? { ...session, activeDeliveryId: deliveryId, updatedAt } : session,
  );
  return { ...run, optionalPracticeSessions: sessions, updatedAt };
}

export function advanceOptionalPracticeRun({ delivery, result, run, completedAt = nowIso() }) {
  const step = optionalStep(run);
  const request = delivery?.generationRequest || {};
  if (!run || !step || run.id !== request.practiceRunId || step.session.activeDeliveryId !== delivery?.id) {
    return { advanced: false, run };
  }
  if (
    request.optionalPracticeSessionId !== step.session.id ||
    Number(request.optionalPracticeIndex) !== step.session.currentIndex ||
    request.queueItemId !== step.item.id ||
    request.variantLevel !== step.item.variantLevel
  ) {
    return { advanced: false, run };
  }
  if (!result?.isCorrect) return { advanced: false, run };

  const usedSupport =
    Number(delivery?.support?.revealedHintCount || 0) > 0 || Number(delivery?.support?.revealedGuidedStepCount || 0) > 0;
  if (usedSupport && !request.independentRetry) {
    const sessions = (run.optionalPracticeSessions || []).map((session) =>
      session.id === step.session.id
        ? {
            ...session,
            activeDeliveryId: null,
            independentRetry: {
              itemId: step.item.id,
              index: step.session.currentIndex,
              variantLevel: step.item.variantLevel,
              requiredAt: completedAt,
            },
            updatedAt: completedAt,
          }
        : session,
    );
    return {
      advanced: false,
      requiresIndependentRetry: true,
      run: {
        ...run,
        optionalPracticeSessions: sessions,
        updatedAt: completedAt,
      },
    };
  }

  const completedItemIds = [...new Set([...(step.session.completedItemIds || []), step.item.id])];
  const nextIndex = step.session.currentIndex + 1;
  const completed = nextIndex >= step.session.items.length;
  const sessions = (run.optionalPracticeSessions || []).map((session) =>
    session.id === step.session.id
      ? {
          ...session,
          status: completed ? "completed" : "in_progress",
          currentIndex: nextIndex,
          activeDeliveryId: null,
          independentRetry: null,
          completedItemIds,
          completedAt: completed ? completedAt : null,
          updatedAt: completedAt,
        }
      : session,
  );
  return {
    advanced: true,
    run: {
      ...run,
      optionalPracticeSessions: sessions,
      updatedAt: completedAt,
    },
  };
}

export function attachDailyPracticeDelivery({ deliveryId, run, updatedAt = nowIso() }) {
  const step = currentStep(run);
  if (!step || !deliveryId || run.activeDeliveryId) return null;
  return {
    ...run,
    activeDeliveryId: deliveryId,
    updatedAt,
  };
}

export function advanceDailyPracticeRun({ delivery, result, run, completedAt = nowIso() }) {
  const step = currentStep(run);
  const request = delivery?.generationRequest || {};
  if (!run || !step || run.activeDeliveryId !== delivery?.id) return { advanced: false, run };
  if (
    request.practiceRunId !== run.id ||
    Number(request.progressionUnitIndex) !== step.unitIndex ||
    Number(request.progressionStageIndex) !== step.stageIndex ||
    request.variantLevel !== step.variantLevel ||
    request.queueItemId !== step.queueItem.id
  ) {
    return { advanced: false, run };
  }
  if (!result?.isCorrect) return { advanced: false, run };

  const usedSupport =
    Number(delivery?.support?.revealedHintCount || 0) > 0 || Number(delivery?.support?.revealedGuidedStepCount || 0) > 0;
  if (usedSupport && !request.independentRetry) {
    return {
      advanced: false,
      requiresIndependentRetry: true,
      run: {
        ...run,
        activeDeliveryId: null,
        independentRetry: {
          queueItemId: step.queueItem.id,
          unitIndex: step.unitIndex,
          stageIndex: step.stageIndex,
          variantLevel: step.variantLevel,
          requiredAt: completedAt,
        },
        updatedAt: completedAt,
      },
    };
  }

  const completedStages = [
    ...(run.completedStages || []),
    {
      queueItemId: step.queueItem.id,
      unitIndex: step.unitIndex,
      stageIndex: step.stageIndex,
      variantLevel: step.variantLevel,
      deliveryId: delivery.id,
      completedAt,
    },
  ];
  let currentUnitIndex = step.unitIndex;
  let currentStageIndex = step.stageIndex + 1;
  let status = "in_progress";
  let requiredPracticeCompleted = false;

  if (currentStageIndex >= progressionVariantsForQueueItem(step.queueItem).length) {
    currentUnitIndex += 1;
    currentStageIndex = 0;
  }
  if (currentUnitIndex >= run.queueItems.length) {
    status = "required_completed";
    requiredPracticeCompleted = true;
  }

  return {
    advanced: true,
    run: {
      ...run,
      status,
      requiredPracticeCompleted,
      currentUnitIndex,
      currentStageIndex,
      activeDeliveryId: null,
      independentRetry: null,
      completedStages,
      updatedAt: completedAt,
    },
  };
}

export function toPublicDailyPracticeRun(run) {
  if (!run) return null;
  const step = currentStep(run);
  const optionalSession = activeOptionalSession(run);
  return {
    id: run.id,
    studentId: run.studentId,
    subjectId: run.subjectId,
    practiceDate: run.practiceDate,
    dailyPlanId: run.dailyPlanId,
    status: run.status,
    requiredPracticeCompleted: Boolean(run.requiredPracticeCompleted),
    activeDeliveryId: run.activeDeliveryId || null,
    independentRetryRequired: Boolean(run.independentRetry),
    currentStep: step
      ? {
          queueItemId: step.queueItem.id,
          familyId: step.queueItem.familyId,
          instructionalGrade: step.queueItem.instructionalGrade,
          unitIndex: step.unitIndex,
          stageIndex: step.stageIndex,
          variantLevel: step.variantLevel,
        }
      : null,
    optionalPractice: publicOptionalSession(optionalSession),
    optionalPracticeHistory: (run.optionalPracticeSessions || []).slice(-6).map(publicOptionalSession),
    updatedAt: run.updatedAt,
    source: "server_owned_daily_progression",
    guardrail:
      "The page may show only a calm fuzzy sense of progress. A hint-assisted correct answer repeats once without support before a new step is released.",
  };
}
