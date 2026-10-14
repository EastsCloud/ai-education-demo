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
  assert.ok(response.cookie);
  return response.cookie;
}

const studentId = "student-001";
const subjectId = "math-linear-equations";
const now = "2026-07-14T10:00:00.000Z";

try {
  database.saveAssessmentSession({
    id: "atlas-initial-assessment",
    studentId,
    subjectId,
    assessmentType: "initial_onboarding",
    status: "completed",
    serverAuthoritative: true,
    updatedAt: now,
    questionSnapshot: [
      {
        id: "atlas-initial-question",
        answer: 12,
        metadata: {
          abilityTags: ["read_context"],
          atlasNodeIds: ["more_less"],
        },
      },
    ],
    responses: [
      {
        questionId: "atlas-initial-question",
        answer: 12,
        isCorrect: true,
        submittedAt: now,
      },
    ],
  });
  database.saveBehaviorEvent({
    eventId: "atlas-trusted-practice",
    studentId,
    subjectId,
    eventType: "answer_submitted",
    timestamp: "2026-07-14T10:03:00.000Z",
    targetId: "atlas-practice-question",
    payload: {
      isCorrect: true,
      scoringSource: "server_authoritative",
      hintsOpened: 0,
      abilityTags: ["read_context"],
      atlasNodeIds: ["more_less"],
      questionPrompt: "一本书有 12 页，今天读了 5 页，还剩多少页？",
      variantLevel: "original",
    },
  });
  database.saveBehaviorEvent({
    eventId: "atlas-untrusted-practice",
    studentId,
    subjectId,
    eventType: "answer_submitted",
    timestamp: "2026-07-14T10:04:00.000Z",
    targetId: "atlas-untrusted-question",
    payload: {
      isCorrect: true,
      scoringSource: "browser_claimed",
      abilityTags: ["read_context"],
      atlasNodeIds: ["more_less"],
    },
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const anonymous = await request(baseUrl, `/api/knowledge-atlases/${studentId}/${subjectId}`);
  assert.equal(anonymous.status, 401);

  const studentResponse = await request(baseUrl, `/api/knowledge-atlases/${studentId}/${subjectId}`, {
    cookie: studentCookie,
  });
  assert.equal(studentResponse.status, 200);
  const atlas = studentResponse.body.atlas;
  assert.equal(atlas.serverAuthoritative, true);
  assert.equal(atlas.source, "server_evidence_snapshot");
  assert.equal(atlas.evidence.initialAssessmentAnswerCount, 1);
  assert.equal(atlas.evidence.trustedPracticeAnswerCount, 1);
  assert.equal(atlas.evidence.excludedUntrustedAnswerCount, 1);
  assert.equal(atlas.evidence.answerCount, 2);
  assert.equal(atlas.pieces.find((piece) => piece.id === "read_target")?.status, "completed");
  assert.equal(JSON.stringify(atlas).includes('"answer":'), false);
  assert.equal(JSON.stringify(atlas).includes("browser_claimed"), false);

  const parentResponse = await request(baseUrl, `/api/knowledge-atlases/${studentId}/${subjectId}`, {
    cookie: parentCookie,
  });
  assert.equal(parentResponse.status, 200);
  assert.equal(parentResponse.body.atlas.audience, "parent");

  console.log("knowledge-atlas-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
