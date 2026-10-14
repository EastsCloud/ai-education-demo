import { getMathQuestionFamilyGraphBinding, mathKnowledgeGraph } from "../src/data/math-knowledge-graph.js";
import { createIndependentAnswerPredicate } from "../src/services/retry-evidence-engine.js";

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function isSubjectEvent(event, subjectId) {
  const eventSubjectId = event?.subjectId || event?.payload?.subjectId || null;
  return !eventSubjectId || eventSubjectId === subjectId;
}

function isTrustedAnswerEvent(event) {
  return event?.eventType === "answer_submitted" && event?.payload?.scoringSource === "server_authoritative";
}

function emptyEvidence() {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    independentCorrect: 0,
    hintedCorrect: 0,
    wrongQuestionIds: new Set(),
  };
}

function lightState(evidence) {
  if (!evidence.attempts) return "dark";
  const accuracy = evidence.correct / evidence.attempts;
  if (evidence.independentCorrect >= 2 && accuracy >= 0.75) return "bright";
  if (evidence.correct) return "partial";
  return "dim";
}

function publicEvidence(evidence) {
  const weightedIndependentWork = evidence.independentCorrect + evidence.hintedCorrect * 0.6;
  return {
    attempts: evidence.attempts,
    correct: evidence.correct,
    wrong: evidence.wrong,
    independentCorrect: evidence.independentCorrect,
    hintedCorrect: evidence.hintedCorrect,
    wrongQuestionCount: evidence.wrongQuestionIds.size,
    coverage: Number(clamp(weightedIndependentWork / 2).toFixed(2)),
    lightState: lightState(evidence),
  };
}

function nodeEvidenceById({ behaviorEvents, subjectId }) {
  const evidenceByNodeId = new Map();
  const answerEvents = behaviorEvents.filter((event) => isSubjectEvent(event, subjectId) && isTrustedAnswerEvent(event));
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  answerEvents.forEach((event) => {
    const payload = event.payload || {};
    const binding = getMathQuestionFamilyGraphBinding(payload.questionFamilyId);
    if (!binding) return;
    const nodeIds = [binding.familyNodeId, ...binding.conceptNodeIds];
    nodeIds.forEach((nodeId) => {
      const evidence = evidenceByNodeId.get(nodeId) || emptyEvidence();
      evidence.attempts += 1;
      if (payload.isCorrect) {
        evidence.correct += 1;
        if (isIndependentAnswer(event)) evidence.independentCorrect += 1;
        else evidence.hintedCorrect += 1;
      } else {
        evidence.wrong += 1;
        evidence.wrongQuestionIds.add(payload.deliveryId || event.targetId || event.eventId);
      }
      evidenceByNodeId.set(nodeId, evidence);
    });
  });
  return { answerEvents, evidenceByNodeId };
}

export function buildServerKnowledgeGraph({ audience = "student", database, studentId, subjectId }) {
  const behaviorEvents = database.listBehaviorEvents({ studentId, subjectId, limit: 2000 });
  const { answerEvents, evidenceByNodeId } = nodeEvidenceById({ behaviorEvents, subjectId });
  const nodes = mathKnowledgeGraph.nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    title: node.title,
    domain: node.domain,
    gradeBands: [...node.gradeBands],
    atlas: node.atlas ? { ...node.atlas } : null,
    questionFamilyIds: [...node.questionFamilyIds],
    conceptNodeIds: [...node.conceptNodeIds],
    prerequisiteNodeIds: [...node.prerequisiteNodeIds],
    nextNodeIds: [...node.nextNodeIds],
    evidence: publicEvidence(evidenceByNodeId.get(node.id) || emptyEvidence()),
  }));
  const activeNodes = nodes.filter((node) => node.evidence.attempts > 0);
  const brightNodes = nodes.filter((node) => node.evidence.lightState === "bright");

  return {
    schemaVersion: "server_knowledge_graph_v1",
    source: "shared_math_knowledge_graph_and_server_evidence",
    audience,
    studentId,
    subjectId,
    graph: {
      id: mathKnowledgeGraph.id,
      gradeBands: [...mathKnowledgeGraph.gradeBands],
      nodes,
      edges: mathKnowledgeGraph.edges.map((edge) => ({ ...edge })),
    },
    evidence: {
      trustedAnswerCount: answerEvents.length,
      activeNodeCount: activeNodes.length,
      brightNodeCount: brightNodes.length,
      source: "server_authoritative_answer_events",
    },
    guardrails: [
      "Question generation and knowledge-map relations share the same family-to-node graph.",
      "Node coverage uses server-scored practice evidence and never exposes answer keys or private generation data.",
      "Knowledge-graph evidence can guide practice and review, but only a completed formal stage assessment may recalibrate the dynamic curve.",
    ],
  };
}
