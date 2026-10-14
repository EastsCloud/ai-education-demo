import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMathQuestionFamilyGraphBinding,
  mathKnowledgeGraph,
  validateMathKnowledgeGraph,
} from "../src/data/math-knowledge-graph.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const database = createEducationDatabase(":memory:");
const server = createServer(createLocalApiServer({ database, projectRoot }));

async function request(baseUrl, path, { body, cookie, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    status: response.status,
  };
}

async function signIn(baseUrl, loginName, password) {
  const response = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName, password },
  });
  assert.equal(response.status, 200);
  return response.cookie;
}

function deliveryRequest() {
  return {
    studentId: "student-001",
    subjectId: "math-linear-equations",
    mode: "practice",
    familyId: "part_whole_add_subtract",
    instructionalGrade: "G1",
    variantLevel: "original",
    aiVersion: "semi_ai",
    seed: 37,
    queueItemId: "knowledge-graph-contract-item",
    source: "knowledge_graph_contract",
  };
}

try {
  const validation = validateMathKnowledgeGraph();
  assert.equal(validation.valid, true, validation.errors.join(", "));
  assert.equal(validation.familyCount, shanghaiMathItemFamilies.length);
  assert.ok(validation.conceptCount > 0);
  assert.ok(validation.edgeCount > shanghaiMathItemFamilies.length);

  shanghaiMathItemFamilies.forEach((family, index) => {
    const binding = getMathQuestionFamilyGraphBinding(family.id);
    assert.ok(binding?.familyNodeId);
    assert.ok(binding?.conceptNodeIds.length);
    const candidate = validateMathQuestionCandidate(
      generateMathQuestionCandidate({
        aiVersion: "semi_ai",
        family,
        seed: index + 1,
        instructionalGrade: family.gradeBands.at(-1),
        variantLevel: index % 2 ? "change_one_number" : "original",
      }),
    );
    assert.equal(candidate.qualityStatus, "system_validated");
    assert.equal(candidate.metadataTags.itemTags.knowledgeGraphTags.graphId, mathKnowledgeGraph.id);
    assert.equal(candidate.metadataTags.itemTags.knowledgeGraphTags.familyNodeId, binding.familyNodeId);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const anonymous = await request(baseUrl, "/api/knowledge-graphs/student-001/math-linear-equations");
  assert.equal(anonymous.status, 401);

  const created = await request(baseUrl, "/api/question-deliveries", {
    method: "POST",
    cookie: studentCookie,
    body: { request: deliveryRequest() },
  });
  assert.equal(created.status, 201);
  const started = await request(baseUrl, `/api/question-deliveries/${created.body.delivery.id}/start`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001" },
  });
  assert.equal(started.status, 200);
  const wrong = await request(baseUrl, `/api/question-deliveries/${created.body.delivery.id}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: -1, elapsedSeconds: 2 },
  });
  assert.equal(wrong.status, 200);

  const graph = await request(baseUrl, "/api/knowledge-graphs/student-001/math-linear-equations", {
    cookie: studentCookie,
  });
  assert.equal(graph.status, 200);
  assert.equal(graph.body.graph.source, "shared_math_knowledge_graph_and_server_evidence");
  assert.ok(graph.body.graph.evidence.trustedAnswerCount >= 1);
  const familyNode = graph.body.graph.graph.nodes.find((node) => node.id === "family:part_whole_add_subtract");
  assert.equal(familyNode.evidence.wrong, 1);
  assert.ok(familyNode.conceptNodeIds.length);
  assert.equal(familyNode.atlas.studentCue, "先分清整体和其中的部分。");
  assert.equal(familyNode.atlas.expression, "整体 = 部分 + 部分");
  assert.equal(JSON.stringify(graph.body.graph).includes('"correctAnswer"'), false);
  assert.equal(JSON.stringify(graph.body.graph).includes('"seed"'), false);

  const parentGraph = await request(baseUrl, "/api/knowledge-graphs/student-001/math-linear-equations", {
    cookie: parentCookie,
  });
  assert.equal(parentGraph.status, 200);
  assert.equal(parentGraph.body.graph.audience, "parent");

  console.log("knowledge-graph-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
