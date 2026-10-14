import assert from "node:assert/strict";
import { buildProfileSignalSnapshot } from "../src/services/profile-signal-engine.js";

function answer({
  id,
  correct,
  hintsOpened = 0,
  elapsedSeconds = 42,
  variantLevel = "original",
  extraPracticeMode = null,
  questionFeatureKeys = [],
}) {
  return {
    eventId: `profile-answer-${id}`,
    eventType: "answer_submitted",
    sessionId: "profile-signal-session",
    targetId: `profile-question-${id}`,
    timestamp: `2026-08-01T10:${String(id).padStart(2, "0")}:00.000Z`,
    payload: {
      scoringSource: "server_authoritative",
      isCorrect: correct,
      hintsOpened,
      elapsedSeconds,
      questionFamilyId: "part_whole_add_subtract",
      variantLevel,
      extraPracticeMode,
      answerRevisionCount: id % 2,
      questionFeatureKeys,
    },
  };
}

const collecting = buildProfileSignalSnapshot({ behaviorEvents: [answer({ id: 1, correct: true })] });
assert.equal(collecting.evidenceStatus, "collecting");
assert.equal(collecting.signals.length, 0);

const signals = buildProfileSignalSnapshot({
  behaviorEvents: [
    answer({ id: 1, correct: false, hintsOpened: 1, elapsedSeconds: 8 }),
    answer({ id: 2, correct: true, hintsOpened: 1 }),
    answer({ id: 3, correct: true, hintsOpened: 1 }),
    answer({ id: 4, correct: false, hintsOpened: 1, elapsedSeconds: 9 }),
    answer({ id: 5, correct: true, hintsOpened: 1 }),
    answer({ id: 6, correct: true, hintsOpened: 1 }),
    { eventId: "profile-review-1", eventType: "practice_detail_opened", timestamp: "2026-08-01T10:10:00.000Z", payload: {} },
    { eventId: "profile-review-2", eventType: "today_atlas_opened", timestamp: "2026-08-01T10:11:00.000Z", payload: {} },
  ],
});

assert.equal(signals.evidenceStatus, "ready");
assert.equal(signals.answerCount, 6);
assert.equal(signals.signals.length <= 3, true);
assert.ok(signals.signals.some((item) => item.id === "protect_reading_time"));
assert.ok(signals.signals.some((item) => item.id === "keep_layered_support"));
assert.equal(JSON.stringify(signals).includes("answerRevisionCount"), false);
assert.match(signals.guardrail, /not a student label/);

const optionalReflection = buildProfileSignalSnapshot({
  behaviorEvents: [
    answer({ id: 1, correct: true }),
    answer({ id: 2, correct: true }),
    answer({ id: 3, correct: true }),
    answer({ id: 4, correct: true }),
    { eventId: "profile-offer-1", eventType: "practice_summary_options_offered", timestamp: "2026-08-01T10:12:00.000Z", payload: {} },
    { eventId: "profile-offer-2", eventType: "practice_summary_options_offered", timestamp: "2026-08-02T10:12:00.000Z", payload: {} },
  ],
});
assert.ok(optionalReflection.signals.some((item) => item.id === "keep_reflection_optional"));

const featurePattern = buildProfileSignalSnapshot({
  behaviorEvents: [
    ...Array.from({ length: 6 }, (_, index) =>
      answer({
        id: index + 1,
        correct: index >= 4,
        questionFeatureKeys: ["number:contains_zero", "domain:quantity_relationship"],
      }),
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      answer({
        id: index + 7,
        correct: true,
        questionFeatureKeys: ["domain:measurement_and_units"],
      }),
    ),
  ],
});
const featureSignal = featurePattern.signals.find((item) => item.id === "feature_pattern_reinforcement");
assert.ok(featureSignal);
assert.match(featureSignal.evidence, /含 0 的数量/);
assert.equal(JSON.stringify(featurePattern).includes("questionFeatureKeys"), false);
assert.equal(JSON.stringify(featurePattern).includes("number:contains_zero"), false);

const hintedChallengeSignals = buildProfileSignalSnapshot({
  behaviorEvents: [
    ...Array.from({ length: 6 }, (_, index) => answer({ id: index + 1, correct: true })),
    ...Array.from({ length: 4 }, (_, index) =>
      answer({
        id: index + 7,
        correct: true,
        hintsOpened: 2,
        extraPracticeMode: "harder",
        variantLevel: "multi_step_extension",
      }),
    ),
    { eventId: "hinted-challenge-request", eventType: "harder_extra_practice_requested", timestamp: "2026-08-01T10:20:00.000Z", payload: { requestedCount: 3 } },
  ],
});
assert.equal(hintedChallengeSignals.signals.some((item) => item.id === "exploration_window"), false);

const independentChallengeSignals = buildProfileSignalSnapshot({
  behaviorEvents: [
    ...Array.from({ length: 6 }, (_, index) => answer({ id: index + 21, correct: true })),
    ...Array.from({ length: 4 }, (_, index) =>
      answer({
        id: index + 27,
        correct: true,
        extraPracticeMode: "harder",
        variantLevel: index % 2 ? "reverse_question" : "multi_step_extension",
      }),
    ),
    { eventId: "independent-challenge-request", eventType: "harder_extra_practice_requested", timestamp: "2026-08-01T10:25:00.000Z", payload: { requestedCount: 3 } },
  ],
});
assert.ok(independentChallengeSignals.signals.some((item) => item.id === "exploration_window"));

console.log("profile-signal-contract: passed");
