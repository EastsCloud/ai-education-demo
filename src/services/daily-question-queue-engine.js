import { getMathQuestionFamilyGraphBinding, mathKnowledgeGraph } from "../data/math-knowledge-graph.js?v=math-graph-4";
import {
  hasVerifiedIndependentProgression,
  summarizeFamilyIndependentEvidence,
} from "./math-learning-path-engine.js?v=learning-path-6";
import { estimateFamilyMastery, summarizeFamilyMasteryEvidence } from "./family-mastery-estimator.js?v=family-mastery-2";
import { generateMathQuestionCandidate } from "./math-item-generator.js?v=math-help-framework-21";
import { summarizeQuestionFeatureEvidence } from "./question-feature-evidence-engine.js?v=question-feature-evidence-2";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

const BUCKET_ORDER = ["wrong_retry", "correct_review", "new_stage_questions", "challenge_extension"];

const BUCKET_VARIANT = {
  wrong_retry: "original",
  correct_review: "context_change",
  new_stage_questions: "original",
  challenge_extension: "change_two_numbers",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashText(text) {
  return [...String(text)].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 997, 0);
}

function chooseFeatureFocusedSeed({ family, focusFeatureIds = [], instructionalGrade, seed, variantLevel }) {
  const requestedFeatureIds = [...new Set(focusFeatureIds)].slice(0, 2);
  if (!family || !requestedFeatureIds.length) {
    return { seed, featureFocus: null };
  }

  const options = Array.from({ length: 8 }, (_, offset) => {
    const candidateSeed = seed + offset;
    const candidate = generateMathQuestionCandidate({
      family,
      seed: candidateSeed,
      instructionalGrade,
      variantLevel,
    });
    const candidateFeatureKeys = candidate.metadataTags?.featureSignature?.matchingKeys || [];
    const matchedFeatureIds = requestedFeatureIds.filter((featureId) => candidateFeatureKeys.includes(featureId));
    return { seed: candidateSeed, matchedFeatureIds };
  });
  const best = options.reduce((current, option) =>
    option.matchedFeatureIds.length > current.matchedFeatureIds.length ? option : current,
  );

  return {
    seed: best.seed,
    featureFocus: {
      source: "recent_question_feature_evidence",
      requestedFeatureIds,
      matchedFeatureIds: best.matchedFeatureIds,
      matchStatus: best.matchedFeatureIds.length ? "matched_bounded_seed" : "not_available_in_family_seed_window",
    },
  };
}

function allocateUnitCounts(buckets, totalUnits) {
  const raw = BUCKET_ORDER.map((bucketId) => ({
    bucketId,
    raw: Math.max(0, Number(buckets?.[bucketId] || 0)) * totalUnits,
  }));
  const counts = Object.fromEntries(raw.map((entry) => [entry.bucketId, Math.floor(entry.raw)]));
  let remaining = totalUnits - Object.values(counts).reduce((sum, count) => sum + count, 0);

  raw
    .sort((left, right) => right.raw - Math.floor(right.raw) - (left.raw - Math.floor(left.raw)))
    .forEach((entry) => {
      if (remaining <= 0) return;
      counts[entry.bucketId] += 1;
      remaining -= 1;
    });

  return counts;
}

function recentAnswerEvents(events = []) {
  return events
    .filter((event) => event.eventType === "answer_submitted" && event.payload?.questionFamilyId)
    .sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
}

function isIndependentCorrect(event, isIndependentAnswer) {
  return Boolean(event?.payload?.isCorrect) && isIndependentAnswer(event);
}

function buildFamilyEvidenceStates(answers, validFamilyIds, behaviorEvents) {
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  const states = new Map();
  answers.forEach((event) => {
    const familyId = event.payload?.questionFamilyId;
    if (!validFamilyIds.has(familyId)) return;
    const state = states.get(familyId) || {
      familyId,
      latest: null,
      latestCorrect: null,
      latestIndependentCorrect: null,
      latestWrong: null,
    };
    if (!state.latest) state.latest = event;
    if (event.payload?.isCorrect && !state.latestCorrect) state.latestCorrect = event;
    if (isIndependentCorrect(event, isIndependentAnswer) && !state.latestIndependentCorrect) state.latestIndependentCorrect = event;
    if (!event.payload?.isCorrect && !state.latestWrong) state.latestWrong = event;
    states.set(familyId, state);
  });

  return [...states.values()]
    .map((state) => {
      const latestWrongAt = String(state.latestWrong?.timestamp || "");
      const latestIndependentAt = String(state.latestIndependentCorrect?.timestamp || "");
      const requiresIndependentRetry =
        !state.latestIndependentCorrect || (Boolean(state.latestWrong) && latestWrongAt > latestIndependentAt);
    return {
      ...state,
      mastery: estimateFamilyMastery({ behaviorEvents, familyId: state.familyId }),
      requiresIndependentRetry,
        retryReason: state.latestWrong
          ? "wrong_answer_after_last_independent_success"
          : "hint_supported_answer_without_independent_success",
      };
    })
    .sort((left, right) => String(right.latest?.timestamp || "").localeCompare(String(left.latest?.timestamp || "")));
}

function normalizeInstructionalGrade(value) {
  const grade = String(value || "").trim().toUpperCase();
  return /^G[1-6]$/.test(grade) ? grade : null;
}

export function selectFamiliesForInstructionalGrade({ families = [], instructionalGrade = null } = {}) {
  const grade = normalizeInstructionalGrade(instructionalGrade);
  if (!grade) return families;
  const alignedFamilies = families.filter((family) => family?.gradeBands?.includes(grade));
  return alignedFamilies.length ? alignedFamilies : families;
}

function evidenceForFamily(behaviorEvents, familyId) {
  return summarizeFamilyIndependentEvidence({ behaviorEvents, familyId });
}

function hasStableIndependentEvidence(evidence) {
  return hasVerifiedIndependentProgression(evidence);
}

function graphSuccessorFamilies({ anchorFamilyId, behaviorEvents, families, graph = mathKnowledgeGraph }) {
  const binding = getMathQuestionFamilyGraphBinding(anchorFamilyId, graph);
  if (!binding) return [];

  const validFamilyIds = new Set(families.map((family) => family.id));
  const familyById = new Map(families.map((family) => [family.id, family]));
  const familyNodeById = new Map(
    (graph?.nodes || [])
      .filter((node) => node.kind === "question_family")
      .map((node) => [node.id, node]),
  );
  const sourceNodeIds = new Set([binding.familyNodeId, ...(binding.conceptNodeIds || [])]);
  const successorIds = (graph?.edges || [])
    .filter((edge) => edge.relation === "prerequisite_for" && sourceNodeIds.has(edge.from))
    .flatMap((edge) => familyNodeById.get(edge.to)?.questionFamilyIds || [])
    .filter((familyId) => familyId !== anchorFamilyId && validFamilyIds.has(familyId));

  return [...new Set(successorIds)]
    .map((familyId) => familyById.get(familyId))
    .filter(Boolean)
    .filter((family) => {
      const namedPrerequisites = (family.prerequisiteIds || []).filter((id) => validFamilyIds.has(id));
      return namedPrerequisites.every((familyId) => hasStableIndependentEvidence(evidenceForFamily(behaviorEvents, familyId)));
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function selectVerifiedGraphSuccessorFamilies({
  anchorFamilyId,
  behaviorEvents = [],
  families = [],
  graph = mathKnowledgeGraph,
  instructionalGrade = null,
} = {}) {
  const eligibleFamilies = selectFamiliesForInstructionalGrade({
    families,
    instructionalGrade,
  });
  const anchorFamily = eligibleFamilies.find((family) => family.id === anchorFamilyId);
  if (!anchorFamily) return [];

  const anchorEvidence = evidenceForFamily(behaviorEvents, anchorFamilyId);
  if (!hasStableIndependentEvidence(anchorEvidence)) return [];

  return graphSuccessorFamilies({
    anchorFamilyId,
    behaviorEvents,
    families: eligibleFamilies,
    graph,
  });
}

function resolveQueueSelection({ bucketId, answers, behaviorEvents, plannedFamilyId, families, challengeIndex = 0 }) {
  const validFamilyIds = new Set(families.map((family) => family.id));
  const familyEvidence = buildFamilyEvidenceStates(answers, validFamilyIds, behaviorEvents);
  const recentUnresolved = familyEvidence.find((state) => state.requiresIndependentRetry);
  const recentIndependent = familyEvidence
    .filter((state) => !state.requiresIndependentRetry && state.latestIndependentCorrect)
    .sort(
      (left, right) =>
        Number(left.mastery?.masteryEstimate ?? 0.5) - Number(right.mastery?.masteryEstimate ?? 0.5) ||
        String(right.latestIndependentCorrect?.timestamp || "").localeCompare(String(left.latestIndependentCorrect?.timestamp || "")),
    )[0];
  const validPlannedFamilyId = validFamilyIds.has(plannedFamilyId) ? plannedFamilyId : null;
  const anchorFamilyId = validPlannedFamilyId || recentIndependent?.familyId || families[0]?.id || null;

  if (bucketId === "wrong_retry" && recentUnresolved) {
    return {
      familyId: recentUnresolved.familyId,
      source: recentUnresolved.latestWrong ? "unresolved_wrong_evidence" : "hint_supported_evidence",
      selectionReason: recentUnresolved.retryReason,
    };
  }
  if (bucketId === "wrong_retry") {
    return {
      familyId: anchorFamilyId,
      source: "planned_foundation_fallback",
      selectionReason: "no_recent_wrong_answer",
    };
  }
  if (bucketId === "correct_review" && recentIndependent) {
    return {
      familyId: recentIndependent.familyId,
      source: "independent_correct_evidence",
      selectionReason: "sample_confirmed_independent_answer",
    };
  }
  if (bucketId === "correct_review") {
    return {
      familyId: anchorFamilyId,
      source: "planned_reproduction_fallback",
      selectionReason: "no_recent_correct_answer",
    };
  }
  if (bucketId === "challenge_extension") {
    const anchorEvidence = evidenceForFamily(behaviorEvents, anchorFamilyId);
    const successors = selectVerifiedGraphSuccessorFamilies({
      anchorFamilyId,
      behaviorEvents,
      families,
    });
    const successor = successors[challengeIndex % Math.max(successors.length, 1)] || null;
    if (successor) {
      return {
        familyId: successor.id,
        source: "knowledge_graph_successor",
        selectionReason: "verified_prerequisites_ready",
        variantLevel: "original",
        advancesFromFamilyId: anchorFamilyId,
      };
    }
    return {
      familyId: anchorFamilyId,
      source: "same_family_extension",
      selectionReason: hasStableIndependentEvidence(anchorEvidence)
        ? "related_prerequisite_evidence_not_yet_ready"
        : "anchor_independent_evidence_not_yet_ready",
    };
  }
  return {
    familyId: anchorFamilyId,
    source: "static_curve_focus",
    selectionReason: "planned_curve_focus",
  };
}

function normalizeSupportPolicy(profile = {}, allocation = {}) {
  const source = profile?.supportPlan || profile || {};
  const taskChunking = String(source.taskChunking || "standard_short_chunks");
  return {
    challengePacing: String(source.challengePacing || "steady"),
    feedbackStyle: String(source.feedbackStyle || "balanced_specific"),
    guidedStructureObserved: Boolean(source.guidedStructureObserved),
    hintDepthTarget: Number(source.hintDepthTarget || source.supportMode?.hintDepthTarget || 1.5),
    taskChunking,
    unitsPerChunk: taskChunking === "short_recovery_chunks" ? 1 : 2,
    finalCheckFocus:
      allocation?.matchingPolicy?.guidedFinalCheckFocus === "brief_final_check" ? "brief_final_check" : "standard",
  };
}

export function createDailyQuestionQueue({
  allocation,
  behaviorEvents = [],
  featureEvidenceEvents = null,
  date,
  dailyMinutes = 30,
  plannedFamilyId,
  families = [],
  supportProfile = null,
  targetGrade = null,
  recovery = null,
}) {
  const totalUnits = clamp(Math.round(Number(dailyMinutes || 30) / 8), 3, 8);
  const unitCounts = allocateUnitCounts(allocation?.buckets, totalUnits);
  const answers = recentAnswerEvents(behaviorEvents);
  const featureEvidence = summarizeQuestionFeatureEvidence(featureEvidenceEvents || behaviorEvents);
  const normalizedTargetGrade = normalizeInstructionalGrade(targetGrade);
  const eligibleFamilies = selectFamiliesForInstructionalGrade({
    families,
    instructionalGrade: normalizedTargetGrade,
  });
  const familyMastery = summarizeFamilyMasteryEvidence({
    behaviorEvents,
    familyIds: eligibleFamilies.map((family) => family.id),
  });
  const supportPolicy = normalizeSupportPolicy(supportProfile, allocation);
  const seedBase = hashText(date || "daily-queue");
  let sequence = 0;
  let challengeIndex = 0;
  const recoveryFamilyId = eligibleFamilies.some((family) => family.id === recovery?.familyId)
    ? recovery.familyId
    : null;
  let recoveryPlaced = false;
  const items = BUCKET_ORDER.flatMap((bucketId) =>
    Array.from({ length: unitCounts[bucketId] || 0 }, () => {
      const isRecoverySlot = Boolean(recoveryFamilyId && !recoveryPlaced);
      const selection = isRecoverySlot
        ? {
            familyId: recoveryFamilyId,
            source: "single_missed_day_recovery",
            selectionReason: "key_unfinished_focus_before_current_core",
            variantLevel: "original",
          }
        : resolveQueueSelection({
            bucketId,
            answers,
            behaviorEvents,
            plannedFamilyId,
            families: eligibleFamilies,
            challengeIndex,
          });
      if (isRecoverySlot) recoveryPlaced = true;
      if (bucketId === "challenge_extension") challengeIndex += 1;
      const familyId = selection.familyId;
      const family = eligibleFamilies.find((item) => item.id === familyId);
      const variantLevel = selection.variantLevel || BUCKET_VARIANT[bucketId];
      const instructionalGrade =
        normalizedTargetGrade && family?.gradeBands?.includes(normalizedTargetGrade)
          ? normalizedTargetGrade
          : family?.gradeBands?.at(-1) || null;
      const seedSelection = chooseFeatureFocusedSeed({
        family,
        focusFeatureIds: featureEvidence.focusFeatureIds,
        instructionalGrade,
        seed: seedBase + sequence * 17,
        variantLevel,
      });
      const item = {
        id: `daily-queue-${date || "undated"}-${bucketId}-${sequence + 1}`,
        bucketId: isRecoverySlot ? "light_makeup" : bucketId,
        familyId,
        familyName: family?.name || familyId,
        variantLevel,
        seed: seedSelection.seed,
        source: selection.source,
        selectionReason: selection.selectionReason,
        advancesFromFamilyId: selection.advancesFromFamilyId || null,
        instructionalGrade,
        featureFocus: seedSelection.featureFocus,
        supportAllowed: true,
        supportPolicy,
        supportChunkIndex: Math.floor(sequence / supportPolicy.unitsPerChunk),
        isSupportChunkLast: (sequence + 1) % supportPolicy.unitsPerChunk === 0 || sequence === totalUnits - 1,
      };
      sequence += 1;
      return item;
    }),
  );

  return {
    id: `daily-question-queue-${date || "undated"}`,
    source: "behavior_aware_daily_queue_engine",
    date,
    totalUnits,
    unitCounts,
    items,
    instructionalGrade: normalizedTargetGrade,
    eligibleFamilyIds: eligibleFamilies.map((family) => family.id),
    familyMastery,
    featureEvidence: {
      source: featureEvidence.source,
      focusFeatureIds: featureEvidence.focusFeatureIds,
      signalCount: featureEvidence.signals.length,
    },
    recovery: recoveryPlaced
      ? {
          sourceDate: String(recovery?.sourceDate || "").slice(0, 10) || null,
          familyId: recoveryFamilyId,
          unitCount: 1,
        }
      : null,
    supportPolicy,
    matchingPolicy: {
      primaryFocus: allocation?.topPriority?.id || "follow_confirmed_learning_path",
      finalCheckFocus: supportPolicy.finalCheckFocus,
      originalReplayPriority: allocation?.matchingPolicy?.originalReplayPriority || "protected",
    },
    guardrails: [
      "Queue selection uses prior behavior and the static or dynamic curve focus, but students only see the next question.",
      "Daily queue changes never update the dynamic learning curve. Only verified formal tests can do that.",
      "Every queue item must still pass the item generator validation gate before delivery.",
      "The daily queue stays inside the learner's current instructional-grade family range; a higher target level alone cannot skip the current range.",
      "A historical wrong answer stops consuming the retry bucket after a later no-hint success for that same family; hint-supported completion remains eligible until an independent success is recorded.",
      "A challenge can move to a graph-linked next family only after repeated independent evidence confirms the anchor and every named prerequisite. Otherwise it stays in the same family with a deeper variation.",
      "After one missed scheduled day, one existing daily slot becomes a light recovery unit; the system never adds a second full task.",
      "Feature-focused seed selection uses only repeated, confidence-bounded structural evidence. It stays within the selected family and instructional grade and cannot replace an exact original-question replay.",
      "A repeated guided final-check difficulty can retain a brief review and check focus for tomorrow, but guided text and final values are never treated as answer scores.",
      "Private family mastery estimates use only trusted scored answers to choose a review tie-breaker. They never relabel past answers or update a curve.",
    ],
  };
}
