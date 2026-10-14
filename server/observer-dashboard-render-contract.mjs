import assert from "node:assert/strict";
import { renderObserverDashboard } from "../src/modules/observer-dashboard.js";

function render({
  activeSection = "overview",
  initialAssessmentStatus = null,
  learningGoalDraft = null,
  learning = null,
  levelAttainment = null,
  learningTrend = null,
  onboardingPrefill = null,
  onboardingStatus = null,
  personalityAssessmentStatus = null,
  personalityProfile = null,
  plan = {},
  profileSignals = null,
} = {}) {
  const container = {
    innerHTML: "",
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  renderObserverDashboard({
    activeSection,
    abilityMap: { overallLevel: 0.48, dimensions: [] },
    behaviorEvents: [],
    container,
    dailyPracticePlan: null,
    knowledgePuzzleMap: { pieces: [] },
    learningParameterConfig: { options: {}, defaults: {} },
    learningReport: { learning, learningTrend, levelAttainment, profileSignals },
    messages: [],
    initialAssessmentStatus,
    learningGoalDraft,
    onboardingPrefill,
    onboardingStatus,
    personalityProfile,
    personalityAssessmentStatus,
    plan,
    reportSummary: {},
    student: { name: "林安" },
    workspace: { role: "parent", enabledModules: ["ability_trend"] },
  });
  return container.innerHTML;
}

const readySnapshot = {
  confidence: "medium",
  summary: "这些观察来自真实练习，用来调整支持方式，而不是给学生贴标签。",
  signals: [
    {
      id: "retry_loop_works",
      title: "重做正在带来回收",
      evidence: "错误后的重做已有较好的成功记录。",
      action: "继续按原题、一个变化、两个变化推进。",
    },
  ],
};

const overview = render({ profileSignals: readySnapshot });
assert.match(overview, /真实练习信号/);
assert.match(overview, /重做正在带来回收/);
assert.match(overview, /一个变化/);

const authenticatedMetrics = render({
  learning: {
    answerCount: 24,
    hasEvidence: true,
    hintUseRate: 0.25,
    hintedAnswerCount: 6,
    hintedAccuracy: 0.67,
    noHintAccuracy: 0.83,
    recentStudyMinutes: 36,
    sessionCount: 3,
    visitCount: 4,
    shortestSessionMinutes: 8,
    longestSessionMinutes: 15,
  },
});
assert.match(authenticatedMetrics, /36 分钟/);
assert.match(authenticatedMetrics, /83%/);
assert.match(authenticatedMetrics, /25%/);
assert.doesNotMatch(authenticatedMetrics, /学习记录会在进入练习后同步/);

const personality = render({
  personalityProfile: {
    complete: true,
    completedCount: 12,
    studentType: { name: "稳步探索者" },
    supportProfile: { supportMode: { label: "先尝试，再给轻提示" } },
    psychologicalDimensions: [{ name: "好奇心", score: 0.72, confidence: 0.8, label: "较强" }],
    learningDimensions: [{ name: "重做习惯", score: 0.68, confidence: 0.7, label: "正在形成" }],
  },
});
assert.match(personality, /学习支持起点/);
assert.match(personality, /稳步探索者/);
assert.match(personality, /好奇心/);

const incompleteStart = render();
assert.match(incompleteStart, /起步进度/);
assert.match(incompleteStart, /等待学生确认起点/);
assert.match(incompleteStart, /查看起点设置/);

const needsGoal = render({
  onboardingPrefill: {
    confirmationStatus: "student_confirmed",
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
  },
  personalityAssessmentStatus: "completed",
  initialAssessmentStatus: "completed",
});
assert.match(needsGoal, /一起确定目标与学习节奏/);
assert.match(needsGoal, /设置目标与节奏/);

const needsSubject = render({
  onboardingPrefill: { confirmationStatus: "student_confirmed" },
  personalityAssessmentStatus: "completed",
  initialAssessmentStatus: "completed",
});
assert.match(needsSubject, /等待学生选择数学/);
assert.match(needsSubject, /学生完成学习偏好小问答后/);

const serverOwnedNeed = render({
  onboardingPrefill: {
    confirmationStatus: "student_confirmed",
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
  },
  personalityAssessmentStatus: "completed",
  initialAssessmentStatus: "completed",
  learningGoalDraft: { confirmationStatus: "student_confirmed" },
  plan: { staticCurveConfirmedAt: "2026-09-04T00:00:00.000Z" },
  onboardingStatus: {
    version: "server_onboarding_status_v1",
    stages: [
      { id: "start_context", state: "completed" },
      { id: "personality", state: "completed" },
      { id: "math_ability", state: "completed" },
      { id: "goal", state: "not_started" },
      { id: "curve", state: "not_started" },
    ],
  },
});
assert.match(serverOwnedNeed, /一起确定目标与学习节奏/);
assert.match(serverOwnedNeed, /设置目标与节奏/);

const readyToPractice = render({
  onboardingPrefill: {
    confirmationStatus: "student_confirmed",
    subjectIds: ["math"],
    subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
  },
  personalityAssessmentStatus: "completed",
  initialAssessmentStatus: "completed",
  learningGoalDraft: { confirmationStatus: "student_confirmed" },
  plan: { staticCurveConfirmedAt: "2026-09-04T00:00:00.000Z" },
});
assert.match(readyToPractice, /学习曲线已就位/);
assert.match(readyToPractice, /已准备好/);
assert.doesNotMatch(readyToPractice, /设置目标与节奏/);

const report = render({ activeSection: "report", profileSignals: readySnapshot });
assert.match(report, /真实练习信号/);
assert.match(report, /重做正在带来回收/);

const collecting = render({
  profileSignals: { confidence: "low", summary: "真实练习证据还在形成。", signals: [] },
});
assert.match(collecting, /先让记录自然形成/);

const trend = render({
  activeSection: "report",
  learningTrend: {
    practice: {
      availability: "observed",
      checkpoints: [
        { correctRate: 0.5, independentCompletionRate: 0.25 },
        { correctRate: 0.75, independentCompletionRate: 0.5 },
      ],
    },
    formal: { availability: "collecting" },
    observerCopy: "近期独立完成比例提高。",
  },
});
assert.match(trend, /练习行为和正式测试分开看/);
assert.match(trend, /近期独立完成比例提高/);

const recomputedLevelEvidence = render({
  levelAttainment: {
    availability: "available",
    targetGrade: "G6",
    officiallyReached: true,
    visualProgress: {
      completedLaneCount: 4,
      totalLaneCount: 4,
      verifiedStageCount: 2,
      lanes: [],
    },
  },
  plan: {
    stageAssessmentHistory: [
      {
        levelAttainment: {
          targetGrade: "G5",
          officiallyReached: false,
          evidence: {},
        },
      },
    ],
  },
});
assert.match(recomputedLevelEvidence, /G6 已确认/);
assert.match(recomputedLevelEvidence, /正式测试的证据已通过目标规则确认/);
assert.doesNotMatch(recomputedLevelEvidence, /G5 证据积累中/);

console.log("observer-dashboard-render-contract: passed");
