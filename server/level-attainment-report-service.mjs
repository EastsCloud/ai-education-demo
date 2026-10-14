import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createMathLevelDefinition, evaluateLevelAttainment } from "../src/services/level-attainment-engine.js";

const GRADE_PATTERN = /^G[1-6]$/i;

function normalizeGrade(value) {
  const grade = String(value || "").trim().toUpperCase();
  return GRADE_PATTERN.test(grade) ? grade : null;
}

function isMathSubject(subjectId) {
  return /^math(?:[-_]|$)/i.test(String(subjectId || ""));
}

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function targetGradeForStageResult(result) {
  return normalizeGrade(
    result?.assessmentScope?.targetGrade ||
      result?.assessmentBlueprint?.targetGrade ||
      result?.levelAttainment?.targetGrade ||
      result?.targetGrade,
  );
}

function compactCoverage(coverage = {}) {
  return {
    observed: Math.max(0, Number(coverage.observed) || 0),
    required: Math.max(0, Number(coverage.required) || 0),
    mastered: Math.max(0, Number(coverage.mastered) || 0),
  };
}

function isCoverageReady(coverage) {
  return coverage.required === 0 || (coverage.observed >= coverage.required && coverage.mastered >= coverage.required);
}

function buildEvidenceLanes({ evidence, officiallyReached }) {
  const coreFamilies = compactCoverage(evidence?.coreFamilyCoverage);
  const coreKnowledgeNodes = compactCoverage(evidence?.coreKnowledgeNodeCoverage);
  const prerequisites = compactCoverage(evidence?.prerequisiteCoverage);
  const stability = {
    observed: Math.max(0, Number(evidence?.variantStability?.observed) || 0),
    required: Math.max(0, Number(evidence?.variantStability?.required) || 0),
  };
  const transfer = {
    observed: Math.max(0, Number(evidence?.transfer?.observedVariantTypeCount) || 0),
    required: Math.max(0, Number(evidence?.transfer?.requiredVariantTypeCount) || 0),
    correctItems: Math.max(0, Number(evidence?.transfer?.correctItems) || 0),
    requiredItems: Math.max(0, Number(evidence?.transfer?.requiredItems) || 0),
  };
  const verifiedStageCount = Math.max(0, Number(evidence?.verifiedStageCount) || 0);
  const coreReady = isCoverageReady(coreFamilies) && isCoverageReady(coreKnowledgeNodes);
  const prerequisiteReady = isCoverageReady(prerequisites);
  const stabilityReady = stability.required === 0 || stability.observed >= stability.required;
  const transferReady =
    (transfer.required === 0 || transfer.observed >= transfer.required) &&
    (transfer.requiredItems === 0 || transfer.correctItems >= transfer.requiredItems);
  const lanes = [
    {
      id: "formal_test",
      label: "正式测试",
      applicable: true,
      complete: verifiedStageCount > 0,
      observed: verifiedStageCount,
      required: 1,
    },
    {
      id: "core_scope",
      label: "核心范围",
      applicable: true,
      complete: coreReady,
      observed: Math.min(coreFamilies.mastered, coreKnowledgeNodes.mastered),
      required: Math.max(coreFamilies.required, coreKnowledgeNodes.required),
    },
    {
      id: "foundation",
      label: "前置基础",
      applicable: prerequisites.required > 0,
      complete: prerequisiteReady,
      observed: prerequisites.mastered,
      required: prerequisites.required,
    },
    {
      id: "stable_variants",
      label: "换数字后仍稳定",
      applicable: stability.required > 0,
      complete: stabilityReady,
      observed: stability.observed,
      required: stability.required,
    },
    {
      id: "transfer",
      label: "换说法后仍会做",
      applicable: transfer.required > 0 || transfer.requiredItems > 0,
      complete: transferReady,
      observed: transfer.observed,
      required: transfer.required,
    },
  ]
    .filter((lane) => lane.applicable)
    .map((lane) => ({
      ...lane,
      status: officiallyReached || lane.complete ? "ready" : "collecting",
    }));

  return {
    lanes,
    completedLaneCount: lanes.filter((lane) => lane.status === "ready").length,
    totalLaneCount: lanes.length,
    coreFamilies,
    coreKnowledgeNodes,
    prerequisites,
    stability,
    transfer,
    verifiedStageCount,
  };
}

function studentCopy({ targetGrade, officiallyReached, visualProgress }) {
  if (officiallyReached) {
    return {
      label: `${targetGrade} 目标已确认`,
      detail: "正式测试已经确认了核心题型、变式和换一种说法后的理解。",
      nextFocus: null,
    };
  }

  if (visualProgress.verifiedStageCount === 0) {
    return {
      label: `${targetGrade} 目标正在起步`,
      detail: "先沿着学习路径练习；正式测试会开始确认你的变化。",
      nextFocus: "正式测试",
    };
  }

  const nextLane = visualProgress.lanes.find((lane) => lane.status !== "ready");
  return {
    label: `${targetGrade} 目标证据积累中`,
    detail: "正式测试正在把不同题型、变式和换一种说法后的表现连起来。",
    nextFocus: nextLane?.label || null,
  };
}

// Recalculate from stored formal evidence so a report never trusts browser state.
export function buildLevelAttainmentReport({ plan, subjectId }) {
  const targetGrade = normalizeGrade(plan?.learningGoal?.targetGrade);
  if (!targetGrade) return null;

  if (!isMathSubject(subjectId)) {
    return {
      source: "level_attainment_report_v1",
      availability: "not_configured_for_subject",
      targetGrade,
      officiallyReached: false,
      studentCopy: {
        label: `${targetGrade} 目标已设定`,
        detail: "这个学科的正式目标确认规则会在题型逻辑准备好后加入。",
        nextFocus: null,
      },
      guardrail: "Official attainment is only shown after a subject-specific, verified formal-test policy is available.",
    };
  }

  const targetScopedHistory = (plan?.stageAssessmentHistory || [])
    .filter((result) => targetGradeForStageResult(result) === targetGrade)
    .slice()
    .sort((left, right) => timestamp(left.completedAt || left.createdAt) - timestamp(right.completedAt || right.createdAt));
  const currentStageResult = targetScopedHistory.at(-1) || null;
  const priorStageResults = currentStageResult ? targetScopedHistory.slice(0, -1) : [];
  const levelDefinition = createMathLevelDefinition({
    targetGrade,
    families: shanghaiMathItemFamilies,
    subjectId,
  });
  const decision = evaluateLevelAttainment({
    levelDefinition,
    currentStageResult,
    priorStageResults,
  });
  const visualProgress = buildEvidenceLanes({
    evidence: decision.evidence,
    officiallyReached: decision.officiallyReached,
  });

  return {
    source: "level_attainment_report_v1",
    availability: "available",
    policyVersion: decision.policyVersion,
    targetGrade,
    status: decision.status,
    officiallyReached: decision.officiallyReached,
    latestVerifiedStageResultId: decision.latestVerifiedStageResultId,
    visualProgress,
    studentCopy: studentCopy({
      targetGrade,
      officiallyReached: decision.officiallyReached,
      visualProgress,
    }),
    guardrail:
      "Learning-path progress and official level confirmation are different signals. Only verified formal-test evidence can confirm a target level.",
  };
}
