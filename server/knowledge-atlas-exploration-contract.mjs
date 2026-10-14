import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const invalid = await request(baseUrl, "/api/knowledge-atlas-explorations", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", familyId: "not-a-family" },
  });
  assert.equal(invalid.status, 400);

  const parentCreate = await request(baseUrl, "/api/knowledge-atlas-explorations", {
    method: "POST",
    cookie: parentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", familyId: "part_whole_add_subtract" },
  });
  assert.equal(parentCreate.status, 403);

  const created = await request(baseUrl, "/api/knowledge-atlas-explorations", {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", subjectId: "math-linear-equations", familyId: "part_whole_add_subtract" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.delivery.question.familyId, "part_whole_add_subtract");
  assert.equal(created.body.delivery.question.variantLevel, "original");
  assert.equal(created.body.delivery.question.instructionalGrade, "G1");
  assert.equal(created.body.delivery.question.support.allowed, true);
  assert.equal(JSON.stringify(created.body.delivery).includes('"answer"'), false);
  assert.equal(JSON.stringify(created.body.delivery).toLowerCase().includes("seed"), false);

  const storedDelivery = database.getQuestionDelivery({ deliveryId: created.body.delivery.id });
  assert.equal(storedDelivery.generationRequest.practiceMode, "atlas_related");
  assert.equal(storedDelivery.generationRequest.practiceRunId, null);

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
  assert.equal(wrong.body.result.isCorrect, false);
  assert.equal(Object.hasOwn(wrong.body, "practiceRun"), false);
  assert.equal(wrong.body.behaviorEvent.payload.extraPracticeMode, "atlas_related");

  const correct = await request(baseUrl, `/api/question-deliveries/${created.body.delivery.id}/attempts`, {
    method: "POST",
    cookie: studentCookie,
    body: { studentId: "student-001", answer: storedDelivery.privateCandidate.answer, elapsedSeconds: 3 },
  });
  assert.equal(correct.status, 200);
  assert.equal(correct.body.result.isCorrect, true);
  assert.equal(Object.hasOwn(correct.body, "practiceRun"), false);

  console.log("knowledge-atlas-exploration-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
