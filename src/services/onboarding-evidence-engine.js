import { mapAbilityTagsToDimensions } from "./ability-map-engine.js?v=ability-evidence-1";
import { mathAnswerValuesMatch } from "./math-answer-input.js?v=math-answer-input-fraction-1";

function isAbilityAnswerResponse(response) {
  return response?.step === "ability_test" && /^(?:numeric|clock_time|fraction)_answer(?:_marked_uncertain)?$/.test(String(response.responseType || ""));
}

function resolveSupportMode(responses) {
  const selfReport = responses.find(
    (response) => response.step === "learning_personality" && response.questionId === "learning_personality-1",
  );

  if (!selfReport) {
    return {
      id: "try_then_light_hint",
      label: "先尝试，再给轻提示",
      hintDepthTarget: 1.5,
    };
  }

  const modes = [
    { id: "independent_retry", label: "先独立重试，再给轻提示", hintDepthTarget: 1 },
    { id: "try_then_light_hint", label: "先尝试，再给轻提示", hintDepthTarget: 1.5 },
    { id: "guided_when_needed", label: "必要时进入分步引导", hintDepthTarget: 2.2 },
    { id: "worked_example_then_retry", label: "看示例后回到同类题重试", hintDepthTarget: 2.6 },
  ];

  return modes[selfReport.answer] || modes[1];
}

export function createOnboardingEvidence({ responses = [], abilityQuestions = [] }) {
  const abilityResponseByQuestion = new Map(
    responses
      .filter(isAbilityAnswerResponse)
      .map((response) => [response.questionId, response]),
  );

  const abilityEvidence = abilityQuestions.flatMap((question) => {
    const response = abilityResponseByQuestion.get(question.id);
    if (!response) return [];

    const answeredCorrectly =
      typeof response.isCorrect === "boolean"
        ? response.isCorrect
        : mathAnswerValuesMatch({ answerInput: question.answerInput, actual: response.answer, expected: question.answer });
    const tags = question.metadataTags?.abilityTags || [];
    const dimensionIds = new Set(mapAbilityTagsToDimensions(tags));
    if (["context_change", "relationship_reframe", "question_order_variant"].includes(question.metadataTags?.variantLevel)) {
      dimensionIds.add("transfer");
    }
    const dimensionScores = [...dimensionIds].map((dimensionId) => ({
        dimensionId,
        value: answeredCorrectly ? 0.86 : 0.28,
        weight: 0.9,
      }));

    return [
      {
        questionId: question.id,
        source: "onboarding_generated_ability_test",
        answeredCorrectly,
        responseTimeSeconds: null,
        dimensionScores,
      },
    ];
  });

  const supportMode = resolveSupportMode(responses);
  return {
    abilityEvidence,
    supportProfile: {
      id: "onboarding-support-profile",
      source: "student_self_report_and_initial_responses",
      responseCount: responses.length,
      supportMode,
      confidence: Number(Math.min(0.7, 0.2 + responses.length * 0.05).toFixed(2)),
      guardrail: "This is a starting support preference, not a fixed student label. Later practice behavior can refine it.",
    },
    coverage: {
      abilityAnswersRecorded: abilityEvidence.length,
      abilityAnswersCorrect: abilityEvidence.filter((item) => item.answeredCorrectly).length,
      selfReportResponses: responses.filter((response) => response.responseType === "choice").length,
    },
  };
}
