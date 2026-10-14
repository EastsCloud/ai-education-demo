import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createMathLevelDefinition, evaluateLevelAttainment } from "../src/services/level-attainment-engine.js";
import { READING_FORM_TRANSFER_VARIANT_LEVELS } from "../src/services/variant-evidence-policy.js";

function familyById(id) {
  return shanghaiMathItemFamilies.find((family) => family.id === id);
}

function questionResult({ family, variantLevel = "original", knowledgePointIds = family.atlasNodeIds }) {
  return {
    familyId: family.id,
    variantLevel,
    knowledgePointIds,
    isCorrect: true,
    qualityStatus: "system_validated",
  };
}

function verifiedResult({ id, targetGrade, questionResults }) {
  const transferItems = questionResults.filter((item) => READING_FORM_TRANSFER_VARIANT_LEVELS.includes(item.variantLevel));
  const transferCorrect = transferItems.filter((item) => item.isCorrect);
  return {
    id,
    status: "completed_verified",
    eligibleForCurveUpdate: true,
    accuracy: 1,
    transferAccuracy: transferItems.length ? transferCorrect.length / transferItems.length : 1,
    assessmentScope: { targetGrade },
    questionResults,
  };
}

function completeEvidence(definition, { includeKnowledgeNodes = true } = {}) {
  const coreFamilies = definition.coreFamilyIds.map(familyById);
  const prerequisiteFamilies = definition.prerequisiteFamilyIds.map(familyById);
  const knowledgePointIdsFor = (family) => (includeKnowledgeNodes ? family.atlasNodeIds : []);
  const results = [
    ...coreFamilies.map((family) => questionResult({ family, knowledgePointIds: knowledgePointIdsFor(family) })),
    ...prerequisiteFamilies.map((family) => questionResult({ family, knowledgePointIds: knowledgePointIdsFor(family) })),
  ];

  coreFamilies.slice(0, 2).forEach((family) => {
    results.push(questionResult({ family, variantLevel: "change_one_number", knowledgePointIds: knowledgePointIdsFor(family) }));
    results.push(questionResult({ family, variantLevel: "change_two_numbers", knowledgePointIds: knowledgePointIdsFor(family) }));
  });
  results.push(questionResult({ family: coreFamilies[0], variantLevel: "context_change", knowledgePointIds: knowledgePointIdsFor(coreFamilies[0]) }));
  results.push(questionResult({ family: coreFamilies[1], variantLevel: "relationship_reframe", knowledgePointIds: knowledgePointIdsFor(coreFamilies[1]) }));
  return results;
}

const definition = createMathLevelDefinition({
  targetGrade: "G6",
  families: shanghaiMathItemFamilies,
  subjectId: "math",
});

const fullyVerified = verifiedResult({
  id: "g6-full-evidence",
  targetGrade: "G6",
  questionResults: completeEvidence(definition),
});
const attained = evaluateLevelAttainment({
  levelDefinition: definition,
  currentStageResult: fullyVerified,
});

assert.equal(attained.officiallyReached, true);
assert.ok(attained.evidence.coreKnowledgeNodeCoverage.mastered >= definition.masteryPolicy.requiredCoreKnowledgeNodeCount);
assert.equal(attained.evidence.transfer.observedVariantTypeCount, 2);
assert.equal(attained.unmetCriteria.length, 0);

const thinCurrent = verifiedResult({
  id: "g6-thin-current",
  targetGrade: "G6",
  questionResults: [
    questionResult({ family: familyById(definition.coreFamilyIds[0]) }),
    questionResult({ family: familyById(definition.coreFamilyIds[0]), variantLevel: "context_change" }),
  ],
});
const foreignTargetEvidence = verifiedResult({
  id: "g5-foreign-but-structurally-strong",
  targetGrade: "G5",
  questionResults: completeEvidence(definition),
});
const targetScoped = evaluateLevelAttainment({
  levelDefinition: definition,
  currentStageResult: thinCurrent,
  priorStageResults: [foreignTargetEvidence],
});

assert.equal(targetScoped.officiallyReached, false);
assert.equal(targetScoped.evidence.verifiedStageCount, 1);
assert.ok(targetScoped.unmetCriteria.includes("core_family_coverage_insufficient"));
assert.ok(targetScoped.unmetCriteria.includes("core_knowledge_node_coverage_insufficient"));

const noNodeTags = verifiedResult({
  id: "g6-family-evidence-without-node-tags",
  targetGrade: "G6",
  questionResults: completeEvidence(definition, { includeKnowledgeNodes: false }),
});
const noNodeDecision = evaluateLevelAttainment({
  levelDefinition: definition,
  currentStageResult: noNodeTags,
});

assert.equal(noNodeDecision.officiallyReached, false);
assert.ok(
  noNodeDecision.evidence.coreFamilyCoverage.mastered >= noNodeDecision.evidence.coreFamilyCoverage.required,
);
assert.equal(noNodeDecision.evidence.coreKnowledgeNodeCoverage.observed, 0);
assert.ok(noNodeDecision.unmetCriteria.includes("core_knowledge_node_coverage_insufficient"));
assert.ok(noNodeDecision.unmetCriteria.includes("core_knowledge_node_mastery_insufficient"));

const oneTransferTypeEvidence = verifiedResult({
  id: "g6-one-transfer-type-only",
  targetGrade: "G6",
  questionResults: completeEvidence(definition).filter((item) => item.variantLevel !== "relationship_reframe"),
});
const oneTransferTypeDecision = evaluateLevelAttainment({
  levelDefinition: definition,
  currentStageResult: oneTransferTypeEvidence,
});
assert.equal(oneTransferTypeDecision.officiallyReached, false);
assert.equal(oneTransferTypeDecision.evidence.transfer.observedVariantTypeCount, 1);
assert.ok(oneTransferTypeDecision.unmetCriteria.includes("transfer_variant_type_coverage_insufficient"));

const structuralTransferEvidence = verifiedResult({
  id: "g6-question-order-transfer",
  targetGrade: "G6",
  questionResults: [
    ...completeEvidence(definition).filter((item) => item.variantLevel !== "context_change"),
    questionResult({
      family: familyById(definition.coreFamilyIds[0]),
      variantLevel: "question_order_variant",
    }),
  ],
});
const structuralTransferDecision = evaluateLevelAttainment({
  levelDefinition: definition,
  currentStageResult: structuralTransferEvidence,
});
assert.equal(structuralTransferDecision.officiallyReached, true);
assert.ok(structuralTransferDecision.evidence.transfer.correctItems >= 1);
assert.ok(structuralTransferDecision.evidence.transfer.correctVariantLevels.includes("question_order_variant"));

console.log("level-attainment-contract: passed");
