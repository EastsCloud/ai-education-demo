function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function deliveryKey(event, index) {
  const value = event?.payload?.deliveryId || event?.targetId || `unbound-${index}`;
  return String(value);
}

function responseStepKey(event, index) {
  const stepIndex = Number(event?.payload?.guidedStepIndex);
  return `${deliveryKey(event, index)}:${Number.isInteger(stepIndex) && stepIndex >= 0 ? stepIndex : "unknown"}`;
}

function rate(numerator, denominator) {
  return denominator > 0 ? Number((numerator / denominator).toFixed(2)) : null;
}

const GUIDED_REASONING_PHASES = new Set(["read_translate", "relationship", "organize", "plan", "calculation"]);

function normalizedReasoningPhase(value) {
  const phase = String(value || "").trim();
  return GUIDED_REASONING_PHASES.has(phase) ? phase : null;
}

// Guided-response content stays inside the protected question delivery. This
// summary intentionally exposes only interaction states for support decisions.
export function summarizeGuidedResponseEvidence(events = []) {
  const responses = events.filter((event) => event?.eventType === "guided_step_response_recorded");
  const latestByStep = new Map();
  let reasoningResponseCount = 0;
  let finalResponseAttemptCount = 0;
  let finalRetryAttemptCount = 0;
  const reasoningPhaseCounts = new Map();

  responses.forEach((event, index) => {
    const payload = event?.payload || {};
    const responseType = payload.guidedResponseType === "final_answer" ? "final_answer" : "short_reasoning";
    const status =
      payload.guidedResponseStatus === "confirmed"
        ? "confirmed"
        : payload.guidedResponseStatus === "needs_retry"
          ? "needs_retry"
          : "recorded";
    if (responseType === "final_answer") {
      finalResponseAttemptCount += 1;
      if (status === "needs_retry") finalRetryAttemptCount += 1;
    } else {
      reasoningResponseCount += 1;
      const phase = normalizedReasoningPhase(payload.guidedStepPhase);
      if (phase) reasoningPhaseCounts.set(phase, (reasoningPhaseCounts.get(phase) || 0) + 1);
    }

    const key = responseStepKey(event, index);
    const previous = latestByStep.get(key);
    if (!previous || toTimestamp(event.timestamp) >= toTimestamp(previous.timestamp)) {
      latestByStep.set(key, {
        deliveryId: deliveryKey(event, index),
        responseType,
        status,
        timestamp: event.timestamp || null,
      });
    }
  });

  const latestResponses = [...latestByStep.values()];
  const finalChecks = latestResponses.filter((item) => item.responseType === "final_answer");
  const confirmedFinalChecks = finalChecks.filter((item) => item.status === "confirmed");

  return {
    guidedResponseCount: responses.length,
    guidedResponseDeliveryCount: new Set(latestResponses.map((item) => item.deliveryId)).size,
    guidedReasoningResponseCount: reasoningResponseCount,
    guidedReasoningPhaseCounts: Object.fromEntries(reasoningPhaseCounts),
    guidedFinalResponseAttemptCount: finalResponseAttemptCount,
    guidedFinalRetryAttemptCount: finalRetryAttemptCount,
    guidedFinalCheckCount: finalChecks.length,
    guidedFinalConfirmationRate: rate(confirmedFinalChecks.length, finalChecks.length),
  };
}
