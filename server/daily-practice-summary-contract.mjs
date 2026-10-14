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
const studentId = "student-001";
const subjectId = "math-linear-equations";
const run = {
  id: "daily-practice-run-summary-contract",
  studentId,
  subjectId,
  practiceDate: "2026-08-04",
  status: "required_completed",
  requiredPracticeCompleted: true,
  queueItems: [],
  optionalPracticeSessions: [],
};

function answerEvent({ id, isCorrect, practiceRunId = run.id, scoringSource = "server_authoritative", timestamp }) {
  return {
    eventId: id,
    studentId,
    subjectId,
    sessionId: practiceRunId,
    eventType: "answer_submitted",
    timestamp,
    targetId: `question-${id}`,
    payload: {
      scoringSource,
      practiceRunId,
      deliveryId: `delivery-${id}`,
      isCorrect,
      hintsOpened: isCorrect ? 0 : 2,
      questionPrompt: `题目 ${id}`,
      stageLabel: isCorrect ? "原题" : "换一个数字",
      answer: 8642,
      seed: 2468,
    },
  };
}

async function request(baseUrl, path, { cookie, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: cookie ? { Cookie: cookie } : {},
  });
  return {
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    status: response.status,
  };
}

async function signIn(baseUrl, loginName, password) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginName, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  const cookie = response.headers.get("set-cookie")?.split(";")[0] || null;
  assert.ok(cookie);
  return cookie;
}

try {
  database.saveDailyPracticeRun(run);
  database.saveBehaviorEvent(
    answerEvent({ id: "same-run-correct", isCorrect: true, timestamp: "2026-08-04T09:00:00.000Z" }),
  );
  database.saveBehaviorEvent(
    answerEvent({ id: "same-run-wrong", isCorrect: false, timestamp: "2026-08-04T09:01:00.000Z" }),
  );
  database.saveBehaviorEvent(
    answerEvent({ id: "different-run", isCorrect: true, practiceRunId: "another-run", timestamp: "2026-08-04T09:02:00.000Z" }),
  );
  database.saveBehaviorEvent(
    answerEvent({ id: "browser-claim", isCorrect: true, scoringSource: "browser_claimed", timestamp: "2026-08-04T09:03:00.000Z" }),
  );

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const unauthenticated = await request(baseUrl, `/api/daily-practice-runs/${run.id}/summary`);
  assert.equal(unauthenticated.status, 401);

  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const studentSummary = await request(baseUrl, `/api/daily-practice-runs/${run.id}/summary`, {
    cookie: studentCookie,
  });
  assert.equal(studentSummary.status, 200, JSON.stringify(studentSummary.body));
  assert.equal(studentSummary.body.summary.practiceRunId, run.id);
  assert.equal(studentSummary.body.summary.total, 2);
  assert.equal(studentSummary.body.summary.correctCount, 1);
  assert.equal(studentSummary.body.summary.wrongCount, 1);
  assert.deepEqual(studentSummary.body.summary.wrongRetry, { available: false, eligibleCount: 0 });
  assert.deepEqual(
    studentSummary.body.summary.items.map((item) => item.id),
    ["same-run-correct", "same-run-wrong"],
  );
  assert.equal(studentSummary.body.summary.items[1].hintsOpened, 2);
  assert.equal(JSON.stringify(studentSummary.body.summary).includes("8642"), false);
  assert.equal(JSON.stringify(studentSummary.body.summary).includes("2468"), false);
  assert.equal(JSON.stringify(studentSummary.body.summary).includes("browser_claimed"), false);

  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const parentSummary = await request(baseUrl, `/api/daily-practice-runs/${run.id}/summary`, {
    cookie: parentCookie,
  });
  assert.equal(parentSummary.status, 200);
  assert.equal(parentSummary.body.summary.total, 2);

  console.log("daily-practice-summary-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
