import { createMathLevelDefinition } from "./level-attainment-engine.js?v=level-attainment-2";
import { READING_FORM_TRANSFER_VARIANT_LEVELS } from "./variant-evidence-policy.js?v=variant-evidence-policy-1";
import {
  generateMathQuestionCandidate,
  validateMathQuestionCandidate,
} from "./math-item-generator.js?v=math-help-framework-21";

function clampInteger(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.floor(Number(value) || minimum)));
}

function rotate(items, offset = 0) {
  if (!items.length) return [];
  const start = Math.abs(Math.floor(Number(offset) || 0)) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function resolveFamilies(ids, familyById) {
  return ids.map((id) => familyById.get(id)).filter(Boolean);
}

function choosePreferredFirst(families, preferredFamilyId) {
  const preferred = families.find((family) => family.id === preferredFamilyId);
  return preferred ? [preferred, ...families.filter((family) => family.id !== preferredFamilyId)] : families;
}

function buildProbePlan({ coreFamilies, prerequisiteFamilies, maxQuestions, attemptIndex = 0 }) {
  const cap = Math.max(1, maxQuestions);
  const plan = [];
  const seen = new Set();
  const add = ({ family, variantLevel, evidenceRole, familyRole }) => {
    if (!family || plan.length >= cap) return false;
    const key = `${family.id}:${variantLevel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    plan.push({ family, variantLevel, evidenceRole, familyRole });
    return true;
  };

  const coreCoverageCount = Math.min(coreFamilies.length, maxQuestions >= 7 ? 4 : Math.max(2, maxQuestions - 3));
  const selectedCore = coreFamilies.slice(0, coreCoverageCount);
  selectedCore.forEach((family) => add({ family, variantLevel: "original", evidenceRole: "core_coverage", familyRole: "core" }));

  const prerequisiteSlots = Math.min(
    prerequisiteFamilies.length,
    Math.max(0, Math.min(2, maxQuestions - selectedCore.length - 3)),
  );
  prerequisiteFamilies.slice(0, prerequisiteSlots).forEach((family) => {
    add({ family, variantLevel: "original", evidenceRole: "prerequisite_check", familyRole: "prerequisite" });
  });

  const stabilityFamily = selectedCore[0] || coreFamilies[0];
  add({
    family: stabilityFamily,
    variantLevel: "change_one_number",
    evidenceRole: "controlled_variant_one",
    familyRole: "core",
  });
  add({
    family: stabilityFamily,
    variantLevel: "change_two_numbers",
    evidenceRole: "controlled_variant_two",
    familyRole: "core",
  });

  const transferFamily = selectedCore[1] || stabilityFamily;
  const transferVariants = READING_FORM_TRANSFER_VARIANT_LEVELS;
  const transferVariantLevel = transferVariants[Math.abs(Math.floor(Number(attemptIndex) || 0)) % transferVariants.length];
  add({
    family: transferFamily,
    variantLevel: transferVariantLevel,
    evidenceRole: `transfer_${transferVariantLevel}`,
    familyRole: "core",
  });

  const fillFamilies = [...selectedCore, ...coreFamilies, ...prerequisiteFamilies];
  let fillIndex = 0;
  const fillVariants = [
    "original",
    "context_change",
    "relationship_reframe",
    "question_order_variant",
    "change_one_number",
    "change_two_numbers",
  ];
  while (plan.length < cap && fillFamilies.length) {
    const family = fillFamilies[fillIndex % fillFamilies.length];
    const variantLevel = fillVariants[Math.floor(fillIndex / fillFamilies.length) % fillVariants.length];
    const before = plan.length;
    add({ family, variantLevel, evidenceRole: "rotating_coverage", familyRole: coreFamilies.includes(family) ? "core" : "prerequisite" });
    fillIndex += 1;
    if (plan.length === before && fillIndex > fillFamilies.length * fillVariants.length) break;
  }

  return plan;
}

export function assembleStageAssessment({
  aiVersion = "semi_ai",
  attemptIndex = 0,
  families = [],
  maxQuestions = 8,
  minQuestions = 6,
  preferredFamilyId = null,
  subjectId = "math",
  targetGrade = "G6",
} = {}) {
  const cap = clampInteger(maxQuestions, 4, 8);
  const familyById = new Map(families.map((family) => [family.id, family]));
  const levelDefinition = createMathLevelDefinition({ targetGrade, families, subjectId });
  const rotatedCore = rotate(resolveFamilies(levelDefinition.coreFamilyIds, familyById), attemptIndex);
  const coreFamilies = choosePreferredFirst(rotatedCore, preferredFamilyId);
  const prerequisiteFamilies = rotate(resolveFamilies(levelDefinition.prerequisiteFamilyIds, familyById), attemptIndex);
  const probes = buildProbePlan({ coreFamilies, prerequisiteFamilies, maxQuestions: cap, attemptIndex });
  const seedBase = 1000 + Math.max(0, attemptIndex) * 101;

  const questions = probes
    .map((probe, index) => {
      const candidate = validateMathQuestionCandidate(
        generateMathQuestionCandidate({
          aiVersion,
          family: probe.family,
          seed: seedBase + index * 17,
          instructionalGrade: levelDefinition.targetGrade,
          variantLevel: probe.variantLevel,
        }),
      );
      if (candidate.qualityStatus !== "system_validated") return null;
      return {
        ...candidate,
        id: `stage-${levelDefinition.targetGrade}-${attemptIndex + 1}-${candidate.id}`,
        metadataTags: {
          ...candidate.metadataTags,
          stageAssessmentRouting: {
            targetGrade: levelDefinition.targetGrade,
            assessmentScope: "cross_family_calibration_sample",
            attemptIndex,
            evidenceRole: probe.evidenceRole,
            familyRole: probe.familyRole,
          },
        },
      };
    })
    .filter(Boolean);

  const requiredMinimum = Math.min(clampInteger(minQuestions, 4, cap), questions.length);
  const observedCoreFamilyIds = [...new Set(
    questions
      .filter((question) => question.metadataTags?.stageAssessmentRouting?.familyRole === "core")
      .map((question) => question.familyId),
  )];
  const observedPrerequisiteFamilyIds = [...new Set(
    questions
      .filter((question) => question.metadataTags?.stageAssessmentRouting?.familyRole === "prerequisite")
      .map((question) => question.familyId),
  )];

  return {
    assessmentMode: "cross_family_generated_stage_test",
    minimumQuestions: requiredMinimum,
    questions,
    levelDefinition,
    coverage: {
      assessmentScope: "cross_family_calibration_sample",
      targetGrade: levelDefinition.targetGrade,
      questionCount: questions.length,
      requestedQuestionCap: cap,
      coreFamilyIds: observedCoreFamilyIds,
      prerequisiteFamilyIds: observedPrerequisiteFamilyIds,
      controlledVariantFamilyId: questions.find(
        (question) => question.metadataTags?.stageAssessmentRouting?.evidenceRole === "controlled_variant_one",
      )?.familyId || null,
      transferFamilyId: questions.find(
        (question) => String(question.metadataTags?.stageAssessmentRouting?.evidenceRole || "").startsWith("transfer_"),
      )?.familyId || null,
      transferVariantLevel: questions.find(
        (question) => String(question.metadataTags?.stageAssessmentRouting?.evidenceRole || "").startsWith("transfer_"),
      )?.metadataTags?.variantLevel || null,
    },
    guardrail:
      "A stage test samples several target-level and direct-prerequisite structures, then adds controlled number and reading-form variants. It calibrates the curve after a verified result; full grade attainment still requires cumulative evidence across formal tests.",
  };
}
