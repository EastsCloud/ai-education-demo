import {
  isControlledNumberVariant,
  isReadingFormTransferVariant,
} from "../services/variant-evidence-policy.js?v=variant-evidence-policy-1";
import { summarizeIndependentChallengeEvidence } from "../services/challenge-evidence-policy.js?v=challenge-evidence-2";
import {
  createIndependentAnswerPredicate,
  summarizeRetryEvidence,
} from "../services/retry-evidence-engine.js?v=retry-evidence-2";

export function createPracticeRuntime({ baseQuestionId, getDefaultTargetId, getPage, seedEvents, studentId, subjectId = null }) {
  const behaviorEvents = [...seedEvents];
  const runtimeSessionId = `session-runtime-${Date.now()}`;
  const questionSession = {
    sessionId: "qs-runtime-001",
    questionId: baseQuestionId,
    startedAt: null,
    currentQuestionStartedAt: null,
    currentQuestionId: baseQuestionId,
    attempts: [],
    highestHintLevelOpened: 0,
    recommendationState: "original",
  };
  const completedItems = [];
  let started = false;

  function getStats() {
    const answerEvents = behaviorEvents.filter((event) => event.eventType === "answer_submitted");
    const hintEvents = behaviorEvents.filter((event) => event.eventType === "hint_opened");
    const guidedStepEvents = behaviorEvents.filter((event) => event.eventType === "guided_step_opened");
    const startedEvents = behaviorEvents.filter((event) => event.eventType === "question_started");
    const latestAnswer = answerEvents[answerEvents.length - 1];
    const sessionEvents = behaviorEvents.filter((event) => event.sessionId === runtimeSessionId);
    const timedEvents = sessionEvents
      .map((event) => Date.parse(event.timestamp))
      .filter((timestamp) => Number.isFinite(timestamp));
    const startedAt = questionSession.startedAt ? Date.parse(questionSession.startedAt) : timedEvents[0];
    const endedAt = timedEvents[timedEvents.length - 1] || startedAt;
    const durationMinutes = startedAt && endedAt ? Math.max(1, Math.round((endedAt - startedAt) / 60000)) : 0;
    const correctAnswerEvents = answerEvents.filter((event) => event.payload?.isCorrect);
    const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
    const independentCorrectEvents = correctAnswerEvents.filter((event) => isIndependentAnswer(event));
    const withHintAnswerEvents = answerEvents.filter((event) => event.payload?.hintsOpened > 0);
    const withHintCorrectEvents = withHintAnswerEvents.filter((event) => event.payload?.isCorrect);
    const supportAssistedAnswerEvents = answerEvents.filter((event) => !isIndependentAnswer(event));
    const supportAssistedCorrectEvents = supportAssistedAnswerEvents.filter((event) => event.payload?.isCorrect);
    const variantAnswerEvents = answerEvents.filter(
      (event) => event.payload?.variantLevel && event.payload.variantLevel !== "original",
    );
    const variantCorrectEvents = variantAnswerEvents.filter((event) => event.payload?.isCorrect);
    const controlledVariantAnswerEvents = answerEvents.filter((event) => isControlledNumberVariant(event.payload?.variantLevel));
    const controlledVariantCorrectEvents = controlledVariantAnswerEvents.filter((event) => event.payload?.isCorrect);
    const formTransferAnswerEvents = answerEvents.filter((event) => isReadingFormTransferVariant(event.payload?.variantLevel));
    const formTransferCorrectEvents = formTransferAnswerEvents.filter((event) => event.payload?.isCorrect);
    const elapsedAnswerEvents = answerEvents.filter((event) => Number.isFinite(Number(event.payload?.elapsedSeconds)));
    const fastIncorrectEvents = elapsedAnswerEvents.filter(
      (event) => !event.payload?.isCorrect && Number(event.payload.elapsedSeconds) <= 12,
    );
    const slowAccurateEvents = elapsedAnswerEvents.filter(
      (event) => event.payload?.isCorrect && Number(event.payload.elapsedSeconds) >= 90,
    );
    const challengeEvidence = summarizeIndependentChallengeEvidence(answerEvents, { isIndependentAnswer });
    const retryEvidence = summarizeRetryEvidence({ events: behaviorEvents, answers: answerEvents });
    const revisionObservedEvents = answerEvents.filter((event) => Number.isFinite(Number(event.payload?.answerRevisionCount)));
    const revisedAnswerEvents = revisionObservedEvents.filter((event) => Number(event.payload?.answerRevisionCount) > 0);
    const voluntaryPracticeCount = behaviorEvents
      .filter((event) => ["same_type_more_requested", "harder_extra_practice_requested", "atlas_related_practice_requested"].includes(event.eventType))
      .reduce(
        (total, event) =>
          total + (event.eventType === "atlas_related_practice_requested" ? 1 : Number(event.payload?.requestedCount || 0)),
        0,
      );
    const sessionAnswerEvents = answerEvents.filter((event) => event.sessionId === runtimeSessionId);
    const splitPoint = Math.ceil(sessionAnswerEvents.length / 2);
    const earlyAnswers = sessionAnswerEvents.slice(0, splitPoint);
    const laterAnswers = sessionAnswerEvents.slice(splitPoint);
    const averageElapsed = (events) => {
      const values = events.map((event) => Number(event.payload?.elapsedSeconds)).filter(Number.isFinite);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    };
    const errorRate = (events) => (events.length ? events.filter((event) => !event.payload?.isCorrect).length / events.length : 0);
    const earlyDuration = averageElapsed(earlyAnswers);
    const laterDuration = averageElapsed(laterAnswers);
    const earlyErrorRate = errorRate(earlyAnswers);
    const laterErrorRate = errorRate(laterAnswers);
    const fatigueSignal =
      laterAnswers.length >= 2
        ? Math.min(
            1,
            Math.max(0, (laterDuration > earlyDuration * 1.5 ? 0.5 : 0) + (laterErrorRate > earlyErrorRate + 0.2 ? 0.5 : 0)),
          )
        : 0;
    const hintLevels = hintEvents
      .map((event) => Number(event.payload?.hintLevel || 0))
      .filter((level) => level > 0);

    return {
      totalEvents: behaviorEvents.length,
      answerCount: answerEvents.length,
      correctAnswerCount: correctAnswerEvents.length,
      correctRate: answerEvents.length ? correctAnswerEvents.length / answerEvents.length : 0,
      durationMinutes,
      hintCount: hintEvents.length,
      guidedStepCount: guidedStepEvents.length,
      hintUseRate: answerEvents.length ? withHintAnswerEvents.length / answerEvents.length : 0,
      hintFreeCorrectRate: answerEvents.length ? independentCorrectEvents.length / answerEvents.length : 0,
      hintedCorrectRate: withHintAnswerEvents.length ? withHintCorrectEvents.length / withHintAnswerEvents.length : 0,
      supportUseRate: answerEvents.length ? supportAssistedAnswerEvents.length / answerEvents.length : 0,
      supportAssistedCorrectRate: supportAssistedAnswerEvents.length
        ? supportAssistedCorrectEvents.length / supportAssistedAnswerEvents.length
        : 0,
      variantAnswerCount: variantAnswerEvents.length,
      variantAccuracy: variantAnswerEvents.length ? variantCorrectEvents.length / variantAnswerEvents.length : null,
      controlledVariantAnswerCount: controlledVariantAnswerEvents.length,
      controlledVariantStabilityRate: controlledVariantAnswerEvents.length
        ? controlledVariantCorrectEvents.length / controlledVariantAnswerEvents.length
        : null,
      formTransferAnswerCount: formTransferAnswerEvents.length,
      formTransferRate: formTransferAnswerEvents.length ? formTransferCorrectEvents.length / formTransferAnswerEvents.length : null,
      // Legacy name for prototype callers. It now means controlled-number stability.
      variantTransferRate: controlledVariantAnswerEvents.length
        ? controlledVariantCorrectEvents.length / controlledVariantAnswerEvents.length
        : null,
      fastGuessRate: elapsedAnswerEvents.length ? fastIncorrectEvents.length / elapsedAnswerEvents.length : 0,
      slowAccurateRate: elapsedAnswerEvents.length ? slowAccurateEvents.length / elapsedAnswerEvents.length : 0,
      challengeSuccessRate: challengeEvidence.challengeSuccessRate,
      independentChallengeEvidenceCount: challengeEvidence.independentChallengeEvidenceCount,
      independentChallengeSuccessRate: challengeEvidence.independentChallengeSuccessRate,
      independentChallengeTransferEvidenceCount: challengeEvidence.independentChallengeTransferEvidenceCount,
      independentChallengeTransferSuccessRate: challengeEvidence.independentChallengeTransferSuccessRate,
      answerRevisionEvidenceCount: revisionObservedEvents.length,
      answerRevisionRate: revisionObservedEvents.length ? revisedAnswerEvents.length / revisionObservedEvents.length : null,
      averageAnswerRevisionCount: revisionObservedEvents.length
        ? revisionObservedEvents.reduce((sum, event) => sum + Number(event.payload?.answerRevisionCount || 0), 0) / revisionObservedEvents.length
        : null,
      voluntaryPracticeCount,
      fatigueSignal,
      averageHintDepth: hintLevels.length ? hintLevels.reduce((sum, level) => sum + level, 0) / hintLevels.length : 0,
      retryCount: retryEvidence.retryCount,
      redoSuccessRate: retryEvidence.retryCount ? retryEvidence.retrySuccessCount / retryEvidence.retryCount : 0,
      startedCount: startedEvents.length,
      highestHintLevel: questionSession.highestHintLevelOpened,
      latestCorrect: latestAnswer?.payload?.isCorrect,
    };
  }

  function getPracticeSummary() {
    const correctItems = completedItems.filter((item) => item.isCorrect);
    const wrongItems = completedItems.filter((item) => !item.isCorrect);

    return {
      items: completedItems.map((item) => ({ ...item })),
      correctItems,
      wrongItems,
      total: completedItems.length,
      correctCount: correctItems.length,
      wrongCount: wrongItems.length,
      studentCorrectRate: completedItems.length ? correctItems.length / completedItems.length : 0,
    };
  }

  function trackEvent(eventType, payload = {}) {
    const event = {
      eventId: `${runtimeSessionId}-${String(behaviorEvents.length + 1).padStart(3, "0")}`,
      studentId,
      subjectId,
      sessionId: runtimeSessionId,
      eventType,
      timestamp: new Date().toISOString(),
      page: getPage(),
      targetId: payload.targetId || getDefaultTargetId(),
      payload,
    };

    behaviorEvents.push(event);
    return event;
  }

  function markStarted() {
    if (started) return false;
    started = true;
    questionSession.startedAt = new Date().toISOString();
    return true;
  }

  function startQuestion(questionId) {
    if (questionSession.currentQuestionId === questionId && questionSession.currentQuestionStartedAt) return;
    questionSession.currentQuestionId = questionId;
    questionSession.currentQuestionStartedAt = new Date().toISOString();
  }

  function restartQuestionTimer(questionId = questionSession.currentQuestionId) {
    questionSession.currentQuestionId = questionId;
    questionSession.currentQuestionStartedAt = new Date().toISOString();
  }

  function getCurrentQuestionElapsedSeconds() {
    const startedAt = Date.parse(questionSession.currentQuestionStartedAt || "");
    if (!Number.isFinite(startedAt)) return 0;
    return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
  }

  function addAttempt(attempt) {
    questionSession.attempts.push(attempt);
  }

  function addCompletedItem(item) {
    completedItems.push(item);
  }

  function getRestoredStageLabel(payload = {}) {
    if (typeof payload.stageLabel === "string" && payload.stageLabel.trim()) return payload.stageLabel;
    const variantLabels = {
      original: "原题",
      change_one_number: "换一个数字",
      change_two_numbers: "换两个数字",
      context_change: "换一种表达",
      relationship_reframe: "换一种关系表达",
      question_order_variant: "换一种提问顺序",
      step_added_variant: "多一个整理步骤",
      two_steps_added_variant: "多两个整理步骤",
      reverse_question: "换一个未知量",
      multi_step_extension: "多一个实际步骤",
    };
    return variantLabels[payload.variantLevel] || "今日练习";
  }

  function getRestoredAnswerText(payload = {}) {
    if (payload.isCorrect === true) {
      return Number(payload.hintsOpened || 0) > 0 || Number(payload.guidedStepsOpened || 0) > 0
        ? "借助帮助完成；之后会安排一次独立重做。"
        : "独立完成。";
    }
    return "已记录，可选择原题重做。";
  }

  function restoreCompletedItemsFromEvents(
    events = [],
    { practiceRunId = null, requireServerScored = false } = {},
  ) {
    const restoredByEventId = new Map();

    events.forEach((event, index) => {
      const payload = event?.payload || {};
      const belongsToRun =
        !practiceRunId || payload.practiceRunId === practiceRunId || event?.sessionId === practiceRunId;
      const isTrustedServerAnswer = payload.scoringSource === "server_authoritative";
      if (
        event?.eventType !== "answer_submitted" ||
        !belongsToRun ||
        (requireServerScored && !isTrustedServerAnswer)
      ) {
        return;
      }

      const eventId = event.eventId || `restored-answer-${event.timestamp || "unknown"}-${index}`;
      restoredByEventId.set(eventId, {
        timestamp: String(event.timestamp || ""),
        item: {
          eventId,
          questionId: event.targetId || payload.deliveryId || null,
          prompt: payload.questionPrompt || "已完成的一道题。",
          stageLabel: getRestoredStageLabel(payload),
          answerText: getRestoredAnswerText(payload),
          isCorrect: payload.isCorrect === true,
          hintsOpened: Math.max(0, Number(payload.hintsOpened || 0)),
          guidedStepsOpened: Math.max(0, Number(payload.guidedStepsOpened || 0)),
          questionSnapshot: null,
          restoredFromServer: isTrustedServerAnswer,
        },
      });
    });

    const restoredItems = [...restoredByEventId.values()]
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .map(({ item }) => item);
    completedItems.splice(0, completedItems.length, ...restoredItems);
    return getPracticeSummary();
  }

  function restoreCompletedItemsFromSummaryItems(items = []) {
    const restoredItems = items
      .filter((item) => item && typeof item === "object")
      .map((item, index) => ({
        eventId: item.id || `server-summary-answer-${index}`,
        questionId: item.questionId || null,
        prompt: item.prompt || "已完成的一道题。",
        stageLabel: item.stageLabel || "今日练习",
        answerText: item.answerText || getRestoredAnswerText(item),
        isCorrect: item.isCorrect === true,
        hintsOpened: Math.max(0, Number(item.hintsOpened || 0)),
        guidedStepsOpened: Math.max(0, Number(item.guidedStepsOpened || 0)),
        questionSnapshot: item.questionSnapshot || null,
        restoredFromServer: true,
      }));
    completedItems.splice(0, completedItems.length, ...restoredItems);
    return getPracticeSummary();
  }

  function importHistoricalEvents(events = []) {
    const knownEventIds = new Set(behaviorEvents.map((event) => event.eventId));
    events.forEach((event) => {
      if (event?.eventId && !knownEventIds.has(event.eventId)) {
        behaviorEvents.push(event);
        knownEventIds.add(event.eventId);
      }
    });
  }

  function setHighestHintLevel(level) {
    questionSession.highestHintLevelOpened = Math.max(questionSession.highestHintLevelOpened, level);
  }

  function setRecommendationState(recommendationState) {
    questionSession.recommendationState = recommendationState;
  }

  return {
    addAttempt,
    addCompletedItem,
    getPracticeSummary,
    getStats,
    importHistoricalEvents,
    restoreCompletedItemsFromEvents,
    restoreCompletedItemsFromSummaryItems,
    getCurrentQuestionElapsedSeconds,
    markStarted,
    questionSession,
    restartQuestionTimer,
    setHighestHintLevel,
    setRecommendationState,
    startQuestion,
    trackEvent,
  };
}
