import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { assembleInitialAbilityTest } from "../src/services/ability-test-assembly.js";
import { createDailyQuestionQueue } from "../src/services/daily-question-queue-engine.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { getSupportedMathItemModelVariants } from "../src/services/math-item-model-specification.js";
import { assembleStageAssessment } from "../src/services/stage-assessment-assembly.js";

const GRADES = ["G1", "G2", "G3", "G4", "G5", "G6"];
const REQUIRED_DOMAINS = [
  "number_and_operation",
  "quantity_relationship",
  "equation_and_algebra_seed",
  "fraction_decimal_percent",
  "measurement_and_units",
  "geometry_and_space",
  "statistics_and_probability",
  "comprehensive_application",
];
const REQUIRED_FAMILY_IDS = [
  "square_perimeter_intro",
  "division_remainder_grouping",
  "fraction_subtract_same_denominator",
  "decimal_divide_equal_share",
  "data_range_comparison",
  "triangle_area_application",
  "addition_subtraction_regrouping",
  "multiplication_division_inverse",
  "integer_operation_order",
  "fraction_equivalent_compare",
  "decimal_rounding_estimation",
  "circle_circumference_application",
  "trapezoid_area_application",
  "proportion_scale_application",
];
const MINIMUM_FAMILY_COVERAGE = { G1: 7, G2: 12, G3: 18, G4: 19, G5: 28, G6: 23 };

assert.ok(shanghaiMathItemFamilies.length >= 41, "math catalog should retain broad G1-G6 coverage");
REQUIRED_FAMILY_IDS.forEach((familyId) => {
  assert.ok(shanghaiMathItemFamilies.some((family) => family.id === familyId), `missing required family: ${familyId}`);
});
REQUIRED_DOMAINS.forEach((domain) => {
  assert.ok(
    shanghaiMathItemFamilies.some((family) => family.domain === domain),
    `missing curriculum domain: ${domain}`,
  );
});

GRADES.forEach((grade) => {
  const covered = shanghaiMathItemFamilies.filter((family) => family.gradeBands.includes(grade));
  assert.ok(
    covered.length >= MINIMUM_FAMILY_COVERAGE[grade],
    `${grade} needs broad family coverage; received ${covered.length}`,
  );
});

let generatedCandidateCount = 0;
shanghaiMathItemFamilies.forEach((family) => {
  family.gradeBands.forEach((instructionalGrade) => {
    [-23, 0, 7, 41].forEach((seed) => {
      getSupportedMathItemModelVariants(family).forEach((variantLevel) => {
        const candidate = validateMathQuestionCandidate(
          generateMathQuestionCandidate({ family, instructionalGrade, seed, variantLevel }),
        );
        generatedCandidateCount += 1;

        assert.equal(candidate.qualityStatus, "system_validated", `${family.id}/${instructionalGrade}/${variantLevel}/${seed}`);
        assert.notEqual(candidate.metadataTags.contextTemplateId, "fallback-bounded-context", `${family.id} needs a real generator`);
        assert.equal(candidate.metadataTags.instructionalGrade, instructionalGrade);
        assert.equal(candidate.metadataTags.itemTags.systemLevelTags.instructionalGrade, `CN_SH_${instructionalGrade}`);
        assert.equal(candidate.metadataTags.itemTags.generationTags.instructionalGrade, instructionalGrade);
        assert.ok(candidate.metadataTags.featureSignature.matchingKeys.includes(`family:${family.id}`));
        assert.ok(candidate.metadataTags.featureSignature.matchingKeys.includes(`variant:${variantLevel}`));
      });
    });
  });

  if (family.gradeBands.length > 1) {
    const lowerGrade = family.gradeBands[0];
    const upperGrade = family.gradeBands.at(-1);
    const lower = generateMathQuestionCandidate({ family, instructionalGrade: lowerGrade, seed: 19 });
    const upper = generateMathQuestionCandidate({ family, instructionalGrade: upperGrade, seed: 19 });
    assert.ok(
      lower.metadataTags.generationBoundary.effectiveSeed <= upper.metadataTags.generationBoundary.effectiveSeed,
      `${family.id} should not expand number complexity downward`,
    );
  }
});

GRADES.forEach((targetGrade) => {
  const initial = assembleInitialAbilityTest({
    families: shanghaiMathItemFamilies,
    targetGrade,
    maxQuestions: 8,
    minQuestions: 4,
  });
  assert.ok(initial.questions.length >= 4 && initial.questions.length <= 8, `${targetGrade} initial test length`);
  assert.ok(initial.questions.every((question) => question.qualityStatus === "system_validated"), `${targetGrade} initial items`);
  assert.ok(
    initial.questions.every((question) => question.metadataTags.gradeBands.includes(question.metadataTags.instructionalGrade)),
    `${targetGrade} initial grade tags`,
  );
  assert.ok(
    initial.questions.some((question) => ["context_change", "relationship_reframe", "question_order_variant"].includes(question.metadataTags.variantLevel)),
    `${targetGrade} initial test needs one bounded form-transfer probe`,
  );
  assert.ok(initial.coverage.controlledTransferQuestionCount >= 1, `${targetGrade} initial transfer coverage`);

  const stage = assembleStageAssessment({
    families: shanghaiMathItemFamilies,
    targetGrade,
    attemptIndex: 2,
    maxQuestions: 8,
    minQuestions: 6,
  });
  assert.ok(stage.questions.length >= 6 && stage.questions.length <= 8, `${targetGrade} stage-test length`);
  assert.ok(stage.questions.every((question) => question.qualityStatus === "system_validated"), `${targetGrade} stage-test items`);
  assert.ok(stage.coverage.coreFamilyIds.length >= 2, `${targetGrade} stage-test core breadth`);

  const dailyQueue = createDailyQuestionQueue({
    allocation: {
      buckets: {
        wrong_retry: 0.4,
        correct_review: 0.25,
        new_stage_questions: 0.25,
        challenge_extension: 0.1,
      },
    },
    date: `2026-07-14-${targetGrade}`,
    dailyMinutes: 30,
    families: shanghaiMathItemFamilies,
    plannedFamilyId: "linear_equation_word_problem",
    targetGrade,
    behaviorEvents: [
      {
        eventType: "answer_submitted",
        timestamp: "2026-07-13T12:00:00.000Z",
        payload: {
          isCorrect: false,
          questionFamilyId: "linear_equation_word_problem",
        },
      },
    ],
  });
  assert.equal(dailyQueue.instructionalGrade, targetGrade);
  assert.ok(
    dailyQueue.items.every((item) => {
      const family = shanghaiMathItemFamilies.find((candidate) => candidate.id === item.familyId);
      return family?.gradeBands.includes(targetGrade) && item.instructionalGrade === targetGrade;
    }),
    `${targetGrade} daily queue must not jump directly to another grade's family`,
  );
});

const seededInitialA = assembleInitialAbilityTest({
  assessmentSeed: 1731,
  families: shanghaiMathItemFamilies,
  targetGrade: "G5",
  maxQuestions: 8,
  minQuestions: 4,
});
const seededInitialAReplay = assembleInitialAbilityTest({
  assessmentSeed: 1731,
  families: shanghaiMathItemFamilies,
  targetGrade: "G5",
  maxQuestions: 8,
  minQuestions: 4,
});
const seededInitialB = assembleInitialAbilityTest({
  assessmentSeed: 9173,
  families: shanghaiMathItemFamilies,
  targetGrade: "G5",
  maxQuestions: 8,
  minQuestions: 4,
});
const initialQuestionSignature = (test) =>
  test.questions.map((question) => ({ id: question.id, familyId: question.familyId, prompt: question.prompt }));

assert.deepEqual(
  initialQuestionSignature(seededInitialA),
  initialQuestionSignature(seededInitialAReplay),
  "the same private assessment seed must reproduce the same validated run",
);
assert.notDeepEqual(
  initialQuestionSignature(seededInitialA),
  initialQuestionSignature(seededInitialB),
  "a distinct private assessment seed should vary the generated assessment",
);
assert.equal(
  new Set(seededInitialA.questions.map((question) => question.id)).size,
  seededInitialA.questions.length,
  "one generated assessment must not reuse question ids",
);
assert.ok(
  seededInitialA.questions.some((question) => ["context_change", "relationship_reframe", "question_order_variant"].includes(question.metadataTags.variantLevel)),
  "a seeded initial run must include controlled form-transfer evidence",
);

console.log(`math-logic-library-contract: passed (${generatedCandidateCount} generated candidates)`);
