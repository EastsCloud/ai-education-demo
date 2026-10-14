import assert from "node:assert/strict";
import { renderStudentLearningCurve, renderStudentLevelAttainment } from "../src/modules/report-dashboard.js";

const staticCurve = {
  progressCurve: [0.28, 0.44, 0.63, 0.82, 1],
  currentPoint: { week: 2, progressTowardTarget: 0.44 },
};
const dynamicCurve = {
  canUpdate: true,
  dynamicProgressCurve: [0.28, 0.51, 0.76, 0.98, 1.1],
  currentPoint: { week: 2, progressTowardTarget: 0.51 },
};

const staticMarkup = renderStudentLearningCurve({ staticCurve, activeCurve: staticCurve });
assert.match(staticMarkup, /curve-live static/);
assert.match(staticMarkup, /正在按初始路径前进/);
assert.equal(staticMarkup.includes(" C"), false);

const dynamicMarkup = renderStudentLearningCurve({ staticCurve, dynamicCurve, activeCurve: dynamicCurve });
assert.match(dynamicMarkup, /curve-base/);
assert.match(dynamicMarkup, /curve-live dynamic/);
assert.match(dynamicMarkup, /正式测试后的路径/);
assert.equal(dynamicMarkup.includes(" C"), false);
const renderedPaths = [...dynamicMarkup.matchAll(/<path class="[^"]+" d="([^"]+)"/g)].map((item) => item[1]);
assert.equal(renderedPaths.length, 2);
assert.notEqual(renderedPaths[0], renderedPaths[1]);

const emptyMarkup = renderStudentLearningCurve();
assert.match(emptyMarkup, /目标确认后/);

const levelEvidenceMarkup = renderStudentLevelAttainment({
  targetGrade: "G6",
  officiallyReached: false,
  studentCopy: {
    label: "G6 目标证据积累中",
    detail: "正式测试正在把不同题型、变式和换一种说法后的表现连起来。",
  },
  visualProgress: {
    lanes: [
      { label: "正式测试", status: "ready" },
      { label: "核心范围", status: "collecting" },
    ],
  },
});
assert.match(levelEvidenceMarkup, /目标确认/);
assert.match(levelEvidenceMarkup, /G6 目标证据积累中/);
assert.match(levelEvidenceMarkup, /is-ready/);
assert.match(levelEvidenceMarkup, /is-collecting/);
assert.equal(renderStudentLevelAttainment(), "");

console.log("student-report-curve-contract: passed");
