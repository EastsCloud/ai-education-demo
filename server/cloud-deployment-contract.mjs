import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";
import { resolveApiBaseUrl } from "../src/services/api-base-url.js";
import { createAuthClient } from "../src/services/auth-client.js";
import { createLocalApiClient } from "../src/services/local-api-client.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const database = createEducationDatabase(":memory:", { seedDemoAccounts: false });
const server = createServer(createLocalApiServer({ database, projectRoot, secureCookies: true }));
assert.equal(database.authenticateAccount({ loginName: "lin.an", password: "student-demo-2026" }), null);
assert.equal(resolveApiBaseUrl(undefined, { protocol: "https:", hostname: "example.onrender.com" }), "/api");
assert.equal(resolveApiBaseUrl(undefined, { protocol: "file:" }), null);
assert.equal(resolveApiBaseUrl("https://api.example.com/"), "https://api.example.com");
const originalLocation = globalThis.location;
globalThis.location = { protocol: "https:", hostname: "example.onrender.com" };
assert.equal(createAuthClient().enabled, true);
assert.equal(createLocalApiClient().enabled, true);
globalThis.location = originalLocation;

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ["/", "/signin.html", "/src/styles.css?v=1", "/src/student-app-bootstrap.js", "/src/services/api-base-url.js"]) {
    assert.equal((await fetch(base + path)).status, 200, path);
  }
  for (const path of ["/server/database.mjs", "/test-data/system-e2e-final.sqlite", "/.env.example", "/.git/config", "/runtime-data/test.sqlite", "/docs/04_运行部署与测试账号.md", "/package.json", "/src/%2e%2e/server/database.mjs", "/src/%2e%2e%2fserver%2fdatabase.mjs", "/src/%5c..%5cserver%5cdatabase.mjs", "/src/runtime-config.js%00"]) {
    assert.equal((await fetch(base + path, { method: "HEAD" })).status, 404, path);
  }
  assert.equal((await fetch(base + "/src/%ZZ")).status, 400);
  assert.equal((await fetch(base + "/index.html", { method: "POST" })).status, 405);
  assert.match(await (await fetch(base + "/src/runtime-config.js")).text(), /publicDemo = false/);
  const registration = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginName: "cloud.contract", displayName: "云端测试", password: "CloudContract2026!", role: "student", gradeLabel: "小学五年级" }),
  });
  assert.equal(registration.status, 201);
  assert.match(registration.headers.get("set-cookie"), /; Secure/);
  const cookie = registration.headers.get("set-cookie").split(";")[0];
  const logout = await fetch(base + "/api/auth/sign-out", { method: "POST", headers: { Cookie: cookie } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /; Secure/);
} finally {
  await new Promise((done) => server.close(done));
  database.close();
}

const demoDb = createEducationDatabase(":memory:", { seedDemoAccounts: false });
const demoServer = createServer(createLocalApiServer({ database: demoDb, projectRoot, publicDemo: true }));
try {
  demoServer.listen(0, "127.0.0.1");
  await once(demoServer, "listening");
  const base = `http://127.0.0.1:${demoServer.address().port}`;
  assert.match(await (await fetch(base + "/")).text(), /data-demo-role="student"/);
  const config = await (await fetch(base + "/src/runtime-config.js")).text();
  assert.match(config, /publicDemo = true/);
  // Evaluate the actual served demo policy against the actual served config.
  const configUrl = `data:text/javascript,${encodeURIComponent(config)}`;
  const policySource = await (await fetch(base + "/src/services/local-demo-entry-policy.js")).text();
  const policy = await import(`data:text/javascript,${encodeURIComponent(policySource.replace('"../runtime-config.js"', JSON.stringify(configUrl)))}`);
  assert.equal(policy.isLocalStudentDemo({ hostname: "portfolio.onrender.com", search: "?demo=student&session=demo-123" }), true);
  assert.equal(policy.isLocalObserverDemo({ hostname: "portfolio.onrender.com", search: "?demo=teacher&session=demo-123" }), true);
  const apiSource = await (await fetch(base + "/src/services/api-base-url.js")).text();
  const api = await import(`data:text/javascript,${encodeURIComponent(apiSource.replace('"../runtime-config.js"', JSON.stringify(configUrl)))}`);
  assert.equal(api.resolveApiBaseUrl(undefined, { protocol: "https:", hostname: "portfolio.onrender.com" }), null);
} finally {
  await new Promise((done) => demoServer.close(done));
  demoDb.close();
}
console.log("cloud-deployment-contract: passed");
