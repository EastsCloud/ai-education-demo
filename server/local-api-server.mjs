import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { URL } from "node:url";
import { createAdjustedDynamicCurve } from "../src/services/dynamic-learning-curve-engine.js";
import { createTodayTaskFromLearningCurve } from "../src/services/learning-curve-engine.js";
import { createDailyAllocation } from "../src/services/daily-allocation-engine.js";
import {
  createDailyQuestionQueue,
  selectVerifiedGraphSuccessorFamilies,
} from "../src/services/daily-question-queue-engine.js";
import {
  createMathLearningPath,
  LEGACY_MATH_LEARNING_PATH_VERSION,
} from "../src/services/math-learning-path-engine.js";
import { analyzeLearningBehavior } from "../src/services/behavior-analysis-engine.js";
import { buildAdaptiveSupportProfile } from "../src/services/adaptive-support-profile-engine.js";
import { selectCurrentBehaviorEvidence } from "../src/services/behavior-evidence-window.js";
import { createTaskCadence } from "../src/services/task-cadence-engine.js";
import { createAssessmentCadence } from "../src/services/assessment-cadence-engine.js";
import { buildServerLearningReport } from "./learning-report-service.mjs";
import { buildDailyPracticeSummary } from "./daily-practice-summary-service.mjs";
import { listEligibleWrongRetrySourceDeliveries } from "./wrong-retry-eligibility-service.mjs";
import { buildQuestionTypeBenchmark } from "./peer-question-benchmark-service.mjs";
import { buildServerKnowledgeAtlas } from "./knowledge-atlas-service.mjs";
import { buildServerKnowledgeGraph } from "./knowledge-graph-service.mjs";
import { buildServerInitialAbilityMap } from "./initial-ability-profile-service.mjs";
import { buildServerOnboardingStatus } from "./onboarding-status-service.mjs";
import {
  advanceDailyPracticeRun,
  advanceOptionalPracticeRun,
  attachDailyPracticeDelivery,
  attachOptionalPracticeDelivery,
  createOptionalPracticeSession,
  createDailyPracticeRun,
  getActiveOptionalPracticeStep,
  getDailyPracticeRunStep,
  toPublicDailyPracticeRun,
} from "./daily-practice-run-service.mjs";
import { createInitialLearningPlanRecord } from "./initial-learning-plan-service.mjs";
import {
  createServerPersonalityAssessmentRun,
  PERSONALITY_ASSESSMENT_TYPE,
  recordPersonalityAssessmentResponse,
  toPublicPersonalityAssessmentRun,
} from "./personality-assessment-run-service.mjs";
import { assessmentCadenceConfig, learningParameterConfig } from "../src/data/learning-parameter-config.js";
import { basicInfoOptionCatalog } from "../src/data/onboarding-schema.js";
import { createMathLearningGoalDraft, getMathLearningGoalOptions } from "../src/services/math-learning-goal-runtime.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createSameFamilyHarderVariantSequence } from "../src/services/challenge-variant-policy.js";
import { canDeliverQuestion, resolveQuestionCandidateForDelivery } from "../src/services/question-source.js";
import { isKnownMathSolutionStrategyId } from "../src/services/math-solution-strategy-engine.js";
import { orderSolutionStrategies } from "../src/services/solution-strategy-preference-engine.js";
import {
  createMathAnswerInput,
  formatMathAnswerValue,
  mathAnswerValuesMatch,
  normalizeMathAnswerValue,
} from "../src/services/math-answer-input.js";
import { validateCorrectReviewBinding } from "../src/services/correct-review-binding-validator.js";
import { createMathLevelDefinition } from "../src/services/level-attainment-engine.js";
import { assembleInitialAbilityTest } from "../src/services/ability-test-assembly.js";
import { assembleStageAssessment } from "../src/services/stage-assessment-assembly.js";
import {
  createStageAssessmentRun,
  finalizeStageAssessmentRun,
  recordStageAssessmentResponse,
} from "../src/services/stage-assessment-runtime.js";
import {
  createQuestionDeliveryRecord,
  createQuestionDeliveryGuidedProcessExport,
  markQuestionDeliveryStarted,
  normalizeQuestionDeliveryRequest,
  recordQuestionDeliveryAttempt,
  recordQuestionDeliveryGuidedStepResponse,
  revealNextQuestionGuidedStep,
  revealNextQuestionHint,
  toQuestionDeliveryPresentation,
  toPublicItemTags,
} from "../src/services/question-delivery-runtime.js";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const MAX_JSON_BODY_BYTES = 2_000_000;

class ApiRequestError extends Error {
  constructor(status, code) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function sendJson(response, status, value, extraHeaders = {}) {
  response.writeHead(status, {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  response.end(JSON.stringify(value));
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf("=");
        return separator < 0 ? [item, ""] : [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))];
      }),
  );
}

function sessionCookie(token, maxAgeSeconds = 0, secure = false) {
  const value = token ? encodeURIComponent(token) : "";
  return `ai_education_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) throw new ApiRequestError(413, "request_body_too_large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ApiRequestError(400, "invalid_json_body");
    }
    return value;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(400, "invalid_json_body");
  }
}

function isValidRecord(record, fields) {
  return record && typeof record === "object" && fields.every((field) => typeof record[field] === "string" && record[field]);
}

const STUDENT_PAGE_STYLES = new Set(["warm", "focus", "lively"]);
const STUDENT_INFORMATION_DENSITIES = new Set(["relaxed", "standard"]);
const STUDENT_MESSAGE_ROLES = new Set(["parent", "teacher", "admin"]);
const CLIENT_BEHAVIOR_EVENT_TYPES = new Set([
  "answer_blank_submitted",
  "app_session_ended",
  "app_session_paused",
  "app_session_resumed",
  "app_session_started",
  "atlas_related_practice_completed",
  "atlas_related_practice_requested",
  "daily_queue_unit_completed",
  "dynamic_curve_adjustment_confirmed",
  "dynamic_curve_adjustment_previewed",
  "guided_step_opened",
  "harder_extra_practice_requested",
  "hint_opened",
  "onboarding_basic_info_confirmed",
  "onboarding_basic_info_updated",
  "optional_practice_completed",
  "optional_practice_next_released",
  "page_view",
  "practice_detail_closed",
  "practice_detail_opened",
  "practice_summary_options_offered",
  "previous_attempt_closed",
  "previous_attempt_opened",
  "progression_completed",
  "question_started",
  "retry_clicked",
  "same_type_more_requested",
  "solution_strategy_opened",
  "stage_assessment_entry_opened",
  "stage_assessment_response_recorded",
  "stage_assessment_skipped",
  "stage_assessment_started",
  "static_curve_confirmed",
  "today_atlas_opened",
  "training_opened",
  "variant_requested",
  "wrong_retry_requested",
]);
const CLIENT_BEHAVIOR_STRING_PAYLOAD_FIELDS = [
  "currentView",
  "deliveryId",
  "entryView",
  "extraPracticeMode",
  "knowledgePoint",
  "lastView",
  "mode",
  "practiceRunId",
  "source",
  "strategyId",
  "supportMode",
  "variantLevel",
  "viewId",
];
const CLIENT_BEHAVIOR_NUMBER_PAYLOAD_LIMITS = {
  activeSeconds: [0, 6 * 60 * 60],
  elapsedSeconds: [0, 6 * 60 * 60],
  entryHour: [0, 23],
  guidedStepIndex: [0, 12],
  hintLevel: [0, 8],
  pauseCount: [0, 100],
  requestedCount: [0, 20],
};

function cleanBehaviorText(value, maximum = 160) {
  const text = String(value || "").replace(/[\u0000-\u001f]/g, " ").trim();
  return text && text.length <= maximum ? text : null;
}

function copyBoundedBehaviorNumber(payload, source, field, minimum, maximum) {
  const value = Number(source?.[field]);
  if (!Number.isFinite(value) || value < minimum || value > maximum) return;
  payload[field] = Number.isInteger(value) ? Math.trunc(value) : value;
}

function normalizeClientBehaviorEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  const eventId = cleanBehaviorText(event.eventId, 180);
  const studentId = cleanBehaviorText(event.studentId, 128);
  const eventType = cleanBehaviorText(event.eventType, 80);
  const timestamp = Date.parse(event.timestamp || "");
  if (!eventId || !studentId || !eventType || !CLIENT_BEHAVIOR_EVENT_TYPES.has(eventType) || !Number.isFinite(timestamp)) {
    return null;
  }
  if (timestamp > Date.now() + 10 * 60 * 1000) return null;

  const rawPayload = event.payload && typeof event.payload === "object" && !Array.isArray(event.payload) ? event.payload : {};
  const payload = {};
  CLIENT_BEHAVIOR_STRING_PAYLOAD_FIELDS.forEach((field) => {
    const value = cleanBehaviorText(rawPayload[field], field === "knowledgePoint" ? 120 : 160);
    if (field === "strategyId" && value && !isKnownMathSolutionStrategyId(value)) return;
    if (value) payload[field] = value;
  });
  Object.entries(CLIENT_BEHAVIOR_NUMBER_PAYLOAD_LIMITS).forEach(([field, [minimum, maximum]]) => {
    copyBoundedBehaviorNumber(payload, rawPayload, field, minimum, maximum);
  });

  const subjectId = cleanBehaviorText(event.subjectId, 80);
  const sessionId = cleanBehaviorText(event.sessionId, 180);
  const targetId = cleanBehaviorText(event.targetId, 180);
  const page = cleanBehaviorText(event.page, 80);
  return {
    eventId,
    studentId,
    eventType,
    timestamp: new Date(timestamp).toISOString(),
    ...(subjectId ? { subjectId } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(targetId ? { targetId } : {}),
    ...(page ? { page } : {}),
    payload,
  };
}

// A client may say that a strategy card was opened, but only the server can
// establish that the card belonged to a question actually delivered to this
// student. Invalid links keep the general reflection event but lose the id
// that could otherwise reorder later optional support.
function retainLinkedSolutionStrategyEvent({ database, event }) {
  if (event?.eventType !== "solution_strategy_opened" || !event?.payload?.strategyId) return event;
  const deliveryId = String(event.payload.deliveryId || "").trim();
  const delivery = deliveryId ? database.getQuestionDelivery({ deliveryId }) : null;
  const candidate = delivery?.privateCandidate || null;
  const strategyAvailable = Array.isArray(candidate?.solutionStrategies)
    ? candidate.solutionStrategies.some((strategy) => strategy?.id === event.payload.strategyId)
    : false;
  const linkedToDeliveredQuestion =
    delivery &&
    delivery.studentId === event.studentId &&
    delivery.subjectId === event.subjectId &&
    delivery.mode === "practice" &&
    Boolean(delivery.support?.allowed) &&
    strategyAvailable &&
    (!event.targetId || event.targetId === candidate?.id);
  if (linkedToDeliveredQuestion) return event;

  const { strategyId, ...payload } = event.payload;
  return { ...event, payload };
}

function normalizeStudentMessageRecord(record) {
  if (!record || typeof record !== "object") return null;
  const id = String(record.id || "").trim();
  const studentId = String(record.studentId || "").trim();
  const fromUserId = String(record.fromUserId || "").trim();
  const fromRole = String(record.fromRole || "").trim();
  const title = String(record.title || "给你的话").replace(/\s+/g, " ").trim();
  const body = String(record.body || "").replace(/\s+/g, " ").trim();
  if (
    !id ||
    id.length > 128 ||
    !studentId ||
    studentId.length > 128 ||
    !fromUserId ||
    fromUserId.length > 128 ||
    !STUDENT_MESSAGE_ROLES.has(fromRole) ||
    !title ||
    title.length > 60 ||
    !body ||
    body.length > 180
  ) {
    return null;
  }
  return {
    ...record,
    id,
    studentId,
    fromUserId,
    fromRole,
    title,
    body,
    // Message order belongs to the server, not to a browser-supplied timestamp.
    createdAt: new Date().toISOString(),
  };
}

function normalizeStudentPreferenceRecord(record) {
  if (!record || typeof record !== "object") return null;
  const studentId = String(record.studentId || "").trim();
  const displayName = String(record.displayName || "").trim();
  const pageStyle = String(record.pageStyle || "").trim();
  const informationDensity = String(record.informationDensity || "").trim();
  const avatarDataUrl = record.avatarDataUrl ? String(record.avatarDataUrl) : null;
  const validAvatar =
    !avatarDataUrl ||
    (avatarDataUrl.length <= 1_500_000 &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatarDataUrl));
  if (
    !studentId ||
    displayName.length < 1 ||
    displayName.length > 20 ||
    !STUDENT_PAGE_STYLES.has(pageStyle) ||
    !STUDENT_INFORMATION_DENSITIES.has(informationDensity) ||
    !validAvatar
  ) {
    return null;
  }
  return {
    ...record,
    studentId,
    displayName,
    pageStyle,
    informationDensity,
    avatarDataUrl,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCurveAdjustmentParameters(parameters) {
  if (!parameters || typeof parameters !== "object") return null;
  const values = {
    durationWeeks: Number(parameters.durationWeeks),
    dailyStudyMinutes: Number(parameters.dailyStudyMinutes),
    weeklyStudyDays: Number(parameters.weeklyStudyDays),
    testIntervalPracticeDays: Number(parameters.testIntervalPracticeDays),
    curveAdjustmentMode: String(parameters.curveAdjustmentMode || ""),
  };
  const options = learningParameterConfig.options;
  const valid =
    options.durationWeeks.includes(values.durationWeeks) &&
    options.dailyStudyMinutes.includes(values.dailyStudyMinutes) &&
    options.weeklyStudyDays.includes(values.weeklyStudyDays) &&
    options.testIntervalPracticeDays.includes(values.testIntervalPracticeDays) &&
    options.curveAdjustmentMode.includes(values.curveAdjustmentMode);
  return valid ? values : null;
}

function isAllowedCurveAdjustmentForRole({ parameters, plan, role }) {
  if (!parameters) return false;
  const curveDirection = plan?.dynamicCurve?.updateEvidence?.direction;
  if (parameters.curveAdjustmentMode === "raise_target_level" && curveDirection && curveDirection !== "ahead") {
    return false;
  }
  if (role !== "student") return true;

  const studentModes = new Set(["keep_study_intensity", "keep_original_goal"]);
  const currentInterval = Number(
    plan?.assessmentCadence?.suggestedAfterPracticeDays ||
      plan?.dynamicCurve?.sourceInputs?.testIntervalPracticeDays ||
      learningParameterConfig.defaults.testIntervalPracticeDays,
  );

  return studentModes.has(parameters.curveAdjustmentMode) && parameters.testIntervalPracticeDays === currentInterval;
}

function normalizeSuggestedTestInterval(value) {
  const interval = Number(value);
  return assessmentCadenceConfig.options.suggestedAfterPracticeDays.includes(interval) ? interval : null;
}

function normalizeMandatoryTestInterval(value) {
  const interval = Number(value);
  return assessmentCadenceConfig.options.mandatoryAfterPracticeDays.includes(interval) ? interval : null;
}

function normalizeAssessmentCadenceSettings({ suggestedAfterPracticeDays, mandatoryAfterPracticeDays }) {
  const suggestedInterval = normalizeSuggestedTestInterval(suggestedAfterPracticeDays);
  const mandatoryInterval = normalizeMandatoryTestInterval(mandatoryAfterPracticeDays);
  const minimumGap = assessmentCadenceConfig.defaults.minimumPracticeDaysBetweenSuggestionAndRequired;
  if (!suggestedInterval || !mandatoryInterval || mandatoryInterval < suggestedInterval + minimumGap) return null;
  return {
    suggestedAfterPracticeDays: suggestedInterval,
    mandatoryAfterPracticeDays: mandatoryInterval,
  };
}

function synchronizeAssessmentCadenceFromCurveAdjustment({ cadence = {}, suggestedAfterPracticeDays, user, updatedAt }) {
  const minimumGap = assessmentCadenceConfig.defaults.minimumPracticeDaysBetweenSuggestionAndRequired;
  const existingMandatory = Number(cadence.mandatoryAfterPracticeDays) || assessmentCadenceConfig.defaults.mandatoryAfterPracticeDays;
  const minimumMandatory = Math.max(existingMandatory, suggestedAfterPracticeDays + minimumGap);
  const mandatoryAfterPracticeDays =
    assessmentCadenceConfig.options.mandatoryAfterPracticeDays.find((value) => value >= minimumMandatory) ||
    assessmentCadenceConfig.options.mandatoryAfterPracticeDays.at(-1);
  return {
    ...cadence,
    suggestedAfterPracticeDays,
    mandatoryAfterPracticeDays,
    policyVersion: "guardian_configurable_assessment_cadence_v1",
    configuredByRole: user.role,
    configuredByUserId: user.userId,
    configuredAt: updatedAt,
    updatedFrom: "curve_adjustment",
  };
}

const ONBOARDING_OPTION_GROUPS = {
  gradeLevelOptionId: "gradeLevel",
  schoolCalendarStageOptionId: "schoolCalendarStage",
  routinePreferenceOptionId: "routinePreference",
  attentionSpanBandOptionId: "attentionSpanBand",
  readingComfortOptionId: "readingComfort",
  primaryDeviceOptionId: "primaryDevice",
  curriculumSystemOptionId: "curriculumSystem",
};

function isKnownOption(group, optionId) {
  return basicInfoOptionCatalog[group]?.some((option) => option.id === optionId) || false;
}

function isValidBirthDate({ birthYear, birthMonth, birthDay }) {
  const year = Number(birthYear);
  const month = Number(birthMonth);
  const day = Number(birthDay);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (!basicInfoOptionCatalog.birthYear.some((option) => Number(option.value) === year)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeOnboardingSubjectIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((subjectId) => subjectId === "math"))];
}

function hasConfirmedMathSubjectSelection(prefill) {
  return Boolean(
    normalizeOnboardingSubjectIds(prefill?.subjectIds).includes("math") &&
      typeof prefill?.subjectSelectionConfirmedAt === "string" &&
      prefill.subjectSelectionConfirmedAt,
  );
}

function isCompletedServerAssessment(session) {
  return Boolean(session?.serverAuthoritative && ["completed", "completed_verified"].includes(session.status));
}

function normalizeOnboardingPrefill({ studentId, prefill, user, existing = null }) {
  const input = prefill?.basicInfo;
  if (!studentId || !input || !isValidBirthDate(input)) return null;

  const basicInfo = {
    birthYear: Number(input.birthYear),
    birthMonth: Number(input.birthMonth),
    birthDay: Number(input.birthDay),
  };
  for (const [field, group] of Object.entries(ONBOARDING_OPTION_GROUPS)) {
    const optionId = String(input[field] || "");
    if (!isKnownOption(group, optionId)) return null;
    basicInfo[field] = optionId;
  }

  const subjectIds = normalizeOnboardingSubjectIds(prefill.subjectIds);
  const updatedAt = new Date().toISOString();
  const confirmedByStudent = user.role === "student";
  const existingSubjectIds = normalizeOnboardingSubjectIds(existing?.subjectIds);
  const subjectSelectionChanged = JSON.stringify(existingSubjectIds) !== JSON.stringify(subjectIds);
  const confirmsMathSelection = confirmedByStudent && prefill.confirmSubjectSelection === true && subjectIds.includes("math");
  const subjectSelectionConfirmedAt = subjectIds.includes("math")
    ? confirmsMathSelection
      ? updatedAt
      : subjectSelectionChanged
        ? null
        : existing?.subjectSelectionConfirmedAt || null
    : null;
  const subjectSelectionConfirmedByUserId = subjectSelectionConfirmedAt
    ? confirmsMathSelection
      ? user.userId
      : existing?.subjectSelectionConfirmedByUserId || null
    : null;
  return {
    id: `onboarding-prefill-${studentId}`,
    studentId,
    basicInfo,
    subjectIds,
    ...(subjectSelectionConfirmedAt
      ? {
          subjectSelectionConfirmedAt,
          subjectSelectionConfirmedByUserId,
        }
      : {}),
    sourceRole: existing?.sourceRole || user.role,
    sourceUserId: existing?.sourceUserId || user.userId,
    lastUpdatedByRole: user.role,
    lastUpdatedByUserId: user.userId,
    confirmationStatus: confirmedByStudent ? "student_confirmed" : "prefilled",
    ...(confirmedByStudent
      ? {
          confirmedAt: updatedAt,
          confirmedByUserId: user.userId,
        }
      : {}),
    updatedAt,
  };
}

function normalizeLearningGoalDraft({ studentId, subjectId, draft, user, existing = null, confirmedByStudent = false }) {
  if (!studentId || subjectId !== "math-linear-equations" || !draft?.learningGoal) return null;
  const input = draft.learningGoal;
  const options = getMathLearningGoalOptions();
  const targetGrade = String(input.targetGrade || "").toUpperCase();
  const durationWeeks = Number(input.durationWeeks);
  const dailyStudyMinutes = Number(input.dailyStudyMinutes);
  const weeklyStudyDays = Number(input.weeklyStudyDays);
  const valid =
    options.targets.some((target) => target.targetGrade === targetGrade) &&
    options.rhythm.durationWeeks.includes(durationWeeks) &&
    options.rhythm.dailyStudyMinutes.includes(dailyStudyMinutes) &&
    options.rhythm.weeklyStudyDays.includes(weeklyStudyDays);
  if (!valid) return null;

  const updatedAt = new Date().toISOString();
  const learningGoal = createMathLearningGoalDraft({
    existingGoal: { ...(existing?.learningGoal || {}), subjectId },
    values: { targetGrade, durationWeeks, dailyStudyMinutes, weeklyStudyDays },
  });
  const selectedBy = new Set([...(existing?.learningGoal?.selectedBy || []), user.role === "admin" ? "student" : user.role]);
  learningGoal.selectedBy = [...selectedBy];
  learningGoal.confirmationStatus = confirmedByStudent ? "student_confirmed" : "prefilled";

  return {
    id: `learning-goal-draft-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    learningGoal,
    sourceRole: existing?.sourceRole || user.role,
    sourceUserId: existing?.sourceUserId || user.userId,
    lastUpdatedByRole: user.role,
    lastUpdatedByUserId: user.userId,
    confirmationStatus: confirmedByStudent ? "student_confirmed" : "prefilled",
    ...(confirmedByStudent
      ? {
          confirmedAt: updatedAt,
          confirmedByUserId: user.userId,
        }
      : {}),
    updatedAt,
  };
}

function validateCorrectReviewRunBinding({ database, request }) {
  if (!request?.correctReviewSourceDeliveryId) return [];
  const run = database?.getDailyPracticeRunById({ runId: request.practiceRunId });
  const step = run ? getDailyPracticeRunStep(run) : null;
  const errors = [];
  if (!run || !step) errors.push("correct_review_run_not_active");
  if (run && (run.studentId !== request.studentId || run.subjectId !== request.subjectId)) {
    errors.push("correct_review_run_scope_mismatch");
  }
  if (run?.activeDeliveryId) errors.push("correct_review_run_delivery_already_active");
  if (step?.queueItem?.id !== request.queueItemId) errors.push("correct_review_queue_item_mismatch");
  if (step?.queueItem?.correctReviewSourceDeliveryId !== request.correctReviewSourceDeliveryId) {
    errors.push("correct_review_queue_source_mismatch");
  }
  if (step && (Number(request.progressionUnitIndex) !== step.unitIndex || Number(request.progressionStageIndex) !== step.stageIndex)) {
    errors.push("correct_review_progression_position_mismatch");
  }
  if (step?.variantLevel !== request.variantLevel) errors.push("correct_review_progression_variant_mismatch");
  return errors;
}

async function createServerQuestionDelivery({ database, deliveryId, deliveryRequest }) {
  const request = normalizeQuestionDeliveryRequest(deliveryRequest);
  if (!request) return { error: "invalid_question_delivery_request" };
  if (!new Set(["math", "math-linear-equations"]).has(request.subjectId)) {
    return { error: "unsupported_question_delivery_subject" };
  }
  const family = shanghaiMathItemFamilies.find((item) => item.id === request.familyId);
  if (!family || !family.gradeBands?.includes(request.instructionalGrade)) {
    return { error: "question_delivery_grade_boundary_denied" };
  }
  const sourced = await resolveQuestionCandidateForDelivery({
    aiVersion: request.aiVersion,
    family,
    seed: request.seed,
    instructionalGrade: request.instructionalGrade,
    variantLevel: request.variantLevel,
  });
  if (!sourced.candidate || !canDeliverQuestion(sourced.candidate)) {
    return { error: sourced.error || "question_delivery_validation_failed" };
  }
  const correctReviewErrors = [
    ...validateCorrectReviewRunBinding({ database, request }),
    ...validateCorrectReviewBinding({
      candidate: sourced.candidate,
      request,
      sourceDelivery: request.correctReviewSourceDeliveryId
        ? database?.getQuestionDelivery({ deliveryId: request.correctReviewSourceDeliveryId })
        : null,
    }).errors,
  ];
  if (correctReviewErrors.length) {
    return { error: `correct_review_binding_failed:${correctReviewErrors.join(",")}` };
  }
  return {
    delivery: createQuestionDeliveryRecord({
      candidate: sourced.candidate,
      deliveryId,
      request,
    }),
  };
}

function createServerScoredBehaviorEvent({ delivery, result }) {
  const candidate = delivery.privateCandidate || {};
  const attempt = (delivery.attempts || []).at(-1) || {};
  const request = delivery.generationRequest || {};
  return {
    eventId: `question-delivery-answer-${delivery.id}-${result.attemptNumber}`,
    studentId: delivery.studentId,
    subjectId: delivery.subjectId,
    sessionId: request.sessionId || `delivery-session-${delivery.id}`,
    eventType: "answer_submitted",
    timestamp: attempt.submittedAt || new Date().toISOString(),
    page: "practice",
    targetId: candidate.id || delivery.id,
    payload: {
      isCorrect: Boolean(result.isCorrect),
      hintsOpened: Number(attempt.hintDepth || 0),
      guidedStepsOpened: Number(delivery?.support?.revealedGuidedStepCount || 0),
      knowledgePoint: candidate.familyName || "数学关系",
      questionPrompt: candidate.prompt || null,
      variantLevel: candidate.metadataTags?.variantLevel || "original",
      questionFamilyId: candidate.familyId || null,
      abilityTags: candidate.metadataTags?.abilityTags || [],
      atlasNodeIds: candidate.metadataTags?.atlasNodeIds || [],
      controlledChanges: candidate.metadataTags?.variantControl?.changedIndependentVariables || [],
      questionFeatureKeys: candidate.metadataTags?.featureSignature?.matchingKeys || [],
      itemTags: candidate.metadataTags?.itemTags || null,
      extraPracticeMode: request.practiceMode || null,
      optionalChallengeRoute: request.optionalChallengeRoute || null,
      retrySourceDeliveryId: request.retrySourceDeliveryId || null,
      correctReviewSourceDeliveryId: request.correctReviewSourceDeliveryId || null,
      practiceRunId: request.practiceRunId || null,
      queueItemId: request.queueItemId || null,
      progressionUnitIndex: request.progressionUnitIndex ?? null,
      progressionStageIndex: request.progressionStageIndex ?? null,
      stageLabel: request.stageLabel || null,
      elapsedSeconds: Number(attempt.elapsedSeconds || 0),
      timingSource: attempt.timingSource || "client_fallback",
      answerRevisionCount: Number(attempt.answerRevisionCount || 0),
      interactionMetadataSource: "client_observed_count",
      deliveryId: delivery.id,
      scoringSource: "server_authoritative",
      subjectId: delivery.subjectId,
    },
  };
}

function toPublicBehaviorEvent(event) {
  if (!event) return null;
  const payload = { ...(event.payload || {}) };
  // Source delivery bindings are learning-engine evidence, not browser data.
  delete payload.retrySourceDeliveryId;
  delete payload.correctReviewSourceDeliveryId;
  return { ...event, payload };
}

function createServerSupportBehaviorEvent({ delivery, eventType, level, phase = null }) {
  const candidate = delivery.privateCandidate || {};
  const request = delivery.generationRequest || {};
  const supportLevel = Math.max(1, Math.floor(Number(level) || 1));
  const payload = {
    deliveryId: delivery.id,
    practiceRunId: request.practiceRunId || null,
    knowledgePoint: candidate.familyName || "数学关系",
    variantLevel: candidate.metadataTags?.variantLevel || "original",
    interactionSource: "server_authoritative_support",
    subjectId: delivery.subjectId,
  };

  if (eventType === "hint_opened") {
    payload.hintLevel = supportLevel;
  } else {
    payload.guidedStepIndex = supportLevel - 1;
    payload.guidedStepPhase = phase || null;
  }

  return {
    eventId: `question-delivery-${eventType}-${delivery.id}-${supportLevel}`,
    studentId: delivery.studentId,
    subjectId: delivery.subjectId,
    sessionId: request.sessionId || `delivery-session-${delivery.id}`,
    eventType,
    timestamp: delivery.updatedAt || new Date().toISOString(),
    page: "practice",
    targetId: candidate.id || delivery.id,
    payload,
  };
}

function createServerGuidedResponseBehaviorEvent({ delivery, response, result }) {
  const candidate = delivery.privateCandidate || {};
  const request = delivery.generationRequest || {};
  const stepIndex = Math.max(0, Number(response.level || 1) - 1);
  const guidedStepPhase = candidate.guidedSteps?.[stepIndex]?.phase || null;
  return {
    eventId: `question-delivery-guided-response-${delivery.id}-${response.level}-${response.attemptCount}`,
    studentId: delivery.studentId,
    subjectId: delivery.subjectId,
    sessionId: request.sessionId || `delivery-session-${delivery.id}`,
    eventType: "guided_step_response_recorded",
    timestamp: delivery.updatedAt || new Date().toISOString(),
    page: "practice",
    targetId: candidate.id || delivery.id,
    payload: {
      deliveryId: delivery.id,
      practiceRunId: request.practiceRunId || null,
      knowledgePoint: candidate.familyName || "数学关系",
      variantLevel: candidate.metadataTags?.variantLevel || "original",
      guidedStepIndex: stepIndex,
      guidedStepPhase,
      guidedResponseType: response.responseType,
      guidedResponseStatus: result.status,
      interactionSource: "server_authoritative_guided_response",
      subjectId: delivery.subjectId,
    },
  };
}

function previousAttemptSource(delivery) {
  const retrySourceDeliveryId = delivery?.generationRequest?.retrySourceDeliveryId;
  if (retrySourceDeliveryId) {
    return {
      sourceDeliveryId: retrySourceDeliveryId,
      recallKind: "previous_wrong_attempt",
      intro: "先看一眼上次的想法，再自己试一次。",
      matchesAttempt: (attempt) => attempt?.isCorrect === false,
    };
  }

  const correctReviewSourceDeliveryId = delivery?.generationRequest?.correctReviewSourceDeliveryId;
  if (correctReviewSourceDeliveryId) {
    return {
      sourceDeliveryId: correctReviewSourceDeliveryId,
      recallKind: "previous_independent_correct_attempt",
      intro: "你之前做过相近的关系，可以先回忆一下当时的思路。",
      matchesAttempt: (attempt) => attempt?.isCorrect === true && Number(attempt?.hintDepth || 0) === 0,
    };
  }

  return null;
}

function previousAttemptReference({ database, delivery }) {
  const source = previousAttemptSource(delivery);
  if (!source) return null;
  const sourceDelivery = database.getQuestionDelivery({ deliveryId: source.sourceDeliveryId });
  if (
    !sourceDelivery ||
    sourceDelivery.studentId !== delivery.studentId ||
    sourceDelivery.subjectId !== delivery.subjectId ||
    !sourceDelivery.privateCandidate?.prompt
  ) {
    return null;
  }
  const priorAttempt = [...(sourceDelivery.attempts || [])].reverse().find(source.matchesAttempt);
  if (!priorAttempt || !Number.isFinite(Number(priorAttempt.answer))) return null;
  return {
    availableBeforeHints: true,
    recallKind: source.recallKind,
    intro: source.intro,
    sourcePrompt: sourceDelivery.privateCandidate.prompt,
    studentAnswerDisplay: formatMathAnswerValue({
      answerInput: sourceDelivery.privateCandidate.answerInput || createMathAnswerInput(),
      value: priorAttempt.answer,
    }),
    attemptedAt: priorAttempt.submittedAt || null,
  };
}

function toSafeQuestionDeliveryPresentation({ database, delivery }) {
  const presentation = toQuestionDeliveryPresentation(delivery);
  if (!presentation) return null;
  const plan =
    delivery.mode === "practice"
      ? database.getPlan({ studentId: delivery.studentId, subjectId: delivery.subjectId })
      : null;
  const strategyPreference =
    plan?.supportProfile?.strategyPreference || plan?.supportProfile?.supportPlan?.strategyPreference || null;
  const solutionStrategies = orderSolutionStrategies({
    strategies: presentation.question.solutionStrategies,
    preference: strategyPreference,
  });
  const recall = previousAttemptReference({ database, delivery });
  return {
    ...presentation,
    question: {
      ...presentation.question,
      solutionStrategies,
      ...(recall ? { previousAttemptReference: recall } : {}),
    },
  };
}

function normalizeStageAssessmentRunRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const targetGrade = String(value.targetGrade || "").trim().toUpperCase();
  const preferredFamilyId = String(value.preferredFamilyId || "").trim() || null;
  const attemptIndex = Math.max(0, Math.min(1000, Math.floor(Number(value.attemptIndex) || 0)));
  const plannedWeek = Math.max(1, Math.min(1000, Math.floor(Number(value.plannedWeek) || 1)));
  if (!studentId || !["math", "math-linear-equations"].includes(subjectId) || !/^G[1-6]$/.test(targetGrade)) return null;
  return { studentId, subjectId, targetGrade, preferredFamilyId, attemptIndex, plannedWeek };
}

function normalizeGradeTarget(value) {
  const targetGrade = String(value || "").trim().toUpperCase();
  return /^G[1-6]$/.test(targetGrade) ? targetGrade : null;
}

function targetGradeForStoredStageResult(result) {
  return normalizeGradeTarget(
    result?.assessmentScope?.targetGrade ||
      result?.assessmentBlueprint?.targetGrade ||
      result?.levelAttainment?.targetGrade ||
      result?.targetGrade,
  );
}

function targetGradeForConfirmedPlan(plan) {
  return [
    plan?.learningGoal?.targetGrade,
    plan?.initialAssessment?.targetGrade,
    plan?.learningPath?.instructionalGrade,
  ]
    .map(normalizeGradeTarget)
    .find(Boolean) || null;
}

function dayTimestamp(value) {
  const normalized = String(value || "").replace(/\./g, "-");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const timestamp = Date.parse(`${normalized}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function resolveAuthoritativeStagePlannedWeek({ database, plan, studentId, subjectId }) {
  const activeCurve = plan?.dynamicCurve?.canUpdate ? plan.dynamicCurve : plan?.staticCurve;
  const curveValues = activeCurve?.dynamicProgressCurve || activeCurve?.progressCurve || [];
  const maximumWeek = Math.max(1, curveValues.length || 1);
  const fallbackWeek = Math.max(1, Math.min(maximumWeek, Math.floor(Number(activeCurve?.currentPoint?.week) || 1)));
  const startedAt = dayTimestamp(plan?.taskCadence?.planStartedAt || plan?.createdAt);
  const latestPracticeDate = latestCompletedServerPracticeDate({ database, studentId, subjectId });
  const latestAt = dayTimestamp(latestPracticeDate);
  if (startedAt === null || latestAt === null || latestAt < startedAt) return fallbackWeek;
  return Math.max(1, Math.min(maximumWeek, Math.floor((latestAt - startedAt) / (7 * 24 * 60 * 60 * 1000)) + 1));
}

function resolveAuthoritativeStageRunRequest({ database, plan, request }) {
  const targetGrade = targetGradeForConfirmedPlan(plan);
  if (!targetGrade) return { error: "stage_assessment_plan_target_unavailable" };
  if (request.targetGrade !== targetGrade) return { error: "stage_assessment_target_mismatch" };

  const attemptIndex = (plan?.stageAssessmentHistory || []).filter(
    (result) => targetGradeForStoredStageResult(result) === targetGrade,
  ).length;
  return {
    request: {
      ...request,
      targetGrade,
      attemptIndex,
      plannedWeek: resolveAuthoritativeStagePlannedWeek({
        database,
        plan,
        studentId: request.studentId,
        subjectId: request.subjectId,
      }),
    },
  };
}

function toPublicStageAssessmentResult(result) {
  if (!result) return null;
  return {
    id: result.id,
    sessionId: result.sessionId,
    studentId: result.studentId,
    subjectId: result.subjectId,
    assessmentType: result.assessmentType,
    plannedWeek: result.plannedWeek,
    status: result.status,
    eligibleForCurveUpdate: result.eligibleForCurveUpdate,
    completedQuestionCount: result.completedQuestionCount,
    requiredQuestionCount: result.requiredQuestionCount,
    correctCount: result.correctCount,
    accuracy: result.accuracy,
    controlledVariantItemCount: result.controlledVariantItemCount,
    controlledVariantAccuracy: result.controlledVariantAccuracy,
    transferItemCount: result.transferItemCount,
    transferAccuracy: result.transferAccuracy,
    masteryScore: result.masteryScore,
    uniqueFamilies: result.uniqueFamilies,
    supportViolation: result.supportViolation,
    allItemsQualityPassed: result.allItemsQualityPassed,
    assessmentScope: result.assessmentScope || null,
    completedAt: result.completedAt || null,
    completedThroughPracticeDate: result.completedThroughPracticeDate || null,
    levelAttainment: result.levelAttainment || null,
    questionResults: (result.questionResults || []).map((item) => ({
      questionId: item.questionId,
      familyId: item.familyId,
      variantLevel: item.variantLevel,
      gradeBands: item.gradeBands || [],
      knowledgePointIds: item.knowledgePointIds || [],
      answered: item.answered,
      isCorrect: item.isCorrect,
      responseTimeMs: item.responseTimeMs,
      qualityStatus: item.qualityStatus,
      assessmentRouting: item.assessmentRouting || null,
    })),
    guardrail: result.guardrail,
  };
}

function toPublicStageAssessmentRun(session) {
  if (!session) return null;
  return {
    id: session.id,
    studentId: session.studentId,
    subjectId: session.subjectId,
    assessmentType: session.assessmentType,
    plannedWeek: session.plannedWeek,
    minimumQuestions: session.minimumQuestions,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    responseCount: session.responseCount || (session.responses || []).length,
    responses: (session.responses || []).map((response) => ({
      questionId: response.questionId,
      responseTimeMs: response.responseTimeMs,
      submittedAt: response.submittedAt,
    })),
    presentationQuestions: session.presentationQuestions || [],
    assessmentBlueprint: session.assessmentBlueprint || null,
    result: toPublicStageAssessmentResult(session.result),
    dynamicCurve: session.dynamicCurve || null,
    serverAuthoritative: true,
    guardrail: session.guardrail,
  };
}

function createServerStageAssessmentRun({ request }) {
  const blueprint = assembleStageAssessment({
    aiVersion: "semi_ai",
    attemptIndex: request.attemptIndex,
    families: shanghaiMathItemFamilies,
    maxQuestions: 8,
    minQuestions: 6,
    preferredFamilyId: request.preferredFamilyId,
    subjectId: request.subjectId,
    targetGrade: request.targetGrade,
  });
  if (blueprint.questions.length < blueprint.minimumQuestions) return { error: "stage_assessment_blueprint_incomplete" };
  const now = new Date().toISOString();
  const session = createStageAssessmentRun({
    studentId: request.studentId,
    subjectId: request.subjectId,
    questions: blueprint.questions,
    assessmentType: "stage_test",
    plannedWeek: request.plannedWeek,
    minimumQuestions: blueprint.minimumQuestions,
    attemptId: randomBytes(8).toString("base64url"),
    assessmentBlueprint: {
      assessmentMode: blueprint.assessmentMode,
      levelDefinitionId: blueprint.levelDefinition.id,
      targetGrade: blueprint.levelDefinition.targetGrade,
      attemptIndex: request.attemptIndex,
      preferredFamilyId: request.preferredFamilyId,
      coverage: blueprint.coverage,
      guardrail: blueprint.guardrail,
    },
  });
  return {
    session: {
      ...session,
      serverAuthoritative: true,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function finalizeServerStageAssessmentRun({ database, session }) {
  const plan = database.getPlan({ studentId: session.studentId, subjectId: session.subjectId });
  if (!plan?.staticCurve) return { error: "stage_assessment_requires_confirmed_static_curve" };
  const targetGrade = session.assessmentBlueprint?.targetGrade || "G6";
  const levelDefinition = createMathLevelDefinition({
    targetGrade,
    families: shanghaiMathItemFamilies,
    subjectId: session.subjectId,
  });
  const finalized = finalizeStageAssessmentRun({
    session,
    staticCurve: plan.staticCurve,
    levelDefinition,
    priorStageResults: plan.stageAssessmentHistory || [],
  });
  const completedAt = new Date().toISOString();
  const completedThroughPracticeDate =
    latestCompletedServerPracticeDate({ database, studentId: session.studentId, subjectId: session.subjectId }) || completedAt.slice(0, 10);
  const stageResult = {
    ...finalized.result,
    completedAt,
    completedThroughPracticeDate,
  };
  const completedSession = {
    ...finalized.session,
    result: stageResult,
    serverAuthoritative: true,
    updatedAt: completedAt,
  };
  const assessmentCadence = stageResult.eligibleForCurveUpdate
    ? {
        ...(plan.assessmentCadence || {}),
        lastVerifiedAt: completedAt,
        lastVerifiedPracticeDate: completedThroughPracticeDate,
        lastSkippedAt: null,
        lastSkippedAtPracticeCount: 0,
        ...(plan.assessmentCadence?.observerRequestStatus === "requested"
          ? {
              observerRequestAcknowledgedAt: completedAt,
              observerRequestAcknowledgedByRole: "student",
              observerRequestStatus: "completed",
            }
          : {}),
      }
    : plan.assessmentCadence || null;
  const updatedPlan = database.savePlan({
    ...plan,
    updatedAt: completedAt,
    stageAssessmentHistory: [...(plan.stageAssessmentHistory || []), stageResult],
    dynamicCurve: finalized.dynamicCurve?.canUpdate ? finalized.dynamicCurve : plan.dynamicCurve || null,
    assessmentCadence,
  });
  return { session: completedSession, plan: updatedPlan };
}

function normalizeInitialAssessmentRunRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const targetGrade = String(value.targetGrade || "").trim().toUpperCase();
  if (!studentId || !["math", "math-linear-equations"].includes(subjectId) || !/^G[1-6]$/.test(targetGrade)) {
    return null;
  }
  return { studentId, subjectId, targetGrade };
}

function normalizePersonalityAssessmentRunRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  if (!studentId || subjectId !== "math-linear-equations") return null;
  return { studentId, subjectId };
}

function normalizeInitialLearningPlanRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const practiceDate = normalizePracticeDate(value.practiceDate);
  const learningGoal = value.learningGoal && typeof value.learningGoal === "object" ? value.learningGoal : null;
  if (!studentId || subjectId !== "math-linear-equations" || !practiceDate || !learningGoal) return null;
  return { studentId, subjectId, practiceDate, learningGoal };
}

function initialAssessmentPrivateMetadata(question) {
  return {
    abilityTags: question.metadataTags?.abilityTags || [],
    atlasNodeIds: question.metadataTags?.atlasNodeIds || [],
    variantLevel: question.metadataTags?.variantLevel || "original",
    itemTags: question.metadataTags?.itemTags || null,
    assessmentRouting: question.metadataTags?.assessmentRouting || null,
  };
}

function toPublicInitialAssessmentMetadata(metadata) {
  return {
    abilityTags: metadata?.abilityTags || [],
    atlasNodeIds: metadata?.atlasNodeIds || [],
    variantLevel: metadata?.variantLevel || "original",
    itemTags: toPublicItemTags(metadata?.itemTags),
    assessmentRouting: metadata?.assessmentRouting || null,
  };
}

function createInitialAssessmentQuestionSnapshot(question) {
  return {
    id: question.id,
    answer: question.answer,
    answerInput: question.answerInput || createMathAnswerInput(),
    familyId: question.familyId || null,
    targetDimension: question.targetDimension || null,
    qualityStatus: question.qualityStatus || null,
    metadata: initialAssessmentPrivateMetadata(question),
  };
}

function toInitialAssessmentQuestionPresentation(question) {
  return {
    id: question.id,
    prompt: question.prompt,
    answerInput: question.answerInput || createMathAnswerInput(),
    stage: question.stage || null,
    familyId: question.familyId || null,
    targetDimension: question.targetDimension || null,
    metadataTags: toPublicInitialAssessmentMetadata(initialAssessmentPrivateMetadata(question)),
  };
}

function toPublicInitialAssessmentResponse(response) {
  return {
    step: "ability_test",
    questionId: response.questionId,
    responseType: response.responseType || (response.isUncertain ? "uncertain_skip" : "numeric_answer"),
    isUncertain: Boolean(response.isUncertain),
    responseTimeMs: response.responseTimeMs,
    submittedAt: response.submittedAt,
    metadata: toPublicInitialAssessmentMetadata(response.metadata),
  };
}

function buildInitialAssessmentResult(session) {
  const responses = session.responses || [];
  const correctCount = responses.filter((response) => response.isCorrect).length;
  const uncertainCount = responses.filter((response) => response.isUncertain).length;
  const skippedCount = responses.filter((response) => response.answer === null || response.answer === undefined).length;
  const requiredQuestionCount = session.questionSnapshot?.length || 0;
  return {
    completedQuestionCount: responses.length,
    requiredQuestionCount,
    correctCount,
    accuracy: requiredQuestionCount ? correctCount / requiredQuestionCount : 0,
    uncertainCount,
    uncertaintyRate: requiredQuestionCount ? uncertainCount / requiredQuestionCount : 0,
    skippedCount,
    familyCount: new Set((session.questionSnapshot || []).map((question) => question.familyId).filter(Boolean)).size,
    targetGrade: session.targetGrade,
    allItemsQualityPassed: (session.questionSnapshot || []).every(
      (question) => question.qualityStatus === "system_validated",
    ),
  };
}

function toPublicInitialAssessmentRun(session) {
  if (!session) return null;
  const result =
    session.status === "completed"
      ? {
          ...(session.result || {}),
          abilityMap: buildServerInitialAbilityMap({ session }),
        }
      : null;
  return {
    id: session.id,
    studentId: session.studentId,
    subjectId: session.subjectId,
    assessmentType: session.assessmentType,
    targetGrade: session.targetGrade,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    responseCount: session.responseCount || (session.responses || []).length,
    routing: session.routing || null,
    coverage: session.coverage || null,
    responses: (session.responses || []).map(toPublicInitialAssessmentResponse),
    presentationQuestions: session.presentationQuestions || [],
    result,
    serverAuthoritative: true,
    guardrail: session.guardrail,
  };
}

function toPublicAssessmentSession(session) {
  if (!session?.serverAuthoritative) return session || null;
  if (session.assessmentType === "stage_test") return toPublicStageAssessmentRun(session);
  if (session.assessmentType === "initial_onboarding") return toPublicInitialAssessmentRun(session);
  if (session.assessmentType === PERSONALITY_ASSESSMENT_TYPE) return toPublicPersonalityAssessmentRun(session);
  return null;
}

function createServerInitialAssessmentRun({ request }) {
  // Kept only in the server-owned session, so a reviewed run can be reproduced
  // without exposing its question-generation trace to the student browser.
  const assessmentSeed = randomBytes(4).readUInt32BE(0) || 1;
  const blueprint = assembleInitialAbilityTest({
    assessmentSeed,
    aiVersion: "semi_ai",
    families: shanghaiMathItemFamilies,
    maxQuestions: 8,
    minQuestions: 4,
    subjectId: request.subjectId,
    targetGrade: request.targetGrade,
  });
  if (blueprint.questions.length < blueprint.minQuestions) return { error: "initial_assessment_blueprint_incomplete" };
  const now = new Date().toISOString();
  return {
    session: {
      id: `initial-assessment-${request.studentId}-${request.subjectId}-${randomBytes(8).toString("base64url")}`,
      studentId: request.studentId,
      subjectId: request.subjectId,
      assessmentType: "initial_onboarding",
      targetGrade: request.targetGrade,
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
      responseCount: 0,
      assessmentSeed,
      routing: blueprint.routing,
      coverage: blueprint.coverage,
      questionSnapshot: blueprint.questions.map(createInitialAssessmentQuestionSnapshot),
      presentationQuestions: blueprint.questions.map(toInitialAssessmentQuestionPresentation),
      responses: [],
      result: null,
      serverAuthoritative: true,
      guardrail:
        "Initial ability assessment uses the shared validated logic library. Answers, generation traces, and item-level correctness remain on the server; the page receives only prompts, its own response state, and completed summary signals.",
    },
  };
}

function recordServerInitialAssessmentResponse({ session, answer, isUncertain = false, questionId, responseTimeMs }) {
  const answeredIds = new Set((session.responses || []).map((response) => response.questionId));
  const expectedQuestion = (session.presentationQuestions || []).find((question) => !answeredIds.has(question.id));
  const privateQuestion = (session.questionSnapshot || []).find((question) => question.id === questionId);
  if (!expectedQuestion || expectedQuestion.id !== questionId || !privateQuestion) {
    return { error: "initial_assessment_question_order_denied" };
  }
  const answerInput = privateQuestion.answerInput || createMathAnswerInput();
  const hasAnswer = answer !== null && answer !== undefined && String(answer).trim() !== "";
  const normalizedAnswer = hasAnswer
    ? normalizeMathAnswerValue({ answerInput, value: answer })
    : null;
  const uncertaintySignal = Boolean(isUncertain);
  if (!uncertaintySignal && normalizedAnswer === null) return { error: "invalid_initial_assessment_answer" };
  if (hasAnswer && normalizedAnswer === null) return { error: "invalid_initial_assessment_answer" };
  const submittedAt = new Date().toISOString();
  const response = {
    questionId,
    answer: normalizedAnswer,
    isCorrect:
      normalizedAnswer !== null &&
      mathAnswerValuesMatch({ answerInput, actual: normalizedAnswer, expected: privateQuestion.answer }),
    isUncertain: uncertaintySignal,
    responseType: normalizedAnswer !== null
      ? uncertaintySignal
        ? `${answerInput.kind}_answer_marked_uncertain`
        : `${answerInput.kind}_answer`
      : "uncertain_skip",
    responseTimeMs: Math.max(0, Math.min(6 * 60 * 60 * 1000, Number(responseTimeMs) || 0)),
    submittedAt,
    metadata: {
      targetDimension: privateQuestion.targetDimension,
      tags: privateQuestion.metadata,
      selfReportedUncertainty: uncertaintySignal,
    },
  };
  const responses = [...(session.responses || []), response];
  const complete = responses.length === (session.questionSnapshot || []).length;
  const updatedSession = {
    ...session,
    responses,
    responseCount: responses.length,
    status: complete ? "completed" : "in_progress",
    updatedAt: submittedAt,
  };
  return {
    session: complete ? { ...updatedSession, result: buildInitialAssessmentResult(updatedSession) } : updatedSession,
  };
}

function normalizePracticeDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text;
}

function normalizeDailyPracticePlanRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const practiceDate = normalizePracticeDate(value.practiceDate);
  if (!studentId || !["math", "math-linear-equations"].includes(subjectId) || !practiceDate) return null;
  return { studentId, subjectId, practiceDate };
}

function resolveServerInstructionalGrade({ database, studentId, subjectId, plan }) {
  const initialSession = database.getLatestAssessmentSession({
    studentId,
    subjectId,
    assessmentType: "initial_onboarding",
  });
  const candidates = [
    initialSession?.targetGrade,
    plan?.todayQuestionQueue?.instructionalGrade,
    plan?.nextQuestionQueue?.instructionalGrade,
    plan?.learningGoal?.currentInstructionalGrade,
    plan?.learningGoal?.targetGrade,
  ];
  return candidates.map((value) => String(value || "").toUpperCase()).find((value) => /^G[1-6]$/.test(value)) || "G6";
}

function toPublicStudentSupportPresentation(profile) {
  const source = profile?.supportPlan || profile || {};
  return {
    helpEntryStyle: source.helpEntryStyle === "private_reassurance" ? "private_reassurance" : "self_then_choose",
    guidedStructurePreferred: Boolean(source.guidedStructurePreferred || source.guidedStructureObserved),
    reviewPromptStyle: ["reflective", "optional"].includes(source.reviewPromptStyle)
      ? source.reviewPromptStyle
      : "light",
  };
}

function toPublicDailyPracticePlan(plan) {
  if (!plan) return null;
  const queue = plan.questionQueue || {};
  return {
    id: plan.id,
    studentId: plan.studentId,
    subjectId: plan.subjectId,
    practiceDate: plan.practiceDate,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    source: "server_owned_daily_matching",
    task: {
      id: plan.task?.id || null,
      date: plan.task?.date || plan.practiceDate,
      focus: plan.task?.focus || "数学关系",
      estimatedMinutes: plan.task?.estimatedMinutes || null,
      intensity: plan.task?.intensity || null,
      curveType: plan.task?.curveType || null,
      recovery: plan.task?.recovery
        ? {
            sourceDate: plan.task.recovery.sourceDate || null,
            message: plan.task.recovery.message || null,
          }
        : null,
    },
    questionQueue: {
      id: queue.id || null,
      date: queue.date || plan.practiceDate,
      totalUnits: queue.totalUnits || 0,
      instructionalGrade: queue.instructionalGrade || plan.instructionalGrade || null,
      items: (queue.items || []).map((item) => ({
        id: item.id,
        familyId: item.familyId,
        familyName: item.familyName,
        variantLevel: item.variantLevel,
        instructionalGrade: item.instructionalGrade,
      })),
    },
    supportPresentation: toPublicStudentSupportPresentation(plan.supportProfile),
    learningPath: plan.learningPath
      ? {
          instructionalGrade: plan.learningPath.instructionalGrade,
          focusFamilyId: plan.learningPath.focusFamilyId,
          focusFamilyName: plan.learningPath.focusFamilyName,
          routePosition: plan.learningPath.routePosition,
        }
      : null,
    taskCadence: plan.taskCadence
      ? {
          makeUpTask: plan.taskCadence.makeUpTask
            ? {
                date: plan.taskCadence.makeUpTask.date,
                studentMessage: plan.taskCadence.makeUpTask.studentMessage,
              }
            : null,
          observerReminder: plan.taskCadence.observerReminder
            ? { level: plan.taskCadence.observerReminder.level }
            : null,
        }
      : null,
    guardrail:
      "This daily queue is resolved once on the server from the confirmed learning path and prior evidence. It changes tomorrow's questions only, never the dynamic curve.",
  };
}

function toPublicPlanQueue(queue) {
  if (!queue) return null;
  return {
    id: queue.id || null,
    date: queue.date || null,
    totalUnits: Number(queue.totalUnits || 0),
    instructionalGrade: queue.instructionalGrade || null,
    items: (queue.items || []).map((item) => ({
      id: item.id || null,
      familyId: item.familyId || null,
      familyName: item.familyName || null,
      instructionalGrade: item.instructionalGrade || null,
      variantLevel: item.variantLevel || null,
    })),
  };
}

function toPublicStudentAssessmentCadence(cadence) {
  if (!cadence) return null;
  return {
    suggestedAfterPracticeDays: cadence.suggestedAfterPracticeDays ?? null,
    mandatoryAfterPracticeDays: cadence.mandatoryAfterPracticeDays ?? null,
    lastVerifiedAt: cadence.lastVerifiedAt || null,
    lastVerifiedPracticeDate: cadence.lastVerifiedPracticeDate || null,
    lastSkippedAt: cadence.lastSkippedAt || null,
    lastSkippedAtPracticeCount: cadence.lastSkippedAtPracticeCount ?? null,
    observerRequestedAt: cadence.observerRequestedAt || null,
    observerRequestStatus: cadence.observerRequestStatus || null,
    observerRequestAcknowledgedAt: cadence.observerRequestAcknowledgedAt || null,
  };
}

function toPublicObserverAssessmentCadence(cadence) {
  if (!cadence) return null;
  return {
    ...toPublicStudentAssessmentCadence(cadence),
    policyVersion: cadence.policyVersion || null,
    configuredAt: cadence.configuredAt || null,
    configuredByRole: cadence.configuredByRole || null,
    updatedFrom: cadence.updatedFrom || null,
    observerRequestedByRole: cadence.observerRequestedByRole || null,
    observerRequestAcknowledgedByRole: cadence.observerRequestAcknowledgedByRole || null,
  };
}

function toPublicStudentLearningPath(path) {
  if (!path) return null;
  return {
    version: path.version || null,
    instructionalGrade: path.instructionalGrade || null,
    focusFamilyId: path.focusFamilyId || null,
    focusFamilyName: path.focusFamilyName || null,
    routePosition: path.routePosition ?? null,
  };
}

function toPublicStudentTask(task) {
  if (!task) return null;
  return {
    id: task.id || null,
    date: task.date || null,
    focus: task.focus || null,
    estimatedMinutes: task.estimatedMinutes ?? null,
    intensity: task.intensity || null,
    curveType: task.curveType || null,
    recovery: task.recovery
      ? {
          sourceDate: task.recovery.sourceDate || null,
          message: task.recovery.message || null,
        }
      : null,
  };
}

function toPublicStudentPlan(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    studentId: plan.studentId,
    subjectId: plan.subjectId,
    status: plan.status || null,
    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
    serverAuthoritative: Boolean(plan.serverAuthoritative),
    persistence: plan.persistence || null,
    learningGoal: plan.learningGoal || null,
    staticCurve: plan.staticCurve || null,
    staticCurveConfirmedAt: plan.staticCurveConfirmedAt || null,
    staticCurveConfirmation: plan.staticCurveConfirmation
      ? {
          action: plan.staticCurveConfirmation.action || null,
          confirmedAt: plan.staticCurveConfirmation.confirmedAt || null,
        }
      : null,
    initialAssessment: plan.initialAssessment || null,
    initialAbilityMap: plan.initialAbilityMap || null,
    learningPathVersion: plan.learningPathVersion || null,
    learningPath: toPublicStudentLearningPath(plan.learningPath),
    todayTask: toPublicStudentTask(plan.todayTask),
    nextDynamicTask: toPublicStudentTask(plan.nextDynamicTask),
    todayQuestionQueue: toPublicPlanQueue(plan.todayQuestionQueue),
    taskCadence: plan.taskCadence
      ? {
          planStartedAt: plan.taskCadence.planStartedAt || null,
          dailyStudyMinutes: plan.taskCadence.dailyStudyMinutes ?? null,
          weeklyStudyDays: plan.taskCadence.weeklyStudyDays ?? null,
          makeUpTask: plan.taskCadence.makeUpTask
            ? {
                date: plan.taskCadence.makeUpTask.date || null,
                studentMessage: plan.taskCadence.makeUpTask.studentMessage || null,
              }
            : null,
        }
      : null,
    assessmentCadence: toPublicStudentAssessmentCadence(plan.assessmentCadence),
    stageAssessmentHistory: (plan.stageAssessmentHistory || []).map((result) => ({
      id: result.id || null,
      targetGrade: result.targetGrade || result.assessmentScope?.targetGrade || null,
      plannedWeek: result.plannedWeek ?? null,
      createdAt: result.createdAt || null,
      completedAt: result.completedAt || null,
      status: result.status || null,
      accuracy: result.accuracy ?? null,
      masteryScore: result.masteryScore ?? null,
      transferAccuracy: result.transferAccuracy ?? null,
      eligibleForCurveUpdate: Boolean(result.eligibleForCurveUpdate),
    })),
    dynamicCurve: plan.dynamicCurve || null,
    curveAdjustmentHistory: (plan.curveAdjustmentHistory || []).map((item) => ({
      confirmationId: item.confirmationId || null,
      action: item.action || null,
      confirmedAt: item.confirmedAt || null,
      parameters: item.parameters || null,
      appliesFrom: item.appliesFrom || null,
    })),
  };
}

function toPublicObserverPlan(plan) {
  if (!plan) return null;
  const studentView = toPublicStudentPlan(plan);
  return {
    ...studentView,
    staticCurveConfirmation: studentView.staticCurveConfirmation
      ? {
          ...studentView.staticCurveConfirmation,
          actorRole: plan.staticCurveConfirmation?.actorRole || null,
        }
      : null,
    assessmentCadence: toPublicObserverAssessmentCadence(plan.assessmentCadence),
    supportProfile: plan.supportProfile || null,
    behaviorAnalysis: plan.behaviorAnalysis || null,
  };
}

function toPublicPlanForRole(plan, role) {
  return role === "student" ? toPublicStudentPlan(plan) : toPublicObserverPlan(plan);
}

function filterTrustedLearningEvents(events = []) {
  return events.filter(
    (event) => event?.eventType !== "answer_submitted" || event?.payload?.scoringSource === "server_authoritative",
  );
}

function resolveServerAssessmentCadence({ database, studentId, subjectId, plan, today }) {
  const sessions = database
    .listDailyPracticeSessions({ studentId, subjectId, limit: 90 })
    .filter((session) => !today || String(session?.practiceDate || "") <= today);
  return createAssessmentCadence({
    sessions,
    stageAssessmentHistory: plan?.stageAssessmentHistory || [],
    config: plan?.assessmentCadence || {},
    today,
  });
}

function latestCompletedServerPracticeDate({ database, studentId, subjectId }) {
  return (
    database
      .listDailyPracticeSessions({ studentId, subjectId, limit: 90 })
      .filter((session) => session?.sessionStatus === "required_completed")
      .map((session) => String(session.practiceDate || "").replace(/\./g, "-"))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort()
      .at(-1) || null
  );
}

function isReplayEligiblePriorOriginal({ delivery, studentId, subjectId }) {
  const request = delivery?.generationRequest || {};
  const attempts = Array.isArray(delivery?.attempts) ? delivery.attempts : [];
  const latestWrongIndex = attempts.map((attempt) => attempt?.isCorrect === false).lastIndexOf(true);
  if (
    !delivery ||
    delivery.studentId !== studentId ||
    delivery.subjectId !== subjectId ||
    delivery.mode !== "practice" ||
    request.variantLevel !== "original" ||
    !request.familyId ||
    !request.instructionalGrade ||
    !Number.isFinite(Number(request.seed)) ||
    !delivery.privateCandidate?.prompt ||
    latestWrongIndex < 0
  ) {
    return false;
  }

  return !attempts
    .slice(latestWrongIndex + 1)
    .some((attempt) => attempt?.isCorrect === true && Number(attempt?.hintDepth || 0) === 0);
}

function attachExactPriorOriginalReplays({ database, studentId, subjectId, questionQueue }) {
  if (!questionQueue?.items?.length) return questionQueue;

  const sourcesByFamilyAndGrade = new Map();
  database
    .listQuestionDeliveries({ studentId, subjectId, limit: 500 })
    .filter((delivery) => isReplayEligiblePriorOriginal({ delivery, studentId, subjectId }))
    .forEach((delivery) => {
      const request = delivery.generationRequest;
      const key = `${request.familyId}|${request.instructionalGrade}`;
      if (!sourcesByFamilyAndGrade.has(key)) sourcesByFamilyAndGrade.set(key, delivery);
    });

  const usedSourceIds = new Set();
  const items = questionQueue.items.map((item) => {
    if (item.bucketId !== "wrong_retry" || item.source !== "unresolved_wrong_evidence" || item.variantLevel !== "original") {
      return item;
    }
    const source = sourcesByFamilyAndGrade.get(`${item.familyId}|${item.instructionalGrade}`);
    if (!source || usedSourceIds.has(source.id)) return item;
    usedSourceIds.add(source.id);
    return {
      ...item,
      seed: Number(source.generationRequest.seed),
      featureFocus: null,
      retrySourceDeliveryId: source.id,
      source: "exact_prior_original_replay",
      selectionReason: `${item.selectionReason}|exact_prior_original_replay`,
    };
  });

  return { ...questionQueue, items };
}

function isCorrectReviewEligiblePriorOriginal({ delivery, studentId, subjectId }) {
  const request = delivery?.generationRequest || {};
  const attempts = Array.isArray(delivery?.attempts) ? delivery.attempts : [];
  const hasIndependentCorrect = attempts.some(
    (attempt) => attempt?.isCorrect === true && Number(attempt?.hintDepth || 0) === 0,
  );
  return Boolean(
    delivery &&
      delivery.studentId === studentId &&
      delivery.subjectId === subjectId &&
      delivery.mode === "practice" &&
      request.variantLevel === "original" &&
      request.familyId &&
      request.instructionalGrade &&
      Number.isFinite(Number(request.seed)) &&
      delivery.privateCandidate?.prompt &&
      hasIndependentCorrect,
  );
}

function attachCorrectReviewSourceBindings({ database, studentId, subjectId, questionQueue }) {
  if (!questionQueue?.items?.length) return questionQueue;

  const sourcesByFamilyAndGrade = new Map();
  database
    .listQuestionDeliveries({ studentId, subjectId, limit: 500 })
    .filter((delivery) => isCorrectReviewEligiblePriorOriginal({ delivery, studentId, subjectId }))
    .forEach((delivery) => {
      const request = delivery.generationRequest;
      const key = `${request.familyId}|${request.instructionalGrade}`;
      const sources = sourcesByFamilyAndGrade.get(key) || [];
      sources.push(delivery);
      sourcesByFamilyAndGrade.set(key, sources);
    });

  const usedSourceIds = new Set();
  const items = questionQueue.items.map((item) => {
    if (item.bucketId !== "correct_review" || item.source !== "independent_correct_evidence" || item.variantLevel !== "context_change") {
      return item;
    }
    const sources = sourcesByFamilyAndGrade.get(`${item.familyId}|${item.instructionalGrade}`) || [];
    const source = sources.find((delivery) => !usedSourceIds.has(delivery.id));
    if (!source) return item;

    usedSourceIds.add(source.id);
    return {
      ...item,
      // Keep the mathematical relation, but reframe it in a fresh real-world context.
      seed: Number(source.generationRequest.seed),
      featureFocus: null,
      correctReviewSourceDeliveryId: source.id,
      source: "linked_independent_correct_context_review",
      selectionReason: `${item.selectionReason}|linked_independent_correct_context_review`,
    };
  });

  return { ...questionQueue, items };
}

function supportSeedFromPlan(profile = {}) {
  const baseline = profile?.baseline || {};
  const direct = profile?.supportPlan || profile || {};
  const existingInitialActionPolicy =
    baseline.initialActionPolicy || profile?.initialActionPolicy || direct.initialActionPolicy || null;
  const fallbackInitialActionPolicy = existingInitialActionPolicy || {
    taskChunking: baseline.taskChunking || profile?.taskChunking || direct.taskChunking || null,
    feedbackStyle: baseline.feedbackStyle || profile?.feedbackStyle || direct.feedbackStyle || null,
    challengePacing: baseline.challengePacing || profile?.challengePacing || direct.challengePacing || null,
    guidedStructurePreferred: Boolean(profile?.guidedStructurePreferred || direct.guidedStructurePreferred),
    helpEntryStyle: profile?.helpEntryStyle || direct.helpEntryStyle || null,
    reviewPromptStyle: profile?.reviewPromptStyle || direct.reviewPromptStyle || null,
  };
  return {
    ...profile,
    supportMode: baseline.supportMode || profile?.supportMode || direct.supportMode || null,
    taskChunking: baseline.taskChunking || profile?.taskChunking || direct.taskChunking || null,
    feedbackStyle: baseline.feedbackStyle || profile?.feedbackStyle || direct.feedbackStyle || null,
    challengePacing: baseline.challengePacing || profile?.challengePacing || direct.challengePacing || null,
    guidedStructurePreferred: Boolean(profile?.guidedStructurePreferred || direct.guidedStructurePreferred),
    helpEntryStyle: profile?.helpEntryStyle || direct.helpEntryStyle || null,
    reviewPromptStyle: profile?.reviewPromptStyle || direct.reviewPromptStyle || null,
    initialActionPolicy: fallbackInitialActionPolicy,
    confidence: baseline.confidence ?? profile?.confidence,
    responseCount: Number(profile?.responseCount || 0),
  };
}

function buildBehaviorRefinedSupportProfile({ plan, behaviorEvents, behaviorEvidenceWindow = null }) {
  if (!plan?.supportProfile) return null;
  const profile = buildAdaptiveSupportProfile({
    initialProfile: supportSeedFromPlan(plan.supportProfile),
    behaviorEvents,
  });
  return behaviorEvidenceWindow ? { ...profile, behaviorEvidenceWindow } : profile;
}

function refreshServerSupportProfile({ database, studentId, subjectId }) {
  const plan = database.getPlan({ studentId, subjectId });
  if (!plan?.supportProfile) return null;
  const behaviorEvents = filterTrustedLearningEvents(
    database.listBehaviorEvents({ studentId, subjectId, limit: 2000 }),
  );
  const currentBehaviorEvidence = selectCurrentBehaviorEvidence({ behaviorEvents });
  const supportProfile = buildBehaviorRefinedSupportProfile({
    plan,
    behaviorEvents: currentBehaviorEvidence.events,
    behaviorEvidenceWindow: currentBehaviorEvidence.metadata,
  });
  if (!supportProfile) return plan;
  return database.savePlan({
    ...plan,
    supportProfile,
    updatedAt: new Date().toISOString(),
  });
}

function createServerDailyPracticePlan({ database, request }) {
  const plan = database.getPlan({ studentId: request.studentId, subjectId: request.subjectId });
  if (!plan?.staticCurve || !plan.staticCurveConfirmedAt) return { error: "daily_plan_requires_confirmed_static_curve" };

  const assessmentCadence = resolveServerAssessmentCadence({
    database,
    studentId: request.studentId,
    subjectId: request.subjectId,
    plan,
    today: request.practiceDate,
  });
  if (assessmentCadence.status === "mandatory") {
    return { error: "mandatory_stage_assessment_required", assessmentCadence };
  }

  const instructionalGrade = resolveServerInstructionalGrade({
    database,
    studentId: request.studentId,
    subjectId: request.subjectId,
    plan,
  });
  const curve = plan.dynamicCurve?.canUpdate ? plan.dynamicCurve : plan.staticCurve;
  if (!curve?.currentPoint || !curve?.sourceInputs) return { error: "daily_plan_curve_snapshot_incomplete" };
  const behaviorEvents = filterTrustedLearningEvents(
    database.listBehaviorEvents({ studentId: request.studentId, subjectId: request.subjectId, limit: 2000 }),
  );
  const currentBehaviorEvidence = selectCurrentBehaviorEvidence({ behaviorEvents });
  const supportProfile =
    buildBehaviorRefinedSupportProfile({
      plan,
      behaviorEvents: currentBehaviorEvidence.events,
      behaviorEvidenceWindow: currentBehaviorEvidence.metadata,
    }) ||
    plan.supportProfile ||
    null;
  const learningPath = createMathLearningPath({
    behaviorEvents,
    curve,
    families: shanghaiMathItemFamilies,
    instructionalGrade,
    pathVersion:
      plan.learningPathVersion ||
      plan.learningPath?.version ||
      LEGACY_MATH_LEARNING_PATH_VERSION,
    planStartedAt: plan.taskCadence?.planStartedAt || plan.staticCurveConfirmedAt,
    practiceDate: request.practiceDate,
  });
  const family =
    shanghaiMathItemFamilies.find((item) => item.id === learningPath.focusFamilyId) ||
    shanghaiMathItemFamilies.find((item) => item.gradeBands?.includes(instructionalGrade)) ||
    shanghaiMathItemFamilies[0];
  const task =
    plan.todayTask?.date === request.practiceDate
      ? plan.todayTask
      : plan.nextDynamicTask?.date === request.practiceDate
        ? plan.nextDynamicTask
        : createTodayTaskFromLearningCurve({
            curve,
            date: request.practiceDate,
            focus: learningPath.focusFamilyName || family?.name || "数学关系",
          });
  const taskCadence = createTaskCadence({
    today: request.practiceDate,
    sessions: database.listDailyPracticeSessions({
      studentId: request.studentId,
      subjectId: request.subjectId,
      limit: 90,
    }),
    weeklyStudyDays: plan.learningGoal?.weeklyStudyDays || curve.sourceInputs?.weeklyStudyDays || 5,
    focus: learningPath.focusFamilyName || family?.name || "数学关系",
    estimatedMinutes: task.estimatedMinutes || plan.learningGoal?.dailyStudyMinutes || 30,
    planStartedAt: plan.taskCadence?.planStartedAt || plan.staticCurveConfirmedAt,
  });
  const missedPlan = taskCadence.makeUpTask
    ? database.getDailyPracticePlan({
        studentId: request.studentId,
        subjectId: request.subjectId,
        practiceDate: taskCadence.makeUpTask.date,
      })
    : null;
  const recoveryFamilyId =
    missedPlan?.learningPath?.focusFamilyId ||
    missedPlan?.questionQueue?.items?.[0]?.familyId ||
    learningPath.focusFamilyId ||
    family?.id ||
    null;
  const recovery = taskCadence.makeUpTask
    ? {
        sourceDate: taskCadence.makeUpTask.date,
        familyId: recoveryFamilyId,
        message: taskCadence.makeUpTask.studentMessage,
      }
    : null;
  const taskWithRecovery = recovery ? { ...task, recovery } : task;
  const behaviorAnalysis = analyzeLearningBehavior(currentBehaviorEvidence.events);
  const allocation = createDailyAllocation({
    generatedTodayTask: taskWithRecovery,
    previousAllocation: plan.nextPracticeAllocation || plan.dailyAllocation || null,
    behaviorSummary: {
      ...behaviorAnalysis.allocationInputs,
      answerCount: behaviorAnalysis.answerCount,
      evidenceConfidence: behaviorAnalysis.confidence,
    },
    supportProfile,
  });
  const generatedQuestionQueue = createDailyQuestionQueue({
    allocation,
    behaviorEvents,
    featureEvidenceEvents: currentBehaviorEvidence.events,
    date: request.practiceDate,
    dailyMinutes: plan.learningGoal?.dailyStudyMinutes || taskWithRecovery.estimatedMinutes || 30,
    plannedFamilyId: family?.id || null,
    families: shanghaiMathItemFamilies,
    supportProfile,
    targetGrade: instructionalGrade,
    recovery,
  });
  const questionQueueWithWrongReplays = attachExactPriorOriginalReplays({
    database,
    studentId: request.studentId,
    subjectId: request.subjectId,
    questionQueue: generatedQuestionQueue,
  });
  const questionQueue = attachCorrectReviewSourceBindings({
    database,
    studentId: request.studentId,
    subjectId: request.subjectId,
    questionQueue: questionQueueWithWrongReplays,
  });
  const now = new Date().toISOString();
  return {
    plan: {
      id: `daily-practice-plan-${request.studentId}-${request.subjectId}-${request.practiceDate}`,
      studentId: request.studentId,
      subjectId: request.subjectId,
      practiceDate: request.practiceDate,
      instructionalGrade,
      task: taskWithRecovery,
      allocation,
      questionQueue,
      learningPath,
      taskCadence,
      behaviorAnalysis: {
        confidence: behaviorAnalysis.confidence,
        answerCount: behaviorAnalysis.answerCount,
        observations: behaviorAnalysis.observations,
        evidenceWindow: currentBehaviorEvidence.metadata,
      },
      supportProfile,
      createdAt: now,
      updatedAt: now,
      guardrail:
        "The server owns daily matching. It uses validated behavior evidence and the confirmed static or dynamic learning path, while only a formal completed test may change the dynamic curve.",
    },
    refinedSupportProfile: supportProfile,
  };
}

function createServerDailyPracticeRun({ database, request }) {
  const dailyPlan = database.getDailyPracticePlan(request);
  if (!dailyPlan) return { error: "daily_practice_run_requires_daily_plan" };
  const plan = database.getPlan({ studentId: request.studentId, subjectId: request.subjectId });
  const assessmentCadence = resolveServerAssessmentCadence({
    database,
    studentId: request.studentId,
    subjectId: request.subjectId,
    plan,
    today: request.practiceDate,
  });
  if (assessmentCadence.status === "mandatory") {
    return { error: "mandatory_stage_assessment_required", assessmentCadence };
  }
  const run = createDailyPracticeRun({
    dailyPlan,
    studentId: request.studentId,
    subjectId: request.subjectId,
    practiceDate: request.practiceDate,
  });
  return run ? { run } : { error: "daily_practice_run_creation_failed" };
}

function recordServerCompletedPracticeSession({ database, run }) {
  if (!run?.requiredPracticeCompleted) return null;
  const existing = database.getDailyPracticeSession({
    studentId: run.studentId,
    subjectId: run.subjectId,
    practiceDate: run.practiceDate,
  });
  const dailyPlan = database.getDailyPracticePlan({
    studentId: run.studentId,
    subjectId: run.subjectId,
    practiceDate: run.practiceDate,
  });
  const completedAt = run.updatedAt || new Date().toISOString();
  return database.saveDailyPracticeSession({
    ...(existing || {}),
    id: existing?.id || `daily-practice-session-${run.studentId}-${run.subjectId}-${run.practiceDate}`,
    studentId: run.studentId,
    subjectId: run.subjectId,
    practiceDate: run.practiceDate,
    sessionStatus: "required_completed",
    requiredPracticeCompleted: true,
    optionalPracticeActive: Boolean(existing?.optionalPracticeActive),
    serverPracticeRunId: run.id,
    serverPracticeRunStatus: run.status,
    recoveredTaskDate: existing?.recoveredTaskDate || dailyPlan?.task?.recovery?.sourceDate || null,
    completedAt: existing?.completedAt || completedAt,
    completionSource: "server_owned_daily_practice_run",
    updatedAt: completedAt,
  });
}

function createRunDeliveryRequest(run) {
  const step = getDailyPracticeRunStep(run);
  if (!step) return null;
  const requiresIndependentRetry =
    run.independentRetry?.queueItemId === step.queueItem.id &&
    Number(run.independentRetry?.unitIndex) === step.unitIndex &&
    Number(run.independentRetry?.stageIndex) === step.stageIndex &&
    run.independentRetry?.variantLevel === step.variantLevel;
  return {
    studentId: run.studentId,
    subjectId: run.subjectId,
    mode: "practice",
    familyId: step.queueItem.familyId,
    instructionalGrade: step.queueItem.instructionalGrade,
    variantLevel: step.variantLevel,
    aiVersion: "semi_ai",
    seed: step.queueItem.seed,
    queueItemId: step.queueItem.id,
    sessionId: run.id,
    source: "server_daily_practice_run",
    practiceRunId: run.id,
    progressionUnitIndex: step.unitIndex,
    progressionStageIndex: step.stageIndex,
    independentRetry: requiresIndependentRetry,
    retrySourceDeliveryId: step.stageIndex === 0 ? step.queueItem.retrySourceDeliveryId || null : null,
    correctReviewSourceDeliveryId: step.queueItem.correctReviewSourceDeliveryId || null,
    stageLabel: step.variantLevel,
  };
}

function normalizeOptionalPracticeRequest(value) {
  if (!value || typeof value !== "object") return null;
  const mode = String(value.mode || "").trim();
  const source = String(value.source || "practice_summary").trim().slice(0, 80) || "practice_summary";
  if (mode === "wrong_retry") return { mode, count: null, source };
  const count = Math.max(1, Math.min(8, Math.floor(Number(value.count) || 0)));
  if (!["same_type", "harder"].includes(mode) || ![1, 2, 3, 4, 5, 6, 7, 8].includes(count)) return null;
  return { mode, count, source };
}

function normalizeKnowledgeAtlasExplorationRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const familyId = String(value.familyId || "").trim();
  if (!studentId || !["math", "math-linear-equations"].includes(subjectId) || !familyId) return null;
  return { studentId, subjectId, familyId };
}

function normalizeKnowledgeAtlasReviewRequest(value) {
  if (!value || typeof value !== "object") return null;
  const studentId = String(value.studentId || "").trim();
  const subjectId = String(value.subjectId || "").trim();
  const questionId = String(value.questionId || "").trim();
  if (!studentId || !["math", "math-linear-equations"].includes(subjectId) || !questionId) return null;
  return { studentId, subjectId, questionId };
}

function timestampValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveKnowledgeAtlasWrongRetrySource({ database, request }) {
  const matchingAnswers = database
    .listBehaviorEvents({ studentId: request.studentId, subjectId: request.subjectId, limit: 2000 })
    .filter(
      (event) =>
        event?.eventType === "answer_submitted" &&
        event?.payload?.scoringSource === "server_authoritative" &&
        event?.targetId === request.questionId &&
        typeof event?.payload?.isCorrect === "boolean",
    )
    .sort((left, right) => timestampValue(left.timestamp) - timestampValue(right.timestamp));

  let latestUnresolvedWrong = null;
  matchingAnswers.forEach((event) => {
    if (event.payload.isCorrect) latestUnresolvedWrong = null;
    else latestUnresolvedWrong = event;
  });
  if (!latestUnresolvedWrong) return { error: "knowledge_atlas_wrong_retry_unavailable" };

  const sourceDeliveryId = String(latestUnresolvedWrong.payload?.deliveryId || "").trim();
  const sourceDelivery = sourceDeliveryId ? database.getQuestionDelivery({ deliveryId: sourceDeliveryId }) : null;
  const sourceRequest = sourceDelivery?.generationRequest || {};
  if (
    !sourceDelivery ||
    sourceDelivery.studentId !== request.studentId ||
    sourceDelivery.subjectId !== request.subjectId ||
    sourceDelivery.mode !== "practice" ||
    sourceDelivery.privateCandidate?.id !== request.questionId ||
    !sourceDelivery.attempts?.some((attempt) => attempt?.isCorrect === false) ||
    !sourceRequest.familyId ||
    !sourceRequest.instructionalGrade ||
    !sourceRequest.variantLevel ||
    !Number.isFinite(Number(sourceRequest.seed))
  ) {
    return { error: "knowledge_atlas_wrong_retry_unavailable" };
  }
  return { sourceDelivery };
}

function createKnowledgeAtlasWrongRetryRequest({ request, sourceDelivery }) {
  const source = sourceDelivery.generationRequest;
  return {
    studentId: request.studentId,
    subjectId: request.subjectId,
    mode: "practice",
    familyId: source.familyId,
    instructionalGrade: source.instructionalGrade,
    variantLevel: source.variantLevel,
    aiVersion: source.aiVersion || "semi_ai",
    seed: Number(source.seed),
    queueItemId: `atlas-wrong-retry-${sourceDelivery.id}`,
    sessionId: `atlas-wrong-retry-${request.studentId}-${Date.now()}-${randomBytes(6).toString("base64url")}`,
    source: "server_knowledge_atlas_wrong_retry",
    practiceMode: "atlas_wrong_retry",
    retrySourceDeliveryId: sourceDelivery.id,
    stageLabel: "错题重做",
  };
}

function resolveAtlasExplorationGrade({ family, currentInstructionalGrade = null }) {
  const gradeOrder = ["G1", "G2", "G3", "G4", "G5", "G6"];
  const allowedGrades = (family?.gradeBands || []).filter((grade) => gradeOrder.includes(grade));
  if (!allowedGrades.length) return null;
  const currentIndex = gradeOrder.indexOf(currentInstructionalGrade);
  if (currentIndex < 0) return allowedGrades[0];
  return allowedGrades.find((grade) => gradeOrder.indexOf(grade) >= currentIndex) || allowedGrades.at(-1);
}

function createKnowledgeAtlasExplorationRequest({ database, request }) {
  const family = shanghaiMathItemFamilies.find((item) => item.id === request.familyId);
  if (!family) return null;
  const plan = database.getPlan({ studentId: request.studentId, subjectId: request.subjectId });
  const currentInstructionalGrade = plan
    ? resolveServerInstructionalGrade({
        database,
        studentId: request.studentId,
        subjectId: request.subjectId,
        plan,
      })
    : null;
  const instructionalGrade = resolveAtlasExplorationGrade({ family, currentInstructionalGrade });
  if (!instructionalGrade) return null;
  const sessionId = `atlas-exploration-${request.studentId}-${Date.now()}-${randomBytes(6).toString("base64url")}`;
  return {
    studentId: request.studentId,
    subjectId: request.subjectId,
    mode: "practice",
    familyId: family.id,
    instructionalGrade,
    variantLevel: "original",
    aiVersion: "semi_ai",
    seed: randomBytes(4).readUInt32BE(0) % 1_000_000_001,
    queueItemId: `atlas-family-${family.id}`,
    sessionId,
    source: "server_knowledge_atlas_exploration",
    practiceMode: "atlas_related",
    stageLabel: "图鉴探索",
  };
}

function createOptionalPracticeItems({ database, run, mode, count }) {
  const latestCompletedItemId = run.completedStages?.at(-1)?.queueItemId || null;
  const baseItem = run.queueItems?.find((item) => item.id === latestCompletedItemId) || run.queueItems?.at(-1) || null;
  if (!baseItem) return [];
  const baseFamily = shanghaiMathItemFamilies.find((family) => family.id === baseItem.familyId) || null;
  const eligibleFamilies = shanghaiMathItemFamilies.filter((family) => family.gradeBands?.includes(baseItem.instructionalGrade));
  const trustedBehaviorEvents = filterTrustedLearningEvents(
    database.listBehaviorEvents({ studentId: run.studentId, subjectId: run.subjectId, limit: 2000 }),
  );
  const successor =
    mode === "harder" && baseFamily
      ? selectVerifiedGraphSuccessorFamilies({
          anchorFamilyId: baseFamily.id,
          behaviorEvents: trustedBehaviorEvents,
          families: eligibleFamilies,
          instructionalGrade: baseItem.instructionalGrade,
        })[0] || null
      : null;
  const familyId = successor?.id || baseItem.familyId;
  const challengeRoute = successor ? "knowledge_graph_successor" : "same_family_deeper_variant";
  const variants =
    mode === "harder"
      ? successor
        ? ["original"]
        : createSameFamilyHarderVariantSequence({ family: baseFamily, count })
      : ["original", "change_one_number", "change_two_numbers"];
  return Array.from({ length: count }, (_, index) => ({
    id: `optional-item-${run.id}-${(run.optionalPracticeSessions || []).length + 1}-${index + 1}`,
    familyId,
    instructionalGrade: baseItem.instructionalGrade,
    variantLevel: variants[index % variants.length],
    challengeRoute: mode === "harder" ? challengeRoute : null,
    advancesFromFamilyId: successor ? baseItem.familyId : null,
    seed: randomBytes(4).readUInt32BE(0) % 1_000_000_001,
  }));
}

function createWrongRetryPracticeItems({ database, run }) {
  const sourceDeliveries = listEligibleWrongRetrySourceDeliveries({ database, run, limit: 8 });

  return sourceDeliveries.map((delivery, index) => {
    const request = delivery.generationRequest;
    return {
      id: `optional-wrong-retry-${run.id}-${(run.optionalPracticeSessions || []).length + 1}-${index + 1}`,
      familyId: request.familyId,
      instructionalGrade: request.instructionalGrade,
      variantLevel: request.variantLevel,
      aiVersion: request.aiVersion || "semi_ai",
      seed: Number(request.seed),
      retrySourceDeliveryId: delivery.id,
    };
  });
}

function createOptionalRunDeliveryRequest(run) {
  const step = getActiveOptionalPracticeStep(run);
  if (!step) return null;
  const requiresIndependentRetry =
    step.session.independentRetry?.itemId === step.item.id &&
    Number(step.session.independentRetry?.index) === Number(step.session.currentIndex) &&
    step.session.independentRetry?.variantLevel === step.item.variantLevel;
  return {
    studentId: run.studentId,
    subjectId: run.subjectId,
    mode: "practice",
    familyId: step.item.familyId,
    instructionalGrade: step.item.instructionalGrade,
    variantLevel: step.item.variantLevel,
    aiVersion: step.item.aiVersion || "semi_ai",
    seed: step.item.seed,
    queueItemId: step.item.id,
    sessionId: step.session.id,
    source: "server_optional_practice_run",
    practiceMode: step.session.mode,
    practiceRunId: run.id,
    optionalPracticeSessionId: step.session.id,
    optionalPracticeIndex: step.session.currentIndex,
    independentRetry: requiresIndependentRetry,
    retrySourceDeliveryId: step.item.retrySourceDeliveryId || null,
    optionalChallengeRoute: step.session.challengeRoute || null,
    stageLabel:
      step.session.mode === "wrong_retry" ? "错题重做" : step.session.mode === "harder" ? "自愿挑战" : "同类型加练",
  };
}

const PUBLIC_PAGES = new Set([
  "index.html", "signin.html", "observer.html", "account.html",
  "student-management.html", "demo.html", "development-status.html",
]);
const PUBLIC_ASSET_EXTENSIONS = new Set([".js", ".css", ".png", ".svg", ".webp", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2"]);

function serveStatic({ request, response, projectRoot, pathname, publicDemo = false }) {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  if (pathname === "/src/runtime-config.js") {
    response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : `export const publicDemo = ${JSON.stringify(publicDemo)};\n`);
    return;
  }
  let requestedPath;
  try {
    requestedPath = pathname === "/" ? (publicDemo ? "demo.html" : "index.html") : decodeURIComponent(pathname.slice(1));
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  // Only browser pages and assets are public. Never serve the checkout itself.
  const components = requestedPath.split("/");
  const allowed = !requestedPath.includes("\\") && !requestedPath.includes("\0") &&
    !components.some((part) => part.startsWith(".") || !part) &&
    (PUBLIC_PAGES.has(requestedPath) ||
      (components[0] === "src" && PUBLIC_ASSET_EXTENSIONS.has(extname(requestedPath))));
  const assetPath = resolve(projectRoot, requestedPath);
  const relativePath = relative(projectRoot, assetPath);
  const withinRoot = relativePath && !isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`);
  let safeFile = false;
  if (allowed && withinRoot && existsSync(assetPath)) {
    try {
      const actualRelative = relative(realpathSync(projectRoot), realpathSync(assetPath));
      safeFile = actualRelative === relativePath && statSync(assetPath).isFile();
    } catch { /* Missing or inaccessible assets are 404 responses. */ }
  }
  if (!safeFile) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(assetPath)] || "application/octet-stream",
    // This server is the local development runtime. Serving fresh assets avoids a
    // stale module or stylesheet making a newly implemented flow look unchanged.
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(assetPath).pipe(response);
}

export function createLocalApiServer({ database, projectRoot, secureCookies = false, publicDemo = false }) {
  const failedAttempts = new Map();
  const createSessionCookie = (token, maxAgeSeconds = 0) => sessionCookie(token, maxAgeSeconds, secureCookies);

  function getRequestSession(request) {
    return database.getAuthSession({ token: parseCookies(request).ai_education_session });
  }

  function requireStudentAccess({ request, response, studentId, roles, write = false }) {
    const session = getRequestSession(request);
    const user = session?.user;
    if (!user) {
      sendJson(response, 401, { error: "authentication_required" });
      return null;
    }
    const isAllowedRole = roles.includes(user.role);
    const isLinkedStudent = user.role === "admin" || database.canUserAccessStudent({ userId: user.userId, studentId });
    if (!isAllowedRole || !isLinkedStudent) {
      sendJson(response, 403, { error: write ? "write_access_denied" : "read_access_denied" });
      return null;
    }
    return user;
  }

  function canAttemptLogin(loginName) {
    const key = String(loginName || "").trim().toLowerCase();
    const record = failedAttempts.get(key);
    if (!record) return true;
    if (Date.now() - record.firstAttemptAt > 15 * 60 * 1000) {
      failedAttempts.delete(key);
      return true;
    }
    return record.count < 5;
  }

  function recordFailedAttempt(loginName) {
    const key = String(loginName || "").trim().toLowerCase();
    const current = failedAttempts.get(key);
    failedAttempts.set(key, {
      count: (current?.count || 0) + 1,
      firstAttemptAt: current?.firstAttemptAt || Date.now(),
    });
  }

  return async function requestHandler(request, response) {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const segments = url.pathname.split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (segments[0] !== "api") {
      serveStatic({ request, response, projectRoot, pathname: url.pathname, publicDemo });
      return;
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, { ok: true, service: "ai-education-local-api" });
        return;
      }

      if (segments[1] === "auth") {
        if (request.method === "POST" && url.pathname === "/api/auth/register") {
          const { loginName, displayName, password, role, gradeLabel } = await readJsonBody(request);
          const result =
            role === "student"
              ? database.createSelfRegisteredStudentAccount({ loginName, displayName, password, gradeLabel })
              : database.createObserverAccount({ loginName, displayName, password, role });
          if (result.error) {
            const status =
              result.error === "login_name_taken"
                ? 409
                : ["account_creation_failed", "student_account_creation_failed"].includes(result.error)
                  ? 500
                  : 400;
            sendJson(response, status, { error: result.error });
            return;
          }
          const session = database.createAuthSession({ userId: result.user.userId });
          sendJson(response, 201, { user: session.user, student: result.student || null, expiresAt: session.expiresAt }, {
            "Set-Cookie": createSessionCookie(session.token, 60 * 60 * 24 * 14),
          });
          return;
        }
        if (request.method === "POST" && url.pathname === "/api/auth/sign-in") {
          const { loginName, password } = await readJsonBody(request);
          if (!canAttemptLogin(loginName)) {
            sendJson(response, 429, { error: "too_many_login_attempts" });
            return;
          }
          const user = database.authenticateAccount({ loginName, password });
          if (!user) {
            recordFailedAttempt(loginName);
            sendJson(response, 401, { error: "invalid_login" });
            return;
          }
          failedAttempts.delete(String(loginName || "").trim().toLowerCase());
          const session = database.createAuthSession({ userId: user.userId });
          sendJson(response, 200, { user: session.user, expiresAt: session.expiresAt }, {
            "Set-Cookie": createSessionCookie(session.token, 60 * 60 * 24 * 14),
          });
          return;
        }
        if (request.method === "GET" && url.pathname === "/api/auth/session") {
          const session = database.getAuthSession({ token: parseCookies(request).ai_education_session });
          sendJson(response, 200, { session: session ? { user: session.user, expiresAt: session.expiresAt } : null });
          return;
        }
        if (request.method === "PUT" && url.pathname === "/api/auth/profile") {
          const token = parseCookies(request).ai_education_session;
          const session = database.getAuthSession({ token });
          if (!session?.user) {
            sendJson(response, 401, { error: "authentication_required" });
            return;
          }
          const { displayName } = await readJsonBody(request);
          const result = database.updateAccountProfile({ userId: session.user.userId, displayName });
          if (result.error) {
            sendJson(response, 400, { error: result.error });
            return;
          }
          sendJson(response, 200, { user: result.user });
          return;
        }
        if (request.method === "POST" && url.pathname === "/api/auth/change-password") {
          const token = parseCookies(request).ai_education_session;
          const session = database.getAuthSession({ token });
          if (!session?.user) {
            sendJson(response, 401, { error: "authentication_required" });
            return;
          }
          const { currentPassword, newPassword } = await readJsonBody(request);
          const result = database.changeAccountPassword({
            userId: session.user.userId,
            currentPassword,
            newPassword,
            currentToken: token,
          });
          if (result.error) {
            sendJson(response, 400, { error: result.error });
            return;
          }
          sendJson(response, 200, { user: result.user, otherSessionsCleared: true });
          return;
        }
        if (request.method === "POST" && url.pathname === "/api/auth/sign-out") {
          database.deleteAuthSession({ token: parseCookies(request).ai_education_session });
          sendJson(response, 200, { ok: true }, { "Set-Cookie": createSessionCookie(null, 0) });
          return;
        }
      }

      if (request.method === "GET" && url.pathname === "/api/linked-students") {
        const session = getRequestSession(request);
        if (!session?.user) {
          sendJson(response, 401, { error: "authentication_required" });
          return;
        }
        sendJson(response, 200, { students: database.listAccessibleStudents({ userId: session.user.userId }) });
        return;
      }

      if (segments[1] === "linked-students" && request.method === "DELETE" && segments.length === 3) {
        const session = getRequestSession(request);
        if (!session?.user) {
          sendJson(response, 401, { error: "authentication_required" });
          return;
        }
        const result = database.revokeOwnStudentRelationship({
          actorUserId: session.user.userId,
          actorRole: session.user.role,
          studentId: segments[2],
        });
        if (result.error) {
          const status =
            result.error === "account_role_not_allowed" ? 403 : result.error === "student_relationship_revoke_failed" ? 500 : result.error === "student_relationship_not_active" ? 404 : 400;
          sendJson(response, status, { error: result.error });
          return;
        }
        sendJson(response, 200, { relationship: result });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/managed-students") {
        const session = getRequestSession(request);
        if (!session?.user) {
          sendJson(response, 401, { error: "authentication_required" });
          return;
        }
        if (!["parent", "teacher", "admin"].includes(session.user.role)) {
          sendJson(response, 403, { error: "student_management_access_denied" });
          return;
        }
        const { student } = await readJsonBody(request);
        const result = database.createManagedStudentAccount({
          actorUserId: session.user.userId,
          actorRole: session.user.role,
          loginName: student?.loginName,
          displayName: student?.displayName,
          password: student?.password,
          gradeLabel: student?.gradeLabel,
        });
        if (result.error) {
          const status = result.error === "login_name_taken" ? 409 : result.error === "student_account_creation_failed" ? 500 : 400;
          sendJson(response, status, { error: result.error });
          return;
        }
        sendJson(response, 201, { user: result.user, student: result.student });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/student-relationship-invites") {
        const session = getRequestSession(request);
        if (!session?.user) {
          sendJson(response, 401, { error: "authentication_required" });
          return;
        }
        const { studentId, targetRole } = await readJsonBody(request);
        const result = database.createStudentRelationshipInvite({
          actorUserId: session.user.userId,
          actorRole: session.user.role,
          studentId,
          targetRole,
        });
        if (result.error) {
          const status =
            result.error === "student_access_denied" || result.error === "account_role_not_allowed" ? 403 : result.error === "relationship_invite_creation_failed" ? 500 : 400;
          sendJson(response, status, { error: result.error });
          return;
        }
        sendJson(response, 201, { invite: result.invite });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/student-relationship-invites/accept") {
        const session = getRequestSession(request);
        if (!session?.user) {
          sendJson(response, 401, { error: "authentication_required" });
          return;
        }
        const { code } = await readJsonBody(request);
        const result = database.acceptStudentRelationshipInvite({
          userId: session.user.userId,
          userRole: session.user.role,
          code,
        });
        if (result.error) {
          const status =
            result.error === "relationship_invite_role_mismatch" || result.error === "account_role_not_allowed" ? 403 : result.error === "student_relationship_already_active" ? 409 : result.error === "relationship_invite_acceptance_failed" ? 500 : 400;
          sendJson(response, status, { error: result.error });
          return;
        }
        sendJson(response, 200, { student: result.student });
        return;
      }

      if (segments[1] === "student-profiles" && request.method === "GET" && segments.length === 3) {
        const studentId = segments[2];
        if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
        sendJson(response, 200, { profile: database.getStudentProfile({ studentId }) });
        return;
      }

      if (segments[1] === "student-onboarding-prefills" && segments.length >= 3) {
        const studentId = segments[2];
        if (request.method === "GET" && segments.length === 3) {
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { record: database.getStudentOnboardingPrefill({ studentId }) });
          return;
        }
        if (request.method === "PUT" && segments.length === 3) {
          const user = requireStudentAccess({
            request,
            response,
            studentId,
            roles: ["student", "parent", "teacher", "admin"],
            write: true,
          });
          if (!user) return;
          const { prefill } = await readJsonBody(request);
          const record = normalizeOnboardingPrefill({
            studentId,
            prefill,
            user,
            existing: database.getStudentOnboardingPrefill({ studentId }),
          });
          if (!record) {
            sendJson(response, 400, { error: "invalid_student_onboarding_prefill" });
            return;
          }
          sendJson(response, 200, { record: database.saveStudentOnboardingPrefill(record) });
          return;
        }
        if (request.method === "POST" && segments.length === 4 && segments[3] === "confirm") {
          const user = requireStudentAccess({
            request,
            response,
            studentId,
            roles: ["student", "admin"],
            write: true,
          });
          if (!user) return;
          const existing = database.getStudentOnboardingPrefill({ studentId });
          if (!existing) {
            sendJson(response, 404, { error: "student_onboarding_prefill_not_found" });
            return;
          }
          const record = database.saveStudentOnboardingPrefill({
            ...existing,
            confirmationStatus: "student_confirmed",
            confirmedAt: new Date().toISOString(),
            confirmedByUserId: user.userId,
            updatedAt: new Date().toISOString(),
          });
          sendJson(response, 200, { record });
          return;
        }
      }

      if (segments[1] === "student-learning-goal-drafts" && segments.length >= 4) {
        const [, , studentId, subjectId] = segments;
        if (request.method === "GET" && segments.length === 4) {
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { record: database.getStudentLearningGoalDraft({ studentId, subjectId }) });
          return;
        }
        if (request.method === "PUT" && segments.length === 4) {
          const user = requireStudentAccess({
            request,
            response,
            studentId,
            roles: ["parent", "teacher", "admin"],
            write: true,
          });
          if (!user) return;
          const confirmedPlan = database.getPlan({ studentId, subjectId });
          if (confirmedPlan?.staticCurveConfirmedAt) {
            sendJson(response, 409, { error: "initial_goal_already_confirmed" });
            return;
          }
          const { draft } = await readJsonBody(request);
          const record = normalizeLearningGoalDraft({
            studentId,
            subjectId,
            draft,
            user,
            existing: database.getStudentLearningGoalDraft({ studentId, subjectId }),
          });
          if (!record) {
            sendJson(response, 400, { error: "invalid_student_learning_goal_draft" });
            return;
          }
          sendJson(response, 200, { record: database.saveStudentLearningGoalDraft(record) });
          return;
        }
        if (request.method === "POST" && segments.length === 5 && segments[4] === "confirm") {
          const user = requireStudentAccess({
            request,
            response,
            studentId,
            roles: ["student", "admin"],
            write: true,
          });
          if (!user) return;
          const { draft } = await readJsonBody(request);
          const record = normalizeLearningGoalDraft({
            studentId,
            subjectId,
            draft,
            user,
            existing: database.getStudentLearningGoalDraft({ studentId, subjectId }),
            confirmedByStudent: true,
          });
          if (!record) {
            sendJson(response, 400, { error: "invalid_student_learning_goal_draft" });
            return;
          }
          sendJson(response, 200, { record: database.saveStudentLearningGoalDraft(record) });
          return;
        }
      }

      if (segments[1] === "onboarding-status" && request.method === "GET" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
        sendJson(response, 200, {
          status: buildServerOnboardingStatus({ database, studentId, subjectId }),
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/initial-learning-plans") {
        const { request: planRequest } = await readJsonBody(request);
        const normalizedRequest = normalizeInitialLearningPlanRequest(planRequest);
        if (!normalizedRequest) {
          sendJson(response, 400, { error: "invalid_initial_learning_plan_request" });
          return;
        }
        const user = requireStudentAccess({
          request,
          response,
          studentId: normalizedRequest.studentId,
          roles: ["student", "admin"],
          write: true,
        });
        if (!user) return;

        const existingPlan = database.getPlan({
          studentId: normalizedRequest.studentId,
          subjectId: normalizedRequest.subjectId,
        });
        if (existingPlan?.serverAuthoritative && existingPlan.staticCurveConfirmedAt) {
          sendJson(response, 200, {
            record: toPublicPlanForRole(existingPlan, user.role),
            goalDraft: database.getStudentLearningGoalDraft({
              studentId: normalizedRequest.studentId,
              subjectId: normalizedRequest.subjectId,
            }),
            idempotent: true,
          });
          return;
        }

        const goalDraft = normalizeLearningGoalDraft({
          studentId: normalizedRequest.studentId,
          subjectId: normalizedRequest.subjectId,
          draft: { learningGoal: normalizedRequest.learningGoal },
          user,
          existing: database.getStudentLearningGoalDraft({
            studentId: normalizedRequest.studentId,
            subjectId: normalizedRequest.subjectId,
          }),
          confirmedByStudent: true,
        });
        if (!goalDraft) {
          sendJson(response, 400, { error: "invalid_initial_learning_goal" });
          return;
        }

        const initialAssessment = database.getLatestAssessmentSession({
          studentId: normalizedRequest.studentId,
          subjectId: normalizedRequest.subjectId,
          assessmentType: "initial_onboarding",
        });
        if (!initialAssessment?.serverAuthoritative || initialAssessment.status !== "completed") {
          sendJson(response, 409, { error: "initial_learning_plan_requires_completed_initial_assessment" });
          return;
        }
        const personalityAssessment = database.getLatestAssessmentSession({
          studentId: normalizedRequest.studentId,
          subjectId: normalizedRequest.subjectId,
          assessmentType: PERSONALITY_ASSESSMENT_TYPE,
        });
        if (!personalityAssessment?.serverAuthoritative || personalityAssessment.status !== "completed") {
          sendJson(response, 409, { error: "initial_learning_plan_requires_completed_personality_assessment" });
          return;
        }
        const created = createInitialLearningPlanRecord({
          database,
          existingPlan,
          initialAssessment,
          learningGoal: goalDraft.learningGoal,
          practiceDate: normalizedRequest.practiceDate,
          studentId: normalizedRequest.studentId,
          subjectId: normalizedRequest.subjectId,
          user,
        });
        if (!created.plan) {
          sendJson(response, 409, {
            error: created.error || "initial_learning_plan_creation_failed",
            ...(created.staticCurve ? { staticCurve: created.staticCurve } : {}),
          });
          return;
        }

        const storedGoalDraft = database.saveStudentLearningGoalDraft(goalDraft);
        const record = database.savePlan(created.plan);
        sendJson(response, created.idempotent ? 200 : 201, {
          record: toPublicPlanForRole(record, user.role),
          goalDraft: storedGoalDraft,
          idempotent: created.idempotent,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/curve-adjustments") {
        const { studentId, subjectId, parameters } = await readJsonBody(request);
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["student", "parent", "teacher", "admin"],
          write: true,
        });
        if (!user) return;
        if (!studentId || !subjectId) {
          sendJson(response, 400, { error: "invalid_curve_adjustment" });
          return;
        }
        const plan = database.getPlan({ studentId, subjectId });
        if (!plan?.learningGoal || !plan?.dynamicCurve?.canUpdate) {
          sendJson(response, 409, { error: "curve_adjustment_requires_verified_dynamic_curve" });
          return;
        }
        const normalizedParameters = normalizeCurveAdjustmentParameters(parameters);
        if (!normalizedParameters) {
          sendJson(response, 400, { error: "invalid_curve_adjustment" });
          return;
        }
        if (!isAllowedCurveAdjustmentForRole({ parameters: normalizedParameters, plan, role: user.role })) {
          sendJson(response, 403, { error: "curve_adjustment_not_allowed_for_role" });
          return;
        }
        const adjustedCurve = createAdjustedDynamicCurve({
          baseCurve: plan.dynamicCurve,
          learningGoal: plan.learningGoal,
          parameters: normalizedParameters,
          actorRole: user.role,
          actorUserId: user.userId,
        });
        const confirmation = {
          confirmationId: `curve-adjustment-confirmation-${Date.now()}`,
          action: "dynamic_curve_adjustment_confirmed",
          actorRole: user.role,
          actorUserId: user.userId,
          confirmedAt: new Date().toISOString(),
          parameters: normalizedParameters,
          baseCurveId: plan.dynamicCurve.id,
          adjustedCurveId: adjustedCurve.id,
          appliesFrom: "next_learning_day",
        };
        const assessmentCadence =
          user.role === "student"
            ? plan.assessmentCadence
            : synchronizeAssessmentCadenceFromCurveAdjustment({
                cadence: plan.assessmentCadence,
                suggestedAfterPracticeDays: normalizedParameters.testIntervalPracticeDays,
                user,
                updatedAt: confirmation.confirmedAt,
              });
        const record = database.savePlan({
          ...plan,
          updatedAt: confirmation.confirmedAt,
          dynamicCurve: adjustedCurve,
          assessmentCadence,
          nextDynamicTask: null,
          curveAdjustmentHistory: [...(plan.curveAdjustmentHistory || []), confirmation],
        });
        sendJson(response, 200, { record: toPublicPlanForRole(record, user.role), confirmation });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/assessment-cadence") {
        const { studentId, subjectId, suggestedAfterPracticeDays, mandatoryAfterPracticeDays } = await readJsonBody(request);
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["parent", "teacher", "admin"],
          write: true,
        });
        if (!user) return;
        const cadenceSettings = normalizeAssessmentCadenceSettings({
          suggestedAfterPracticeDays,
          mandatoryAfterPracticeDays,
        });
        if (!studentId || !subjectId || !cadenceSettings) {
          sendJson(response, 400, { error: "invalid_assessment_cadence" });
          return;
        }
        const plan = database.getPlan({ studentId, subjectId });
        if (!plan) {
          sendJson(response, 404, { error: "student_plan_not_found" });
          return;
        }
        const updatedAt = new Date().toISOString();
        const assessmentCadence = {
          ...(plan.assessmentCadence || {}),
          ...cadenceSettings,
          policyVersion: "guardian_configurable_assessment_cadence_v1",
          configuredByRole: user.role,
          configuredByUserId: user.userId,
          configuredAt: updatedAt,
        };
        const record = database.savePlan({
          ...plan,
          updatedAt,
          assessmentCadence,
        });
        sendJson(response, 200, { record });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/stage-assessment-skips") {
        const { studentId, subjectId, practiceDate } = await readJsonBody(request);
        const normalizedPracticeDate = normalizePracticeDate(practiceDate);
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["student", "admin"],
          write: true,
        });
        if (!user) return;
        if (!studentId || !subjectId || !normalizedPracticeDate) {
          sendJson(response, 400, { error: "invalid_stage_assessment_skip" });
          return;
        }
        const plan = database.getPlan({ studentId, subjectId });
        if (!plan) {
          sendJson(response, 404, { error: "student_plan_not_found" });
          return;
        }
        const cadence = resolveServerAssessmentCadence({
          database,
          studentId,
          subjectId,
          plan,
          today: normalizedPracticeDate,
        });
        if (!cadence.canSkip) {
          sendJson(response, 409, {
            error: "stage_assessment_skip_not_available",
            assessmentCadence: cadence,
          });
          return;
        }
        const skippedAt = new Date().toISOString();
        const assessmentCadence = {
          ...(plan.assessmentCadence || {}),
          lastSkippedAt: skippedAt,
          lastSkippedAtPracticeCount: cadence.practiceDaysSinceVerifiedTest,
          lastSkippedByUserId: user.userId,
          ...(cadence.observerRequestActive
            ? {
                observerRequestAcknowledgedAt: skippedAt,
                observerRequestAcknowledgedByRole: user.role,
                observerRequestStatus: "skipped",
              }
            : {}),
        };
        const record = database.savePlan({
          ...plan,
          updatedAt: skippedAt,
          assessmentCadence,
        });
        const updatedCadence = resolveServerAssessmentCadence({
          database,
          studentId,
          subjectId,
          plan: record,
          today: normalizedPracticeDate,
        });
        sendJson(response, 200, {
          record: toPublicPlanForRole(record, user.role),
          assessmentCadence: updatedCadence,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/stage-assessment-requests") {
        const { studentId, subjectId } = await readJsonBody(request);
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["parent", "teacher", "admin"],
          write: true,
        });
        if (!user) return;
        if (!studentId || !subjectId) {
          sendJson(response, 400, { error: "invalid_stage_assessment_request" });
          return;
        }
        const plan = database.getPlan({ studentId, subjectId });
        if (!plan) {
          sendJson(response, 404, { error: "student_plan_not_found" });
          return;
        }
        const requestedAt = new Date().toISOString();
        const assessmentCadence = {
          ...(plan.assessmentCadence || {}),
          observerRequestedAt: requestedAt,
          observerRequestedByRole: user.role,
          observerRequestedByUserId: user.userId,
          observerRequestAcknowledgedAt: null,
          observerRequestAcknowledgedByRole: null,
          observerRequestStatus: "requested",
        };
        const record = database.savePlan({
          ...plan,
          updatedAt: requestedAt,
          assessmentCadence,
        });
        sendJson(response, 200, { record });
        return;
      }

      if (segments[1] === "student-plans" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        if (request.method === "GET") {
          const user = requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] });
          if (!user) return;
          sendJson(response, 200, { record: toPublicPlanForRole(database.getPlan({ studentId, subjectId }), user.role) });
          return;
        }
        if (request.method === "PUT") {
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "admin"], write: true })) return;
          const { record } = await readJsonBody(request);
          if (!isValidRecord(record, ["studentId", "subjectId"]) || record.studentId !== studentId || record.subjectId !== subjectId) {
            sendJson(response, 400, { error: "invalid_student_plan" });
            return;
          }
          const existing = database.getPlan({ studentId, subjectId });
          if (existing?.serverAuthoritative || record.serverAuthoritative) {
            sendJson(response, 409, { error: "server_authoritative_plan_managed_by_dedicated_api" });
            return;
          }
          sendJson(response, 200, { record: database.savePlan(record) });
          return;
        }
      }

      if (segments[1] === "behavior-events") {
        if (request.method === "GET" && segments.length === 3) {
          if (!requireStudentAccess({ request, response, studentId: segments[2], roles: ["student", "parent", "teacher", "admin"] })) return;
          const subjectId = String(url.searchParams.get("subjectId") || "").trim() || null;
          sendJson(response, 200, {
            events: database
              .listBehaviorEvents({
                studentId: segments[2],
                subjectId,
                limit: url.searchParams.get("limit"),
              })
              .map(toPublicBehaviorEvent),
          });
          return;
        }
        if (request.method === "POST" && segments.length === 2) {
          const { event } = await readJsonBody(request);
          if (event?.eventType === "answer_submitted") {
            sendJson(response, 403, { error: "server_scored_answer_event_required" });
            return;
          }
          const normalizedEvent = normalizeClientBehaviorEvent(event);
          if (!normalizedEvent) {
            sendJson(response, 400, { error: "invalid_behavior_event" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedEvent.studentId, roles: ["student", "admin"], write: true })) return;
          const savedEvent = database.saveBehaviorEvent(
            retainLinkedSolutionStrategyEvent({ database, event: normalizedEvent }),
          );
          if (savedEvent.eventType === "solution_strategy_opened" && savedEvent.subjectId) {
            refreshServerSupportProfile({
              database,
              studentId: savedEvent.studentId,
              subjectId: savedEvent.subjectId,
            });
          }
          sendJson(response, 201, { event: toPublicBehaviorEvent(savedEvent) });
          return;
        }
      }

      if (segments[1] === "learning-reports" && request.method === "GET" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["student", "parent", "teacher", "admin"],
        });
        if (!user) return;
        sendJson(response, 200, {
          report: buildServerLearningReport({
            audience: user.role,
            database,
            studentId,
            subjectId,
          }),
        });
        return;
      }

      if (segments[1] === "question-type-benchmarks" && request.method === "GET" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        const familyId = String(url.searchParams.get("familyId") || "").trim();
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["student", "parent", "teacher", "admin"],
        });
        if (!user) return;
        if (!familyId) {
          sendJson(response, 400, { error: "missing_question_family" });
          return;
        }
        sendJson(response, 200, {
          benchmark: buildQuestionTypeBenchmark({ database, studentId, subjectId, familyId }),
        });
        return;
      }

      if (segments[1] === "knowledge-atlases" && request.method === "GET" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["student", "parent", "teacher", "admin"],
        });
        if (!user) return;
        sendJson(response, 200, {
          atlas: buildServerKnowledgeAtlas({
            audience: user.role,
            database,
            studentId,
            subjectId,
          }),
        });
        return;
      }

      if (segments[1] === "knowledge-graphs" && request.method === "GET" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        const user = requireStudentAccess({
          request,
          response,
          studentId,
          roles: ["student", "parent", "teacher", "admin"],
        });
        if (!user) return;
        sendJson(response, 200, {
          graph: buildServerKnowledgeGraph({
            audience: user.role,
            database,
            studentId,
            subjectId,
          }),
        });
        return;
      }

      if (segments[1] === "assessment-sessions") {
        if (request.method === "GET" && segments.length === 4) {
          const [, , studentId, subjectId] = segments;
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          const assessmentType = url.searchParams.get("assessmentType") || "initial_onboarding";
          const session = database.getLatestAssessmentSession({ studentId, subjectId, assessmentType });
          sendJson(response, 200, {
            session: toPublicAssessmentSession(session),
          });
          return;
        }
        if (request.method === "POST" && segments.length === 2) {
          const { session } = await readJsonBody(request);
          if (!requireStudentAccess({ request, response, studentId: session?.studentId, roles: ["student", "admin"], write: true })) return;
          if (!isValidRecord(session, ["id", "studentId", "subjectId", "assessmentType"])) {
            sendJson(response, 400, { error: "invalid_assessment_session" });
            return;
          }
          sendJson(response, 409, { error: "assessment_session_server_managed" });
          return;
        }
      }

      if (segments[1] === "initial-assessment-runs") {
        if (request.method === "POST" && segments.length === 2) {
          const { request: runRequest } = await readJsonBody(request);
          const normalizedRequest = normalizeInitialAssessmentRunRequest(runRequest);
          if (!normalizedRequest) {
            sendJson(response, 400, { error: "invalid_initial_assessment_run_request" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedRequest.studentId, roles: ["student", "admin"], write: true })) return;
          const existing = database.getLatestAssessmentSession({
            studentId: normalizedRequest.studentId,
            subjectId: normalizedRequest.subjectId,
            assessmentType: "initial_onboarding",
          });
          if (
            existing?.serverAuthoritative &&
            existing.targetGrade === normalizedRequest.targetGrade
          ) {
            sendJson(response, 200, { session: toPublicInitialAssessmentRun(existing), idempotent: true });
            return;
          }
          const prefill = database.getStudentOnboardingPrefill({ studentId: normalizedRequest.studentId });
          if (prefill?.confirmationStatus !== "student_confirmed" || !hasConfirmedMathSubjectSelection(prefill)) {
            sendJson(response, 409, { error: "initial_assessment_requires_confirmed_math_subject_selection" });
            return;
          }
          const personalityAssessment = database.getLatestAssessmentSession({
            studentId: normalizedRequest.studentId,
            subjectId: "math-linear-equations",
            assessmentType: PERSONALITY_ASSESSMENT_TYPE,
          });
          if (!isCompletedServerAssessment(personalityAssessment)) {
            sendJson(response, 409, { error: "initial_assessment_requires_completed_personality_assessment" });
            return;
          }
          const created = createServerInitialAssessmentRun({ request: normalizedRequest });
          if (!created.session) {
            sendJson(response, 400, { error: created.error || "initial_assessment_run_creation_failed" });
            return;
          }
          const session = database.saveAssessmentSession(created.session);
          sendJson(response, 201, { session: toPublicInitialAssessmentRun(session), idempotent: false });
          return;
        }

        if (request.method === "GET" && segments.length === 3) {
          const session = database.getAssessmentSessionById({ sessionId: segments[2] });
          if (!session?.serverAuthoritative || session.assessmentType !== "initial_onboarding") {
            sendJson(response, 404, { error: "initial_assessment_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: session.studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { session: toPublicInitialAssessmentRun(session) });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "responses") {
          const session = database.getAssessmentSessionById({ sessionId: segments[2] });
          if (!session?.serverAuthoritative || session.assessmentType !== "initial_onboarding") {
            sendJson(response, 404, { error: "initial_assessment_run_not_found" });
            return;
          }
          const { answer, isUncertain, questionId, responseTimeMs, studentId } = await readJsonBody(request);
          if (studentId !== session.studentId) {
            sendJson(response, 400, { error: "initial_assessment_student_mismatch" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: session.studentId, roles: ["student", "admin"], write: true })) return;
          if (session.status !== "in_progress") {
            sendJson(response, 409, { error: "initial_assessment_run_not_active" });
            return;
          }
          const updated = recordServerInitialAssessmentResponse({
            session,
            answer,
            isUncertain,
            questionId,
            responseTimeMs,
          });
          if (updated.error) {
            sendJson(response, 409, { error: updated.error });
            return;
          }
          const storedSession = database.saveAssessmentSession(updated.session);
          sendJson(response, 200, { session: toPublicInitialAssessmentRun(storedSession) });
          return;
        }
      }

      if (segments[1] === "personality-assessment-runs") {
        if (request.method === "GET" && segments.length === 4) {
          const [, , studentId, subjectId] = segments;
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          const session = database.getLatestAssessmentSession({
            studentId,
            subjectId,
            assessmentType: PERSONALITY_ASSESSMENT_TYPE,
          });
          sendJson(response, 200, {
            session: session?.serverAuthoritative ? toPublicPersonalityAssessmentRun(session) : null,
          });
          return;
        }

        if (request.method === "POST" && segments.length === 2) {
          const { request: runRequest } = await readJsonBody(request);
          const normalizedRequest = normalizePersonalityAssessmentRunRequest(runRequest);
          if (!normalizedRequest) {
            sendJson(response, 400, { error: "invalid_personality_assessment_run_request" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedRequest.studentId, roles: ["student", "admin"], write: true })) return;
          const prefill = database.getStudentOnboardingPrefill({ studentId: normalizedRequest.studentId });
          if (prefill?.confirmationStatus !== "student_confirmed") {
            sendJson(response, 409, { error: "personality_assessment_requires_confirmed_basic_info" });
            return;
          }
          const existing = database.getLatestAssessmentSession({
            studentId: normalizedRequest.studentId,
            subjectId: normalizedRequest.subjectId,
            assessmentType: PERSONALITY_ASSESSMENT_TYPE,
          });
          if (existing?.serverAuthoritative) {
            sendJson(response, 200, { session: toPublicPersonalityAssessmentRun(existing), idempotent: true });
            return;
          }
          const created = createServerPersonalityAssessmentRun(normalizedRequest);
          if (!created.session) {
            sendJson(response, 400, { error: created.error || "personality_assessment_run_creation_failed" });
            return;
          }
          const session = database.saveAssessmentSession(created.session);
          sendJson(response, 201, { session: toPublicPersonalityAssessmentRun(session), idempotent: false });
          return;
        }

        if (request.method === "GET" && segments.length === 3) {
          const session = database.getAssessmentSessionById({ sessionId: segments[2] });
          if (!session?.serverAuthoritative || session.assessmentType !== PERSONALITY_ASSESSMENT_TYPE) {
            sendJson(response, 404, { error: "personality_assessment_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: session.studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { session: toPublicPersonalityAssessmentRun(session) });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "responses") {
          const session = database.getAssessmentSessionById({ sessionId: segments[2] });
          if (!session?.serverAuthoritative || session.assessmentType !== PERSONALITY_ASSESSMENT_TYPE) {
            sendJson(response, 404, { error: "personality_assessment_run_not_found" });
            return;
          }
          const { answer, questionId, responseTimeMs, studentId } = await readJsonBody(request);
          if (studentId !== session.studentId) {
            sendJson(response, 400, { error: "personality_assessment_student_mismatch" });
            return;
          }
          const user = requireStudentAccess({ request, response, studentId: session.studentId, roles: ["student", "admin"], write: true });
          if (!user) return;
          if (session.status !== "in_progress") {
            sendJson(response, 409, { error: "personality_assessment_run_not_active" });
            return;
          }
          const updated = recordPersonalityAssessmentResponse({ session, answer, questionId, responseTimeMs });
          if (!updated.session) {
            sendJson(response, 409, { error: updated.error || "personality_assessment_response_rejected" });
            return;
          }
          const storedSession = database.saveAssessmentSession(updated.session);
          sendJson(response, 200, { session: toPublicPersonalityAssessmentRun(storedSession) });
          return;
        }
      }

      if (segments[1] === "stage-assessment-runs") {
        if (request.method === "POST" && segments.length === 2) {
          const { request: runRequest } = await readJsonBody(request);
          const normalizedRequest = normalizeStageAssessmentRunRequest(runRequest);
          if (!normalizedRequest) {
            sendJson(response, 400, { error: "invalid_stage_assessment_run_request" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedRequest.studentId, roles: ["student", "admin"], write: true })) return;
          const plan = database.getPlan({ studentId: normalizedRequest.studentId, subjectId: normalizedRequest.subjectId });
          if (!plan?.staticCurve || !plan.staticCurveConfirmedAt) {
            sendJson(response, 409, { error: "stage_assessment_requires_confirmed_static_curve" });
            return;
          }
          const authoritativeStageRun = resolveAuthoritativeStageRunRequest({
            database,
            plan,
            request: normalizedRequest,
          });
          if (!authoritativeStageRun.request) {
            sendJson(response, 409, { error: authoritativeStageRun.error || "stage_assessment_request_denied" });
            return;
          }
          const authoritativeRequest = authoritativeStageRun.request;
          const assessmentCadence = resolveServerAssessmentCadence({
            database,
            studentId: authoritativeRequest.studentId,
            subjectId: authoritativeRequest.subjectId,
            plan,
            today: latestCompletedServerPracticeDate({
              database,
              studentId: authoritativeRequest.studentId,
              subjectId: authoritativeRequest.subjectId,
            }),
          });
          if (!assessmentCadence.canStart) {
            sendJson(response, 409, {
              error: "stage_assessment_not_available",
              assessmentCadence,
            });
            return;
          }
          const existing = database.getLatestAssessmentSession({
            studentId: authoritativeRequest.studentId,
            subjectId: authoritativeRequest.subjectId,
            assessmentType: "stage_test",
          });
          if (
            existing?.serverAuthoritative &&
            existing.assessmentBlueprint?.targetGrade === authoritativeRequest.targetGrade &&
            existing.assessmentBlueprint?.attemptIndex === authoritativeRequest.attemptIndex
          ) {
            sendJson(response, 200, { session: toPublicStageAssessmentRun(existing), idempotent: true });
            return;
          }
          const created = createServerStageAssessmentRun({ request: authoritativeRequest });
          if (!created.session) {
            sendJson(response, 400, { error: created.error || "stage_assessment_run_creation_failed" });
            return;
          }
          const session = database.saveAssessmentSession(created.session);
          sendJson(response, 201, { session: toPublicStageAssessmentRun(session), idempotent: false });
          return;
        }

        if (request.method === "GET" && segments.length === 3) {
          const session = database.getAssessmentSessionById({ sessionId: segments[2] });
          if (!session?.serverAuthoritative) {
            sendJson(response, 404, { error: "stage_assessment_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: session.studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { session: toPublicStageAssessmentRun(session) });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "responses") {
          const session = database.getAssessmentSessionById({ sessionId: segments[2] });
          if (!session?.serverAuthoritative) {
            sendJson(response, 404, { error: "stage_assessment_run_not_found" });
            return;
          }
          const { answer, questionId, responseTimeMs, studentId } = await readJsonBody(request);
          if (studentId !== session.studentId) {
            sendJson(response, 400, { error: "stage_assessment_student_mismatch" });
            return;
          }
          const user = requireStudentAccess({ request, response, studentId: session.studentId, roles: ["student", "admin"], write: true });
          if (!user) return;
          if (session.status !== "in_progress") {
            sendJson(response, 409, { error: "stage_assessment_run_not_active" });
            return;
          }
          const answeredIds = new Set((session.responses || []).map((response) => response.questionId));
          const expectedQuestion = (session.presentationQuestions || []).find((question) => !answeredIds.has(question.id));
          if (!expectedQuestion || expectedQuestion.id !== questionId) {
            sendJson(response, 409, { error: "stage_assessment_question_order_denied" });
            return;
          }
          const privateQuestion = (session.questionSnapshot || []).find((question) => question.id === questionId);
          const answerInput = privateQuestion?.answerInput || createMathAnswerInput();
          if (normalizeMathAnswerValue({ answerInput, value: answer }) === null) {
            sendJson(response, 400, { error: "invalid_stage_assessment_answer" });
            return;
          }
          let updatedSession = recordStageAssessmentResponse({
            session,
            answer,
            questionId,
            responseTimeMs: Math.max(0, Math.min(6 * 60 * 60 * 1000, Number(responseTimeMs) || 0)),
          });
          let updatedPlan = null;
          if (updatedSession.status === "ready_to_score") {
            const finalized = finalizeServerStageAssessmentRun({ database, session: updatedSession });
            if (finalized.error) {
              sendJson(response, 409, { error: finalized.error });
              return;
            }
            updatedSession = finalized.session;
            updatedPlan = finalized.plan;
          }
          const storedSession = database.saveAssessmentSession(updatedSession);
          sendJson(response, 200, {
            session: toPublicStageAssessmentRun(storedSession),
            ...(updatedPlan ? { plan: toPublicPlanForRole(updatedPlan, user.role) } : {}),
          });
          return;
        }
      }

      if (segments[1] === "daily-practice-history" && request.method === "GET" && segments.length === 4) {
        const [, , studentId, subjectId] = segments;
        if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
        sendJson(response, 200, {
          sessions: database.listDailyPracticeSessions({
            studentId,
            subjectId,
            limit: url.searchParams.get("limit"),
          }),
        });
        return;
      }

      if (segments[1] === "daily-practice-plans") {
        if (request.method === "GET" && segments.length === 5 && segments[4] === "latest") {
          const [, , studentId, subjectId] = segments;
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, {
            plan: toPublicDailyPracticePlan(database.getLatestDailyPracticePlan({ studentId, subjectId })),
          });
          return;
        }

        if (request.method === "GET" && segments.length === 4) {
          const [, , studentId, subjectId] = segments;
          const practiceDate = normalizePracticeDate(url.searchParams.get("practiceDate"));
          if (!practiceDate) {
            sendJson(response, 400, { error: "practice_date_required" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, {
            plan: toPublicDailyPracticePlan(database.getDailyPracticePlan({ studentId, subjectId, practiceDate })),
          });
          return;
        }

        if (request.method === "POST" && segments.length === 2) {
          const { request: planRequest } = await readJsonBody(request);
          const normalizedRequest = normalizeDailyPracticePlanRequest(planRequest);
          if (!normalizedRequest) {
            sendJson(response, 400, { error: "invalid_daily_practice_plan_request" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedRequest.studentId, roles: ["student", "admin"], write: true })) return;
          const existing = database.getDailyPracticePlan(normalizedRequest);
          if (existing) {
            sendJson(response, 200, { plan: toPublicDailyPracticePlan(existing) });
            return;
          }
          const created = createServerDailyPracticePlan({ database, request: normalizedRequest });
          if (!created.plan) {
            sendJson(response, 409, {
              error: created.error || "daily_practice_plan_creation_failed",
              ...(created.assessmentCadence ? { assessmentCadence: created.assessmentCadence } : {}),
            });
            return;
          }
          const plan = database.saveDailyPracticePlan(created.plan);
          if (created.refinedSupportProfile) {
            const currentPlan = database.getPlan({
              studentId: normalizedRequest.studentId,
              subjectId: normalizedRequest.subjectId,
            });
            if (currentPlan) {
              database.savePlan({
                ...currentPlan,
                supportProfile: created.refinedSupportProfile,
                updatedAt: new Date().toISOString(),
              });
            }
          }
          sendJson(response, 201, { plan: toPublicDailyPracticePlan(plan) });
          return;
        }
      }

      if (segments[1] === "daily-practice-runs") {
        if (request.method === "GET" && segments.length === 4 && segments[3] === "summary") {
          const run = database.getDailyPracticeRunById({ runId: segments[2] });
          if (!run) {
            sendJson(response, 404, { error: "daily_practice_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: run.studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { summary: buildDailyPracticeSummary({ database, run }) });
          return;
        }

        if (request.method === "GET" && segments.length === 4) {
          const [, , studentId, subjectId] = segments;
          const practiceDate = normalizePracticeDate(url.searchParams.get("practiceDate"));
          if (!practiceDate) {
            sendJson(response, 400, { error: "practice_date_required" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, {
            run: toPublicDailyPracticeRun(database.getDailyPracticeRun({ studentId, subjectId, practiceDate })),
          });
          return;
        }

        if (request.method === "POST" && segments.length === 2) {
          const { request: runRequest } = await readJsonBody(request);
          const normalizedRequest = normalizeDailyPracticePlanRequest(runRequest);
          if (!normalizedRequest) {
            sendJson(response, 400, { error: "invalid_daily_practice_run_request" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedRequest.studentId, roles: ["student", "admin"], write: true })) return;
          const existing = database.getDailyPracticeRun(normalizedRequest);
          if (existing) {
            sendJson(response, 200, { run: toPublicDailyPracticeRun(existing) });
            return;
          }
          const created = createServerDailyPracticeRun({ database, request: normalizedRequest });
          if (!created.run) {
            sendJson(response, 409, {
              error: created.error || "daily_practice_run_creation_failed",
              ...(created.assessmentCadence ? { assessmentCadence: created.assessmentCadence } : {}),
            });
            return;
          }
          const run = database.saveDailyPracticeRun(created.run);
          sendJson(response, 201, { run: toPublicDailyPracticeRun(run) });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "optional-practice") {
          const run = database.getDailyPracticeRunById({ runId: segments[2] });
          if (!run) {
            sendJson(response, 404, { error: "daily_practice_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: run.studentId, roles: ["student", "admin"], write: true })) return;
          const requestBody = normalizeOptionalPracticeRequest(await readJsonBody(request));
          if (!requestBody) {
            sendJson(response, 400, { error: "invalid_optional_practice_request" });
            return;
          }
          if (!run.requiredPracticeCompleted) {
            sendJson(response, 409, { error: "optional_practice_requires_completed_required_practice" });
            return;
          }
          if (getActiveOptionalPracticeStep(run)) {
            sendJson(response, 409, { error: "optional_practice_session_already_active" });
            return;
          }
          const optionalItems =
            requestBody.mode === "wrong_retry"
              ? createWrongRetryPracticeItems({ database, run })
              : createOptionalPracticeItems({ database, run, mode: requestBody.mode, count: requestBody.count });
          if (!optionalItems.length) {
            sendJson(response, 409, {
              error:
                requestBody.mode === "wrong_retry"
                  ? "no_server_scored_wrong_items_available"
                  : "optional_practice_items_unavailable",
            });
            return;
          }
          const updatedRun = createOptionalPracticeSession({
            run,
            items: optionalItems,
            mode: requestBody.mode,
            source: requestBody.source,
          });
          if (!updatedRun) {
            sendJson(response, 409, { error: "optional_practice_session_creation_failed" });
            return;
          }
          database.saveDailyPracticeRun(updatedRun);
          sendJson(response, 201, { run: toPublicDailyPracticeRun(updatedRun) });
          return;
        }

        if (
          request.method === "POST" &&
          segments.length === 5 &&
          segments[3] === "optional-practice" &&
          segments[4] === "deliveries"
        ) {
          const run = database.getDailyPracticeRunById({ runId: segments[2] });
          if (!run) {
            sendJson(response, 404, { error: "daily_practice_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: run.studentId, roles: ["student", "admin"], write: true })) return;
          const step = getActiveOptionalPracticeStep(run);
          if (!step) {
            sendJson(response, 409, { error: "optional_practice_not_active" });
            return;
          }
          if (step.session.activeDeliveryId) {
            const activeDelivery = database.getQuestionDelivery({ deliveryId: step.session.activeDeliveryId });
            if (activeDelivery && activeDelivery.status !== "completed") {
              sendJson(response, 200, {
                run: toPublicDailyPracticeRun(run),
                delivery: toSafeQuestionDeliveryPresentation({ database, delivery: activeDelivery }),
              });
              return;
            }
            sendJson(response, 409, { error: "optional_practice_delivery_reconciliation_required" });
            return;
          }
          const deliveryRequest = createOptionalRunDeliveryRequest(run);
          if (!deliveryRequest) {
            sendJson(response, 409, { error: "optional_practice_not_active" });
            return;
          }
          const created = await createServerQuestionDelivery({
            database,
            deliveryId: `question-delivery-${randomBytes(12).toString("base64url")}`,
            deliveryRequest,
          });
          if (!created.delivery) {
            sendJson(response, 400, { error: created.error || "optional_practice_delivery_creation_failed" });
            return;
          }
          const delivery = database.saveQuestionDelivery(created.delivery);
          const updatedRun = attachOptionalPracticeDelivery({ deliveryId: delivery.id, run });
          if (!updatedRun) {
            sendJson(response, 409, { error: "optional_practice_not_active" });
            return;
          }
          database.saveDailyPracticeRun(updatedRun);
          sendJson(response, 201, {
            run: toPublicDailyPracticeRun(updatedRun),
            delivery: toSafeQuestionDeliveryPresentation({ database, delivery }),
          });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "deliveries") {
          const run = database.getDailyPracticeRunById({ runId: segments[2] });
          if (!run) {
            sendJson(response, 404, { error: "daily_practice_run_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: run.studentId, roles: ["student", "admin"], write: true })) return;
          if (run.activeDeliveryId) {
            const activeDelivery = database.getQuestionDelivery({ deliveryId: run.activeDeliveryId });
            if (activeDelivery && activeDelivery.status !== "completed") {
              sendJson(response, 200, {
                run: toPublicDailyPracticeRun(run),
                delivery: toSafeQuestionDeliveryPresentation({ database, delivery: activeDelivery }),
              });
              return;
            }
            sendJson(response, 409, { error: "daily_practice_run_delivery_reconciliation_required" });
            return;
          }
          const deliveryRequest = createRunDeliveryRequest(run);
          if (!deliveryRequest) {
            sendJson(response, 409, { error: "daily_practice_run_completed" });
            return;
          }
          const created = await createServerQuestionDelivery({
            database,
            deliveryId: `question-delivery-${randomBytes(12).toString("base64url")}`,
            deliveryRequest,
          });
          if (!created.delivery) {
            sendJson(response, 400, { error: created.error || "daily_practice_run_delivery_creation_failed" });
            return;
          }
          const delivery = database.saveQuestionDelivery(created.delivery);
          const updatedRun = attachDailyPracticeDelivery({ deliveryId: delivery.id, run });
          if (!updatedRun) {
            sendJson(response, 409, { error: "daily_practice_run_not_active" });
            return;
          }
          database.saveDailyPracticeRun(updatedRun);
          sendJson(response, 201, {
            run: toPublicDailyPracticeRun(updatedRun),
            delivery: toSafeQuestionDeliveryPresentation({ database, delivery }),
          });
          return;
        }
      }

      if (segments[1] === "daily-practice-sessions") {
        if (request.method === "GET" && segments.length === 4) {
          const [, , studentId, subjectId] = segments;
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          const practiceDate = url.searchParams.get("practiceDate");
          if (!practiceDate) {
            sendJson(response, 400, { error: "practice_date_required" });
            return;
          }
          sendJson(response, 200, {
            session: database.getDailyPracticeSession({ studentId, subjectId, practiceDate }),
          });
          return;
        }
        if (request.method === "POST" && segments.length === 2) {
          const { session } = await readJsonBody(request);
          if (!requireStudentAccess({ request, response, studentId: session?.studentId, roles: ["student", "admin"], write: true })) return;
          if (!isValidRecord(session, ["id", "studentId", "subjectId", "practiceDate"])) {
            sendJson(response, 400, { error: "invalid_daily_practice_session" });
            return;
          }
          sendJson(response, 409, { error: "daily_practice_session_server_managed" });
          return;
        }
      }

      if (segments[1] === "knowledge-atlas-explorations" && request.method === "POST" && segments.length === 2) {
        const requestBody = normalizeKnowledgeAtlasExplorationRequest(await readJsonBody(request));
        if (!requestBody) {
          sendJson(response, 400, { error: "invalid_knowledge_atlas_exploration_request" });
          return;
        }
        if (!requireStudentAccess({ request, response, studentId: requestBody.studentId, roles: ["student", "admin"], write: true })) {
          return;
        }
        const deliveryRequest = createKnowledgeAtlasExplorationRequest({ database, request: requestBody });
        if (!deliveryRequest) {
          sendJson(response, 400, { error: "knowledge_atlas_exploration_unavailable" });
          return;
        }
        const created = await createServerQuestionDelivery({
          database,
          deliveryId: `question-delivery-${randomBytes(12).toString("base64url")}`,
          deliveryRequest,
        });
        if (!created.delivery) {
          sendJson(response, 400, { error: created.error || "knowledge_atlas_exploration_creation_failed" });
          return;
        }
        const delivery = database.saveQuestionDelivery(created.delivery);
        sendJson(response, 201, {
          delivery: toSafeQuestionDeliveryPresentation({ database, delivery }),
          guardrail:
            "Atlas exploration is optional. It adds learning evidence but does not consume a future daily task or recalibrate the learning curve.",
        });
        return;
      }

      if (segments[1] === "knowledge-atlas-reviews" && request.method === "POST" && segments.length === 2) {
        const requestBody = normalizeKnowledgeAtlasReviewRequest(await readJsonBody(request));
        if (!requestBody) {
          sendJson(response, 400, { error: "invalid_knowledge_atlas_review_request" });
          return;
        }
        if (!requireStudentAccess({ request, response, studentId: requestBody.studentId, roles: ["student", "admin"], write: true })) {
          return;
        }
        const source = resolveKnowledgeAtlasWrongRetrySource({ database, request: requestBody });
        if (!source.sourceDelivery) {
          sendJson(response, 409, { error: source.error || "knowledge_atlas_wrong_retry_unavailable" });
          return;
        }
        const created = await createServerQuestionDelivery({
          database,
          deliveryId: `question-delivery-${randomBytes(12).toString("base64url")}`,
          deliveryRequest: createKnowledgeAtlasWrongRetryRequest({ request: requestBody, sourceDelivery: source.sourceDelivery }),
        });
        if (!created.delivery) {
          sendJson(response, 400, { error: created.error || "knowledge_atlas_wrong_retry_creation_failed" });
          return;
        }
        const delivery = database.saveQuestionDelivery(created.delivery);
        sendJson(response, 201, {
          delivery: toSafeQuestionDeliveryPresentation({ database, delivery }),
          guardrail:
            "A wrong-question replay is optional. It preserves the original question, does not consume a daily task, and cannot recalibrate the learning curve.",
        });
        return;
      }

      if (segments[1] === "question-deliveries") {
        if (request.method === "POST" && segments.length === 2) {
          const { request: deliveryRequest } = await readJsonBody(request);
          const normalizedRequest = normalizeQuestionDeliveryRequest(deliveryRequest);
          if (!normalizedRequest) {
            sendJson(response, 400, { error: "invalid_question_delivery_request" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: normalizedRequest.studentId, roles: ["student", "admin"], write: true })) return;
          if (normalizedRequest.correctReviewSourceDeliveryId) {
            sendJson(response, 403, { error: "correct_review_delivery_server_owned" });
            return;
          }
          const created = await createServerQuestionDelivery({
            database,
            deliveryId: `question-delivery-${randomBytes(12).toString("base64url")}`,
            deliveryRequest: normalizedRequest,
          });
          if (!created.delivery) {
            sendJson(response, 400, { error: created.error || "invalid_question_delivery" });
            return;
          }
          const delivery = database.saveQuestionDelivery(created.delivery);
          sendJson(response, 201, { delivery: toSafeQuestionDeliveryPresentation({ database, delivery }) });
          return;
        }

        if (request.method === "GET" && segments.length === 3) {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, { delivery: toSafeQuestionDeliveryPresentation({ database, delivery }) });
          return;
        }

        if (request.method === "GET" && segments.length === 4 && segments[3] === "guided-process") {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "admin"] })) return;
          const guidedProcess = createQuestionDeliveryGuidedProcessExport(delivery);
          if (!guidedProcess || guidedProcess.error) {
            sendJson(response, 409, { error: guidedProcess?.error || "guided_process_not_available" });
            return;
          }
          sendJson(response, 200, { process: guidedProcess });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "start") {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          const { studentId } = await readJsonBody(request);
          if (studentId !== delivery.studentId) {
            sendJson(response, 400, { error: "question_delivery_student_mismatch" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "admin"], write: true })) return;
          const started = markQuestionDeliveryStarted({ delivery });
          if (!started) {
            sendJson(response, 409, { error: "question_delivery_not_active" });
            return;
          }
          const storedDelivery = database.saveQuestionDelivery(started);
          sendJson(response, 200, { delivery: toSafeQuestionDeliveryPresentation({ database, delivery: storedDelivery }) });
          return;
        }

        if (request.method === "POST" && segments.length === 4 && segments[3] === "attempts") {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          const { studentId, answer, elapsedSeconds, answerRevisionCount } = await readJsonBody(request);
          if (studentId !== delivery.studentId) {
            sendJson(response, 400, { error: "question_delivery_student_mismatch" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "admin"], write: true })) return;
          const scored = recordQuestionDeliveryAttempt({ delivery, answer, elapsedSeconds, answerRevisionCount });
          if (!scored) {
            sendJson(response, 400, { error: "invalid_question_delivery_attempt" });
            return;
          }
          database.saveQuestionDelivery(scored.delivery);
          const behaviorEvent = database.saveBehaviorEvent(
            createServerScoredBehaviorEvent({ delivery: scored.delivery, result: scored.result }),
          );
          refreshServerSupportProfile({
            database,
            studentId: scored.delivery.studentId,
            subjectId: scored.delivery.subjectId,
          });
          let practiceRun = null;
          const practiceRunId = scored.delivery.generationRequest?.practiceRunId;
          if (practiceRunId) {
            const storedRun = database.getDailyPracticeRunById({ runId: practiceRunId });
            if (storedRun) {
              const advanced = scored.delivery.generationRequest?.optionalPracticeSessionId
                ? advanceOptionalPracticeRun({
                    delivery: scored.delivery,
                    result: scored.result,
                    run: storedRun,
                  })
                : advanceDailyPracticeRun({
                    delivery: scored.delivery,
                    result: scored.result,
                    run: storedRun,
                  });
              const resolvedRun = advanced.advanced || advanced.requiresIndependentRetry
                ? database.saveDailyPracticeRun(advanced.run)
                : storedRun;
              if (advanced.advanced && resolvedRun.requiredPracticeCompleted) {
                recordServerCompletedPracticeSession({ database, run: resolvedRun });
              }
              practiceRun = toPublicDailyPracticeRun(resolvedRun);
              if (advanced.requiresIndependentRetry) {
                scored.result = {
                  ...scored.result,
                  requiresIndependentRetry: true,
                };
              }
            }
          }
          sendJson(response, 200, {
            delivery: toSafeQuestionDeliveryPresentation({ database, delivery: scored.delivery }),
            result: scored.result,
            behaviorEvent: toPublicBehaviorEvent(behaviorEvent),
            ...(practiceRun ? { practiceRun } : {}),
          });
          return;
        }

        if (request.method === "POST" && segments.length === 5 && segments[3] === "hints" && segments[4] === "next") {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          const { studentId } = await readJsonBody(request);
          if (studentId !== delivery.studentId) {
            sendJson(response, 400, { error: "question_delivery_student_mismatch" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "admin"], write: true })) return;
          const revealed = revealNextQuestionHint({ delivery });
          if (revealed?.error) {
            sendJson(response, 409, { error: revealed.error });
            return;
          }
          const storedDelivery = database.saveQuestionDelivery(revealed.delivery);
          const behaviorEvent = revealed.hint
            ? database.saveBehaviorEvent(
                createServerSupportBehaviorEvent({
                  delivery: storedDelivery,
                  eventType: "hint_opened",
                  level: revealed.hint.level,
                }),
              )
            : null;
          sendJson(response, 200, {
            delivery: toSafeQuestionDeliveryPresentation({ database, delivery: storedDelivery }),
            hint: revealed.hint,
            complete: revealed.complete,
            ...(behaviorEvent ? { behaviorEvent: toPublicBehaviorEvent(behaviorEvent) } : {}),
          });
          return;
        }

        if (request.method === "POST" && segments.length === 5 && segments[3] === "guided-steps" && segments[4] === "next") {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          const { studentId } = await readJsonBody(request);
          if (studentId !== delivery.studentId) {
            sendJson(response, 400, { error: "question_delivery_student_mismatch" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "admin"], write: true })) return;
          const revealed = revealNextQuestionGuidedStep({ delivery });
          if (revealed?.error) {
            sendJson(response, 409, { error: revealed.error });
            return;
          }
          const storedDelivery = database.saveQuestionDelivery(revealed.delivery);
          const behaviorEvent = revealed.step
            ? database.saveBehaviorEvent(
                createServerSupportBehaviorEvent({
                  delivery: storedDelivery,
                  eventType: "guided_step_opened",
                  level: revealed.step.level,
                  phase: revealed.step.phase,
                }),
              )
            : null;
          sendJson(response, 200, {
            delivery: toSafeQuestionDeliveryPresentation({ database, delivery: storedDelivery }),
            step: revealed.step,
            complete: revealed.complete,
            ...(behaviorEvent ? { behaviorEvent: toPublicBehaviorEvent(behaviorEvent) } : {}),
          });
          return;
        }

        if (request.method === "POST" && segments.length === 5 && segments[3] === "guided-steps" && segments[4] === "responses") {
          const delivery = database.getQuestionDelivery({ deliveryId: segments[2] });
          if (!delivery) {
            sendJson(response, 404, { error: "question_delivery_not_found" });
            return;
          }
          const { studentId, level, response: guidedResponse } = await readJsonBody(request);
          if (studentId !== delivery.studentId) {
            sendJson(response, 400, { error: "question_delivery_student_mismatch" });
            return;
          }
          if (!requireStudentAccess({ request, response, studentId: delivery.studentId, roles: ["student", "admin"], write: true })) return;
          const recorded = recordQuestionDeliveryGuidedStepResponse({
            delivery,
            level,
            response: guidedResponse,
          });
          if (!recorded || recorded.error) {
            sendJson(response, 409, { error: recorded?.error || "invalid_guided_step_response" });
            return;
          }
          const storedDelivery = database.saveQuestionDelivery(recorded.delivery);
          const behaviorEvent = database.saveBehaviorEvent(
            createServerGuidedResponseBehaviorEvent({
              delivery: storedDelivery,
              response: recorded.response,
              result: recorded.result,
            }),
          );
          sendJson(response, 200, {
            delivery: toSafeQuestionDeliveryPresentation({ database, delivery: storedDelivery }),
            response: recorded.response,
            result: recorded.result,
            behaviorEvent: toPublicBehaviorEvent(behaviorEvent),
          });
          return;
        }
      }

      if (segments[1] === "observer-workspaces") {
        if (request.method === "GET" && segments.length === 4) {
          const [, , actorUserId, studentId] = segments;
          const user = requireStudentAccess({ request, response, studentId, roles: ["parent", "teacher", "admin"] });
          if (!user) return;
          if (user.role !== "admin" && user.userId !== actorUserId) {
            sendJson(response, 403, { error: "observer_workspace_access_denied" });
            return;
          }
          sendJson(response, 200, {
            record: database.getObserverWorkspace({ actorUserId, studentId }),
          });
          return;
        }
        if (request.method === "PUT" && segments.length === 4) {
          const [, , actorUserId, studentId] = segments;
          const user = requireStudentAccess({ request, response, studentId, roles: ["parent", "teacher", "admin"], write: true });
          if (!user) return;
          if (user.role !== "admin" && user.userId !== actorUserId) {
            sendJson(response, 403, { error: "observer_workspace_access_denied" });
            return;
          }
          const { record } = await readJsonBody(request);
          if (
            !isValidRecord(record, ["actorUserId", "studentId", "role"]) ||
            record.actorUserId !== actorUserId ||
            record.studentId !== studentId ||
            (user.role !== "admin" && record.role !== user.role)
          ) {
            sendJson(response, 400, { error: "invalid_observer_workspace" });
            return;
          }
          sendJson(response, 200, { record: database.saveObserverWorkspace(record) });
          return;
        }
      }

      if (segments[1] === "student-messages") {
        if (request.method === "GET" && segments.length === 3) {
          if (!requireStudentAccess({ request, response, studentId: segments[2], roles: ["student", "parent", "teacher", "admin"] })) return;
          sendJson(response, 200, {
            messages: database.listStudentMessages({ studentId: segments[2], limit: url.searchParams.get("limit") }),
          });
          return;
        }
        if (request.method === "POST" && segments.length === 2) {
          const { message } = await readJsonBody(request);
          const user = requireStudentAccess({ request, response, studentId: message?.studentId, roles: ["parent", "teacher", "admin"], write: true });
          if (!user) return;
          const normalizedMessage = normalizeStudentMessageRecord(message);
          if (!normalizedMessage) {
            sendJson(response, 400, { error: "invalid_student_message" });
            return;
          }
          if (
            user.role !== "admin" &&
            (normalizedMessage.fromUserId !== user.userId || normalizedMessage.fromRole !== user.role)
          ) {
            sendJson(response, 403, { error: "message_sender_identity_denied" });
            return;
          }
          sendJson(response, 201, { message: database.saveStudentMessage(normalizedMessage) });
          return;
        }
      }

      if (segments[1] === "student-preferences" && segments.length === 3) {
        const [, , studentId] = segments;
        if (request.method === "GET") {
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "admin"] })) return;
          sendJson(response, 200, { record: database.getStudentPreferences({ studentId }) });
          return;
        }
        if (request.method === "PUT") {
          if (!requireStudentAccess({ request, response, studentId, roles: ["student", "admin"], write: true })) return;
          const { record } = await readJsonBody(request);
          const normalizedRecord = normalizeStudentPreferenceRecord(record);
          if (!normalizedRecord || normalizedRecord.studentId !== studentId) {
            sendJson(response, 400, { error: "invalid_student_preferences" });
            return;
          }
          sendJson(response, 200, { record: database.saveStudentPreferences(normalizedRecord) });
          return;
        }
      }

      sendJson(response, 404, { error: "api_route_not_found" });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        sendJson(response, error.status, { error: error.code });
        return;
      }
      sendJson(response, 500, { error: "api_request_failed" });
    }
  };
}
