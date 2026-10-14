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

  const invalidRole = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "admin.self",
      displayName: "不应创建",
      password: "StudentStart2026",
      role: "admin",
    },
  });
  assert.equal(invalidRole.status, 400);
  assert.equal(invalidRole.body.error, "invalid_account_role");

  const invalidLogin = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "bad login",
      displayName: "陈妈妈",
      password: "ParentStart2026",
      role: "parent",
    },
  });
  assert.equal(invalidLogin.status, 400);
  assert.equal(invalidLogin.body.error, "invalid_login_name");

  const missingStudentGrade = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "student.missing-grade",
      displayName: "独立学生",
      password: "StudentStart2026",
      role: "student",
    },
  });
  assert.equal(missingStudentGrade.status, 400);
  assert.equal(missingStudentGrade.body.error, "invalid_student_grade");

  const selfStudentRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "student.self",
      displayName: "独立学生",
      password: "StudentStart2026",
      role: "student",
      gradeLabel: "小学三年级",
    },
  });
  assert.equal(selfStudentRegistration.status, 201);
  assert.ok(selfStudentRegistration.cookie);
  assert.equal(selfStudentRegistration.body.user.role, "student");
  assert.equal(selfStudentRegistration.body.user.passwordHash, undefined);
  assert.equal(selfStudentRegistration.body.student.relationshipType, "self");
  const selfStudentId = selfStudentRegistration.body.user.studentId;
  assert.ok(selfStudentId);

  const selfStudentProfile = await request(baseUrl, `/api/student-profiles/${encodeURIComponent(selfStudentId)}`, {
    cookie: selfStudentRegistration.cookie,
  });
  assert.equal(selfStudentProfile.status, 200);
  assert.equal(selfStudentProfile.body.profile.gradeLabel, "小学三年级");

  const selfStudentLinks = await request(baseUrl, "/api/linked-students", {
    cookie: selfStudentRegistration.cookie,
  });
  assert.equal(selfStudentLinks.status, 200);
  assert.deepEqual(
    selfStudentLinks.body.students.map((student) => ({ studentId: student.studentId, relationshipType: student.relationshipType })),
    [{ studentId: selfStudentId, relationshipType: "self" }],
  );

  const selfStudentAuditEvents = database.listAccountAuditEvents({ actorUserId: selfStudentRegistration.body.user.userId });
  assert.ok(selfStudentAuditEvents.some((event) => event.actionType === "student_account_registered"));

  const selfStudentInvite = await request(baseUrl, "/api/student-relationship-invites", {
    method: "POST",
    cookie: selfStudentRegistration.cookie,
    body: { studentId: selfStudentId, targetRole: "parent" },
  });
  assert.equal(selfStudentInvite.status, 201);
  assert.equal(selfStudentInvite.body.invite.targetRole, "parent");

  const optionalParentRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "parent.self-support",
      displayName: "支持家长",
      password: "ParentStart2026",
      role: "parent",
    },
  });
  assert.equal(optionalParentRegistration.status, 201);
  const optionalParentAcceptance = await request(baseUrl, "/api/student-relationship-invites/accept", {
    method: "POST",
    cookie: optionalParentRegistration.cookie,
    body: { code: selfStudentInvite.body.invite.code },
  });
  assert.equal(optionalParentAcceptance.status, 200);
  assert.equal(optionalParentAcceptance.body.student.studentId, selfStudentId);
  assert.equal(optionalParentAcceptance.body.student.relationshipType, "guardian");

  const registration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "parent.chen",
      displayName: "陈妈妈",
      password: "ParentStart2026",
      role: "parent",
    },
  });
  assert.equal(registration.status, 201);
  assert.ok(registration.cookie);
  assert.equal(registration.body.user.role, "parent");
  assert.equal(registration.body.user.passwordHash, undefined);
  const parentCookie = registration.cookie;
  const parentUserId = registration.body.user.userId;

  const duplicateRegistration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      loginName: "parent.chen",
      displayName: "另一位陈妈妈",
      password: "ParentStart2026",
      role: "parent",
    },
  });
  assert.equal(duplicateRegistration.status, 409);
  assert.equal(duplicateRegistration.body.error, "login_name_taken");

  const anonymousCreation = await request(baseUrl, "/api/managed-students", {
    method: "POST",
    body: { student: {} },
  });
  assert.equal(anonymousCreation.status, 401);

  const invalidStudent = await request(baseUrl, "/api/managed-students", {
    method: "POST",
    cookie: parentCookie,
    body: {
      student: {
        loginName: "chen.yu",
        displayName: "陈宇",
        password: "StudentStart2026",
        gradeLabel: "高中一年级",
      },
    },
  });
  assert.equal(invalidStudent.status, 400);
  assert.equal(invalidStudent.body.error, "invalid_student_grade");

  const createdStudent = await request(baseUrl, "/api/managed-students", {
    method: "POST",
    cookie: parentCookie,
    body: {
      student: {
        loginName: "chen.yu",
        displayName: "陈宇",
        password: "StudentStart2026",
        gradeLabel: "小学四年级",
      },
    },
  });
  assert.equal(createdStudent.status, 201);
  assert.equal(createdStudent.body.user.role, "student");
  assert.equal(createdStudent.body.user.passwordHash, undefined);
  assert.equal(createdStudent.body.student.displayName, "陈宇");
  assert.equal(createdStudent.body.student.relationshipType, "guardian");
  const studentId = createdStudent.body.student.studentId;

  const parentStudents = await request(baseUrl, "/api/linked-students", { cookie: parentCookie });
  assert.equal(parentStudents.status, 200);
  assert.ok(parentStudents.body.students.some((student) => student.studentId === studentId));

  const studentSignIn = await signIn(baseUrl, "chen.yu", "StudentStart2026");
  assert.equal(studentSignIn.body.user.studentId, studentId);
  const ownProfile = await request(baseUrl, `/api/student-profiles/${encodeURIComponent(studentId)}`, {
    cookie: studentSignIn.cookie,
  });
  assert.equal(ownProfile.status, 200);
  assert.equal(ownProfile.body.profile.gradeLabel, "小学四年级");

  const demoTeacher = await signIn(baseUrl, "teacher.wang", "teacher-demo-2026");
  const unrelatedTeacherRead = await request(baseUrl, `/api/student-profiles/${encodeURIComponent(studentId)}`, {
    cookie: demoTeacher.cookie,
  });
  assert.equal(unrelatedTeacherRead.status, 403);

  const parentRead = await request(baseUrl, `/api/student-profiles/${encodeURIComponent(studentId)}`, {
    cookie: parentCookie,
  });
  assert.equal(parentRead.status, 200);
  assert.equal(parentRead.body.profile.displayName, "陈宇");

  const studentCannotCreate = await request(baseUrl, "/api/managed-students", {
    method: "POST",
    cookie: studentSignIn.cookie,
    body: {
      student: {
        loginName: "not.allowed",
        displayName: "不允许",
        password: "StudentStart2026",
        gradeLabel: "小学一年级",
      },
    },
  });
  assert.equal(studentCannotCreate.status, 403);

  const duplicateStudentLogin = await request(baseUrl, "/api/managed-students", {
    method: "POST",
    cookie: parentCookie,
    body: {
      student: {
        loginName: "chen.yu",
        displayName: "重复学生",
        password: "StudentStart2026",
        gradeLabel: "小学四年级",
      },
    },
  });
  assert.equal(duplicateStudentLogin.status, 409);
  assert.equal(duplicateStudentLogin.body.error, "login_name_taken");

  const auditEvents = database.listAccountAuditEvents({ actorUserId: parentUserId });
  assert.ok(auditEvents.some((event) => event.actionType === "account_registered"));
  assert.ok(
    auditEvents.some(
      (event) => event.actionType === "student_account_created" && event.targetStudentId === studentId,
    ),
  );

  console.log("student-account-management-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
