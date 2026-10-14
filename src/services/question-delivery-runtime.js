import {
  createMathAnswerInput,
  formatMathAnswerValue,
  mathAnswerValuesMatch,
  normalizeMathAnswerValue,
} from "./math-answer-input.js?v=math-answer-input-fraction-1";

const DELIVERY_MODES = new Set(["practice", "formal_assessment"]);
const SUPPORTED_AI_VERSIONS = new Set(["semi_ai", "full_ai_ready"]);
const SUPPORTED_VARIANTS = new Set([
  "original",
  "change_one_number",
  "change_two_numbers",
  "relationship_reframe",
  "question_order_variant",
  "context_change",
  "step_added_variant",
  "two_steps_added_variant",
  "reverse_question",
  "multi_step_extension",
]);
const SUPPORTED_GRADES = new Set(["G1", "G2", "G3", "G4", "G5", "G6"]);
const SUPPORTED_PRACTICE_MODES = new Set(["same_type", "harder", "wrong_retry", "atlas_related", "atlas_wrong_retry"]);
const OPTIONAL_CHALLENGE_ROUTES = new Set(["same_family_deeper_variant", "knowledge_graph_successor"]);
const HELP_PHASE_TITLES = {
  calculation: "计算",
  check: "检查",
  read_translate: "读题翻译",
  relationship: "找关系",
};

function cleanString(value) {
  const text = String(value || "").trim();
  return text || null;
}

function boundedNumber(value, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) return null;
  return integer ? Math.trunc(number) : number;
}

function cleanGuidedText(value, maximum = 360) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return text && text.length <= maximum ? text : null;
}

function latestGuidedResponses(delivery) {
  const responses = Array.isArray(delivery?.guidedResponses) ? delivery.guidedResponses : [];
  const latestByLevel = new Map();
  responses.forEach((response) => {
    const level = Math.floor(Number(response?.level));
    if (!Number.isFinite(level) || level < 1) return;
    const previous = latestByLevel.get(level);
    if (!previous || Number(response.attemptNumber || 0) >= Number(previous.attemptNumber || 0)) {
      latestByLevel.set(level, response);
    }
  });
  return [...latestByLevel.values()].sort((left, right) => Number(left.level) - Number(right.level));
}

function publicGuidedResponseStates(delivery) {
  return latestGuidedResponses(delivery).map((response) => ({
    level: Number(response.level),
    responseType: response.responseType || "short_reasoning",
    status:
      response.responseType === "final_answer"
        ? response.isCorrect
          ? "confirmed"
          : "needs_retry"
        : "recorded",
    attemptCount: Number(response.attemptNumber || 1),
    submittedAt: response.submittedAt || null,
  }));
}

function deliverySupport(delivery) {
  const candidate = delivery.privateCandidate || {};
  const support = delivery.support || {};
  const hintLayers = Array.isArray(candidate.hintLayers) ? candidate.hintLayers : [];
  const guidedSteps = Array.isArray(candidate.guidedSteps) ? candidate.guidedSteps : [];
  const guidedResponseStates = Boolean(support.allowed) ? publicGuidedResponseStates(delivery) : [];
  return {
    allowed: Boolean(support.allowed),
    hintCount: Boolean(support.allowed) ? hintLayers.length : 0,
    revealedHintCount: Math.min(Number(support.revealedHintCount || 0), hintLayers.length),
    guidedStepCount: Boolean(support.allowed) ? guidedSteps.length : 0,
    revealedGuidedStepCount: Math.min(Number(support.revealedGuidedStepCount || 0), guidedSteps.length),
    guidedResponseCount: guidedResponseStates.length,
    guidedResponseStates,
  };
}

function copyKnownFields(source, fields) {
  return fields.reduce((result, field) => {
    if (source?.[field] === undefined) return result;
    const value = source[field];
    result[field] = Array.isArray(value) ? [...value] : value;
    return result;
  }, {});
}

// Delivery metadata is useful to the learning surface, but generation and scoring
// fields stay private so a browser cannot reconstruct the answer-bearing item.
export function toPublicItemTags(itemTags) {
  if (!itemTags || typeof itemTags !== "object") return null;
  return {
    systemLevelTags: copyKnownFields(itemTags.systemLevelTags, [
      "instructionalGrade",
      "curriculumStandards",
      "targetLevel",
      "readinessLevel",
    ]),
    difficultyTags: copyKnownFields(itemTags.difficultyTags, [
      "difficultyLevel",
      "instructionalGrade",
      "cognitiveDemand",
      "dokLevel",
      "estimatedTimeSeconds",
    ]),
    knowledgeTags: copyKnownFields(itemTags.knowledgeTags, [
      "knowledgeClusterId",
      "knowledgePointIds",
      "prerequisiteIds",
      "knowledgeGraphNodeIds",
    ]),
    knowledgeGraphTags: copyKnownFields(itemTags.knowledgeGraphTags, [
      "graphId",
      "familyNodeId",
      "conceptNodeIds",
      "prerequisiteNodeIds",
    ]),
    atlasTags: copyKnownFields(itemTags.atlasTags, ["atlasEntryIds", "commonMisconceptionIds"]),
    abilityTags: copyKnownFields(itemTags.abilityTags, ["abilityDimensions", "evidenceTargets"]),
    practiceTags: copyKnownFields(itemTags.practiceTags, [
      "runtimeModes",
      "supportAllowedByMode",
      "variantLevel",
      "variantCode",
      "repeatRole",
    ]),
    solutionTags: copyKnownFields(itemTags.solutionTags, ["strategyIds", "stepTemplateId", "hintTemplateId", "guidedModeId", "learningPhases"]),
    // Context-template and validation-certificate identifiers remain server-only.
    // The learner needs the question and permitted support, never generation internals.
    qualityTags: copyKnownFields(itemTags.qualityTags, ["reviewStatus", "aiGenerated", "humanVerified", "version"]),
  };
}

function feedbackCode({ isCorrect, supportAllowed }) {
  if (isCorrect) return "correct_continue";
  return supportAllowed ? "retry_or_open_next_hint" : "response_recorded";
}

export function normalizeQuestionDeliveryRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = cleanString(value.studentId);
  const subjectId = cleanString(value.subjectId);
  const mode = cleanString(value.mode);
  const familyId = cleanString(value.familyId);
  const instructionalGrade = cleanString(value.instructionalGrade)?.toUpperCase();
  const variantLevel = cleanString(value.variantLevel || "original");
  const aiVersion = cleanString(value.aiVersion || "semi_ai");
  const practiceMode = cleanString(value.practiceMode);
  const practiceRunId = cleanString(value.practiceRunId);
  const optionalPracticeSessionId = cleanString(value.optionalPracticeSessionId);
  const retrySourceDeliveryId = cleanString(value.retrySourceDeliveryId);
  const correctReviewSourceDeliveryId = cleanString(value.correctReviewSourceDeliveryId);
  const optionalPracticeIndex =
    value.optionalPracticeIndex === undefined || value.optionalPracticeIndex === null
      ? null
      : boundedNumber(value.optionalPracticeIndex, { minimum: 0, maximum: 1000, integer: true });
  const progressionUnitIndex =
    value.progressionUnitIndex === undefined || value.progressionUnitIndex === null
      ? null
      : boundedNumber(value.progressionUnitIndex, { minimum: 0, maximum: 1000, integer: true });
  const progressionStageIndex =
    value.progressionStageIndex === undefined || value.progressionStageIndex === null
      ? null
      : boundedNumber(value.progressionStageIndex, { minimum: 0, maximum: 2, integer: true });
  const independentRetry = Boolean(value.independentRetry);
  const optionalChallengeRoute = cleanString(value.optionalChallengeRoute);
  const seed = boundedNumber(value.seed, { minimum: 0, maximum: 1_000_000_000, integer: true });

  if (!studentId || !subjectId || !DELIVERY_MODES.has(mode) || !familyId || !SUPPORTED_GRADES.has(instructionalGrade)) {
    return null;
  }
  if (!SUPPORTED_VARIANTS.has(variantLevel) || !SUPPORTED_AI_VERSIONS.has(aiVersion) || seed === null) return null;
  const hasRequiredProgression = progressionUnitIndex !== null && progressionStageIndex !== null;
  const hasOptionalProgression = optionalPracticeSessionId && optionalPracticeIndex !== null;
  if (practiceRunId && !hasRequiredProgression && !hasOptionalProgression) return null;
  if (!practiceRunId && (hasRequiredProgression || hasOptionalProgression)) return null;

  return {
    studentId,
    subjectId,
    mode,
    familyId,
    instructionalGrade,
    variantLevel,
    aiVersion,
    seed,
    queueItemId: cleanString(value.queueItemId),
    sessionId: cleanString(value.sessionId),
    source: cleanString(value.source) || "learning_runtime",
    practiceMode: SUPPORTED_PRACTICE_MODES.has(practiceMode) ? practiceMode : null,
    practiceRunId,
    optionalPracticeSessionId,
    optionalPracticeIndex,
    retrySourceDeliveryId,
    correctReviewSourceDeliveryId,
    progressionUnitIndex,
    progressionStageIndex,
    independentRetry,
    optionalChallengeRoute: OPTIONAL_CHALLENGE_ROUTES.has(optionalChallengeRoute) ? optionalChallengeRoute : null,
    stageLabel: cleanString(value.stageLabel),
  };
}

export function createQuestionDeliveryRecord({ candidate, deliveryId, request, createdAt = new Date().toISOString() }) {
  if (!candidate?.id || !deliveryId || !request) return null;
  const supportAllowed = request.mode === "practice" && !request.independentRetry;
  return {
    id: deliveryId,
    studentId: request.studentId,
    subjectId: request.subjectId,
    mode: request.mode,
    status: "delivered",
    generationRequest: request,
    support: {
      allowed: supportAllowed,
      revealedHintCount: 0,
      revealedGuidedStepCount: 0,
    },
    guidedResponses: [],
    attempts: [],
    startedAt: null,
    privateCandidate: candidate,
    createdAt,
    updatedAt: createdAt,
  };
}

export function markQuestionDeliveryStarted({ delivery, startedAt = new Date().toISOString() }) {
  if (!delivery?.privateCandidate || delivery.status === "completed") return null;
  if (delivery.startedAt) return delivery;
  return {
    ...delivery,
    startedAt,
    status: delivery.status === "delivered" ? "in_progress" : delivery.status,
    updatedAt: startedAt,
  };
}

export function toQuestionDeliveryPresentation(delivery) {
  if (!delivery?.privateCandidate) return null;
  const candidate = delivery.privateCandidate;
  const support = deliverySupport(delivery);
  return {
    id: delivery.id,
    studentId: delivery.studentId,
    subjectId: delivery.subjectId,
    mode: delivery.mode,
    status: delivery.status,
    attemptCount: Array.isArray(delivery.attempts) ? delivery.attempts.length : 0,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    question: {
      id: candidate.id,
      prompt: candidate.prompt,
      answerInput: candidate.answerInput || createMathAnswerInput(),
      knowledgePoint: candidate.familyName || "Math relationship",
      familyId: candidate.familyId,
      variantLevel: candidate.metadataTags?.variantLevel || "original",
      instructionalGrade: candidate.metadataTags?.instructionalGrade || null,
      metadata: {
        atlasNodeIds: candidate.metadataTags?.atlasNodeIds || [],
        abilityTags: candidate.metadataTags?.abilityTags || [],
        domain: candidate.metadataTags?.domain || null,
        itemTags: toPublicItemTags(candidate.metadataTags?.itemTags),
      },
      support,
      learningPath: support.allowed ? candidate.supportStructure?.learningPath || ["读题翻译", "找关系", "计算", "检查"] : [],
      revealedGuidedSteps: support.allowed
        ? (candidate.guidedSteps || []).slice(0, support.revealedGuidedStepCount).map((step, index) => ({
            level: index + 1,
            phase: step.phase || null,
            prompt: step.prompt || "Work through the next relationship in the problem.",
            responseType: step.responseType || "short_reasoning",
            ...(step.responseType === "final_answer" ? { answerInput: step.answerInput || candidate.answerInput || createMathAnswerInput() } : {}),
          }))
        : [],
      solutionStrategies: support.allowed
        ? (candidate.solutionStrategies || []).map((strategy) => ({
            id: strategy.id,
            name: strategy.name,
            bestFor: strategy.bestFor,
            steps: [...(strategy.steps || [])],
          }))
        : [],
    },
  };
}

export function recordQuestionDeliveryAttempt({
  delivery,
  answer,
  elapsedSeconds = 0,
  answerRevisionCount = 0,
  submittedAt = new Date().toISOString(),
}) {
  if (!delivery?.privateCandidate || delivery.status === "completed") return null;
  const answerInput = delivery.privateCandidate.answerInput || createMathAnswerInput();
  const normalizedAnswer = normalizeMathAnswerValue({ answerInput, value: answer });
  if (normalizedAnswer === null) return null;

  const attemptCount = (delivery.attempts || []).length + 1;
  const isCorrect = mathAnswerValuesMatch({
    answerInput,
    actual: normalizedAnswer,
    expected: delivery.privateCandidate.answer,
  });
  const support = deliverySupport(delivery);
  const completesAfterThisAttempt = isCorrect || delivery.mode === "formal_assessment";
  const startedAt = Date.parse(delivery.startedAt || "");
  const submittedAtTimestamp = Date.parse(submittedAt);
  const hasServerTiming = Number.isFinite(startedAt) && Number.isFinite(submittedAtTimestamp) && submittedAtTimestamp >= startedAt;
  const recordedElapsedSeconds = hasServerTiming
    ? Math.max(0, Math.min(6 * 60 * 60, (submittedAtTimestamp - startedAt) / 1000))
    : boundedNumber(elapsedSeconds, { minimum: 0, maximum: 6 * 60 * 60 }) || 0;
  const requestedAnswerRevisionCount = Number(answerRevisionCount);
  const recordedAnswerRevisionCount = Number.isFinite(requestedAnswerRevisionCount)
    ? Math.min(25, Math.max(0, Math.trunc(requestedAnswerRevisionCount)))
    : 0;
  const attempt = {
    attemptNumber: attemptCount,
    answer: normalizedAnswer,
    isCorrect,
    elapsedSeconds: recordedElapsedSeconds,
    timingSource: hasServerTiming ? "server_started_at" : "client_fallback",
    // This is a bounded client-observed count only. Draft answer values are never retained.
    answerRevisionCount: recordedAnswerRevisionCount,
    hintDepth: support.revealedHintCount,
    submittedAt,
  };
  const updatedDelivery = {
    ...delivery,
    attempts: [...(delivery.attempts || []), attempt],
    status: completesAfterThisAttempt ? "completed" : "in_progress",
    updatedAt: submittedAt,
  };
  return {
    delivery: updatedDelivery,
    result: {
      isCorrect,
      attemptNumber: attemptCount,
      status: updatedDelivery.status,
      feedbackCode: feedbackCode({ isCorrect, supportAllowed: support.allowed }),
      supportAvailable: support.allowed && support.revealedHintCount < support.hintCount,
    },
  };
}

export function revealNextQuestionHint({ delivery, revealedAt = new Date().toISOString() }) {
  if (!delivery?.privateCandidate) return null;
  const support = deliverySupport(delivery);
  if (!support.allowed) return { error: "support_not_available" };
  if (support.revealedHintCount >= support.hintCount) return { delivery, hint: null, complete: true };

  const nextLevel = support.revealedHintCount + 1;
  const phase = delivery.privateCandidate.supportStructure?.hintPhases?.[nextLevel - 1];
  const updatedDelivery = {
    ...delivery,
    support: {
      ...delivery.support,
      revealedHintCount: nextLevel,
    },
    updatedAt: revealedAt,
  };
  return {
    delivery: updatedDelivery,
    complete: nextLevel >= support.hintCount,
    hint: {
      level: nextLevel,
      title: HELP_PHASE_TITLES[phase] || (nextLevel === support.hintCount ? "完整讲解" : `提示 ${nextLevel}`),
      body: delivery.privateCandidate.hintLayers[nextLevel - 1],
    },
  };
}

export function revealNextQuestionGuidedStep({ delivery, revealedAt = new Date().toISOString() }) {
  if (!delivery?.privateCandidate) return null;
  const support = deliverySupport(delivery);
  if (!support.allowed) return { error: "support_not_available" };
  if (support.revealedGuidedStepCount >= support.guidedStepCount) return { delivery, step: null, complete: true };

  const priorLevel = support.revealedGuidedStepCount;
  if (priorLevel > 0 && !support.guidedResponseStates.some((response) => response.level === priorLevel)) {
    return { error: "guided_response_required", requiredLevel: priorLevel };
  }

  const nextLevel = support.revealedGuidedStepCount + 1;
  const sourceStep = delivery.privateCandidate.guidedSteps[nextLevel - 1] || {};
  const updatedDelivery = {
    ...delivery,
    support: {
      ...delivery.support,
      revealedGuidedStepCount: nextLevel,
    },
    updatedAt: revealedAt,
  };
  return {
    delivery: updatedDelivery,
    complete: nextLevel >= support.guidedStepCount,
    step: {
      level: nextLevel,
      phase: sourceStep.phase || null,
      prompt: sourceStep.prompt || "Work through the next relationship in the problem.",
      responseType: sourceStep.responseType || "short_reasoning",
      ...(sourceStep.responseType === "final_answer"
        ? { answerInput: sourceStep.answerInput || delivery.privateCandidate.answerInput || createMathAnswerInput() }
        : {}),
    },
  };
}

export function recordQuestionDeliveryGuidedStepResponse({
  delivery,
  level,
  response,
  submittedAt = new Date().toISOString(),
}) {
  if (!delivery?.privateCandidate || delivery.status === "completed") return null;
  const support = deliverySupport(delivery);
  if (!support.allowed) return { error: "support_not_available" };

  const responseLevel = boundedNumber(level, { minimum: 1, maximum: support.guidedStepCount, integer: true });
  if (responseLevel === null || responseLevel > support.revealedGuidedStepCount) {
    return { error: "guided_step_not_revealed" };
  }
  if (
    responseLevel > 1 &&
    !Array.from({ length: responseLevel - 1 }, (_, index) => index + 1).every((priorLevel) =>
      support.guidedResponseStates.some((item) => item.level === priorLevel),
    )
  ) {
    return { error: "guided_step_order_required" };
  }

  const sourceStep = delivery.privateCandidate.guidedSteps?.[responseLevel - 1];
  if (!sourceStep) return { error: "guided_step_not_found" };
  const priorResponses = Array.isArray(delivery.guidedResponses) ? delivery.guidedResponses : [];
  const attemptNumber = priorResponses.filter((item) => Number(item?.level) === responseLevel).length + 1;
  let record;
  let result;

  if (sourceStep.responseType === "final_answer") {
    const answerInput = sourceStep.answerInput || delivery.privateCandidate.answerInput || createMathAnswerInput();
    const numericResponse = normalizeMathAnswerValue({ answerInput, value: response });
    if (numericResponse === null) return { error: "invalid_guided_final_answer" };
    const isCorrect = mathAnswerValuesMatch({
      answerInput,
      actual: numericResponse,
      expected: delivery.privateCandidate.answer,
    });
    record = {
      level: responseLevel,
      responseType: "final_answer",
      numericResponse,
      isCorrect,
      attemptNumber,
      submittedAt,
    };
    result = {
      status: isCorrect ? "confirmed" : "needs_retry",
      feedbackCode: isCorrect ? "guided_final_confirmed" : "guided_final_retry",
    };
  } else {
    const responseText = cleanGuidedText(response);
    if (!responseText) return { error: "invalid_guided_reasoning" };
    record = {
      level: responseLevel,
      responseType: "short_reasoning",
      responseText,
      attemptNumber,
      submittedAt,
    };
    result = {
      status: "recorded",
      feedbackCode: "guided_reasoning_recorded",
    };
  }

  const updatedDelivery = {
    ...delivery,
    guidedResponses: [...priorResponses, record],
    updatedAt: submittedAt,
  };
  const responseState = publicGuidedResponseStates(updatedDelivery).find((item) => item.level === responseLevel) || null;
  return {
    delivery: updatedDelivery,
    response: responseState,
    result,
  };
}

// This is intentionally a student-owned export, not a normal delivery field.
// It is available only after all guided steps are complete and is never included
// in parent, teacher, or standard question presentation routes.
export function createQuestionDeliveryGuidedProcessExport(delivery) {
  if (!delivery?.privateCandidate) return null;
  const support = deliverySupport(delivery);
  if (!support.allowed) return { error: "support_not_available" };

  const guidedSteps = Array.isArray(delivery.privateCandidate.guidedSteps) ? delivery.privateCandidate.guidedSteps : [];
  const responseByLevel = new Map(latestGuidedResponses(delivery).map((response) => [Number(response.level), response]));
  const complete =
    guidedSteps.length > 0 &&
    guidedSteps.every((step, index) => {
      const response = responseByLevel.get(index + 1);
      if (!response) return false;
      return step.responseType === "final_answer" ? response.isCorrect === true : Boolean(response.responseText);
    });
  if (!complete) return { error: "guided_process_incomplete" };

  return {
    title: "我的分步解题过程",
    prompt: delivery.privateCandidate.prompt,
    steps: guidedSteps.map((step, index) => {
      const response = responseByLevel.get(index + 1);
      return {
        level: index + 1,
        phase: step.phase || null,
        prompt: step.prompt || "",
        response:
          step.responseType === "final_answer"
            ? formatMathAnswerValue({ answerInput: step.answerInput || delivery.privateCandidate.answerInput, value: response.numericResponse })
            : response.responseText,
      };
    }),
  };
}
