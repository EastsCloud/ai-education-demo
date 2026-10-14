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

async function request(baseUrl, path, { body, cookie, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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
  return response;
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const anonymous = await request(baseUrl, `/api/linked-students/${studentId}`, { method: "DELETE" });
  assert.equal(anonymous.status, 401);

  const student = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const studentAttempt = await request(baseUrl, `/api/linked-students/${studentId}`, {
    method: "DELETE",
    cookie: student.cookie,
  });
  assert.equal(studentAttempt.status, 403);

  const parent = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const teacherRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "teacher.revoke",
      displayName: "Revoke Teacher",
      password: "TeacherRevoke2026",
      role: "teacher",
    },
  });
  assert.equal(teacherRegistration.status, 201);
  const teacherCookie = teacherRegistration.cookie;

  const teacherInvite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: parent.cookie,
    body: { studentId, targetRole: "teacher" },
  });
  assert.equal(teacherInvite.status, 201);
  const teacherAccepted = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: teacherCookie,
    body: { code: teacherInvite.body.invite.code },
  });
  assert.equal(teacherAccepted.status, 200);

  const revoked = await request(baseUrl, `/api/linked-students/${studentId}`, {
    method: "DELETE",
    cookie: parent.cookie,
  });
  assert.equal(revoked.status, 200);
  assert.equal(revoked.body.relationship.studentId, studentId);
  assert.equal(revoked.body.relationship.accessStatus, "revoked");

  const parentStudents = await request(baseUrl, "/api/linked-students", { cookie: parent.cookie });
  assert.equal(parentStudents.status, 200);
  assert.equal(parentStudents.body.students.some((item) => item.studentId === studentId), false);

  const parentRead = await request(baseUrl, `/api/student-profiles/${studentId}`, { cookie: parent.cookie });
  assert.equal(parentRead.status, 403);
  const teacherRead = await request(baseUrl, `/api/student-profiles/${studentId}`, { cookie: teacherCookie });
  assert.equal(teacherRead.status, 200);

  const repeatedRevoke = await request(baseUrl, `/api/linked-students/${studentId}`, {
    method: "DELETE",
    cookie: parent.cookie,
  });
  assert.equal(repeatedRevoke.status, 404);
  assert.equal(repeatedRevoke.body.error, "student_relationship_not_active");

  const parentRejoinInvite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: teacherCookie,
    body: { studentId, targetRole: "parent" },
  });
  assert.equal(parentRejoinInvite.status, 201);
  const parentRejoined = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: parent.cookie,
    body: { code: parentRejoinInvite.body.invite.code },
  });
  assert.equal(parentRejoined.status, 200);

  const restoredParentStudents = await request(baseUrl, "/api/linked-students", { cookie: parent.cookie });
  assert.equal(restoredParentStudents.status, 200);
  assert.equal(restoredParentStudents.body.students.some((item) => item.studentId === studentId), true);

  const parentAudit = database.listAccountAuditEvents({ actorUserId: "user-parent-001" });
  assert.ok(
    parentAudit.some(
      (event) =>
        event.actionType === "student_relationship_revoked" &&
        event.targetStudentId === studentId &&
        event.detail.scope === "self_access_only",
    ),
  );

  console.log("relationship-revocation-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
