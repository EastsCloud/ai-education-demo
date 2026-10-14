import assert from "node:assert/strict";
import { createObserverWorkspaceRepository } from "../src/services/observer-workspace-repository.js";

function createMemoryStorage(initialRecords = []) {
  let value = JSON.stringify(initialRecords);
  return {
    getItem() {
      return value;
    },
    setItem(_key, nextValue) {
      value = nextValue;
    },
    records() {
      return JSON.parse(value);
    },
  };
}

const storage = createMemoryStorage([
  {
    id: "observer-workspace-user-parent-001-student-001",
    actorUserId: "user-parent-001",
    studentId: "student-001",
    role: "parent",
    displayName: "家长观察页",
    enabledModules: ["progress", "messages"],
  },
]);
const mirrored = [];
const repository = createObserverWorkspaceRepository({
  storage,
  apiClient: {
    mirrorObserverWorkspace(record) {
      mirrored.push(record);
    },
  },
});

const migrated = repository.getOrCreate({
  actorUserId: "user-parent-001",
  studentId: "student-001",
  role: "parent",
});
assert.equal(migrated.moduleCatalogVersion, 3);
assert.equal(migrated.enabledModules.includes("formal_test_evidence"), true);
assert.equal(storage.records()[0].enabledModules.includes("formal_test_evidence"), true);
assert.equal(mirrored.length, 1);

const optedOut = repository.toggleModule({
  actorUserId: "user-parent-001",
  studentId: "student-001",
  role: "parent",
  moduleId: "formal_test_evidence",
});
assert.equal(optedOut.moduleCatalogVersion, 3);
assert.equal(optedOut.enabledModules.includes("formal_test_evidence"), false);

const retainedOptOut = repository.getOrCreate({
  actorUserId: "user-parent-001",
  studentId: "student-001",
  role: "parent",
});
assert.equal(retainedOptOut.enabledModules.includes("formal_test_evidence"), false);

const teacherStorage = createMemoryStorage([
  {
    id: "observer-workspace-user-teacher-001-student-001",
    actorUserId: "user-teacher-001",
    studentId: "student-001",
    role: "teacher",
    displayName: "老师观察页",
    enabledModules: ["progress", "question_tag_evidence"],
    moduleCatalogVersion: 2,
  },
]);
const teacherRepository = createObserverWorkspaceRepository({
  storage: teacherStorage,
  apiClient: { mirrorObserverWorkspace() {} },
});
const migratedTeacher = teacherRepository.getOrCreate({
  actorUserId: "user-teacher-001",
  studentId: "student-001",
  role: "teacher",
});
assert.equal(migratedTeacher.moduleCatalogVersion, 3);
assert.equal(migratedTeacher.enabledModules.includes("peer_trend"), true);

teacherRepository.toggleModule({
  actorUserId: "user-teacher-001",
  studentId: "student-001",
  role: "teacher",
  moduleId: "peer_trend",
});
assert.equal(
  teacherRepository.getOrCreate({
    actorUserId: "user-teacher-001",
    studentId: "student-001",
    role: "teacher",
  }).enabledModules.includes("peer_trend"),
  false,
);

console.log("observer-workspace-repository-contract: passed");
