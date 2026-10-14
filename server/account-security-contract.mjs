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
    cacheControl: response.headers.get("cache-control"),
    cookie: response.headers.get("set-cookie")?.split(";")[0] || null,
    setCookie: response.headers.get("set-cookie") || "",
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
  const baseUrl = "http://127.0.0.1:" + address.port;

  const firstSignIn = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const firstCookie = firstSignIn.cookie;
  assert.equal(firstSignIn.cacheControl, "no-store, max-age=0");
  assert.equal(firstSignIn.body.user.passwordHash, undefined);
  assert.equal(firstSignIn.body.user.password_hash, undefined);

  const secondSignIn = await signIn(baseUrl, "lin.an", "student-demo-2026");
  const secondCookie = secondSignIn.cookie;

  const session = await request(baseUrl, "/api/auth/session", { cookie: firstCookie });
  assert.equal(session.status, 200);
  assert.equal(session.body.session.user.userId, "user-student-001");
  assert.equal(session.body.session.user.displayName, "林安");

  const profile = await request(baseUrl, "/api/auth/profile", {
    method: "PUT",
    cookie: firstCookie,
    body: { displayName: "林安同学" },
  });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.displayName, "林安同学");

  const refreshedSecondSession = await request(baseUrl, "/api/auth/session", { cookie: secondCookie });
  assert.equal(refreshedSecondSession.status, 200);
  assert.equal(refreshedSecondSession.body.session.user.displayName, "林安同学");

  const invalidProfile = await request(baseUrl, "/api/auth/profile", {
    method: "PUT",
    cookie: firstCookie,
    body: { displayName: "名字\n不可以" },
  });
  assert.equal(invalidProfile.status, 400);
  assert.equal(invalidProfile.body.error, "invalid_display_name");

  const wrongCurrentPassword = await request(baseUrl, "/api/auth/change-password", {
    method: "POST",
    cookie: firstCookie,
    body: { currentPassword: "not-the-current-password", newPassword: "NewStudentPass2026" },
  });
  assert.equal(wrongCurrentPassword.status, 400);
  assert.equal(wrongCurrentPassword.body.error, "current_password_incorrect");

  const weakNewPassword = await request(baseUrl, "/api/auth/change-password", {
    method: "POST",
    cookie: firstCookie,
    body: { currentPassword: "student-demo-2026", newPassword: "short123" },
  });
  assert.equal(weakNewPassword.status, 400);
  assert.equal(weakNewPassword.body.error, "password_policy_not_met");

  const passwordChange = await request(baseUrl, "/api/auth/change-password", {
    method: "POST",
    cookie: firstCookie,
    body: { currentPassword: "student-demo-2026", newPassword: "NewStudentPass2026" },
  });
  assert.equal(passwordChange.status, 200);
  assert.equal(passwordChange.body.otherSessionsCleared, true);

  const preservedCurrentSession = await request(baseUrl, "/api/auth/session", { cookie: firstCookie });
  assert.equal(preservedCurrentSession.status, 200);
  assert.ok(preservedCurrentSession.body.session);

  const revokedOtherSession = await request(baseUrl, "/api/auth/session", { cookie: secondCookie });
  assert.equal(revokedOtherSession.status, 200);
  assert.equal(revokedOtherSession.body.session, null);

  const oldPasswordSignIn = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "lin.an", password: "student-demo-2026" },
  });
  assert.equal(oldPasswordSignIn.status, 401);
  assert.equal(oldPasswordSignIn.body.error, "invalid_login");

  const newPasswordSignIn = await signIn(baseUrl, "lin.an", "NewStudentPass2026");
  const signOut = await request(baseUrl, "/api/auth/sign-out", {
    method: "POST",
    cookie: newPasswordSignIn.cookie,
    body: {},
  });
  assert.equal(signOut.status, 200);
  assert.match(signOut.setCookie, /HttpOnly/);
  assert.match(signOut.setCookie, /SameSite=Lax/);
  assert.match(signOut.setCookie, /Max-Age=0/);

  const signedOutSession = await request(baseUrl, "/api/auth/session", { cookie: newPasswordSignIn.cookie });
  assert.equal(signedOutSession.status, 200);
  assert.equal(signedOutSession.body.session, null);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const denied = await request(baseUrl, "/api/auth/sign-in", {
      method: "POST",
      body: { loginName: "rate-limit-check", password: "wrong-password" },
    });
    assert.equal(denied.status, 401);
  }
  const rateLimited = await request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: { loginName: "rate-limit-check", password: "wrong-password" },
  });
  assert.equal(rateLimited.status, 429);
  assert.equal(rateLimited.body.error, "too_many_login_attempts");

  console.log("account-security-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
