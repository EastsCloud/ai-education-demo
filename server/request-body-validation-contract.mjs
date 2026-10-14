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

async function rawRequest(baseUrl, body) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return { body: await response.json(), status: response.status };
}

try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const malformed = await rawRequest(baseUrl, '{"loginName":');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.error, "invalid_json_body");
  assert.equal(malformed.body.detail, undefined);

  const arrayBody = await rawRequest(baseUrl, "[]");
  assert.equal(arrayBody.status, 400);
  assert.equal(arrayBody.body.error, "invalid_json_body");

  const tooLarge = await rawRequest(baseUrl, JSON.stringify({ padding: "x".repeat(2_000_100) }));
  assert.equal(tooLarge.status, 413);
  assert.equal(tooLarge.body.error, "request_body_too_large");

  const valid = await rawRequest(baseUrl, JSON.stringify({ loginName: "lin.an", password: "student-demo-2026" }));
  assert.equal(valid.status, 200);
  assert.ok(valid.body.user);

  console.log("request-body-validation-contract: passed");
} finally {
  if (server.listening) {
    server.close();
    await once(server, "close");
  }
  database.close();
}
