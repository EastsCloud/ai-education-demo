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
  const response = await fetch(baseUrl + path, {
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
  const studentId = "student-001";

  const anonymousInvite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    body: { studentId, targetRole: "teacher" },
  });
  assert.equal(anonymousInvite.status, 401);

  const student = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const studentInvite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: student.cookie,
    body: { studentId, targetRole: "parent" },
  });
  assert.equal(studentInvite.status, 201);
  assert.equal(studentInvite.body.invite.targetRole, "parent");

  const studentInvitedParent = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "parent.invited-by-student",
      displayName: "学生邀请的家长",
      password: "ParentStart2026",
      role: "parent",
    },
  });
  assert.equal(studentInvitedParent.status, 201);
  const studentInviteAccepted = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: studentInvitedParent.cookie,
    body: { code: studentInvite.body.invite.code },
  });
  assert.equal(studentInviteAccepted.status, 200);
  assert.equal(studentInviteAccepted.body.student.studentId, studentId);
  assert.equal(studentInviteAccepted.body.student.relationshipType, "guardian");

  const parent = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const invalidRole = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: parent.cookie,
    body: { studentId, targetRole: "student" },
  });
  assert.equal(invalidRole.status, 400);
  assert.equal(invalidRole.body.error, "invalid_relationship_role");

  const invite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: parent.cookie,
    body: { studentId, targetRole: "teacher" },
  });
  assert.equal(invite.status, 201);
  assert.match(invite.body.invite.code, /^AE-[A-F0-9]{18}$/);
  assert.equal(invite.body.invite.targetRole, "teacher");
  assert.equal(invite.body.invite.student.displayName, "林安");
  assert.equal(invite.body.invite.codeHash, undefined);

  const wrongRoleAcceptance = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: parent.cookie,
    body: { code: invite.body.invite.code },
  });
  assert.equal(wrongRoleAcceptance.status, 403);
  assert.equal(wrongRoleAcceptance.body.error, "relationship_invite_role_mismatch");

  const unrelatedParentRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "parent.unlinked",
      displayName: "未关联家长",
      password: "ParentStart2026",
      role: "parent",
    },
  });
  assert.equal(unrelatedParentRegistration.status, 201);
  const unrelatedParentInvite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: unrelatedParentRegistration.cookie,
    body: { studentId, targetRole: "teacher" },
  });
  assert.equal(unrelatedParentInvite.status, 403);
  assert.equal(unrelatedParentInvite.body.error, "student_access_denied");

  const teacherRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "teacher.chen",
      displayName: "陈老师",
      password: "TeacherStart2026",
      role: "teacher",
    },
  });
  assert.equal(teacherRegistration.status, 201);
  const teacherUserId = teacherRegistration.body.user.userId;

  const accepted = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: teacherRegistration.cookie,
    body: { code: invite.body.invite.code },
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.student.studentId, studentId);
  assert.equal(accepted.body.student.relationshipType, "teacher");

  const teacherStudents = await request(baseUrl, "/api/linked-students", { cookie: teacherRegistration.cookie });
  assert.equal(teacherStudents.status, 200);
  assert.ok(teacherStudents.body.students.some((linkedStudent) => linkedStudent.studentId === studentId));

  const teacherRead = await request(baseUrl, `/api/student-profiles/${studentId}`, { cookie: teacherRegistration.cookie });
  assert.equal(teacherRead.status, 200);

  const reusedCode = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: teacherRegistration.cookie,
    body: { code: invite.body.invite.code },
  });
  assert.equal(reusedCode.status, 400);
  assert.equal(reusedCode.body.error, "relationship_invite_unavailable");

  const parentAudit = database.listAccountAuditEvents({ actorUserId: "user-parent-001" });
  assert.ok(parentAudit.some((event) => event.actionType === "student_relationship_invited"));
  const studentAudit = database.listAccountAuditEvents({ actorUserId: "user-student-001" });
  assert.ok(studentAudit.some((event) => event.actionType === "student_relationship_invited"));
  const teacherAudit = database.listAccountAuditEvents({ actorUserId: teacherUserId });
  assert.ok(
    teacherAudit.some(
      (event) => event.actionType === "student_relationship_invite_accepted" && event.targetStudentId === studentId,
    ),
  );

  console.log("relationship-invite-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
