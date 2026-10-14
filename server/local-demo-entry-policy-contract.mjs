import assert from "node:assert/strict";
import {
  isLocalObserverDemo,
  isLocalStudentDemo,
  normalizeLocalDemoSessionId,
  resolveLocalDemoContext,
} from "../src/services/local-demo-entry-policy.js";

assert.equal(isLocalStudentDemo({ hostname: "127.0.0.1", search: "?demo=student" }), true);
assert.equal(isLocalStudentDemo({ hostname: "localhost", search: "?entry=onboarding&demo=student" }), true);
assert.equal(isLocalStudentDemo({ hostname: "::1", search: "?demo=student&entry=home" }), true);
assert.equal(isLocalStudentDemo({ hostname: "127.0.0.1", search: "?demo=parent" }), false);
assert.equal(isLocalStudentDemo({ hostname: "example.com", search: "?demo=student" }), false);
assert.equal(
  isLocalObserverDemo({ hostname: "127.0.0.1", search: "?demo=parent&session=demo-123" }),
  true,
);
assert.equal(
  isLocalObserverDemo({ hostname: "localhost", search: "?demo=teacher&session=demo-123" }),
  true,
);
assert.equal(isLocalObserverDemo({ hostname: "localhost", search: "?demo=parent" }), false);
assert.equal(isLocalObserverDemo({ hostname: "example.com", search: "?demo=parent&session=demo-123" }), false);
assert.equal(normalizeLocalDemoSessionId("DEMO 123/<bad>"), "demo123bad");
assert.deepEqual(
  resolveLocalDemoContext({ hostname: "127.0.0.1", search: "?demo=teacher&session=DEMO-123" }),
  {
    role: "teacher",
    sessionId: "demo-123",
    studentId: "student-onboarding-demo-123",
  },
);

console.log("local-demo-entry-policy-contract: passed");
