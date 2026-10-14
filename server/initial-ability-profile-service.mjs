import { buildAbilityMapFromRuntimeEvidence } from "../src/services/ability-map-engine.js";

function initialAssessmentResponses(session) {
  return (session?.responses || []).map((response) => ({
    ...response,
    step: "ability_test",
    questionMetadata: {
      targetDimension: response.metadata?.targetDimension || null,
      tags: response.metadata?.tags || {},
    },
  }));
}

function isTrustedAnswerEvent(event) {
  return event?.eventType === "answer_submitted" && event?.payload?.scoringSource === "server_authoritative";
}

export function buildServerWorkingAbilityMap({
  session,
  studentId = session?.studentId,
  subjectId = session?.subjectId,
  behaviorEvents = [],
} = {}) {
  if (!session?.serverAuthoritative || session.assessmentType !== "initial_onboarding" || session.status !== "completed") {
    return null;
  }

  const trustedPracticeEvents = (behaviorEvents || []).filter(isTrustedAnswerEvent);
  const abilityMap = buildAbilityMapFromRuntimeEvidence({
    assessment: { assessmentId: session.id },
    assessmentResponses: initialAssessmentResponses(session),
    abilityQuestions: [],
    behaviorEvents: trustedPracticeEvents,
    initialEvidence: [],
    studentId,
    subjectId,
  });
  return {
    ...abilityMap,
    serverAuthoritative: true,
    source: "server_initial_and_trusted_practice_evidence",
    evidenceSummary: {
      ...abilityMap.evidenceSummary,
      source: "completed_server_owned_initial_assessment_and_server_scored_practice",
      initialAssessmentResponseCount: (session.responses || []).length,
      trustedPracticeAnswerCount: trustedPracticeEvents.length,
      qualityPassed: Boolean(session.result?.allItemsQualityPassed),
    },
    guardrail:
      "This working ability map combines the completed server-owned initial assessment with server-scored practice. Daily practice may refine this view, but only a verified formal test may update the dynamic curve.",
  };
}

export function buildServerInitialAbilityMap({ session, studentId = session?.studentId, subjectId = session?.subjectId } = {}) {
  const abilityMap = buildServerWorkingAbilityMap({ session, studentId, subjectId });
  if (!abilityMap) return null;
  return {
    ...abilityMap,
    serverAuthoritative: true,
    source: "server_initial_assessment_evidence",
    evidenceSummary: {
      source: "completed_server_owned_initial_assessment",
      responseCount: (session.responses || []).length,
      qualityPassed: Boolean(session.result?.allItemsQualityPassed),
    },
    guardrail:
      "This initial ability map is derived only from completed server-owned assessment responses. Daily practice may inform later reports, but cannot change the dynamic curve without a verified formal test.",
  };
}
