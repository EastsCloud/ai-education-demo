import assert from "node:assert/strict";
import { buildAdaptiveSupportProfile } from "../src/services/adaptive-support-profile-engine.js";
import { createDailyAllocation } from "../src/services/daily-allocation-engine.js";
import { createDailyQuestionQueue } from "../src/services/daily-question-queue-engine.js";

const seedProfile = {
  confidence: 0.68,
  responseCount: 12,
  supportMode: {
    id: "try_then_light_hint",
    label: "先尝试，再给轻提示",
    hintDepthTarget: 1.5,
  },
  taskChunking: "standard_short_chunks",
};

function answer({
  id,
  correct,
  hintsOpened = 0,
  elapsedSeconds = 20,
  extraPracticeMode = null,
  sessionId = "session-1",
  variantLevel = Number(id) % 2 ? "original" : "change_one_number",
}) {
  return {
    eventId: `answer-${id}`,
    eventType: "answer_submitted",
    sessionId,
    targetId: `question-${id}`,
    timestamp: `2026-07-14T0${Math.min(9, Number(id) || 1)}:00:00.000Z`,
    payload: {
      elapsedSeconds,
      extraPracticeMode,
      hintsOpened,
      isCorrect: correct,
      questionFamilyId: "quantity_total_difference",
      variantLevel,
    },
  };
}

function guidedReasoning({ deliveryId, phase, timestamp }) {
  return {
    eventId: `guided-${deliveryId}-${phase}`,
    eventType: "guided_step_response_recorded",
    sessionId: `guided-session-${deliveryId}`,
    targetId: deliveryId,
    timestamp,
    payload: {
      deliveryId,
      guidedStepPhase: phase,
      guidedResponseType: "short_reasoning",
      guidedResponseStatus: "recorded",
    },
  };
}

function strategyOpening({ deliveryId, strategyId, timestamp }) {
  return {
    eventId: `strategy-${deliveryId}-${strategyId}`,
    eventType: "solution_strategy_opened",
    targetId: `question-${deliveryId}`,
    timestamp,
    payload: {
      deliveryId,
      strategyId,
    },
  };
}

const sparse = buildAdaptiveSupportProfile({ initialProfile: seedProfile, behaviorEvents: [answer({ id: 1, correct: true })] });
assert.equal(sparse.supportMode.id, "try_then_light_hint");
assert.equal(sparse.confidenceBand, "low");
assert.equal(sparse.refinements[0].id, "collecting_practice_evidence");

const independentEvents = [
  ...Array.from({ length: 8 }, (_, index) =>
    answer({
      id: index + 1,
      correct: true,
      extraPracticeMode: index >= 4 ? "harder" : null,
      variantLevel: index >= 4 ? (index % 2 ? "reverse_question" : "multi_step_extension") : undefined,
    }),
  ),
  { eventId: "extra-1", eventType: "harder_extra_practice_requested", timestamp: "2026-07-14T10:00:00.000Z", payload: { requestedCount: 3 } },
  { eventId: "explore-1", eventType: "atlas_related_practice_requested", timestamp: "2026-07-14T10:00:30.000Z", payload: {} },
  { eventId: "review-1", eventType: "practice_detail_opened", timestamp: "2026-07-14T10:01:00.000Z", payload: {} },
  { eventId: "review-2", eventType: "today_atlas_opened", timestamp: "2026-07-14T10:02:00.000Z", payload: {} },
];
const independent = buildAdaptiveSupportProfile({ initialProfile: seedProfile, behaviorEvents: independentEvents });
assert.equal(independent.supportMode.id, "independent_retry");
assert.equal(independent.challengePacing, "explore_when_stable");
assert.equal(independent.feedbackStyle, "reflective_prompt");
assert.equal(independent.evidence.voluntaryPracticeCount, 4);

const hintedChallengeOnly = buildAdaptiveSupportProfile({
  initialProfile: seedProfile,
  behaviorEvents: [
    ...Array.from({ length: 4 }, (_, index) => answer({ id: 31 + index, correct: true })),
    ...Array.from({ length: 4 }, (_, index) =>
      answer({
        id: 35 + index,
        correct: true,
        hintsOpened: 2,
        extraPracticeMode: "harder",
        variantLevel: "multi_step_extension",
      }),
    ),
    { eventId: "hinted-extra", eventType: "harder_extra_practice_requested", timestamp: "2026-07-14T10:05:00.000Z", payload: { requestedCount: 3 } },
  ],
});
assert.equal(hintedChallengeOnly.challengePacing, "steady");
assert.equal(hintedChallengeOnly.evidence.independentChallengeTransferEvidenceCount, 0);

const supportedEvents = [
  answer({ id: 1, correct: true, hintsOpened: 1, elapsedSeconds: 8 }),
  answer({ id: 2, correct: true, hintsOpened: 1, elapsedSeconds: 8 }),
  answer({ id: 3, correct: true, hintsOpened: 1, elapsedSeconds: 8 }),
  answer({ id: 4, correct: false, hintsOpened: 2, elapsedSeconds: 28 }),
  answer({ id: 5, correct: false, hintsOpened: 2, elapsedSeconds: 30 }),
  answer({ id: 6, correct: false, hintsOpened: 2, elapsedSeconds: 32 }),
];
const supported = buildAdaptiveSupportProfile({ initialProfile: seedProfile, behaviorEvents: supportedEvents });
assert.equal(supported.supportMode.id, "guided_when_needed");
assert.equal(supported.taskChunking, "short_recovery_chunks");
assert.equal(supported.feedbackStyle, "warm_specific");
assert.match(supported.guardrail, /cannot update the dynamic learning curve/);

const interruptedEngagement = buildAdaptiveSupportProfile({
  initialProfile: seedProfile,
  behaviorEvents: [
    ...Array.from({ length: 6 }, (_, index) => answer({ id: index + 1, correct: true })),
    { eventId: "visit-1", eventType: "app_session_ended", timestamp: "2026-07-14T11:00:00.000Z", payload: { activeSeconds: 240, pauseCount: 2 } },
    { eventId: "visit-2", eventType: "app_session_ended", timestamp: "2026-07-15T11:00:00.000Z", payload: { activeSeconds: 300, pauseCount: 2 } },
    { eventId: "visit-3", eventType: "app_session_ended", timestamp: "2026-07-16T11:00:00.000Z", payload: { activeSeconds: 360, pauseCount: 3 } },
  ],
});
assert.equal(interruptedEngagement.taskChunking, "short_recovery_chunks");
assert.equal(interruptedEngagement.evidence.completedVisitCount, 3);
assert.equal(interruptedEngagement.evidence.shortVisitRate, 1);
assert.ok(interruptedEngagement.refinements.some((item) => item.id === "shorter_entry_chunks"));

const structuredGuidance = buildAdaptiveSupportProfile({
  initialProfile: seedProfile,
  behaviorEvents: [
    ...Array.from({ length: 6 }, (_, index) => answer({ id: index + 1, correct: index % 2 === 0 })),
    guidedReasoning({ deliveryId: "guided-delivery-1", phase: "organize", timestamp: "2026-07-14T12:00:00.000Z" }),
    guidedReasoning({ deliveryId: "guided-delivery-2", phase: "plan", timestamp: "2026-07-15T12:00:00.000Z" }),
  ],
});
assert.equal(structuredGuidance.supportMode.id, "try_then_light_hint");
assert.equal(structuredGuidance.guidedStructureObserved, true);
assert.equal(structuredGuidance.supportPlan.guidedStructureObserved, true);
assert.equal(structuredGuidance.evidence.guidedOrganizationResponseCount, 1);
assert.equal(structuredGuidance.evidence.guidedPlanningResponseCount, 1);
assert.match(structuredGuidance.studentCue, /整理条件和关系/);
assert.ok(structuredGuidance.refinements.some((item) => item.id === "preserve_structured_guidance"));

const strategyPreferred = buildAdaptiveSupportProfile({
  initialProfile: seedProfile,
  behaviorEvents: [
    strategyOpening({
      deliveryId: "strategy-delivery-1",
      strategyId: "quantity_relation_table",
      timestamp: "2026-07-14T13:00:00.000Z",
    }),
    strategyOpening({
      deliveryId: "strategy-delivery-2",
      strategyId: "quantity_relation_table",
      timestamp: "2026-07-15T13:00:00.000Z",
    }),
  ],
});
assert.equal(strategyPreferred.strategyPreference.dominantStrategyId, "quantity_relation_table");
assert.deepEqual(strategyPreferred.supportPlan.strategyPreference.orderedStrategyIds, ["quantity_relation_table"]);
assert.equal(strategyPreferred.evidence.strategyPreferenceQuestionCount, 2);
assert.ok(strategyPreferred.refinements.some((item) => item.id === "preserve_voluntary_solution_strategy"));
assert.match(strategyPreferred.adultSummary, /数量关系表/);

const allocation = createDailyAllocation({
  generatedTodayTask: { internalAllocation: { wrong_retry: 0.4, correct_review: 0.25, new_stage_questions: 0.25, challenge_extension: 0.1 } },
  behaviorSummary: { wrongRate: 0.3, retrySuccessRate: 0.6, correctReproductionRate: 0.7, hintDepthAverage: 2.2 },
  supportProfile: supported,
});
assert.equal(allocation.supportPolicy.taskChunking, "short_recovery_chunks");

const queue = createDailyQuestionQueue({
  allocation,
  behaviorEvents: supportedEvents,
  date: "2026-07-15",
  dailyMinutes: 30,
  families: [{ id: "quantity_total_difference", name: "总量差量" }],
  plannedFamilyId: "quantity_total_difference",
  supportProfile: supported,
});
assert.equal(queue.supportPolicy.unitsPerChunk, 1);
assert.ok(queue.items.every((item) => item.supportPolicy.taskChunking === "short_recovery_chunks"));

console.log("adaptive-support-profile-contract: passed");
