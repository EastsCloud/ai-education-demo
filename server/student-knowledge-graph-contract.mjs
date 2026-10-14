import assert from "node:assert/strict";
import { getMathQuestionFamilyGraphBinding } from "../src/data/math-knowledge-graph.js";
import { buildStudentKnowledgeGraph } from "../src/services/student-knowledge-graph-engine.js";

function answer({ id, familyId, scoringSource = "prototype_fallback" }) {
  return {
    eventId: id,
    eventType: "answer_submitted",
    targetId: `question-${id}`,
    timestamp: `2026-09-07T10:0${id.at(-1)}:00.000Z`,
    payload: {
      isCorrect: true,
      hintsOpened: 0,
      guidedStepsOpened: 0,
      questionFamilyId: familyId,
      scoringSource,
    },
  };
}

const events = [
  answer({ id: "prototype-1", familyId: "data_range_comparison" }),
  answer({ id: "prototype-2", familyId: "data_range_comparison" }),
  answer({ id: "server-3", familyId: "compare_more_less", scoringSource: "server_authoritative" }),
];
const localGraph = buildStudentKnowledgeGraph({ behaviorEvents: events, includePrototypeEvidence: true });
const localRangeNodeId = getMathQuestionFamilyGraphBinding("data_range_comparison").familyNodeId;
const localRangeNode = localGraph.graph.nodes.find((node) => node.id === localRangeNodeId);
assert.equal(localRangeNode.evidence.independentCorrect, 2);
assert.equal(localRangeNode.evidence.lightState, "bright");

const strictGraph = buildStudentKnowledgeGraph({ behaviorEvents: events, includePrototypeEvidence: false });
const strictRangeNode = strictGraph.graph.nodes.find((node) => node.id === localRangeNodeId);
const strictServerNodeId = getMathQuestionFamilyGraphBinding("compare_more_less").familyNodeId;
const strictServerNode = strictGraph.graph.nodes.find((node) => node.id === strictServerNodeId);
assert.equal(strictRangeNode.evidence.attempts, 0);
assert.equal(strictRangeNode.evidence.lightState, "dark");
assert.equal(strictServerNode.evidence.attempts, 1);
assert.equal(strictServerNode.evidence.lightState, "partial");

console.log("student-knowledge-graph-contract: passed");
