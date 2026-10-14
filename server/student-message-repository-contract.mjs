import assert from "node:assert/strict";
import { createStudentMessageRepository } from "../src/services/student-message-repository.js";

function createStorage() {
  const records = new Map();
  return {
    getItem(key) {
      return records.get(key) || null;
    },
    setItem(key, value) {
      records.set(key, String(value));
    },
  };
}

const storage = createStorage();
let remoteReadCount = 0;
let remoteWriteCount = 0;
const apiClient = {
  enabled: true,
  async getStudentMessages() {
    remoteReadCount += 1;
    return { messages: [] };
  },
  mirrorStudentMessage() {
    remoteWriteCount += 1;
  },
};

const parentRepository = createStudentMessageRepository({ storage, apiClient, remoteEnabled: false });
parentRepository.add({
  id: "message-1",
  studentId: "student-demo-1",
  fromRole: "parent",
  body: "今天先找关系再计算，做得很好。",
  createdAt: "2026-09-07T18:00:00.000Z",
});

const studentRepository = createStudentMessageRepository({ storage, apiClient, remoteEnabled: false });
const localMessages = await studentRepository.hydrate("student-demo-1");
assert.equal(localMessages.length, 1);
assert.equal(localMessages[0].body, "今天先找关系再计算，做得很好。");
assert.equal(remoteReadCount, 0);
assert.equal(remoteWriteCount, 0);

const authenticatedRepository = createStudentMessageRepository({ storage, apiClient, remoteEnabled: true });
await authenticatedRepository.hydrate("student-demo-1");
assert.equal(remoteReadCount, 1);

console.log("student-message-repository-contract: passed");
