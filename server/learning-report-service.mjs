import { summarizeLearningEvidence } from "../src/services/learning-evidence-engine.js";
import { buildLearningReport } from "../src/services/learning-report-engine.js";
import { buildServerWorkingAbilityMap } from "./initial-ability-profile-service.mjs";
import { buildPeerReference } from "./peer-reference-service.mjs";
import { buildObserverGuidance } from "./observer-guidance-service.mjs";
import { buildProfileSignalSnapshot } from "../src/services/profile-signal-engine.js";
import { buildLearningProgressTrend } from "../src/services/learning-progress-trend-engine.js";
import { READING_FORM_TRANSFER_VARIANT_LEVELS } from "../src/services/variant-evidence-policy.js";
import { createIndependentAnswerPredicate } from "../src/services/retry-evidence-engine.js";
import { buildLevelAttainmentReport } from "./level-attainment-report-service.mjs";

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isSubjectEvent(event, subjectId) {
  const eventSubjectId = event?.subjectId || event?.payload?.subjectId || null;
  // Earlier prototype events did not carry a subject. They remain compatible with
  // the one-subject math MVP until a student starts recording scoped events.
  return !eventSubjectId || eventSubjectId === subjectId;
}

function isTrustedAnswerEvent(event) {
  return event?.eventType === "answer_submitted" && event?.payload?.scoringSource === "server_authoritative";
}

function round(value, digits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(digits));
}

function publicCurveSummary(plan) {
  const curve = plan?.dynamicCurve?.canUpdate ? plan.dynamicCurve : plan?.staticCurve;
  if (!curve) return null;
  return {
    id: curve.id || null,
    type: curve.curveType || (plan?.dynamicCurve?.canUpdate ? "dynamic" : "static"),
    progressTowardTarget: round(curve.currentPoint?.progressTowardTarget),
    remainingGap: round(curve.currentPoint?.remainingGap),
    targetGrade: plan?.learningGoal?.targetGrade || null,
    updatedAt: curve.updatedAt || plan?.updatedAt || null,
  };
}

function publicInitialTest(session) {
  if (!session) return null;
  const result = session.result || {};
  const responses = Array.isArray(session.responses) ? session.responses : [];
  const requiredQuestionCount = Number(result.requiredQuestionCount || session.questionSnapshot?.length || 0);
  const uncertainCount = Number.isFinite(Number(result.uncertainCount))
    ? Number(result.uncertainCount)
    : responses.filter((response) => response?.isUncertain).length;
  const skippedCount = Number.isFinite(Number(result.skippedCount))
    ? Number(result.skippedCount)
    : responses.filter((response) => response?.answer === null || response?.answer === undefined).length;
  return {
    id: session.id,
    type: "initial",
    status: session.status || "recorded",
    completedAt: session.updatedAt || session.createdAt || null,
    targetGrade: session.targetGrade || null,
    accuracy: round(result.accuracy),
    completedQuestionCount: Number(result.completedQuestionCount || session.responseCount || 0),
    requiredQuestionCount,
    // A self-reported "not sure" is useful assessment evidence, not a learner label.
    // The report exposes only its aggregate, never per-question answers or correctness.
    uncertainCount,
    uncertaintyRate: round(
      Number.isFinite(Number(result.uncertaintyRate))
        ? Number(result.uncertaintyRate)
        : requiredQuestionCount
          ? uncertainCount / requiredQuestionCount
          : 0,
    ),
    skippedCount,
  };
}

function publicStageTests(plan) {
  return (plan?.stageAssessmentHistory || [])
    .slice(-6)
    .map((result) => {
      const directTransferVariant = (result.questionResults || []).find((item) =>
        READING_FORM_TRANSFER_VARIANT_LEVELS.includes(item?.variantLevel),
      )?.variantLevel;
      const scopedTransferVariant = result.assessmentScope?.transferVariantLevel;
      const transferVariantLevel = READING_FORM_TRANSFER_VARIANT_LEVELS.includes(scopedTransferVariant)
        ? scopedTransferVariant
        : READING_FORM_TRANSFER_VARIANT_LEVELS.includes(directTransferVariant)
          ? directTransferVariant
          : null;
      return {
        id: result.id || result.sessionId,
        type: "stage",
        status: result.status || "recorded",
        completedAt: result.completedAt || result.createdAt || null,
        targetGrade: result.levelAttainment?.targetGrade || plan?.learningGoal?.targetGrade || null,
        accuracy: round(result.accuracy),
        controlledVariantAccuracy: round(result.controlledVariantAccuracy),
        transferAccuracy: round(result.transferAccuracy),
        transferVariantLevel,
        masteryScore: round(result.masteryScore),
        verified: result.status === "completed_verified" || Boolean(result.eligibleForCurveUpdate),
        officiallyReached: Boolean(result.levelAttainment?.officiallyReached),
      };
    })
    .sort((left, right) => toTimestamp(right.completedAt) - toTimestamp(left.completedAt));
}

function resolveNextStep(plan) {
  const allocation = plan?.nextPracticeAllocation || plan?.dailyAllocation || null;
  const priority = allocation?.topPriority || null;
  return {
    focus: priority?.label || plan?.todayTask?.focus || plan?.nextDynamicTask?.focus || "数学关系",
    rationale: priority?.rationale || null,
    source: priority ? "server_matching_priority" : "confirmed_learning_curve",
  };
}

function boundedText(value, { fallback = null, maxLength = 96 } = {}) {
  const text = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function boundedStrings(values, { maxItems = 4, maxLength = 72 } = {}) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => boundedText(value, { maxLength })).filter(Boolean))].slice(0, maxItems);
}

function safeRate(numerator, denominator) {
  return denominator > 0 ? round(numerator / denominator) : null;
}

function isVerifiedStageResult(result) {
  return result?.status === "completed_verified" || Boolean(result?.eligibleForCurveUpdate);
}

function buildFormalTransferEvidence(plan) {
  const verifiedResults = [...(plan?.stageAssessmentHistory || [])]
    .filter(isVerifiedStageResult)
    .sort((left, right) => toTimestamp(left.completedAt || left.createdAt) - toTimestamp(right.completedAt || right.createdAt));
  const transferItems = verifiedResults.flatMap((result) =>
    (result.questionResults || [])
      .filter((item) => READING_FORM_TRANSFER_VARIANT_LEVELS.includes(item?.variantLevel))
      .map((item) => ({
        completedAt: result.completedAt || result.createdAt || null,
        isCorrect: Boolean(item?.isCorrect),
        variantLevel: item.variantLevel,
      })),
  );
  const correctTransferItemCount = transferItems.filter((item) => item.isCorrect).length;
  const latestTransfer = transferItems.at(-1) || null;
  const variants = READING_FORM_TRANSFER_VARIANT_LEVELS.map((variantLevel) => {
    const attempts = transferItems.filter((item) => item.variantLevel === variantLevel);
    const correctCount = attempts.filter((item) => item.isCorrect).length;
    return {
      variantLevel,
      attemptCount: attempts.length,
      correctCount,
      correctRate: safeRate(correctCount, attempts.length),
    };
  }).filter((item) => item.attemptCount > 0);

  return {
    source: "verified_formal_stage_transfer_evidence_v1",
    evidenceStatus:
      verifiedResults.length === 0
        ? "awaiting_verified_stage_test"
        : transferItems.length < 2
          ? "collecting"
          : "observed",
    verifiedStageTestCount: verifiedResults.length,
    transferItemCount: transferItems.length,
    correctTransferItemCount,
    transferAccuracy: safeRate(correctTransferItemCount, transferItems.length),
    latestTransferVariantLevel: latestTransfer?.variantLevel || null,
    variants,
    guardrail:
      "This summarizes only verified, no-help formal-test transfer items. It never exposes prompts, answers, or private generation data.",
  };
}

function buildTaggedQuestionEvidence(answerEvents = [], { behaviorEvents = answerEvents } = {}) {
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  const byFamily = new Map();

  answerEvents.forEach((event) => {
    const payload = event?.payload || {};
    const familyId = boundedText(payload.questionFamilyId, { maxLength: 120 });
    if (!familyId) return;

    const itemTags = payload.itemTags || {};
    const existing = byFamily.get(familyId) || {
      familyId,
      label: null,
      instructionalGrade: null,
      attemptCount: 0,
      correctCount: 0,
      independentAttemptCount: 0,
      independentCorrectCount: 0,
      hintedAttemptCount: 0,
      variantLevels: new Set(),
      knowledgePointIds: new Set(),
      abilityDimensions: new Set(),
      lastPracticedAt: null,
    };
    const isCorrect = Boolean(payload.isCorrect);
    const independent = isIndependentAnswer(event);
    const instructionalGrade = boundedText(
      itemTags?.difficultyTags?.instructionalGrade || itemTags?.generationTags?.instructionalGrade,
      { maxLength: 12 },
    );

    existing.label = existing.label || boundedText(payload.knowledgePoint, { fallback: familyId, maxLength: 80 });
    existing.instructionalGrade = existing.instructionalGrade || instructionalGrade;
    existing.attemptCount += 1;
    existing.correctCount += isCorrect ? 1 : 0;
    existing.independentAttemptCount += independent ? 1 : 0;
    existing.independentCorrectCount += independent && isCorrect ? 1 : 0;
    existing.hintedAttemptCount += independent ? 0 : 1;
    const variantLevel = boundedText(payload.variantLevel, { maxLength: 40 });
    if (variantLevel) existing.variantLevels.add(variantLevel);
    boundedStrings(itemTags?.knowledgeTags?.knowledgePointIds).forEach((value) => existing.knowledgePointIds.add(value));
    boundedStrings(itemTags?.abilityTags?.abilityDimensions).forEach((value) => existing.abilityDimensions.add(value));
    if (toTimestamp(event.timestamp) >= toTimestamp(existing.lastPracticedAt)) existing.lastPracticedAt = event.timestamp || null;
    byFamily.set(familyId, existing);
  });

  const allFamilies = [...byFamily.values()]
    .map((item) => ({
      familyId: item.familyId,
      label: item.label || item.familyId,
      instructionalGrade: item.instructionalGrade,
      attemptCount: item.attemptCount,
      correctRate: safeRate(item.correctCount, item.attemptCount),
      independentAttemptCount: item.independentAttemptCount,
      independentCorrectRate: safeRate(item.independentCorrectCount, item.independentAttemptCount),
      hintedAttemptCount: item.hintedAttemptCount,
      variantLevels: [...item.variantLevels].slice(0, 4),
      knowledgePointCount: item.knowledgePointIds.size,
      abilityDimensionCount: item.abilityDimensions.size,
      lastPracticedAt: item.lastPracticedAt,
    }));
  const totalTaggedAttemptCount = allFamilies.reduce((sum, item) => sum + item.attemptCount, 0);
  const families = allFamilies
    .sort(
      (left, right) =>
        toTimestamp(right.lastPracticedAt) - toTimestamp(left.lastPracticedAt) || right.attemptCount - left.attemptCount,
    )
    .slice(0, 6);

  return {
    source: "server_scored_item_tag_evidence_v1",
    totalTaggedAttemptCount,
    familyCount: byFamily.size,
    families,
    guardrail:
      "This compact teacher view uses only server-scored attempts and high-level tags. It does not expose answers, raw prompts, private generation inputs, or student-facing profile labels.",
  };
}

export function buildServerLearningReport({ audience = "student", database, studentId, subjectId }) {
  const scopedEvents = database
    .listBehaviorEvents({ studentId, subjectId, limit: 2000 })
    .filter((event) => isSubjectEvent(event, subjectId))
    .sort((left, right) => toTimestamp(left.timestamp) - toTimestamp(right.timestamp));
  const answerEvents = scopedEvents.filter((event) => event?.eventType === "answer_submitted");
  const trustedAnswers = answerEvents.filter(isTrustedAnswerEvent);
  const reportEvents = scopedEvents.filter(
    (event) => event?.eventType !== "answer_submitted" || isTrustedAnswerEvent(event),
  );
  const plan = database.getPlan({ studentId, subjectId });
  const initialAssessment = database.getLatestAssessmentSession({
    studentId,
    subjectId,
    assessmentType: "initial_onboarding",
  });
  const learning = buildLearningReport({ behaviorEvents: reportEvents });
  const abilityMap = buildServerWorkingAbilityMap({
    session: initialAssessment,
    studentId,
    subjectId,
    behaviorEvents: trustedAnswers,
  });
  const latestRecordedAt = reportEvents.at(-1)?.timestamp || null;
  const peerReference = buildPeerReference({ database, studentId, subjectId, plan });
  const nextStep = resolveNextStep(plan);

  return {
    schemaVersion: "server_learning_report_v1",
    source: "server_evidence_snapshot",
    audience,
    studentId,
    subjectId,
    generatedAt: new Date().toISOString(),
    evidence: {
      scopedEventCount: scopedEvents.length,
      includedActivityEventCount: reportEvents.filter((event) => event?.eventType !== "answer_submitted").length,
      trustedAnswerCount: trustedAnswers.length,
      excludedUntrustedAnswerCount: answerEvents.length - trustedAnswers.length,
      latestRecordedAt,
      answerScoreSource: "server_authoritative",
      timingSource: trustedAnswers.length ? "server_started_at_when_available" : null,
    },
    learning: {
      ...learning,
      source: "server_authoritative_behavior_report_v1",
    },
    abilityEvidence: summarizeLearningEvidence(reportEvents),
    abilityMap,
    curve: publicCurveSummary(plan),
    peerReference,
    learningTrend: buildLearningProgressTrend({
      answerEvents: trustedAnswers,
      behaviorEvents: reportEvents,
      stageAssessmentHistory: plan?.stageAssessmentHistory || [],
    }),
    testHistory: [publicInitialTest(initialAssessment), ...publicStageTests(plan)].filter(Boolean),
    formalTransferEvidence: buildFormalTransferEvidence(plan),
    levelAttainment: buildLevelAttainmentReport({ plan, subjectId }),
    nextStep,
    profileSignals: ["parent", "teacher", "admin"].includes(audience)
      ? buildProfileSignalSnapshot({ behaviorEvents: reportEvents })
      : null,
    taggedQuestionEvidence: ["teacher", "admin"].includes(audience)
      ? buildTaggedQuestionEvidence(trustedAnswers, { behaviorEvents: reportEvents })
      : null,
    observerGuidance: buildObserverGuidance({
      audience,
      learning,
      nextStep,
      plan,
    }),
    guardrails: [
      "Only server-scored answer events contribute to report accuracy, timing, and hint metrics.",
      "Activity events help summarize learning rhythm but do not change the dynamic learning curve.",
      "Only a completed formal stage assessment may recalibrate the dynamic learning curve.",
    ],
  };
}
