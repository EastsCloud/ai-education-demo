import assert from "node:assert/strict";
import { analyzeLearningBehavior } from "../src/services/behavior-analysis-engine.js";
import { buildKnowledgePuzzleMap } from "../src/services/knowledge-atlas-evidence-engine.js";
import { summarizeLearningEvidence } from "../src/services/learning-evidence-engine.js";
import { buildLearningProgressTrend } from "../src/services/learning-progress-trend-engine.js";
import { buildLearningReport } from "../src/services/learning-report-engine.js";
import { summarizeFamilyIndependentEvidence } from "../src/services/math-learning-path-engine.js";
import { estimateFamilyMastery } from "../src/services/family-mastery-estimator.js";

function answer({
  id,
  timestamp,
  deliveryId,
  correct = true,
  extraPracticeMode = "harder",
  variantLevel = "multi_step_extension",
}) {
  return {
    eventId: `answer-${id}`,
    eventType: "answer_submitted",
    timestamp,
    targetId: `question-${id}`,
    sessionId: `session-${id}`,
    payload: {
      deliveryId,
      isCorrect: correct,
      hintsOpened: 0,
      abilityTags: ["read_context"],
      atlasNodeIds: ["more_less"],
      extraPracticeMode,
      variantLevel,
      scoringSource: "server_authoritative",
    },
  };
}

function guidedStep({ id, timestamp, deliveryId }) {
  return {
    eventId: `guided-${id}`,
    eventType: "guided_step_opened",
    timestamp,
    targetId: `question-${id}`,
    sessionId: `session-${id}`,
    payload: { deliveryId },
  };
}

const guidedAnswer = answer({
  id: "guided",
  timestamp: "2026-09-06T10:02:00.000Z",
  deliveryId: "guided-delivery",
});
const independentAnswer = answer({
  id: "independent",
  timestamp: "2026-09-06T10:03:00.000Z",
  deliveryId: "independent-delivery",
});
const coreEvents = [
  guidedStep({ id: "guided", timestamp: "2026-09-06T10:01:00.000Z", deliveryId: "guided-delivery" }),
  guidedAnswer,
  independentAnswer,
];

const report = buildLearningReport({ behaviorEvents: coreEvents });
assert.equal(report.answerCount, 2);
assert.equal(report.noHintAnswerCount, 1);
assert.equal(report.hintedAnswerCount, 1);
assert.equal(report.hintUseRate, 0.5);

const behavior = analyzeLearningBehavior(coreEvents);
assert.equal(behavior.allocationInputs.independentChallengeEvidenceCount, 1);
assert.equal(behavior.allocationInputs.independentChallengeTransferEvidenceCount, 1);

const evidence = summarizeLearningEvidence(coreEvents);
const reading = evidence.dimensions.find((dimension) => dimension.id === "reading");
assert.equal(reading?.independentCorrect, 1);
assert.equal(reading?.hintedCorrect, 1);

const atlas = buildKnowledgePuzzleMap({
  baseMap: { pieces: [{ id: "read_target", title: "读题", status: "unlocked" }] },
  behaviorEvents: coreEvents,
});
assert.equal(atlas.pieces[0].independentCorrect, 1);
assert.equal(atlas.pieces[0].hintedCorrect, 1);
assert.equal(atlas.pieces[0].completed, false);

const guidedProgressionEvents = ["original", "change_one_number", "change_two_numbers"].flatMap((variantLevel, index) => {
  const id = `guided-progression-${index + 1}`;
  const deliveryId = `guided-progression-delivery-${index + 1}`;
  const answered = answer({
    id,
    timestamp: `2026-09-1${index + 1}T10:00:00.000Z`,
    deliveryId,
    extraPracticeMode: null,
    variantLevel,
  });
  answered.payload.questionFamilyId = "part_whole_add_subtract";
  answered.payload.queueItemId = "guided-progression-unit";
  answered.payload.practiceRunId = "guided-progression-run";
  return [guidedStep({ id, timestamp: `2026-09-1${index + 1}T09:59:00.000Z`, deliveryId }), answered];
});
const guidedProgression = summarizeFamilyIndependentEvidence({
  behaviorEvents: guidedProgressionEvents,
  familyId: "part_whole_add_subtract",
});
assert.equal(guidedProgression.independentCorrectCount, 0);
assert.equal(guidedProgression.completedIndependentUnitCount, 0);
const guidedMastery = estimateFamilyMastery({
  behaviorEvents: guidedProgressionEvents,
  familyId: "part_whole_add_subtract",
});
assert.equal(guidedMastery.independentCorrectCount, 0);
assert.equal(guidedMastery.hintedCorrectCount, 3);

const trendEvents = [
  ...Array.from({ length: 4 }, (_, index) => {
    const id = `assisted-${index + 1}`;
    const deliveryId = `assisted-delivery-${index + 1}`;
    const timestamp = `2026-09-0${index + 1}T10:00:00.000Z`;
    return [guidedStep({ id, timestamp: `2026-09-0${index + 1}T09:59:00.000Z`, deliveryId }), answer({ id, timestamp, deliveryId, extraPracticeMode: null, variantLevel: "original" })];
  }).flat(),
  ...Array.from({ length: 4 }, (_, index) =>
    answer({
      id: `independent-${index + 1}`,
      timestamp: `2026-09-0${index + 5}T10:00:00.000Z`,
      deliveryId: `independent-delivery-${index + 1}`,
      extraPracticeMode: null,
      variantLevel: "original",
    }),
  ),
];
const trend = buildLearningProgressTrend({
  answerEvents: trendEvents.filter((event) => event.eventType === "answer_submitted"),
  behaviorEvents: trendEvents,
});
assert.equal(trend.practice.availability, "observed");
assert.equal(trend.practice.direction, "growing_independence");
assert.equal(trend.practice.checkpoints[0].independentCompletionRate, 0);
assert.equal(trend.practice.checkpoints[1].independentCompletionRate, 1);

console.log("guided-help-evidence-contract: passed");
