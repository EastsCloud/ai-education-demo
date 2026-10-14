import assert from "node:assert/strict";
import { resolveRuntimePracticeDate } from "../src/services/runtime-practice-date.js";

assert.equal(
  resolveRuntimePracticeDate({
    demoDate: "2026-07-09",
    useDemoSeedData: true,
    now: new Date(2026, 7, 3, 9, 30),
  }),
  "2026-07-09",
);

assert.equal(
  resolveRuntimePracticeDate({
    demoDate: "2026-07-09",
    useDemoSeedData: false,
    now: new Date(2026, 7, 3, 9, 30),
  }),
  "2026-08-03",
);

assert.equal(
  resolveRuntimePracticeDate({
    demoDate: "not-a-date",
    useDemoSeedData: true,
    now: new Date(2026, 7, 3, 9, 30),
  }),
  "2026-08-03",
);

console.log("runtime-practice-date-contract: passed");
