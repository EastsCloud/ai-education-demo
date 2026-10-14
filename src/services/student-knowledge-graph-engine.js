import { getMathQuestionFamilyGraphBinding, mathKnowledgeGraph } from "../data/math-knowledge-graph.js?v=math-knowledge-graph-1";
import { createIndependentAnswerPredicate } from "./retry-evidence-engine.js?v=retry-evidence-2";

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
  return {
    attempts: evidence.attempts,
    correct: evidence.correct,
    wrong: evidence.wrong,
    independentCorrect: evidence.independentCorrect,
    hintedCorrect: evidence.hintedCorrect,
    wrongQuestionCount: evidence.wrongQuestionIds.size,
    coverage: Number(Math.min(1, (evidence.independentCorrect + evidence.hintedCorrect * 0.6) / 2).toFixed(2)),
    lightState: lightState(evidence),
  };
}

export function buildStudentKnowledgeGraph({
  behaviorEvents = [],
  includePrototypeEvidence = false,
  studentId = null,
  subjectId = "math",
} = {}) {
  const acceptedScoringSources = new Set([
    "server_authoritative",
    ...(includePrototypeEvidence ? ["prototype_fallback"] : []),
  ]);
  const answerEvents = behaviorEvents.filter(
    (event) =>
      event?.eventType === "answer_submitted" &&
      typeof event.payload?.isCorrect === "boolean" &&
      acceptedScoringSources.has(event.payload?.scoringSource),
  );
  const isIndependentAnswer = createIndependentAnswerPredicate(behaviorEvents);
  const evidenceByNodeId = new Map();

  answerEvents.forEach((event) => {
    const binding = getMathQuestionFamilyGraphBinding(event.payload?.questionFamilyId);
    if (!binding) return;
    [binding.familyNodeId, ...binding.conceptNodeIds].forEach((nodeId) => {
      const evidence = evidenceByNodeId.get(nodeId) || emptyEvidence();
      evidence.attempts += 1;
      if (event.payload.isCorrect) {
        evidence.correct += 1;
        if (isIndependentAnswer(event)) evidence.independentCorrect += 1;
        else evidence.hintedCorrect += 1;
      } else {
        evidence.wrong += 1;
        evidence.wrongQuestionIds.add(event.targetId || event.eventId);
      }
      evidenceByNodeId.set(nodeId, evidence);
    });
  });

  const nodes = mathKnowledgeGraph.nodes.map((node) => ({
    ...node,
    gradeBands: [...node.gradeBands],
    questionFamilyIds: [...node.questionFamilyIds],
    conceptNodeIds: [...node.conceptNodeIds],
    prerequisiteNodeIds: [...node.prerequisiteNodeIds],
    nextNodeIds: [...node.nextNodeIds],
    evidence: publicEvidence(evidenceByNodeId.get(node.id) || emptyEvidence()),
  }));

  return {
    schemaVersion: "student_knowledge_graph_v1",
    source: includePrototypeEvidence ? "shared_math_graph_and_verified_prototype_evidence" : "shared_math_graph_and_server_evidence",
    studentId,
    subjectId,
    graph: {
      id: mathKnowledgeGraph.id,
      gradeBands: [...mathKnowledgeGraph.gradeBands],
      nodes,
      edges: mathKnowledgeGraph.edges.map((edge) => ({ ...edge })),
    },
  };
}
