import { READING_FORM_TRANSFER_VARIANT_LEVELS } from "./variant-evidence-policy.js?v=variant-evidence-policy-1";

const GRADE_ORDER = ["G1", "G2", "G3", "G4", "G5", "G6"];
const TRANSFER_VARIANT_LEVELS = new Set(READING_FORM_TRANSFER_VARIANT_LEVELS);

function normalizeGrade(value) {
  const match = String(value || "").match(/G([1-6])/i);
  return match ? "G" + match[1] : null;
}

function gradeIndex(grade) {
  const index = GRADE_ORDER.indexOf(normalizeGrade(grade));
  return index >= 0 ? index : -1;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function isVerifiedStageResult(result) {
  return Boolean(result?.eligibleForCurveUpdate || result?.status === "completed_verified");
}

function targetGradeForStageResult(result) {
  return normalizeGrade(
    result?.assessmentScope?.targetGrade ||
      result?.assessmentScope?.coverage?.targetGrade ||
      result?.assessmentBlueprint?.targetGrade ||
      result?.levelAttainment?.targetGrade ||
      result?.targetGrade,
  );
}

function normalizeQuestionResult(item) {
  const gradeBands = (item?.gradeBands || item?.itemTags?.systemLevelTags?.gradeBands || [])
    .map(normalizeGrade)
    .filter(Boolean);
  const knowledgePointIds = uniqueStrings([
    ...(item?.knowledgePointIds || []),
    ...(item?.itemTags?.knowledgeTags?.knowledgePointIds || []),
    ...(item?.atlasNodeIds || []),
    ...(item?.itemTags?.atlasNodeIds || []),
  ]);
  return {
    familyId: item?.familyId || null,
    gradeBands,
    knowledgePointIds,
    isCorrect: Boolean(item?.isCorrect),
    variantLevel: item?.variantLevel || "original",
    qualityStatus: item?.qualityStatus || null,
  };
}

function summarizeFamilyEvidence(results, familyIds) {
  return familyIds.map((familyId) => {
    const items = results.filter((item) => item.familyId === familyId);
    const correctItems = items.filter((item) => item.isCorrect);
    const correctVariantLevels = new Set(correctItems.map((item) => item.variantLevel));
    return {
      familyId,
      itemCount: items.length,
      correctCount: correctItems.length,
      accuracy: items.length ? correctItems.length / items.length : null,
      correctVariantLevels: [...correctVariantLevels],
      hasStableVariantEvidence: ["original", "change_one_number", "change_two_numbers"].every((variant) =>
        correctVariantLevels.has(variant),
      ),
      hasCorrectTransferEvidence: [...correctVariantLevels].some((variantLevel) => TRANSFER_VARIANT_LEVELS.has(variantLevel)),
    };
  });
}

function summarizeKnowledgeNodeEvidence(results, nodeIds, accuracyThreshold) {
  return nodeIds.map((nodeId) => {
    const items = results.filter((item) => item.knowledgePointIds.includes(nodeId));
    const correctItems = items.filter((item) => item.isCorrect);
    const accuracy = items.length ? correctItems.length / items.length : null;
    return {
      nodeId,
      itemCount: items.length,
      correctCount: correctItems.length,
      accuracy,
      mastered: accuracy !== null && accuracy >= accuracyThreshold,
    };
  });
}

function policyCount(total, proportion) {
  return total ? Math.max(1, Math.ceil(total * proportion)) : 0;
}

function nodeIdsForFamilies(families, familyIds) {
  const allowedFamilyIds = new Set(familyIds);
  return uniqueStrings(
    families.filter((family) => allowedFamilyIds.has(family.id)).flatMap((family) => family.atlasNodeIds || []),
  );
}

function verifiedResultsForLevel({ currentStageResult, priorStageResults, targetGrade }) {
  const scopedPriorResults = (priorStageResults || []).filter(
    (result) => isVerifiedStageResult(result) && targetGradeForStageResult(result) === targetGrade,
  );
  const current = isVerifiedStageResult(currentStageResult) ? [currentStageResult] : [];
  const seen = new Set();
  return [...scopedPriorResults, ...current].filter((result, index) => {
    const identity = result?.id || result?.sessionId || "stage-result-" + index;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function createMathLevelDefinition({ targetGrade = "G6", families = [], subjectId = "math" } = {}) {
  const grade = normalizeGrade(targetGrade) || "G6";
  const targetIndex = gradeIndex(grade);
  const coreFamilyIds = families.filter((family) => family.gradeBands?.includes(grade)).map((family) => family.id);
  const prerequisiteFamilyIds =
    targetIndex <= 0
      ? []
      : families
          .filter(
            (family) =>
              !coreFamilyIds.includes(family.id) &&
              family.gradeBands?.some((familyGrade) => gradeIndex(familyGrade) === targetIndex - 1),
          )
          .map((family) => family.id);
  const coreKnowledgeNodeIds = nodeIdsForFamilies(families, coreFamilyIds);
  const prerequisiteKnowledgeNodeIds = nodeIdsForFamilies(families, prerequisiteFamilyIds).filter(
    (nodeId) => !coreKnowledgeNodeIds.includes(nodeId),
  );

  return {
    id: "cn-shanghai-math-" + grade.toLowerCase() + "-v3",
    version: "math-level-attainment-v3",
    subjectId,
    targetGrade: grade,
    coreFamilyIds,
    prerequisiteFamilyIds,
    coreKnowledgeNodeIds,
    prerequisiteKnowledgeNodeIds,
    masteryPolicy: {
      coreFamilyAccuracy: 0.8,
      prerequisiteFamilyAccuracy: 0.75,
      coreKnowledgeNodeAccuracy: 0.8,
      latestVerifiedStageAccuracy: 0.8,
      latestVerifiedTransferAccuracy: 0.75,
      requiredCoreFamilyCount: policyCount(coreFamilyIds.length, 0.8),
      requiredPrerequisiteFamilyCount: policyCount(prerequisiteFamilyIds.length, 0.75),
      requiredCoreKnowledgeNodeCount: policyCount(coreKnowledgeNodeIds.length, 0.7),
      requiredStableVariantFamilyCount: Math.min(2, policyCount(coreFamilyIds.length, 0.8)),
      requiredCorrectTransferItemCount: 1,
      requiredCorrectTransferVariantTypeCount: Math.min(2, TRANSFER_VARIANT_LEVELS.size),
    },
    guardrail:
      "A level decision needs target-scoped verified assessment evidence across curriculum coverage, knowledge nodes, prerequisites, and controlled variants. A single focused stage test may calibrate the curve but cannot by itself claim an entire grade level.",
  };
}

export function evaluateLevelAttainment({ levelDefinition, currentStageResult, priorStageResults = [] } = {}) {
  if (!levelDefinition) throw new Error("level_definition_required");

  const verifiedStageResults = verifiedResultsForLevel({
    currentStageResult,
    priorStageResults,
    targetGrade: levelDefinition.targetGrade,
  });
  const latestVerifiedResult = [...verifiedStageResults].at(-1) || null;
  const evidenceResults = verifiedStageResults.flatMap((result) => (result.questionResults || []).map(normalizeQuestionResult));
  const policy = levelDefinition.masteryPolicy;
  const coreEvidence = summarizeFamilyEvidence(evidenceResults, levelDefinition.coreFamilyIds);
  const prerequisiteEvidence = summarizeFamilyEvidence(evidenceResults, levelDefinition.prerequisiteFamilyIds);
  const coreKnowledgeNodeEvidence = summarizeKnowledgeNodeEvidence(
    evidenceResults,
    levelDefinition.coreKnowledgeNodeIds,
    policy.coreKnowledgeNodeAccuracy,
  );
  const coveredCoreFamilies = coreEvidence.filter((item) => item.itemCount > 0);
  const masteredCoreFamilies = coreEvidence.filter((item) => item.accuracy !== null && item.accuracy >= policy.coreFamilyAccuracy);
  const coveredPrerequisiteFamilies = prerequisiteEvidence.filter((item) => item.itemCount > 0);
  const masteredPrerequisiteFamilies = prerequisiteEvidence.filter(
    (item) => item.accuracy !== null && item.accuracy >= policy.prerequisiteFamilyAccuracy,
  );
  const coveredCoreKnowledgeNodes = coreKnowledgeNodeEvidence.filter((item) => item.itemCount > 0);
  const masteredCoreKnowledgeNodes = coreKnowledgeNodeEvidence.filter((item) => item.mastered);
  const stableVariantFamilies = coreEvidence.filter((item) => item.hasStableVariantEvidence);
  const correctTransferItems = evidenceResults.filter(
    (item) =>
      levelDefinition.coreFamilyIds.includes(item.familyId) &&
      TRANSFER_VARIANT_LEVELS.has(item.variantLevel) &&
      item.isCorrect,
  );
  const correctTransferVariantLevels = [...new Set(correctTransferItems.map((item) => item.variantLevel))];
  const unmetCriteria = [];

  if (!latestVerifiedResult) {
    unmetCriteria.push("verified_stage_test_required");
  } else {
    if (latestVerifiedResult.accuracy < policy.latestVerifiedStageAccuracy) {
      unmetCriteria.push("latest_stage_accuracy_below_threshold");
    }
    if (latestVerifiedResult.transferAccuracy < policy.latestVerifiedTransferAccuracy) {
      unmetCriteria.push("latest_stage_transfer_below_threshold");
    }
  }

  if (coveredCoreFamilies.length < policy.requiredCoreFamilyCount) {
    unmetCriteria.push("core_family_coverage_insufficient");
  }
  if (masteredCoreFamilies.length < policy.requiredCoreFamilyCount) {
    unmetCriteria.push("core_family_mastery_insufficient");
  }
  if (coveredCoreKnowledgeNodes.length < policy.requiredCoreKnowledgeNodeCount) {
    unmetCriteria.push("core_knowledge_node_coverage_insufficient");
  }
  if (masteredCoreKnowledgeNodes.length < policy.requiredCoreKnowledgeNodeCount) {
    unmetCriteria.push("core_knowledge_node_mastery_insufficient");
  }
  if (coveredPrerequisiteFamilies.length < policy.requiredPrerequisiteFamilyCount) {
    unmetCriteria.push("prerequisite_evidence_insufficient");
  }
  if (masteredPrerequisiteFamilies.length < policy.requiredPrerequisiteFamilyCount) {
    unmetCriteria.push("prerequisite_mastery_insufficient");
  }
  if (stableVariantFamilies.length < policy.requiredStableVariantFamilyCount) {
    unmetCriteria.push("controlled_variant_stability_insufficient");
  }
  if (correctTransferItems.length < policy.requiredCorrectTransferItemCount) {
    unmetCriteria.push("transfer_evidence_insufficient");
  }
  if (correctTransferVariantLevels.length < policy.requiredCorrectTransferVariantTypeCount) {
    unmetCriteria.push("transfer_variant_type_coverage_insufficient");
  }

  const attained = unmetCriteria.length === 0;
  return {
    id: levelDefinition.id + "-decision-" + (currentStageResult?.id || "pending"),
    levelDefinitionId: levelDefinition.id,
    policyVersion: levelDefinition.version,
    subjectId: levelDefinition.subjectId,
    targetGrade: levelDefinition.targetGrade,
    status: attained ? "attained" : latestVerifiedResult ? "evidence_incomplete" : "awaiting_verified_test",
    officiallyReached: attained,
    evaluatedAt: new Date().toISOString(),
    latestVerifiedStageResultId: latestVerifiedResult?.id || null,
    evidence: {
      verifiedStageCount: verifiedStageResults.length,
      coreFamilyCoverage: {
        observed: coveredCoreFamilies.length,
        required: policy.requiredCoreFamilyCount,
        mastered: masteredCoreFamilies.length,
        families: coreEvidence,
      },
      coreKnowledgeNodeCoverage: {
        observed: coveredCoreKnowledgeNodes.length,
        required: policy.requiredCoreKnowledgeNodeCount,
        mastered: masteredCoreKnowledgeNodes.length,
        nodes: coreKnowledgeNodeEvidence,
      },
      prerequisiteCoverage: {
        observed: coveredPrerequisiteFamilies.length,
        required: policy.requiredPrerequisiteFamilyCount,
        mastered: masteredPrerequisiteFamilies.length,
        families: prerequisiteEvidence,
      },
      variantStability: {
        observed: stableVariantFamilies.length,
        required: policy.requiredStableVariantFamilyCount,
        familyIds: stableVariantFamilies.map((item) => item.familyId),
      },
      transfer: {
        correctItems: correctTransferItems.length,
        requiredItems: policy.requiredCorrectTransferItemCount,
        correctVariantLevels: correctTransferVariantLevels,
        observedVariantTypeCount: correctTransferVariantLevels.length,
        requiredVariantTypeCount: policy.requiredCorrectTransferVariantTypeCount,
      },
    },
    unmetCriteria,
    guardrail: levelDefinition.guardrail,
  };
}
