import assert from "node:assert/strict";
import { buildAdaptiveSupportProfile } from "../src/services/adaptive-support-profile-engine.js";
import { createInitialPersonalitySupportActionPolicy } from "../src/services/personality-support-action-policy.js";
import { scorePersonalityQuestionSets } from "../src/services/personality-assessment-engine.js";

function dimension(id, score) {
  return { id, score, confidence: 1 };
}

function questionSetsFromScores(scores) {
  const psychologicalIds = [
    "exploration_curiosity",
    "self_management",
    "frustration_recovery",
    "interaction_help_seeking",
    "feedback_receptivity",
  ];
  const learningIds = [
    "hint_dependency",
    "challenge_tolerance",
    "expression_preference",
    "error_response",
    "self_review_tendency",
  ];
  const createQuestion = (step, id, index) => ({
    id: `${step}-${index + 1}`,
    dimensionId: id,
    optionScores: [scores[id]],
  });
  const psychologicalQuestions = psychologicalIds.map((id, index) => createQuestion("psychological_personality", id, index));
  const learningQuestions = learningIds.map((id, index) => createQuestion("learning_personality", id, index));
  return {
    psychologicalQuestions,
    learningQuestions,
    responses: [
      ...psychologicalQuestions.map((question) => ({ step: "psychological_personality", questionId: question.id, answer: 0 })),
      ...learningQuestions.map((question) => ({ step: "learning_personality", questionId: question.id, answer: 0 })),
    ],
  };
}

const cautiousPolicy = createInitialPersonalitySupportActionPolicy({
  psychologicalDimensions: [
    dimension("exploration_curiosity", 0.9),
    dimension("self_management", 0.32),
    dimension("frustration_recovery", 0.34),
    dimension("interaction_help_seeking", 0.3),
    dimension("feedback_receptivity", 0.42),
  ],
  learningDimensions: [
    dimension("hint_dependency", 0.34),
    dimension("challenge_tolerance", 0.9),
    dimension("expression_preference", 0.82),
    dimension("error_response", 0.38),
    dimension("self_review_tendency", 0.9),
  ],
});

assert.equal(cautiousPolicy.taskChunking, "short_recovery_chunks");
assert.equal(cautiousPolicy.feedbackStyle, "warm_specific");
assert.equal(cautiousPolicy.challengePacing, "stabilize");
assert.equal(cautiousPolicy.guidedStructurePreferred, true);
assert.equal(cautiousPolicy.helpEntryStyle, "private_reassurance");
assert.equal(cautiousPolicy.reviewPromptStyle, "reflective");
assert.deepEqual(
  cautiousPolicy.appliedActions.map((item) => item.id),
  ["exploration_pacing", "entry_chunking", "feedback_entry", "help_entry", "guided_structure", "review_invitation"],
);

const exploratoryPolicy = createInitialPersonalitySupportActionPolicy({
  psychologicalDimensions: [
    dimension("exploration_curiosity", 0.9),
    dimension("self_management", 0.88),
    dimension("frustration_recovery", 0.84),
    dimension("interaction_help_seeking", 0.86),
    dimension("feedback_receptivity", 0.86),
  ],
  learningDimensions: [
    dimension("hint_dependency", 0.88),
    dimension("challenge_tolerance", 0.86),
    dimension("expression_preference", 0.5),
    dimension("error_response", 0.86),
    dimension("self_review_tendency", 0.46),
  ],
});

assert.equal(exploratoryPolicy.taskChunking, "standard_short_chunks");
assert.equal(exploratoryPolicy.feedbackStyle, "balanced_specific");
assert.equal(exploratoryPolicy.challengePacing, "explore_when_stable");
assert.equal(exploratoryPolicy.helpEntryStyle, "self_then_choose");
assert.equal(exploratoryPolicy.reviewPromptStyle, "optional");

const scoredInput = questionSetsFromScores({
  exploration_curiosity: 0.9,
  self_management: 0.32,
  frustration_recovery: 0.34,
  interaction_help_seeking: 0.3,
  feedback_receptivity: 0.42,
  hint_dependency: 0.34,
  challenge_tolerance: 0.9,
  expression_preference: 0.82,
  error_response: 0.38,
  self_review_tendency: 0.9,
});
const scored = scorePersonalityQuestionSets({
  questionSets: scoredInput,
  responses: scoredInput.responses,
  psychologicalLibrary: { dimensions: [] },
  learningLibrary: { productDimensions: [] },
});
assert.equal(scored.complete, true);
assert.equal(scored.supportProfile.initialActionPolicy.challengePacing, "stabilize");
assert.equal(scored.supportProfile.taskChunking, "short_recovery_chunks");

const adaptive = buildAdaptiveSupportProfile({
  initialProfile: scored.supportProfile,
  behaviorEvents: [],
});
assert.equal(adaptive.taskChunking, "short_recovery_chunks");
assert.equal(adaptive.feedbackStyle, "warm_specific");
assert.equal(adaptive.challengePacing, "stabilize");
assert.equal(adaptive.supportPlan.guidedStructurePreferred, true);
assert.equal(adaptive.supportPlan.helpEntryStyle, "private_reassurance");
assert.match(adaptive.studentCue, /整理条件和关系/);
assert.equal(adaptive.initialActionPolicy.version, "personality_support_action_policy_v1");

console.log("personality-support-action-policy-contract: passed");
