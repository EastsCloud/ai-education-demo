import assert from "node:assert/strict";
import { createEducationDatabase } from "./database.mjs";

const database = createEducationDatabase(":memory:");

database.saveBehaviorEvent({
  eventId: "event-math-1",
  studentId: "student-001",
  subjectId: "math-linear-equations",
  eventType: "answer_submitted",
  timestamp: "2026-07-14T08:00:00.000Z",
  payload: { subjectId: "math-linear-equations", scoringSource: "server_authoritative" },
});
database.saveBehaviorEvent({
  eventId: "event-english-1",
  studentId: "student-001",
  subjectId: "english",
  eventType: "answer_submitted",
  timestamp: "2026-07-14T08:01:00.000Z",
  payload: { subjectId: "english", scoringSource: "server_authoritative" },
});

const mathEvents = database.listBehaviorEvents({
  studentId: "student-001",
  subjectId: "math-linear-equations",
});
assert.equal(mathEvents.length, 1);
assert.equal(mathEvents[0].subjectId, "math-linear-equations");

const englishEvents = database.listBehaviorEvents({ studentId: "student-001", subjectId: "english" });
assert.equal(englishEvents.length, 1);
assert.equal(englishEvents[0].subjectId, "english");

database.close();
console.log("behavior-subject-boundary-contract: passed");
