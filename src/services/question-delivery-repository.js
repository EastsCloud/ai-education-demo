import { createLocalApiClient } from "./local-api-client.js?v=answer-revision-1";

function requestKey(request) {
  return [
    request.studentId,
    request.subjectId,
    request.mode,
    request.familyId,
    request.instructionalGrade,
    request.variantLevel,
    request.seed,
    request.queueItemId || "",
  ].join("|");
}

function publicGuidedResponseStates(delivery) {
  return Array.isArray(delivery?.question?.support?.guidedResponseStates) ? delivery.question.support.guidedResponseStates : [];
}

function publicRevealedGuidedSteps(delivery) {
  return Array.isArray(delivery?.question?.revealedGuidedSteps) ? delivery.question.revealedGuidedSteps : [];
}

function mergeGuidedSteps(previous = [], current = []) {
  const byLevel = new Map();
  [...previous, ...current].forEach((step) => {
    const level = Number(step?.level);
    if (!Number.isInteger(level) || level < 1) return;
    byLevel.set(level, { ...byLevel.get(level), ...step, level });
  });
  return [...byLevel.values()].sort((left, right) => left.level - right.level);
}

function mergeGuidedResponses(previous = [], current = []) {
  const byLevel = new Map();
  [...previous, ...current].forEach((response) => {
    const level = Number(response?.level);
    if (!Number.isInteger(level) || level < 1) return;
    const existing = byLevel.get(level);
    if (!existing || Number(response.attemptCount || 0) >= Number(existing.attemptCount || 0)) {
      byLevel.set(level, { ...existing, ...response, level });
    }
  });
  return [...byLevel.values()].sort((left, right) => left.level - right.level);
}

export function createQuestionDeliveryRepository({
  apiClient = createLocalApiClient(),
  allowLocalFallback = true,
  remoteEnabled = true,
} = {}) {
  const statesByQuestionId = new Map();
  const pendingByKey = new Map();
  let remoteDeliveryEnabled = Boolean(remoteEnabled && apiClient.enabled);

  function canUseLocalFallback() {
    return typeof allowLocalFallback === "function" ? Boolean(allowLocalFallback()) : Boolean(allowLocalFallback);
  }

  function stateForQuestion(questionId) {
    return statesByQuestionId.get(questionId) || null;
  }

  function remember(questionId, delivery, previous = null, { source = previous?.source || "direct" } = {}) {
    const existing = statesByQuestionId.get(questionId) || null;
    if (existing?.source === "server_daily_run" && source !== "server_daily_run") return existing;
    const retainsInteractionState =
      previous?.source === source && previous?.delivery?.id === delivery?.id;
    const state = {
      delivery,
      revealedHints: retainsInteractionState ? previous.revealedHints : [],
      revealedGuidedSteps: mergeGuidedSteps(
        retainsInteractionState ? previous?.revealedGuidedSteps || [] : [],
        publicRevealedGuidedSteps(delivery),
      ),
      guidedResponses: mergeGuidedResponses(
        retainsInteractionState ? previous?.guidedResponses || [] : [],
        publicGuidedResponseStates(delivery),
      ),
      source,
    };
    statesByQuestionId.set(questionId, state);
    return state;
  }

  function adoptDelivery({ questionId, delivery, source = "server_daily_run" }) {
    if (!questionId || !delivery) return null;
    return remember(questionId, delivery, stateForQuestion(questionId), { source });
  }

  async function ensureDelivery({ questionId, deliveryRequest }) {
    const existing = stateForQuestion(questionId);
    if (existing?.delivery) return existing;
    if (!remoteDeliveryEnabled || !deliveryRequest) return null;

    const key = requestKey(deliveryRequest);
    if (pendingByKey.has(key)) return pendingByKey.get(key);

    const pending = Promise.resolve(apiClient.createQuestionDelivery?.({ deliveryRequest }))
      .then((response) => {
        if (!response?.delivery) return null;
        return remember(questionId, response.delivery, stateForQuestion(questionId), { source: "direct" });
      })
      .catch(() => {
        // Only the intentional offline prototype can continue without a server-scored delivery.
        if (canUseLocalFallback()) remoteDeliveryEnabled = false;
        return null;
      })
      .finally(() => pendingByKey.delete(key));
    pendingByKey.set(key, pending);
    return pending;
  }

  async function hydrateDelivery({ questionId, deliveryId, source = "direct" }) {
    if (!questionId || !deliveryId || !remoteDeliveryEnabled) return null;
    try {
      const response = await apiClient.getQuestionDelivery?.({ deliveryId });
      if (!response?.delivery) return null;
      return remember(questionId, response.delivery, stateForQuestion(questionId), { source });
    } catch {
      return null;
    }
  }

  async function submitAttempt({ questionId, studentId, answer, elapsedSeconds, answerRevisionCount = 0 }) {
    const existing = stateForQuestion(questionId);
    if (!existing?.delivery?.id || !remoteDeliveryEnabled) return null;
    try {
      const response = await apiClient.submitQuestionDeliveryAttempt?.({
        deliveryId: existing.delivery.id,
        studentId,
        answer,
        elapsedSeconds,
        answerRevisionCount,
      });
      if (!response?.delivery || !response?.result) return null;
      return {
        ...response,
        state: remember(questionId, response.delivery, existing),
      };
    } catch {
      return null;
    }
  }

  async function markStarted({ questionId, studentId }) {
    const existing = stateForQuestion(questionId);
    if (!existing?.delivery?.id || !remoteDeliveryEnabled) return null;
    try {
      const response = await apiClient.markQuestionDeliveryStarted?.({
        deliveryId: existing.delivery.id,
        studentId,
      });
      if (!response?.delivery) return null;
      return {
        ...response,
        state: remember(questionId, response.delivery, existing),
      };
    } catch {
      return null;
    }
  }

  async function revealHint({ questionId, studentId }) {
    const existing = stateForQuestion(questionId);
    if (!existing?.delivery?.id || !remoteDeliveryEnabled) return null;
    try {
      const response = await apiClient.revealQuestionDeliveryHint?.({
        deliveryId: existing.delivery.id,
        studentId,
      });
      if (!response?.delivery) return null;
      const revealedHints = response.hint
        ? [...existing.revealedHints.filter((hint) => hint.level !== response.hint.level), response.hint].sort((a, b) => a.level - b.level)
        : existing.revealedHints;
      return {
        ...response,
        state: remember(questionId, response.delivery, { ...existing, revealedHints }),
      };
    } catch {
      return null;
    }
  }

  async function revealGuidedStep({ questionId, studentId }) {
    const existing = stateForQuestion(questionId);
    if (!existing?.delivery?.id || !remoteDeliveryEnabled) return null;
    try {
      const response = await apiClient.revealQuestionDeliveryGuidedStep?.({
        deliveryId: existing.delivery.id,
        studentId,
      });
      if (!response?.delivery) return null;
      const revealedGuidedSteps = response.step
        ? [...existing.revealedGuidedSteps.filter((step) => step.level !== response.step.level), response.step].sort((a, b) => a.level - b.level)
        : existing.revealedGuidedSteps;
      return {
        ...response,
        state: remember(questionId, response.delivery, { ...existing, revealedGuidedSteps }),
      };
    } catch {
      return null;
    }
  }

  async function submitGuidedStepResponse({ questionId, studentId, level, response }) {
    const existing = stateForQuestion(questionId);
    if (!existing?.delivery?.id || !remoteDeliveryEnabled) return null;
    try {
      const result = await apiClient.submitQuestionDeliveryGuidedStepResponse?.({
        deliveryId: existing.delivery.id,
        studentId,
        level,
        response,
      });
      if (!result?.delivery || !result?.response || !result?.result) return null;
      const localResponse = {
        ...result.response,
        responseValue: typeof response === "string" ? response : String(response),
      };
      return {
        ...result,
        state: remember(questionId, result.delivery, {
          ...existing,
          guidedResponses: mergeGuidedResponses(existing.guidedResponses, [localResponse]),
        }),
      };
    } catch {
      return null;
    }
  }

  async function getGuidedProcess({ questionId }) {
    const existing = stateForQuestion(questionId);
    if (!existing?.delivery?.id || !remoteDeliveryEnabled) return null;
    try {
      const result = await apiClient.getQuestionDeliveryGuidedProcess?.({ deliveryId: existing.delivery.id });
      return result?.process || null;
    } catch {
      return null;
    }
  }

  return {
    adoptDelivery,
    ensureDelivery,
    getGuidedProcess,
    hydrateDelivery,
    markStarted,
    revealGuidedStep,
    revealHint,
    remoteAvailable: () => remoteDeliveryEnabled,
    stateForQuestion,
    submitGuidedStepResponse,
    submitAttempt,
  };
}
