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
const subjectId = "math-linear-equations";
const familyId = "linear_equation_word_problem";

async function request(baseUrl, path, { cookie } = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers: cookie ? { Cookie: cookie } : {} });
  return {
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    status: response.status,
  };
}

async function signIn(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginName: "lin.an", password: "student-demo-2026" }),
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")?.split(";")[0] || null;
}

function savePlan(studentId) {
  database.savePlan({
    id: `plan-${studentId}`,
    studentId,
    subjectId,
    status: "active",
    learningGoal: { targetGrade: "G5" },
    staticCurve: {
      id: `curve-${studentId}`,
      currentPoint: { week: 1, progressTowardTarget: 0.55, remainingGap: 0.45 },
      sourceInputs: { dailyStudyMinutes: 30, weeklyStudyDays: 5 },
    },
  });
}

function savePeerAttempts(studentId, correctCount) {
  for (let index = 0; index < 3; index += 1) {
    database.saveBehaviorEvent({
      eventId: `peer-question-${studentId}-${index}`,
      eventType: "answer_submitted",
      studentId,
      subjectId,
      timestamp: `2026-07-2${index}T12:00:00.000Z`,
      payload: {
        subjectId,
        questionFamilyId: familyId,
        scoringSource: "server_authoritative",
        isCorrect: index < correctCount,
      },
    });
  }
}

try {
  savePlan("student-001");
  Array.from({ length: 8 }, (_, index) => `student-peer-${index + 1}`).forEach((studentId, index) => {
    savePlan(studentId);
    savePeerAttempts(studentId, index % 3 === 0 ? 2 : 3);
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const cookie = await signIn(baseUrl);
  assert.ok(cookie);

  const anonymous = await request(
    baseUrl,
    `/api/question-type-benchmarks/student-001/${subjectId}?familyId=${familyId}`,
  );
  assert.equal(anonymous.status, 401);

  const available = await request(
    baseUrl,
    `/api/question-type-benchmarks/student-001/${subjectId}?familyId=${familyId}`,
    { cookie },
  );
  assert.equal(available.status, 200);
  assert.equal(available.body.benchmark.availability, "available");
  assert.equal(available.body.benchmark.cohortDescription, "同目标、同阶段学习者");
  assert.ok(available.body.benchmark.peerCorrectRate > 0);
  assert.equal(JSON.stringify(available.body.benchmark).includes("student-peer-"), false);

  const calibrating = await request(
    baseUrl,
    `/api/question-type-benchmarks/student-001/${subjectId}?familyId=ratio_rate_unit`,
    { cookie },
  );
  assert.equal(calibrating.status, 200);
  assert.equal(calibrating.body.benchmark.availability, "calibrating");

  console.log("peer-question-benchmark-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
