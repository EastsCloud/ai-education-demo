import assert from "node:assert/strict";
import { createAtlasPracticeResumeRepository } from "../src/services/atlas-practice-resume-repository.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

const storage = createMemoryStorage();
const repository = createAtlasPracticeResumeRepository({ storage });

assert.equal(
  repository.save({
    studentId: "student-001",
    subjectId: "math-linear-equations",
    deliveryId: "delivery-wrong-retry",
    familyId: "time_elapsed_simple",
    kind: "wrong_retry",
    answer: "08:45",
    sourcePrompt: "This must never be stored in browser resume state.",
  }).deliveryId,
  "delivery-wrong-retry",
);

const stored = storage.getItem("ai-education-atlas-practice-resumes-v1");
assert.equal(stored.includes("08:45"), false);
assert.equal(stored.includes("This must never"), false);
assert.equal(repository.find({ studentId: "student-001", subjectId: "math-linear-equations" }).kind, "wrong_retry");

repository.save({
  studentId: "student-001",
  subjectId: "math-linear-equations",
  deliveryId: "delivery-exploration",
  familyId: "fraction_part_of_whole",
  kind: "exploration",
});
assert.equal(
  repository.find({ studentId: "student-001", subjectId: "math-linear-equations" }).deliveryId,
  "delivery-exploration",
);

repository.save({
  studentId: "student-001",
  subjectId: "math",
  deliveryId: "delivery-other-subject",
  familyId: "fraction_part_of_whole",
  kind: "exploration",
});
repository.clear({
  studentId: "student-001",
  subjectId: "math-linear-equations",
  deliveryId: "different-delivery",
});
assert.ok(repository.find({ studentId: "student-001", subjectId: "math-linear-equations" }));

repository.clear({
  studentId: "student-001",
  subjectId: "math-linear-equations",
  deliveryId: "delivery-exploration",
});
assert.equal(repository.find({ studentId: "student-001", subjectId: "math-linear-equations" }), null);
assert.equal(repository.find({ studentId: "student-001", subjectId: "math" }).deliveryId, "delivery-other-subject");
assert.equal(
  repository.save({
    studentId: "student-001",
    subjectId: "math",
    deliveryId: "invalid-kind",
    kind: "unsupported",
  }),
  null,
);

console.log("atlas-practice-resume-repository-contract: passed");
