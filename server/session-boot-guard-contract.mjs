import assert from "node:assert/strict";
import { waitForSession } from "../src/services/session-boot-guard.js";

const resolved = await waitForSession(Promise.resolve({ session: { user: { role: "student" } } }), { timeoutMs: 20 });
assert.equal(resolved.session.user.role, "student");

await assert.rejects(
  waitForSession(new Promise(() => {}), { timeoutMs: 5 }),
  (error) => error instanceof Error && error.message === "session_boot_timeout",
);

console.log("session-boot-guard-contract: passed");
