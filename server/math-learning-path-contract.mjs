import assert from "node:assert/strict";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import {
  createMathLearningPath,
  DEFAULT_MATH_LEARNING_PATH_VERSION,
  hasVerifiedIndependentProgression,
  LEGACY_MATH_LEARNING_PATH_VERSION,
  PREVIOUS_MATH_LEARNING_PATH_VERSION,
  summarizeFamilyIndependentEvidence,
  validateMathCurriculumRoutes,
} from "../src/services/math-learning-path-engine.js";

function answerEvent({ familyId, hintsOpened = 0, isCorrect = true, queueItemId, timestamp, variantLevel }) {
  return {
    eventType: "answer_submitted",
    sessionId: "daily-practice-run-student-001-math-2026-07-14",
    timestamp,
    payload: {
      questionFamilyId: familyId,
      isCorrect,
      hintsOpened,
      queueItemId,
      variantLevel,
      scoringSource: "server_authoritative",
    },
  };
}

function independentUnit({ familyId, queueItemId, date = "2026-07-14" }) {
  return ["original", "change_one_number", "change_two_numbers"].map((variantLevel, index) =>
    answerEvent({
      familyId,
      queueItemId,
      timestamp: `${date}T08:0${index}:00.000Z`,
      variantLevel,
    }),
  );
}

const curve = {
  curveType: "static",
  progressCurve: [0.5, 0.55, 0.6],
  currentPoint: { progressTowardTarget: 0.5 },
};

const routeValidation = validateMathCurriculumRoutes({ families: shanghaiMathItemFamilies });
assert.equal(routeValidation.valid, true, routeValidation.errors.join(", "));

const placedPath = createMathLearningPath({
  curve,
  families: shanghaiMathItemFamilies,
  instructionalGrade: "G5",
  pathVersion: LEGACY_MATH_LEARNING_PATH_VERSION,
  planStartedAt: "2026-07-14",
  practiceDate: "2026-07-14",
});
assert.equal(placedPath.version, LEGACY_MATH_LEARNING_PATH_VERSION);
assert.equal(placedPath.focusFamilyId, "ratio_rate_unit");
assert.equal(placedPath.routePosition.planned, 8);
assert.equal(placedPath.routePosition.coreTotal, 15);
assert.ok(placedPath.routePosition.total > placedPath.routePosition.coreTotal);

const expandedPath = createMathLearningPath({
  curve,
  families: shanghaiMathItemFamilies,
  instructionalGrade: "G5",
  pathVersion: DEFAULT_MATH_LEARNING_PATH_VERSION,
  planStartedAt: "2026-07-14",
  practiceDate: "2026-07-14",
});
assert.equal(expandedPath.version, DEFAULT_MATH_LEARNING_PATH_VERSION);
assert.equal(expandedPath.focusFamilyId, "ratio_rate_unit");
assert.equal(expandedPath.routePosition.planned, 15);
assert.equal(expandedPath.routePosition.coreTotal, 28);
assert.equal(expandedPath.routePosition.total, 28);
assert.equal(expandedPath.route.some((item) => item.familyId === "decimal_divide_equal_share"), true);
assert.equal(expandedPath.route.some((item) => item.familyId === "triangle_area_application"), true);
assert.equal(expandedPath.route.some((item) => item.familyId === "circle_circumference_application"), true);

const previousPath = createMathLearningPath({
  curve,
  families: shanghaiMathItemFamilies,
  instructionalGrade: "G5",
  pathVersion: PREVIOUS_MATH_LEARNING_PATH_VERSION,
  planStartedAt: "2026-07-14",
  practiceDate: "2026-07-14",
});
assert.equal(previousPath.version, PREVIOUS_MATH_LEARNING_PATH_VERSION);
assert.equal(previousPath.focusFamilyId, "ratio_rate_unit");
assert.equal(previousPath.routePosition.planned, 12);
assert.equal(previousPath.routePosition.coreTotal, 23);

const incompleteEvidence = [
  answerEvent({
    familyId: "decimal_money_measure",
    queueItemId: "decimal-unit-incomplete",
    timestamp: "2026-07-14T08:00:00.000Z",
    variantLevel: "original",
  }),
];
const repairPath = createMathLearningPath({
  behaviorEvents: incompleteEvidence,
  curve,
  families: shanghaiMathItemFamilies,
  instructionalGrade: "G5",
  pathVersion: DEFAULT_MATH_LEARNING_PATH_VERSION,
  planStartedAt: "2026-07-14",
  practiceDate: "2026-07-14",
});
assert.equal(repairPath.focusFamilyId, "decimal_money_measure");
assert.equal(repairPath.selectionReason, "observed_independent_completion_incomplete");

const completedEvidence = independentUnit({
  familyId: "decimal_money_measure",
  queueItemId: "decimal-unit-complete",
});
const completedSummary = summarizeFamilyIndependentEvidence({
  behaviorEvents: completedEvidence,
  familyId: "decimal_money_measure",
});
assert.equal(completedSummary.completedIndependentUnitCount, 1);
assert.equal(hasVerifiedIndependentProgression(completedSummary), true);

const hintedEvidence = independentUnit({
  familyId: "decimal_money_measure",
  queueItemId: "decimal-unit-hinted",
}).map((event) =>
  event.payload.variantLevel === "change_one_number"
    ? { ...event, payload: { ...event.payload, hintsOpened: 1 } }
    : event,
);
const hintedSummary = summarizeFamilyIndependentEvidence({
  behaviorEvents: hintedEvidence,
  familyId: "decimal_money_measure",
});
assert.equal(hasVerifiedIndependentProgression(hintedSummary), false);

console.log("math-learning-path-contract: passed");
