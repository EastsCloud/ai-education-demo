import assert from "node:assert/strict";
import { createBehaviorEventRepository } from "../src/services/behavior-event-repository.js";

const storage = {
  values: new Map(),
  getItem(key) {
    return this.values.get(key) || null;
  },
  setItem(key, value) {
    this.values.set(key, value);
  },
};

let requestedSubjectId = null;
const syncedEventIds = [];
const apiClient = {
  getBehaviorEvents({ subjectId }) {
    requestedSubjectId = subjectId;
    return Promise.resolve({
      events: [
        {
          eventId: "remote-math",
          studentId: "student-001",
          subjectId: "math-linear-equations",
          eventType: "answer_submitted",
          timestamp: "2026-07-14T09:00:00.000Z",
          payload: { subjectId: "math-linear-equations" },
        },
      ],
    });
  },
  syncBehaviorEvent(event) {
    syncedEventIds.push(event.eventId);
    return Promise.resolve({ event });
  },
};

const repository = createBehaviorEventRepository({ apiClient, storage });
repository.append(
  {
    eventId: "local-math",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    eventType: "question_started",
    timestamp: "2026-07-14T08:00:00.000Z",
    payload: { subjectId: "math-linear-equations" },
  },
  { mirror: false },
);
repository.append(
  {
    eventId: "local-server-answer",
    studentId: "student-001",
    subjectId: "math-linear-equations",
    eventType: "answer_submitted",
    timestamp: "2026-07-14T08:00:30.000Z",
    payload: { isCorrect: true, subjectId: "math-linear-equations" },
  },
  { mirror: false },
);
repository.append(
  {
    eventId: "local-english",
    studentId: "student-001",
    subjectId: "english",
    eventType: "question_started",
    timestamp: "2026-07-14T08:01:00.000Z",
    payload: { subjectId: "english" },
  },
  { mirror: false },
);

assert.deepEqual(
  repository.listByStudent("student-001", "math-linear-equations").map((event) => event.eventId),
  ["local-math", "local-server-answer"],
);
assert.deepEqual(repository.listByStudent("student-001", "english").map((event) => event.eventId), ["local-english"]);

const hydrated = await repository.hydrateByStudent("student-001", "math-linear-equations");
assert.equal(requestedSubjectId, "math-linear-equations");
assert.deepEqual(hydrated.map((event) => event.eventId), ["local-math", "local-server-answer", "remote-math"]);
assert.deepEqual(syncedEventIds, ["local-math"]);
assert.deepEqual(repository.listByStudent("student-001", "english").map((event) => event.eventId), ["local-english"]);

console.log("behavior-event-repository-contract: passed");
