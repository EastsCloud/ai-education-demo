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

const record = {
  studentId: "student-001",
  displayName: "小安",
  avatarDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  pageStyle: "focus",
  informationDensity: "standard",
};

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = "http://127.0.0.1:" + address.port;
  const studentCookie = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const parentCookie = await signIn(baseUrl, "parent.lin", "parent-demo-2026");

  const saved = await request(baseUrl, "/api/student-preferences/student-001", {
    method: "PUT",
    cookie: studentCookie,
    body: { record },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.record.displayName, "小安");
  assert.equal(saved.body.record.pageStyle, "focus");
  assert.ok(saved.body.record.updatedAt);

  const read = await request(baseUrl, "/api/student-preferences/student-001", {
    cookie: studentCookie,
  });
  assert.equal(read.status, 200);
  assert.equal(read.body.record.avatarDataUrl, record.avatarDataUrl);

  const parentRead = await request(baseUrl, "/api/student-preferences/student-001", {
    cookie: parentCookie,
  });
  assert.equal(parentRead.status, 403);

  const parentWrite = await request(baseUrl, "/api/student-preferences/student-001", {
    method: "PUT",
    cookie: parentCookie,
    body: { record },
  });
  assert.equal(parentWrite.status, 403);

  const invalidStyle = await request(baseUrl, "/api/student-preferences/student-001", {
    method: "PUT",
    cookie: studentCookie,
    body: { record: { ...record, pageStyle: "unknown" } },
  });
  assert.equal(invalidStyle.status, 400);

  const invalidAvatar = await request(baseUrl, "/api/student-preferences/student-001", {
    method: "PUT",
    cookie: studentCookie,
    body: { record: { ...record, avatarDataUrl: "https://example.com/avatar.png" } },
  });
  assert.equal(invalidAvatar.status, 400);

  console.log("student-preferences-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
