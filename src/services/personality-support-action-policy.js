export const PERSONALITY_SUPPORT_ACTION_POLICY_VERSION = "personality_support_action_policy_v1";

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function observedScore(dimensions, id) {
  const dimension = (dimensions || []).find((item) => item?.id === id);
  const score = Number(dimension?.score);
  const confidence = Number(dimension?.confidence);
  if (!Number.isFinite(score) || !Number.isFinite(confidence) || confidence <= 0) return null;
  return clamp(score);
}

function action(id, sourceDimensions, effect) {
  return { id, sourceDimensions, effect };
}

// Onboarding answers are a small, fallible starting signal. This policy keeps
// their influence bounded to instructional presentation and task composition;
// observed practice behavior remains the later and stronger source of truth.
export function createInitialPersonalitySupportActionPolicy({
  psychologicalDimensions = [],
  learningDimensions = [],
} = {}) {
  const allDimensions = [...psychologicalDimensions, ...learningDimensions];
  const curiosity = observedScore(allDimensions, "exploration_curiosity");
  const selfManagement = observedScore(allDimensions, "self_management");
  const recovery = observedScore(allDimensions, "frustration_recovery");
  const helpSeeking = observedScore(allDimensions, "interaction_help_seeking");
  const feedbackReceptivity = observedScore(allDimensions, "feedback_receptivity");
  const hintPreference = observedScore(allDimensions, "hint_dependency");
  const challengeTolerance = observedScore(allDimensions, "challenge_tolerance");
  const expressionPreference = observedScore(allDimensions, "expression_preference");
  const errorResponse = observedScore(allDimensions, "error_response");
  const selfReview = observedScore(allDimensions, "self_review_tendency");

  const needsRecoveryChunking = (selfManagement !== null && selfManagement < 0.5) || (recovery !== null && recovery < 0.5);
  const needsWarmFeedback =
    (recovery !== null && recovery < 0.5) ||
    (feedbackReceptivity !== null && feedbackReceptivity < 0.5) ||
    (errorResponse !== null && errorResponse < 0.5);
  const prefersReflection = selfReview !== null && selfReview >= 0.72;
  const protectVariation =
    (recovery !== null && recovery < 0.5) || (challengeTolerance !== null && challengeTolerance < 0.5);
  const inviteExploration =
    !protectVariation && curiosity !== null && curiosity >= 0.72 && challengeTolerance !== null && challengeTolerance >= 0.72;
  const guidedStructurePreferred = expressionPreference !== null && expressionPreference >= 0.72;
  const helpEntryStyle = helpSeeking !== null && helpSeeking < 0.5 ? "private_reassurance" : "self_then_choose";
  const reviewPromptStyle =
    selfReview !== null && selfReview >= 0.72 ? "reflective" : selfReview !== null && selfReview < 0.5 ? "optional" : "light";
  const feedbackStyle = needsWarmFeedback ? "warm_specific" : prefersReflection ? "reflective_prompt" : "balanced_specific";
  const taskChunking = needsRecoveryChunking ? "short_recovery_chunks" : "standard_short_chunks";
  const challengePacing = protectVariation ? "stabilize" : inviteExploration ? "explore_when_stable" : "steady";

  const appliedActions = [];
  if (curiosity !== null || challengeTolerance !== null) {
    appliedActions.push(
      action("exploration_pacing", ["exploration_curiosity", "challenge_tolerance"], {
        challengePacing,
        requiresIndependentPracticeEvidence: true,
      }),
    );
  }
  if (selfManagement !== null || recovery !== null) {
    appliedActions.push(
      action("entry_chunking", ["self_management", "frustration_recovery"], { taskChunking }),
    );
  }
  if (recovery !== null || feedbackReceptivity !== null || errorResponse !== null) {
    appliedActions.push(
      action("feedback_entry", ["frustration_recovery", "feedback_receptivity", "error_response"], { feedbackStyle }),
    );
  }
  if (helpSeeking !== null || hintPreference !== null) {
    appliedActions.push(
      action("help_entry", ["interaction_help_seeking", "hint_dependency"], { helpEntryStyle }),
    );
  }
  if (expressionPreference !== null) {
    appliedActions.push(
      action("guided_structure", ["expression_preference"], { guidedStructurePreferred }),
    );
  }
  if (selfReview !== null) {
    appliedActions.push(
      action("review_invitation", ["self_review_tendency"], { reviewPromptStyle }),
    );
  }

  return {
    id: "onboarding_personality_support_actions",
    version: PERSONALITY_SUPPORT_ACTION_POLICY_VERSION,
    taskChunking,
    feedbackStyle,
    challengePacing,
    guidedStructurePreferred,
    helpEntryStyle,
    reviewPromptStyle,
    appliedActions,
    guardrail:
      "Initial personality signals may only tune support presentation and next-practice composition. They are not learner labels, cannot override verified practice evidence, and cannot update a learning curve.",
  };
}
