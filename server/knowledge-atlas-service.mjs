import { createBaseKnowledgePuzzleMap } from "../src/data/knowledge-atlas-map.js";
import { buildKnowledgePuzzleMap } from "../src/services/knowledge-atlas-evidence-engine.js";

function isSubjectEvent(event, subjectId) {
  const eventSubjectId = event?.subjectId || event?.payload?.subjectId || null;
  return !eventSubjectId || eventSubjectId === subjectId;
}

function isTrustedAnswerEvent(event) {
  return event?.eventType === "answer_submitted" && event?.payload?.scoringSource === "server_authoritative";
}

function initialAssessmentEvidence(session) {
  if (!session?.serverAuthoritative || session.assessmentType !== "initial_onboarding" || session.status !== "completed") {
    return { responseCount: 0, responses: [] };
  }

  const questionById = new Map((session.questionSnapshot || []).map((question) => [question.id, question]));
  const responses = (session.responses || []).flatMap((response) => {
    const question = questionById.get(response.questionId);
    if (!question || typeof response.isCorrect !== "boolean") return [];
    return [
      {
        step: "ability_test",
        responseType: `${question.answerInput?.kind || "numeric"}_answer`,
        questionId: response.questionId,
        isCorrect: response.isCorrect,
        storedAt: response.submittedAt,
        questionMetadata: { tags: question.metadata || {} },
      },
    ];
  });

  return { responseCount: responses.length, responses };
}

export function buildServerKnowledgeAtlas({ audience = "student", database, studentId, subjectId }) {
  const scopedEvents = database
    .listBehaviorEvents({ studentId, subjectId, limit: 2000 })
    .filter((event) => isSubjectEvent(event, subjectId));
  const answerEvents = scopedEvents.filter((event) => event?.eventType === "answer_submitted");
  const trustedPracticeEvents = answerEvents.filter(isTrustedAnswerEvent);
  const initialAssessment = database.getLatestAssessmentSession({
    studentId,
    subjectId,
    assessmentType: "initial_onboarding",
  });
  const assessment = initialAssessmentEvidence(initialAssessment);
  const atlas = buildKnowledgePuzzleMap({
    baseMap: createBaseKnowledgePuzzleMap({ studentId, subjectId }),
    behaviorEvents: trustedPracticeEvents,
    assessmentResponses: assessment.responses,
  });

  return {
    ...atlas,
    schemaVersion: "server_knowledge_atlas_v1",
    source: "server_evidence_snapshot",
    audience,
    serverAuthoritative: true,
    evidence: {
      ...atlas.evidence,
      source: "server_authoritative_initial_assessment_and_practice",
      trustedPracticeAnswerCount: trustedPracticeEvents.length,
      excludedUntrustedAnswerCount: answerEvents.length - trustedPracticeEvents.length,
      initialAssessmentAnswerCount: assessment.responseCount,
    },
    guardrails: [
      "Only completed server-owned initial assessment responses and server-scored practice answers can light the knowledge map.",
      "Question details never include answer keys in the knowledge atlas response.",
      "A knowledge map records practice evidence; only a completed formal stage assessment may recalibrate the dynamic curve.",
    ],
  };
}
