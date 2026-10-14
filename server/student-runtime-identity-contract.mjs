import assert from "node:assert/strict";
import { resolveStudentRuntimeIdentity } from "../src/services/student-runtime-identity.js";

const fallback = resolveStudentRuntimeIdentity({});
assert.equal(fallback.authenticated, false);
assert.equal(fallback.studentId, "student-001");
assert.equal(fallback.useDemoSeedData, true);

const newStudent = resolveStudentRuntimeIdentity({
  bootstrap: {
    user: {
      userId: "user-student-new",
      role: "student",
      studentId: "student-new",
      displayName: "账户名称",
    },
    profile: {
      studentId: "student-new",
      displayName: "周宁",
      gradeLabel: "小学四年级",
    },
  },
});
assert.equal(newStudent.authenticated, true);
assert.equal(newStudent.studentId, "student-new");
assert.equal(newStudent.displayName, "周宁");
assert.equal(newStudent.gradeLabel, "小学四年级");
assert.equal(newStudent.useDemoSeedData, false);

const delayedProfile = resolveStudentRuntimeIdentity({
  bootstrap: {
    user: {
      role: "student",
      studentId: "student-delayed-profile",
      displayName: "新同学",
    },
  },
});
assert.equal(delayedProfile.authenticated, true);
assert.equal(delayedProfile.displayName, "新同学");
assert.equal(delayedProfile.gradeLabel, null);
assert.equal(delayedProfile.useDemoSeedData, false);

console.log("student-runtime-identity-contract: passed");
