// Run the real entry point with Render-like environment, including a restart.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

const temporary = mkdtempSync(resolve(tmpdir(), "ai-education-render-"));
let child;
let output = "";
let spawnError;
const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const port = listener.address().port;
await new Promise((done) => listener.close(done));
const base = `http://127.0.0.1:${port}`;
async function start(publicDemo = false) {
  output = "";
  spawnError = null;
  child = spawn(process.execPath, ["server/dev-server.mjs"], {
    env: { ...process.env, NODE_ENV: "production", RENDER: "true", HOST: "0.0.0.0", PORT: String(port), AI_EDUCATION_DATABASE_PATH: resolve(temporary, "education.sqlite"), AI_EDUCATION_SEED_DEMO_ACCOUNTS: "false", AI_EDUCATION_PUBLIC_DEMO: String(publicDemo) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.on("error", (error) => { spawnError = error; });
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error(output);
    try {
      const response = await fetch(base + "/api/health");
      if (response.ok) return;
    } catch { /* Wait for listening. */ }
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`Render startup timed out: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await exited;
}
try {
  await start();
  assert.match(output, /http:\/\/0\.0\.0\.0:/);
  const credentials = { loginName: "render.smoke", displayName: "Render 测试", password: "RenderSmoke2026!", role: "student", gradeLabel: "小学五年级" };
  const register = await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
  assert.equal(register.status, 201);
  assert.match(register.headers.get("set-cookie"), /; Secure/);
  const cookie = register.headers.get("set-cookie").split(";")[0];
  const registered = await register.json();
  await stop();
  await start();
  const session = await (await fetch(base + "/api/auth/session", { headers: { Cookie: cookie } })).json();
  assert.equal(session.session.user.userId, registered.user.userId);
  const demoLogin = await fetch(base + "/api/auth/sign-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginName: "lin.an", password: "student-demo-2026" }) });
  assert.equal(demoLogin.status, 401);
  await stop();
  await start(true);
  assert.match(await (await fetch(base + "/")).text(), /data-demo-role="student"/);
  assert.match(await (await fetch(base + "/src/runtime-config.js")).text(), /publicDemo = true/);
  console.log("render-smoke: startup, secure cookies, registration, DB/session persistence after restart, and portfolio mode passed");
} finally {
  await stop();
  assert.equal(dirname(temporary), resolve(tmpdir()));
  assert.ok(basename(temporary).startsWith("ai-education-render-"));
  rmSync(temporary, { recursive: true, force: true });
}
