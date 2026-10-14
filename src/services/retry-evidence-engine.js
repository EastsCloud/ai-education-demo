const SUPPORT_EVENT_TYPES = new Set(["hint_opened", "guided_step_opened"]);

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function cleanIdentifier(value) {
  const id = String(value || "").trim();
  return id || null;
}

function evidenceKeys(event) {
  const deliveryId = cleanIdentifier(event?.payload?.deliveryId);
  if (deliveryId) return [`delivery:${deliveryId}`];

  const sessionId = cleanIdentifier(event?.sessionId);
  const targetId = cleanIdentifier(event?.targetId);
  return sessionId || targetId ? [`session-target:${sessionId || "none"}:${targetId || "none"}`] : [];
}

function supportIndex(events = []) {
  const byEvidenceKey = new Map();
  events
    .filter((event) => SUPPORT_EVENT_TYPES.has(event?.eventType))
    .forEach((event) => {
      const timestamp = toTimestamp(event.timestamp);
      evidenceKeys(event).forEach((key) => {
        const timestamps = byEvidenceKey.get(key) || [];
        timestamps.push(timestamp);
        byEvidenceKey.set(key, timestamps);
      });
    });
  return byEvidenceKey;
}

// A new delivery for an independent replay has its own delivery id. This avoids
// carrying help opened on an earlier delivery into the later no-support retry.
export function createIndependentAnswerPredicate(events = []) {
  const supportByEvidenceKey = supportIndex(events);
  return (answer) => {
    if (
      Number(answer?.payload?.hintsOpened || 0) > 0 ||
      Number(answer?.payload?.guidedStepsOpened || 0) > 0
    ) {
      return false;
    }
    const answerTimestamp = toTimestamp(answer?.timestamp);
    return !evidenceKeys(answer).some((key) =>
      (supportByEvidenceKey.get(key) || []).some(
        (supportTimestamp) => !answerTimestamp || !supportTimestamp || supportTimestamp <= answerTimestamp,
      ),
    );
  };
}

function sourceTargetIds(answers = []) {
  const byDeliveryId = new Map();
  answers.forEach((answer) => {
    const deliveryId = cleanIdentifier(answer?.payload?.deliveryId);
    const targetId = cleanIdentifier(answer?.targetId);
    if (deliveryId && targetId) byDeliveryId.set(deliveryId, targetId);
  });
  return byDeliveryId;
}

// Reports and matching need one definition of a retry: an explicit student retry
// click, or a server-bound exact replay. A server-bound replay is counted once
// even when the student makes several attempts before independently resolving it.
export function summarizeRetryEvidence({ events = [], answers = [] } = {}) {
  const isIndependentAnswer = createIndependentAnswerPredicate(events);
  const originalTargetByDeliveryId = sourceTargetIds(answers);
  const replayGroups = new Map();

  answers.forEach((answer) => {
    const sourceDeliveryId = cleanIdentifier(answer?.payload?.retrySourceDeliveryId);
    if (!sourceDeliveryId) return;
    const group = replayGroups.get(sourceDeliveryId) || { sourceDeliveryId, answers: [] };
    group.answers.push(answer);
    replayGroups.set(sourceDeliveryId, group);
  });

  const serverRetries = [...replayGroups.values()].map((group) => {
    const answerTimes = group.answers.map((answer) => toTimestamp(answer.timestamp)).filter(Boolean);
    return {
      sourceTargetId: originalTargetByDeliveryId.get(group.sourceDeliveryId) || null,
      firstAnswerAt: answerTimes.length ? Math.min(...answerTimes) : 0,
      independentlySucceeded: group.answers.some(
        (answer) => Boolean(answer.payload?.isCorrect) && isIndependentAnswer(answer),
      ),
    };
  });

  const directRetries = events
    .filter((event) => event?.eventType === "retry_clicked")
    .filter((retry) => {
      const retryTargetId = cleanIdentifier(retry.targetId);
      const retryTimestamp = toTimestamp(retry.timestamp);
      return !serverRetries.some(
        (serverRetry) =>
          retryTargetId &&
          serverRetry.sourceTargetId === retryTargetId &&
          serverRetry.firstAnswerAt >= retryTimestamp,
      );
    });

  const directSuccessCount = directRetries.filter((retry) => {
    const retryTimestamp = toTimestamp(retry.timestamp);
    return answers.some(
      (answer) =>
        answer.targetId === retry.targetId &&
        toTimestamp(answer.timestamp) >= retryTimestamp &&
        Boolean(answer.payload?.isCorrect) &&
        isIndependentAnswer(answer),
    );
  }).length;
  const serverSuccessCount = serverRetries.filter((retry) => retry.independentlySucceeded).length;

  return {
    retryCount: directRetries.length + serverRetries.length,
    retrySuccessCount: directSuccessCount + serverSuccessCount,
  };
}
