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

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = "http://127.0.0.1:" + address.port;
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");
  const teacherCookie = await signIn(baseUrl, "teacher.wang", "teacher-demo-2026");
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");

  const workspace = {
    id: "observer-workspace-user-parent-001-student-001",
    actorUserId: "user-parent-001",
    studentId,
    role: "parent",
    displayName: "家长观察页",
    enabledModules: ["progress", "messages"],
    createdAt: "2026-07-21T12:00:00.000Z",
    updatedAt: "2026-07-21T12:00:00.000Z",
  };
  const savedWorkspace = await request(baseUrl, "/api/observer-workspaces/user-parent-001/student-001", {
    method: "PUT",
    cookie: parentCookie,
    body: { record: workspace },
  });
  assert.equal(savedWorkspace.status, 200);
  assert.equal(savedWorkspace.body.record.actorUserId, "user-parent-001");

  const spoofedWorkspace = await request(baseUrl, "/api/observer-workspaces/user-teacher-001/student-001", {
    method: "PUT",
    cookie: parentCookie,
    body: {
      record: {
        ...workspace,
        id: "observer-workspace-user-teacher-001-student-001",
        actorUserId: "user-teacher-001",
        role: "teacher",
      },
    },
  });
  assert.equal(spoofedWorkspace.status, 403);

  const studentWorkspaceRead = await request(baseUrl, "/api/observer-workspaces/user-parent-001/student-001", {
    cookie: studentCookie,
  });
  assert.equal(studentWorkspaceRead.status, 403);

  const parentMessage = {
    id: "message-parent-001",
    studentId,
    fromUserId: "user-parent-001",
    fromRole: "parent",
    title: "给你的话",
    body: " <img src=x onerror=alert(1)> 今天先把题意读清楚，再慢慢做。 ",
    createdAt: "2026-07-21T12:01:00.000Z",
  };
  const savedParentMessage = await request(baseUrl, "/api/student-messages", {
    method: "POST",
    cookie: parentCookie,
    body: { message: parentMessage },
  });
  assert.equal(savedParentMessage.status, 201);
  assert.equal(savedParentMessage.body.message.fromUserId, "user-parent-001");
  assert.equal(savedParentMessage.body.message.body, "<img src=x onerror=alert(1)> 今天先把题意读清楚，再慢慢做。");

  const spoofedMessage = await request(baseUrl, "/api/student-messages", {
    method: "POST",
    cookie: parentCookie,
    body: {
      message: {
        ...parentMessage,
        id: "message-spoofed",
        fromUserId: "user-teacher-001",
        fromRole: "teacher",
      },
    },
  });
  assert.equal(spoofedMessage.status, 403);

  const studentWrite = await request(baseUrl, "/api/student-messages", {
    method: "POST",
    cookie: studentCookie,
    body: {
      message: {
        ...parentMessage,
        id: "message-student-write",
        fromUserId: "user-student-001",
        fromRole: "student",
      },
    },
  });
  assert.equal(studentWrite.status, 403);

  const teacherMessage = await request(baseUrl, "/api/student-messages", {
    method: "POST",
    cookie: teacherCookie,
    body: {
      message: {
        ...parentMessage,
        id: "message-teacher-001",
        fromUserId: "user-teacher-001",
        fromRole: "teacher",
        body: "先说出题目里的关系，再写算式。",
      },
    },
  });
  assert.equal(teacherMessage.status, 201);

  const oversizedMessage = await request(baseUrl, "/api/student-messages", {
    method: "POST",
    cookie: parentCookie,
    body: {
      message: {
        ...parentMessage,
        id: "message-too-long",
        body: "x".repeat(181),
      },
    },
  });
  assert.equal(oversizedMessage.status, 400);
  assert.equal(oversizedMessage.body.error, "invalid_student_message");

  const studentMessages = await request(baseUrl, "/api/student-messages/student-001", {
    cookie: studentCookie,
  });
  assert.equal(studentMessages.status, 200);
  assert.equal(studentMessages.body.messages.length, 2);
  assert.ok(studentMessages.body.messages.some((message) => message.id === "message-parent-001"));
  assert.ok(studentMessages.body.messages.some((message) => message.id === "message-teacher-001"));

  console.log("observer-collaboration-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
