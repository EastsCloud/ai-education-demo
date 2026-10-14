import assert from "node:assert/strict";
import { createKnowledgeGraphRepository } from "../src/services/knowledge-graph-repository.js";

const authoritativeGraph = {
  schemaVersion: "server_knowledge_graph_v1",
  studentId: "student-journey",
  subjectId: "math-linear-equations",
  graph: { nodes: [{ id: "family:test", kind: "question_family" }] },
};

const repository = createKnowledgeGraphRepository({
  apiClient: {
    enabled: true,
    async getKnowledgeGraph() {
      return { graph: authoritativeGraph };
    },
  },
});

const hydrated = await repository.hydrate({
  studentId: "student-journey",
  subjectId: "math-linear-equations",
});
assert.deepEqual(hydrated, authoritativeGraph);
assert.deepEqual(
  repository.find({ studentId: "student-journey", subjectId: "math-linear-equations" }),
  authoritativeGraph,
);

console.log("knowledge-graph-repository-contract: passed");
