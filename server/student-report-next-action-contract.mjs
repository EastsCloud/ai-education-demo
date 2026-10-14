import assert from "node:assert/strict";
import { resolveStudentReportNextAction } from "../src/services/student-report-next-action-engine.js";

const today = resolveStudentReportNextAction({
  requiredPracticeCompleted: false,
  practicePlan: { focus: "总量和差量" },
  nextStep: {
    focus: "下一次保留一个简短核对点",
    rationale: "完成列式后会先回看数量关系和计算。",
    source: "server_matching_priority",
  },
});
assert.equal(today.id, "continue_today_practice");
assert.equal(today.label, "继续练");
assert.equal(today.focus, "总量和差量");

const matched = resolveStudentReportNextAction({
  requiredPracticeCompleted: true,
  practicePlan: { focus: "总量和差量" },
  nextStep: {
    focus: "下一次保留一个简短核对点",
    rationale: "完成列式后会先回看数量关系和计算。",
    source: "server_matching_priority",
  },
});
assert.equal(matched.id, "next_practice_focus");
assert.equal(matched.label, "下一次练");
assert.equal(matched.focus, "下一次保留一个简短核对点");
assert.equal(matched.source, "server_matching_priority");

const allocationFallback = resolveStudentReportNextAction({
  requiredPracticeCompleted: true,
  nextPracticeAllocation: {
    topPriority: {
      label: "先做一次轻复现",
      rationale: "下一次会换一个小情境确认思路。",
      source: "linked_reproduction_evidence",
    },
  },
});
assert.equal(allocationFallback.focus, "先做一次轻复现");
assert.equal(allocationFallback.source, "linked_reproduction_evidence");

const fallback = resolveStudentReportNextAction({ requiredPracticeCompleted: true });
assert.equal(fallback.id, "continue_learning_path");
assert.equal(fallback.focus, "沿着当前学习路径继续练习");

console.log("student-report-next-action-contract: passed");
