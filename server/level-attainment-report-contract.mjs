import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { createMathLevelDefinition } from "../src/services/level-attainment-engine.js";
import { READING_FORM_TRANSFER_VARIANT_LEVELS } from "../src/services/variant-evidence-policy.js";
import { buildLevelAttainmentReport } from "./level-attainment-report-service.mjs";

function familyById(id) {
  return shanghaiMathItemFamilies.find((family) => family.id === id);
}

function questionResult({ family, variantLevel = "original" }) {
  return {
    questionId: `private-${family.id}-${variantLevel}`,
    familyId: family.id,
    variantLevel,
    knowledgePointIds: family.atlasNodeIds,
    isCorrect: true,
    qualityStatus: "system_validated",
  };
}

function verifiedStage({ id, targetGrade, questionResults }) {
  const transferItems = questionResults.filter((item) => READING_FORM_TRANSFER_VARIANT_LEVELS.includes(item.variantLevel));
  return {
    id,
    status: "completed_verified",
    eligibleForCurveUpdate: true,
    accuracy: 1,
    transferAccuracy: transferItems.length ? 1 : 0,
    assessmentScope: { targetGrade },
    questionResults,
  };
}

function completeEvidence(definition) {
  const coreFamilies = definition.coreFamilyIds.map(familyById);
  const prerequisiteFamilies = definition.prerequisiteFamilyIds.map(familyById);
  const results = [...coreFamilies, ...prerequisiteFamilies].map((family) => questionResult({ family }));
  coreFamilies.slice(0, 2).forEach((family) => {
    results.push(questionResult({ family, variantLevel: "change_one_number" }));
    results.push(questionResult({ family, variantLevel: "change_two_numbers" }));
  });
  results.push(questionResult({ family: coreFamilies[0], variantLevel: "context_change" }));
  results.push(questionResult({ family: coreFamilies[1], variantLevel: "relationship_reframe" }));
  return results;
}

const definition = createMathLevelDefinition({
  targetGrade: "G6",
  families: shanghaiMathItemFamilies,
  subjectId: "math-linear-equations",
});

const noFormalTest = buildLevelAttainmentReport({
  subjectId: "math-linear-equations",
  plan: { learningGoal: { targetGrade: "G6" }, stageAssessmentHistory: [] },
});
assert.equal(noFormalTest.availability, "available");
assert.equal(noFormalTest.officiallyReached, false);
assert.equal(noFormalTest.status, "awaiting_verified_test");
assert.equal(noFormalTest.visualProgress.lanes.find((lane) => lane.id === "formal_test")?.status, "collecting");
assert.equal(noFormalTest.studentCopy.nextFocus, "正式测试");

const partial = buildLevelAttainmentReport({
  subjectId: "math-linear-equations",
  plan: {
    learningGoal: { targetGrade: "G6" },
    stageAssessmentHistory: [
      verifiedStage({
        id: "partial-g6-stage",
        targetGrade: "G6",
        questionResults: [questionResult({ family: familyById(definition.coreFamilyIds[0]) })],
      }),
    ],
  },
});
assert.equal(partial.officiallyReached, false);
assert.equal(partial.status, "evidence_incomplete");
assert.equal(partial.visualProgress.lanes.find((lane) => lane.id === "formal_test")?.status, "ready");
assert.equal(partial.visualProgress.lanes.find((lane) => lane.id === "core_scope")?.status, "collecting");

const attained = buildLevelAttainmentReport({
  subjectId: "math-linear-equations",
  plan: {
    learningGoal: { targetGrade: "G6" },
    stageAssessmentHistory: [
      verifiedStage({
        id: "complete-g6-stage",
        targetGrade: "G6",
        questionResults: completeEvidence(definition),
      }),
    ],
  },
});
assert.equal(attained.officiallyReached, true);
assert.equal(attained.status, "attained");
assert.equal(attained.studentCopy.label, "G6 目标已确认");
assert.ok(attained.visualProgress.lanes.every((lane) => lane.status === "ready"));
assert.equal(JSON.stringify(attained).includes("questionId"), false);
assert.equal(JSON.stringify(attained).includes("familyId"), false);
assert.equal(JSON.stringify(attained).includes('"answer"'), false);

const nonMath = buildLevelAttainmentReport({
  subjectId: "english",
  plan: { learningGoal: { targetGrade: "G4" }, stageAssessmentHistory: [] },
});
assert.equal(nonMath.availability, "not_configured_for_subject");
assert.equal(nonMath.officiallyReached, false);

console.log("level-attainment-report-contract: passed");
