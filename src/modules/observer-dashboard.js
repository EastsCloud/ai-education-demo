import { observerModuleCatalog } from "../services/observer-workspace-repository.js?v=observer-workspace-3";
import { buildLearningReport } from "../services/learning-report-engine.js?v=learning-report-5";
import { projectMathKnowledgeAtlas, summarizeMathKnowledgeAtlas } from "../services/math-atlas-projection.js?v=math-atlas-projection-2";

const SECTION_COPY = {
  overview: { label: "学习概览", title: "看见过程，给出下一步支持。" },
  report: { label: "学习报告", title: "把行为、能力和目标放在同一张图里。" },
  messages: { label: "给学生的留言", title: "一句具体的鼓励，比一串数据更容易被记住。" },
  settings: { label: "我的观察页", title: "选择你真正想持续关注的内容。" },
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function percent(value) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100)}%`;
}

function percentOrBlank(value) {
  return typeof value === "number" && Number.isFinite(value) ? percent(value) : "--";
}

function formatMinutes(value) {
  return `${Math.max(0, Math.round(Number(value) || 0))} 分钟`;
}

function entryPatternText(stats) {
  return Number.isInteger(stats.typicalEntryHour) ? `常在 ${String(stats.typicalEntryHour).padStart(2, "0")}:00 左右进入` : "进入节奏仍在积累";
}

function answerRevisionText(stats) {
  const evidenceCount = Number(stats?.answerRevisionEvidenceCount || 0);
  const revisedItemCount = Number(stats?.answerRevisionItemCount || 0);
  if (evidenceCount < 3 || revisedItemCount <= 0) return null;
  return `${revisedItemCount} 次提交前重新作答`;
}

function buildBehaviorStats(events = [], learningReport = null) {
  const report = learningReport?.learning || learningReport || buildLearningReport({ behaviorEvents: events });
  return {
    ...report,
    studyMinutes: report.recentStudyMinutes,
    independentCorrectRate: report.noHintAccuracy,
    averageSeconds: report.averageAnswerSeconds,
  };
}

function legacyLevelAttainment(plan) {
  const history = plan?.stageAssessmentHistory || [];
  return [...history].reverse().find((result) => result?.levelAttainment)?.levelAttainment || null;
}

function reportLevelEvidenceSummary(levelAttainment) {
  if (levelAttainment?.availability !== "available" || !levelAttainment?.targetGrade) return null;

  if (levelAttainment.officiallyReached) {
    return {
      value: `${levelAttainment.targetGrade} 已确认`,
      detail: "正式测试的证据已通过目标规则确认。",
    };
  }

  const progress = levelAttainment.visualProgress || {};
  const completed = Math.max(0, Number(progress.completedLaneCount) || 0);
  const total = Math.max(0, Number(progress.totalLaneCount) || 0);
  const nextLane = (progress.lanes || []).find((lane) => lane.status !== "ready");
  if (Number(progress.verifiedStageCount || 0) === 0) {
    return {
      value: `${levelAttainment.targetGrade} 等待正式测试`,
      detail: "每日练习会调整明日出题；正式测试后才开始确认目标水平证据。",
    };
  }

  return {
    value: `${levelAttainment.targetGrade} 证据积累中`,
    detail:
      (total ? `已积累 ${completed}/${total} 条确认路径` : "正式测试证据正在积累") +
      (nextLane?.label ? ` · 下一步关注${nextLane.label}` : "") +
      "。",
  };
}

function levelEvidenceSummary({ plan, levelAttainment } = {}) {
  const reportSummary = reportLevelEvidenceSummary(levelAttainment);
  if (reportSummary) return reportSummary;

  const decision = legacyLevelAttainment(plan);
  if (!decision) {
    return {
      value: "等待正式测试",
      detail: "每日练习会调整明日出题；正式测试后才开始确认目标水平证据。",
    };
  }

  if (decision.officiallyReached) {
    return {
      value: `${decision.targetGrade} 已确认`,
      detail: "已通过覆盖、前置基础、变式和迁移证据确认。",
    };
  }

  const core = decision.evidence?.coreFamilyCoverage || {};
  const nodes = decision.evidence?.coreKnowledgeNodeCoverage || {};
  const prerequisite = decision.evidence?.prerequisiteCoverage || {};
  const transfer = decision.evidence?.transfer || {};
  return {
    value: decision.targetGrade + " 证据积累中",
    detail:
      "核心题型 " +
      (core.mastered || 0) +
      "/" +
      (core.required || 0) +
      " · 知识节点 " +
      (nodes.mastered || 0) +
      "/" +
      (nodes.required || 0) +
      " · 前置基础 " +
      (prerequisite.mastered || 0) +
      "/" +
      (prerequisite.required || 0) +
      " · 表达迁移 " +
      (transfer.observedVariantTypeCount || 0) +
      "/" +
      (transfer.requiredVariantTypeCount || 0) +
      "。当前正式测试可校准曲线，但不会过早确认整级水平。",
  };
}

function renderPersonalitySupport({ personalityProfile, plan, role }) {
  if (!personalityProfile?.completedCount) return "";
  const dimensions = [...(personalityProfile.psychologicalDimensions || []), ...(personalityProfile.learningDimensions || [])]
    .filter((dimension) => dimension.score !== null)
    .sort((left, right) => right.confidence - left.confidence || right.score - left.score)
    .slice(0, 4);
  const support = plan?.supportProfile || personalityProfile.supportProfile;
  const isBehaviorRefined = support?.source === "onboarding_seed_plus_behavior_evidence";
  const refinement = support?.refinements?.find((item) => item.id !== "collecting_practice_evidence");
  return `
    <section class="observer-personality-support">
      <div>
        <span>${isBehaviorRefined ? "学习支持更新" : "学习支持起点"}</span>
        <strong>${personalityProfile.complete ? personalityProfile.studentType.name : "正在形成"}</strong>
      </div>
      <p>${support?.adultSummary || `${support?.supportMode?.label || "先尝试，再给轻提示"}。${role === "teacher" ? "先用它调整课堂或任务的进入方式。" : "先用它理解孩子更舒服的开始方式。"}`} ${refinement ? refinement.action : ""}</p>
      <div class="observer-personality-chips">
        ${dimensions.map((dimension) => `<span><b>${dimension.name}</b>${dimension.label}</span>`).join("")}
      </div>
    </section>
  `;
}

function isCompletedAssessment(status) {
  return ["completed", "completed_verified"].includes(status);
}

function normalizeServerOnboardingStages(onboardingStatus) {
  if (onboardingStatus?.version !== "server_onboarding_status_v1" || !Array.isArray(onboardingStatus.stages)) return null;
  const stateById = new Map(onboardingStatus.stages.map((stage) => [stage?.id, stage?.state]));
  const expectedIds = ["start_context", "personality", "math_ability", "goal", "curve"];
  if (!expectedIds.every((id) => stateById.has(id))) return null;
  return stateById;
}

function buildOnboardingReadiness({
  onboardingPrefill,
  personalityProfile,
  personalityAssessmentStatus,
  initialAssessmentStatus,
  learningGoalDraft,
  onboardingStatus,
  plan,
}) {
  const curveConfirmed = Boolean(plan?.staticCurveConfirmedAt);
  const serverStages = normalizeServerOnboardingStages(onboardingStatus);
  const fallbackStateById = {
    start_context: curveConfirmed || onboardingPrefill?.confirmationStatus === "student_confirmed" ? "completed" : onboardingPrefill ? "awaiting_student_confirmation" : "not_started",
    personality:
      curveConfirmed || Boolean(personalityProfile?.complete) || isCompletedAssessment(personalityAssessmentStatus)
        ? "completed"
        : personalityAssessmentStatus === "in_progress"
          ? "in_progress"
          : "not_started",
    math_ability: curveConfirmed
      ? "completed"
      : !onboardingPrefill?.subjectSelectionConfirmedAt
      ? "awaiting_subject_selection"
      : isCompletedAssessment(initialAssessmentStatus)
        ? "completed"
        : initialAssessmentStatus === "in_progress"
          ? "in_progress"
          : "not_started",
    goal: curveConfirmed || learningGoalDraft?.confirmationStatus === "student_confirmed"
      ? "completed"
      : learningGoalDraft?.confirmationStatus === "prefilled"
        ? "awaiting_student_confirmation"
        : "not_started",
    curve: curveConfirmed ? "completed" : plan?.staticCurve ? "awaiting_student_confirmation" : "not_started",
  };
  const stages = [
    {
      id: "start_context",
      label: "起点",
      state: serverStages?.get("start_context") || fallbackStateById.start_context,
    },
    {
      id: "personality",
      label: "偏好",
      state: serverStages?.get("personality") || fallbackStateById.personality,
    },
    {
      id: "math_ability",
      label: "数学",
      state: serverStages?.get("math_ability") || fallbackStateById.math_ability,
    },
    {
      id: "goal",
      label: "目标",
      state: serverStages?.get("goal") || fallbackStateById.goal,
    },
    {
      id: "curve",
      label: "曲线",
      state: serverStages?.get("curve") || fallbackStateById.curve,
    },
  ].map((stage) => ({ ...stage, complete: stage.state === "completed" }));
  const nextStage = stages.find((stage) => !stage.complete) || null;

  if (!nextStage) {
    return {
      complete: true,
      stages,
      title: "学习曲线已就位",
      detail: "系统会以这条确认过的曲线安排每日练习；之后只由正式测试校准它。",
    };
  }

  const waitingForStudent = {
    start_context: {
      title: "等待学生确认起点",
      detail: "先由学生确认基本信息，之后才进入轻量测试。",
      actionLabel: "查看起点设置",
    },
    personality: {
      title: "等待学生完成学习偏好测试",
      detail: "系统会把结果当作支持方式的起点，而不是给学生贴标签。",
    },
    math_ability:
      nextStage?.state === "awaiting_subject_selection"
        ? {
            title: "等待学生选择数学",
            detail: "学生完成学习偏好小问答后，可以自己确认本次从数学开始。",
          }
        : {
            title: "等待学生完成数学起点测试",
            detail: "测试结果会形成能力图，再一起确定目标与学习节奏。",
          },
    goal: {
      title: "一起确定目标与学习节奏",
      detail: "先把目标和可持续的节奏建议给学生，再由学生确认。",
      actionLabel: "设置目标与节奏",
    },
    curve: {
      title: "等待学生确认学习曲线",
      detail: "确认后，系统才会开始按计划安排每日练习。",
    },
  };
  const guidance = waitingForStudent[nextStage.id];
  const shouldOpenSettings =
    (nextStage.id === "goal" && nextStage.state === "not_started") ||
    (nextStage.id === "start_context" && nextStage.state === "not_started");

  return {
    complete: false,
    stages,
    title: guidance.title,
    detail: guidance.detail,
    actionLabel: shouldOpenSettings ? guidance.actionLabel : null,
  };
}

function renderOnboardingReadiness(readiness) {
  const currentStageId = readiness.stages.find((stage) => !stage.complete)?.id || null;
  return `
    <section class="observer-onboarding-readiness" aria-label="学生起步进度">
      <div class="observer-onboarding-readiness-head">
        <div>
          <span>起步进度</span>
          <strong>${readiness.title}</strong>
        </div>
        <i class="${readiness.complete ? "is-complete" : ""}">${readiness.complete ? "已准备好" : "正在进行"}</i>
      </div>
      <ol class="observer-onboarding-steps">
        ${readiness.stages
          .map(
            (stage) => `
              <li class="${stage.complete ? "is-complete" : ""} ${stage.id === currentStageId ? "is-current" : ""}">
                <b aria-hidden="true"></b>
                <span>${stage.label}</span>
              </li>
            `,
          )
          .join("")}
      </ol>
      <div class="observer-onboarding-readiness-next">
        <p>${readiness.detail}</p>
        ${
          readiness.actionLabel
            ? `<button class="secondary-action" type="button" data-observer-section="settings">${readiness.actionLabel}</button>`
            : ""
        }
      </div>
    </section>
  `;
}

function profileSignalConfidence(value) {
  if (value === "high") return "证据较充分";
  if (value === "medium") return "证据逐渐清晰";
  return "证据积累中";
}

function profileSignalTone(id) {
  if (["protect_reading_time", "shorter_recovery_chunks", "stabilize_before_extension"].includes(id)) return "coral";
  if (["retry_loop_works", "exploration_window", "protect_independent_entry"].includes(id)) return "green";
  if (["keep_layered_support", "reflection_entry", "answer_checking"].includes(id)) return "blue";
  return "teal";
}

function renderProfileSignals(profileSignals) {
  if (!profileSignals) return "";
  const signals = Array.isArray(profileSignals.signals) ? profileSignals.signals.slice(0, 3) : [];
  if (!signals.length) {
    return `
      <section class="observer-profile-signals is-collecting">
        <div class="observer-profile-signals-heading">
          <div><span>真实练习信号</span><strong>先让记录自然形成</strong></div>
          <em>${profileSignalConfidence(profileSignals.confidence)}</em>
        </div>
        <p>${escapeHtml(profileSignals.summary || "先沿用初始支持方式，等待更多真实练习证据。")}</p>
      </section>
    `;
  }

  return `
    <section class="observer-profile-signals">
      <div class="observer-profile-signals-heading">
        <div><span>真实练习信号</span><strong>测试只是起点，练习会继续补全理解。</strong></div>
        <em>${profileSignalConfidence(profileSignals.confidence)}</em>
      </div>
      <p>${escapeHtml(profileSignals.summary || "这些观察来自真实练习。")}</p>
      <div class="observer-profile-signal-list">
        ${signals
          .map(
            (item) => `
              <article class="${profileSignalTone(item.id)}">
                <span>${escapeHtml(item.title)}</span>
                <p>${escapeHtml(item.evidence)}</p>
                <strong>${escapeHtml(item.action)}</strong>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function roleGuidance(role, stats, plan) {
  const focus = plan?.nextPracticeAllocation?.topPriority?.label || plan?.dailyAllocation?.topPriority?.label || "读题与关系建模";
  if (role === "teacher") {
    return {
      title: "下一次介入点",
      body: `先让学生口头说出题目要解决的问题，再进入 ${focus}。不需要重复讲完整知识点。`,
    };
  }
  const behaviorLine = stats.hintUseRate > 0.35 ? "提示使用较多，先肯定她愿意继续尝试。" : "独立尝试正在形成，先肯定过程。";
  return {
    title: "这周怎么支持",
    body: `${behaviorLine} 每次练习后，只问一个问题：这道题先要找什么关系？`,
  };
}

function renderMetric(label, value, detail, tone = "") {
  return `
    <article class="observer-metric ${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
      <em>${detail}</em>
    </article>
  `;
}

function boundedProgress(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1.15, numeric));
}

function curvePercent(value) {
  return `${Math.round(boundedProgress(value) * 100)}%`;
}

function boundedInteger(value, { min = 0, max = 999, fallback = min } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function curveValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => boundedProgress(value));
}

function planCurveData(plan, abilityMap = null) {
  const staticCurve = plan?.staticCurve || null;
  const dynamicCurve = plan?.dynamicCurve?.canUpdate ? plan.dynamicCurve : null;
  const activeCurve = dynamicCurve || staticCurve;
  const fallbackProgress = boundedProgress(abilityMap?.overallLevel, 0);
  const staticValues = curveValues(staticCurve?.progressCurve);
  const activeValues = curveValues(dynamicCurve?.dynamicProgressCurve || activeCurve?.progressCurve);
  const currentProgress = boundedProgress(activeCurve?.currentPoint?.progressTowardTarget, fallbackProgress);
  const values = activeValues.length ? activeValues : staticValues;
  const totalWeeks = Math.max(values.length, staticValues.length, 1);
  const currentWeek = boundedInteger(activeCurve?.currentPoint?.week, {
    min: 1,
    max: totalWeeks,
    fallback: 1,
  });
  const targetProgress = boundedProgress(activeCurve?.targetProgress ?? staticCurve?.targetProgress, 1);
  const expectedTerminal = boundedProgress(
    dynamicCurve?.expectedTerminalProgress ?? activeCurve?.terminalProgress ?? targetProgress,
    targetProgress,
  );

  return {
    activeValues: values.length ? values : [currentProgress],
    currentProgress,
    currentWeek,
    dynamicCurve,
    expectedTerminal,
    hasPlan: Boolean(staticCurve || dynamicCurve),
    staticCurve,
    staticValues: staticValues.length ? staticValues : values.length ? values : [currentProgress],
    targetProgress,
    totalWeeks,
  };
}

function pathForCurve(values, { width, height, paddingX, paddingY, maximum }) {
  const safeValues = values.length ? values : [0];
  const usableWidth = Math.max(1, width - paddingX * 2);
  const usableHeight = Math.max(1, height - paddingY * 2);
  return safeValues
    .map((value, index) => {
      const x = paddingX + (safeValues.length === 1 ? 0 : (index / (safeValues.length - 1)) * usableWidth);
      const y = height - paddingY - (boundedProgress(value) / maximum) * usableHeight;
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function pointForCurve(values, index, { width, height, paddingX, paddingY, maximum }) {
  const safeValues = values.length ? values : [0];
  const safeIndex = Math.max(0, Math.min(safeValues.length - 1, index));
  const usableWidth = Math.max(1, width - paddingX * 2);
  const usableHeight = Math.max(1, height - paddingY * 2);
  return {
    x: paddingX + (safeValues.length === 1 ? 0 : (safeIndex / (safeValues.length - 1)) * usableWidth),
    y: height - paddingY - (boundedProgress(safeValues[safeIndex]) / maximum) * usableHeight,
  };
}

function renderPlanCurveSvg(curveData, { compact = false } = {}) {
  if (!curveData.hasPlan) return "";
  const width = compact ? 240 : 660;
  const height = compact ? 90 : 192;
  const paddingX = compact ? 10 : 18;
  const paddingY = compact ? 10 : 20;
  const values = [...curveData.staticValues, ...curveData.activeValues, curveData.targetProgress, curveData.expectedTerminal];
  const maximum = Math.max(1, ...values.map((value) => boundedProgress(value)));
  const geometry = { width, height, paddingX, paddingY, maximum };
  const activePath = pathForCurve(curveData.activeValues, geometry);
  const staticPath = pathForCurve(curveData.staticValues, geometry);
  const markerIndex = Math.round(
    ((curveData.currentWeek - 1) / Math.max(1, curveData.totalWeeks - 1)) * Math.max(0, curveData.activeValues.length - 1),
  );
  const marker = pointForCurve(curveData.activeValues, markerIndex, geometry);
  const targetY = height - paddingY - (curveData.targetProgress / maximum) * (height - paddingY * 2);

  return `
    <svg class="observer-plan-curve-svg ${compact ? "compact" : ""}" viewBox="0 0 ${width} ${height}" role="img" aria-label="学习曲线">
      <path class="observer-plan-curve-guide" d="M${paddingX} ${targetY.toFixed(1)} H${width - paddingX}"></path>
      <path class="observer-plan-curve-static" d="${staticPath}"></path>
      ${curveData.dynamicCurve ? `<path class="observer-plan-curve-dynamic" d="${activePath}"></path>` : ""}
      <circle class="observer-plan-curve-marker" cx="${marker.x.toFixed(1)}" cy="${marker.y.toFixed(1)}" r="${compact ? 4 : 5}"></circle>
    </svg>
  `;
}

function renderCurveGlimpse({ plan, abilityMap }) {
  const curveData = planCurveData(plan, abilityMap);
  if (!curveData.hasPlan) {
    return `
      <div class="observer-curve-glimpse is-empty" aria-label="学习曲线等待确认">
        <span>学习曲线</span>
        <strong>等待确认</strong>
        <p>目标与学习节奏确认后，会在这里形成第一条路径。</p>
      </div>
    `;
  }

  const state = curveData.dynamicCurve ? "动态曲线已校准" : "初始曲线进行中";
  return `
    <div class="observer-curve-glimpse" aria-label="学习曲线摘要">
      <span>${state}</span>
      ${renderPlanCurveSvg(curveData, { compact: true })}
      <strong>${curvePercent(curveData.currentProgress)}</strong>
    </div>
  `;
}

function renderPlanTrajectory({ plan, abilityMap, dailyPracticePlan }) {
  const curveData = planCurveData(plan, abilityMap);
  if (!curveData.hasPlan) {
    return `
      <section class="observer-plan-trajectory is-empty">
        <div>
          <span>完整学习计划</span>
          <strong>等待学生确认目标与学习节奏</strong>
        </div>
        <p>初始能力测试完成后，系统会把目标、周期和每日节奏合成为第一条静态学习曲线。</p>
      </section>
    `;
  }

  const learningGoal = plan?.learningGoal || {};
  const source = curveData.dynamicCurve?.sourceInputs || curveData.staticCurve?.sourceInputs || {};
  const targetGrade = escapeHtml(learningGoal.targetGrade || "目标水平");
  const durationWeeks = boundedInteger(source.durationWeeks ?? learningGoal.durationWeeks, { min: 1, max: 104, fallback: curveData.totalWeeks });
  const dailyMinutes = boundedInteger(source.dailyStudyMinutes ?? learningGoal.dailyStudyMinutes, { min: 1, max: 240, fallback: 30 });
  const weeklyDays = boundedInteger(source.weeklyStudyDays ?? learningGoal.weeklyStudyDays, { min: 1, max: 7, fallback: 5 });
  const focus = escapeHtml(dailyPracticePlan?.learningPath?.focusFamilyName || plan?.learningPath?.focusFamilyName || "等待下一次学习安排");
  const dynamicDirection = curveData.dynamicCurve?.updateEvidence?.direction;
  const stateLabel = curveData.dynamicCurve
    ? dynamicDirection === "ahead"
      ? "正式测试后领先推进"
      : dynamicDirection === "behind"
        ? "正式测试后稳住基础"
        : "正式测试后重新校准"
    : "按初始计划推进";
  const calibrationCopy = curveData.dynamicCurve
    ? "虚线是最近一次无提示正式测试后的动态走向；日常练习继续只影响下一次出题与提示。"
    : "目前展示的是确认后的初始曲线。日常练习会调整下一次出题与提示，只有正式测试才会改变这条曲线。";
  const expectedTerminalCopy = curveData.dynamicCurve
    ? `动态终点预计 ${curvePercent(curveData.expectedTerminal)}`
    : `目标终点 ${curvePercent(curveData.targetProgress)}`;

  return `
    <section class="observer-plan-trajectory" aria-label="完整学习计划">
      <div class="observer-plan-heading">
        <div>
          <span>完整学习计划</span>
          <h3>目标、节奏和校准在同一条路径上。</h3>
        </div>
        <em>${stateLabel}</em>
      </div>
      <div class="observer-plan-chart">
        <div class="observer-plan-legend" aria-hidden="true">
          <span><i class="static"></i>初始路径</span>
          ${curveData.dynamicCurve ? "<span><i class=\"dynamic\"></i>正式测试后的路径</span>" : ""}
        </div>
        ${renderPlanCurveSvg(curveData)}
        <div class="observer-plan-axis" aria-hidden="true"><span>开始</span><span>第 ${curveData.currentWeek} 周</span><span>目标</span></div>
      </div>
      <div class="observer-plan-facts">
        <div><span>目标</span><strong>${targetGrade}</strong></div>
        <div><span>当前</span><strong>${curvePercent(curveData.currentProgress)} · 第 ${curveData.currentWeek}/${durationWeeks} 周</strong></div>
        <div><span>节奏</span><strong>${dailyMinutes} 分钟 / 天 · ${weeklyDays} 天 / 周</strong></div>
        <div><span>下一步</span><strong>${focus}</strong></div>
      </div>
      <p class="observer-plan-calibration"><b>${expectedTerminalCopy}</b>${calibrationCopy}</p>
    </section>
  `;
}

function lightStateFromPuzzlePiece(piece) {
  if (piece?.status === "completed") return "bright";
  if (piece?.status === "current") return "partial";
  if (piece?.attempts) return "dim";
  return "dark";
}

function buildObserverKnowledgeMap({ knowledgeGraph, knowledgePuzzleMap, currentFamilyId = null }) {
  const graphNodes = (knowledgeGraph?.graph?.nodes || []).filter(
    (node) => node.kind === "question_family" && node.questionFamilyIds?.[0],
  );
  if (graphNodes.length) {
    const nodes = projectMathKnowledgeAtlas(graphNodes, { currentFamilyId });
    return {
      source: "shared_math_knowledge_graph",
      nodes,
      ...summarizeMathKnowledgeAtlas(graphNodes, { currentFamilyId }),
    };
  }

  const nodes = (knowledgePuzzleMap?.pieces || []).map((piece) => ({
    id: piece.id,
    title: piece.title,
    lightState: lightStateFromPuzzlePiece(piece),
    progress: Number(piece.progress || 0),
  }));
  const weighted = nodes.reduce((sum, node) => sum + node.progress, 0);
  return {
    source: "strategy_puzzle_fallback",
    nodes,
    total: nodes.length,
    bright: nodes.filter((node) => node.lightState === "bright").length,
    partial: nodes.filter((node) => node.lightState === "partial").length,
    dim: nodes.filter((node) => node.lightState === "dim").length,
    dark: nodes.filter((node) => node.lightState === "dark").length,
    completionRate: nodes.length ? weighted / nodes.length : 0,
  };
}

function renderObserverGuidance(guidance) {
  if (!guidance?.actions?.length) return "";
  return `
    <section class="observer-guidance" aria-label="下一步支持建议">
      <div class="observer-guidance-heading">
        <span>下一步支持</span>
        <p>${guidance.summary}</p>
      </div>
      <div class="observer-guidance-list">
        ${guidance.actions
          .map(
            (item) => `
              <article class="${item.tone || "teal"}">
                <i aria-hidden="true"></i>
                <div>
                  <strong>${item.title}</strong>
                  <p>${item.action}</p>
                  <em>${item.evidence}</em>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

const VARIANT_LABELS = {
  original: "原题",
  context_change: "换情境",
  change_one_number: "换一个数",
  change_two_numbers: "换两个数",
  relationship_reframe: "换一种关系说法",
  question_order_variant: "换一种提问顺序",
  step_added_variant: "多一个整理步骤",
  two_steps_added_variant: "多两个整理步骤",
  reverse_question: "换一个未知量",
  multi_step_extension: "多一个实际步骤",
};

function formalTransferEvidenceTile(evidence) {
  if (!evidence || evidence.evidenceStatus === "awaiting_verified_stage_test") {
    return {
      value: "等待正式测试",
      detail: "每日练习会调整明日出题；正式测试才会确认换一种表达后的理解。",
    };
  }
  const latest = VARIANT_LABELS[evidence.latestTransferVariantLevel] || "换一种表达";
  return {
    value: `${percentOrBlank(evidence.transferAccuracy)} 稳定完成`,
    detail: `${evidence.verifiedStageTestCount || 0} 次已验证测试 · 最近检查 ${latest}`,
  };
}

function renderFormalTransferEvidence(evidence) {
  if (!evidence || evidence.evidenceStatus === "awaiting_verified_stage_test") return "";
  const variants = evidence.variants || [];
  if (!variants.length) return "";
  return `
    <section class="observer-tag-evidence observer-transfer-evidence" aria-label="正式测试中的迁移证据">
      <div class="observer-tag-evidence-heading">
        <div>
          <span>正式测试</span>
          <strong>看学生能否把同一个关系带到另一种表达里。</strong>
        </div>
        <em>${evidence.verifiedStageTestCount || 0} 次已验证</em>
      </div>
      <div class="observer-tag-evidence-list">
        ${variants
          .map((item) => {
            const label = VARIANT_LABELS[item.variantLevel] || "换一种表达";
            return `
              <article>
                <div class="observer-tag-evidence-title"><strong>${escapeHtml(label)}</strong></div>
                <p>${item.attemptCount || 0} 次测试作答 · 正确 ${percentOrBlank(item.correctRate)}</p>
                <div class="observer-tag-evidence-tags"><span>只统计无提示正式测试</span></div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function observerTrendPath(values, { width = 180, height = 56, padding = 7 } = {}) {
  const safeValues = values.length ? values : [0];
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  return safeValues
    .map((value, index) => {
      const numeric = Math.max(0, Math.min(1, Number(value) || 0));
      const x = padding + (safeValues.length === 1 ? 0 : (index / (safeValues.length - 1)) * usableWidth);
      const y = height - padding - numeric * usableHeight;
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderObserverLearningTrend(learningTrend) {
  if (!learningTrend) return "";
  const practice = learningTrend.practice || {};
  const formal = learningTrend.formal || {};
  if (practice.availability !== "observed" && formal.availability !== "observed") {
    return `
      <section class="observer-learning-trend is-collecting" aria-label="学习趋势">
        <div><span>学习趋势</span><strong>先让可信记录自然形成</strong></div>
        <p>${escapeHtml(learningTrend.observerCopy || "暂不对短期波动作结论。")}</p>
      </section>
    `;
  }

  const checkpoints = practice.availability === "observed" ? practice.checkpoints || [] : [];
  const independentPath = observerTrendPath(checkpoints.map((item) => item.independentCompletionRate));
  const correctPath = observerTrendPath(checkpoints.map((item) => item.correctRate));
  const formalCopy =
    formal.availability === "observed"
      ? `已验证测试 ${formal.verifiedTestCount || 0} 次${typeof formal.delta === "number" ? ` · 最近变化 ${formal.delta >= 0 ? "+" : ""}${Math.round(formal.delta * 100)}%` : ""}`
      : "正式测试趋势仍在积累";

  return `
    <section class="observer-learning-trend" aria-label="学习趋势">
      <div class="observer-learning-trend-heading">
        <div><span>学习趋势</span><strong>练习行为和正式测试分开看。</strong></div>
        <em>${escapeHtml(formalCopy)}</em>
      </div>
      ${
        checkpoints.length
          ? `<svg viewBox="0 0 180 56" role="img" aria-label="近期练习趋势"><path class="observer-trend-independent" d="${independentPath}"></path><path class="observer-trend-correct" d="${correctPath}"></path></svg>`
          : ""
      }
      <p>${escapeHtml(learningTrend.observerCopy || "只把重复、可信的证据用于下一步支持。")}</p>
    </section>
  `;
}

function taggedEvidenceTile(evidence) {
  const item = evidence?.families?.[0];
  if (!item) {
    return {
      value: "等待题型证据",
      detail: "学生完成服务器评分的练习后，这里会汇总题型、变式和独立完成情况。",
    };
  }
  const independent = percentOrBlank(item.independentCorrectRate);
  return {
    value: escapeHtml(item.label || "最近练习题型"),
    detail: `${item.instructionalGrade ? `${escapeHtml(item.instructionalGrade)} · ` : ""}${item.attemptCount || 0} 次作答 · 独立 ${independent}`,
  };
}

function renderTaggedQuestionEvidence(evidence) {
  const families = evidence?.families || [];
  if (!families.length) {
    return `
      <section class="observer-tag-evidence is-empty">
        <div>
          <span>题型证据</span>
          <strong>等待第一批服务器评分的作答</strong>
        </div>
        <p>之后会在这里看到题型、年级、变式和独立完成情况，不展示答案或学生内部标签。</p>
      </section>
    `;
  }

  return `
    <section class="observer-tag-evidence" aria-label="题型证据">
      <div class="observer-tag-evidence-heading">
        <div>
          <span>题型证据</span>
          <strong>从已评分的作答里看最近的练习路径。</strong>
        </div>
        <em>${evidence.totalTaggedAttemptCount || 0} 次已标记作答</em>
      </div>
      <div class="observer-tag-evidence-list">
        ${families
          .slice(0, 4)
          .map((item) => {
            const variants = (item.variantLevels || [])
              .map((variant) => VARIANT_LABELS[variant] || variant)
              .map((variant) => escapeHtml(variant))
              .join(" · ");
            return `
              <article>
                <div class="observer-tag-evidence-title">
                  <strong>${escapeHtml(item.label || "练习题型")}</strong>
                  ${item.instructionalGrade ? `<span>${escapeHtml(item.instructionalGrade)}</span>` : ""}
                </div>
                <p>${item.attemptCount || 0} 次作答 · 总体 ${percentOrBlank(item.correctRate)} · 独立 ${percentOrBlank(item.independentCorrectRate)}</p>
                <div class="observer-tag-evidence-tags">
                  ${variants ? `<span>${variants}</span>` : ""}
                  ${item.knowledgePointCount ? `<span>${item.knowledgePointCount} 个知识点</span>` : ""}
                  ${item.abilityDimensionCount ? `<span>${item.abilityDimensionCount} 个能力维度</span>` : ""}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderSelect(name, label, values, selected, formatter = (value) => value) {
  return `
    <label>
      <span>${label}</span>
      <select name="${name}">
        ${values.map((value) => `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${formatter(value)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderCatalogSelect(name, label, options, selected) {
  const isBirthdayPart = ["birthYear", "birthMonth", "birthDay"].includes(name);
  const selectionMissing = selected === null || selected === undefined || selected === "";
  return `
    <label>
      <span>${label}</span>
      <select name="${name}" required>
        <option value="" ${selectionMissing ? "selected" : ""}>请选择</option>
        ${options
          .map(
            (option) => {
              const value = isBirthdayPart ? option.value : option.id;
              return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${option.label}</option>`;
            },
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderCurveAdjustment({ plan, learningParameterConfig, curveAdjustmentDraft, curveAdjustmentError }) {
  if (!plan?.dynamicCurve?.canUpdate) {
    return `
      <section class="observer-curve-adjustment observer-curve-locked">
        <div>
          <span>学习节奏</span>
          <strong>等待阶段测试</strong>
        </div>
        <p>正式测试校准后，才能调整后续曲线；当天练习不会被打断。</p>
      </section>
    `;
  }

  const source = plan.dynamicCurve.sourceInputs || {};
  const draft = curveAdjustmentDraft?.adjustment?.parameters;
  const curveDirection = plan.dynamicCurve.updateEvidence?.direction;
  const curveAdjustmentModes = learningParameterConfig.options.curveAdjustmentMode.filter(
    (mode) => curveDirection !== "behind" || mode !== "raise_target_level",
  );
  const requestedCurveAdjustmentMode = draft?.curveAdjustmentMode || learningParameterConfig.defaults.curveAdjustmentMode;
  const values = {
    durationWeeks: draft?.durationWeeks || source.durationWeeks || learningParameterConfig.defaults.durationWeeks,
    dailyStudyMinutes: draft?.dailyStudyMinutes || source.dailyStudyMinutes || learningParameterConfig.defaults.dailyStudyMinutes,
    weeklyStudyDays: draft?.weeklyStudyDays || source.weeklyStudyDays || learningParameterConfig.defaults.weeklyStudyDays,
    testIntervalPracticeDays:
      draft?.testIntervalPracticeDays || source.testIntervalPracticeDays || learningParameterConfig.defaults.testIntervalPracticeDays,
    curveAdjustmentMode: curveAdjustmentModes.includes(requestedCurveAdjustmentMode)
      ? requestedCurveAdjustmentMode
      : learningParameterConfig.defaults.curveAdjustmentMode,
  };
  const modes = {
    keep_study_intensity: "同样节奏，终点自然提高",
    keep_original_goal: "保持目标，调整预计时间",
    raise_target_level: "保持周期，挑战更高目标",
  };
  const originalTarget = Number(curveAdjustmentDraft?.originalTargetProgress ?? plan.dynamicCurve.targetProgress ?? 1);
  const expectedTerminal = Number(curveAdjustmentDraft?.expectedTerminalProgress ?? originalTarget);
  const expectedCompletionWeeks = Number(curveAdjustmentDraft?.expectedCompletionWeeks);
  const previewOutcome =
    curveAdjustmentDraft?.adjustment?.parameters?.curveAdjustmentMode === "keep_original_goal"
      ? Number.isFinite(expectedCompletionWeeks)
        ? `预计约 ${expectedCompletionWeeks} 周到达原目标`
        : "按此节奏继续靠近原目标"
      : curveAdjustmentDraft?.adjustment?.parameters?.curveAdjustmentMode === "raise_target_level"
        ? "在当前周期内向更高目标推进"
        : expectedTerminal > originalTarget + 0.02
          ? "保持节奏，预计终点自然提高"
          : "保持节奏，稳步推进当前目标";

  return `
    <section class="observer-curve-adjustment">
      <div class="observer-adjustment-title">
        <div>
          <span>重新安排节奏</span>
          <strong>只从下一学习日开始</strong>
        </div>
        <i aria-hidden="true"></i>
      </div>
      <form id="observer-curve-adjustment-form">
        ${renderSelect("durationWeeks", "学习周期", learningParameterConfig.options.durationWeeks, values.durationWeeks, (value) => `${value} 周`)}
        ${renderSelect("dailyStudyMinutes", "每天", learningParameterConfig.options.dailyStudyMinutes, values.dailyStudyMinutes, (value) => `${value} 分钟`)}
        ${renderSelect("weeklyStudyDays", "每周", learningParameterConfig.options.weeklyStudyDays, values.weeklyStudyDays, (value) => `${value} 天`)}
        ${renderSelect("testIntervalPracticeDays", "测试间隔", learningParameterConfig.options.testIntervalPracticeDays, values.testIntervalPracticeDays, (value) => `${value} 次练习`)}
        ${renderSelect("curveAdjustmentMode", "曲线方向", curveAdjustmentModes, values.curveAdjustmentMode, (value) => modes[value])}
        <button class="primary-action" type="submit">生成调整方案</button>
      </form>
      ${
        curveAdjustmentDraft
          ? `
            <div class="observer-curve-preview">
              <span>新的动态曲线</span>
              <strong>${percent(curveAdjustmentDraft.expectedTerminalProgress ?? curveAdjustmentDraft.targetProgress)}</strong>
              <p>${previewOutcome} · ${curveAdjustmentDraft.adjustment.parameters.durationWeeks} 周 · ${curveAdjustmentDraft.adjustment.parameters.dailyStudyMinutes} 分钟 / 天 · 从下一学习日开始</p>
              <button type="button" data-confirm-curve-adjustment>确认新曲线</button>
            </div>
          `
          : ""
      }
      ${curveAdjustmentError ? `<p class="observer-curve-error">${curveAdjustmentError}</p>` : ""}
    </section>
  `;
}

function renderOverview({
  workspace,
  stats,
  plan,
  student,
  abilityMap,
  knowledgeMap,
  personalityProfile,
  personalityAssessmentStatus,
  initialAssessmentStatus,
  onboardingPrefill,
  learningGoalDraft,
  onboardingStatus,
  dailyPracticePlan,
  learningReport,
}) {
  const guidance = roleGuidance(workspace.role, stats, plan);
  const strongest = abilityMap?.dimensions?.slice().sort((left, right) => right.score - left.score)[0];
  const focus = abilityMap?.dimensions?.slice().sort((left, right) => left.score - right.score)[0];
  const cadenceReminder = plan?.taskCadence?.observerReminder;
  const levelEvidence = levelEvidenceSummary({ plan, levelAttainment: learningReport?.levelAttainment });
  const onboardingReadiness = buildOnboardingReadiness({
    onboardingPrefill,
    personalityProfile,
    personalityAssessmentStatus,
    initialAssessmentStatus,
    learningGoalDraft,
    onboardingStatus,
    plan,
  });

  return `
    <section class="observer-hero">
      <div>
        <p class="label">${workspace.role === "teacher" ? "老师观察" : "家长观察"} · ${escapeHtml(student.name)}</p>
        <h2>${guidance.title}</h2>
        <p>${guidance.body}</p>
      </div>
      ${renderCurveGlimpse({ plan, abilityMap })}
    </section>

    ${renderOnboardingReadiness(onboardingReadiness)}
    <section class="observer-metric-grid-main">
      ${renderMetric("本周学习", stats.hasEvidence ? formatMinutes(stats.studyMinutes) : "--", stats.sessionCount ? `${stats.sessionCount} 次学习 · ${stats.visitCount || 0} 次进入 · 单次 ${stats.shortestSessionMinutes}-${stats.longestSessionMinutes} 分钟` : "学习记录会在进入练习后同步", "teal")}
      ${renderMetric("独立完成", stats.answerCount ? percentOrBlank(stats.independentCorrectRate) : "--", "不打开提示时的完成情况", "gold")}
      ${renderMetric(
        "提示使用",
        stats.answerCount ? percentOrBlank(stats.hintUseRate) : "--",
        stats.guidedResponseDeliveryCount
          ? `分步引导 ${stats.guidedResponseDeliveryCount} 次`
          : stats.hintedAnswerCount
            ? `提示后正确率 ${percentOrBlank(stats.hintedAccuracy)}`
            : stats.averageSeconds
              ? `平均作答 ${Math.round(stats.averageSeconds)} 秒`
              : "等待本次练习记录",
        "blue",
      )}
      ${renderMetric(
        "知识地图",
        percent(knowledgeMap.completionRate),
        knowledgeMap.source === "shared_math_knowledge_graph"
          ? `已点亮 ${knowledgeMap.bright}/${knowledgeMap.total} 个数学区域`
          : "已点亮的解题方法区域",
        "green",
      )}
    </section>

    ${renderPlanTrajectory({ plan, abilityMap, dailyPracticePlan })}
    <section class="observer-focus-grid">
      <article>
        <span>当前最稳</span>
        <strong>${strongest?.name || strongest?.label || "等待更多证据"}</strong>
        <p>保持已有的解题节奏，让稳定能力继续变成迁移能力。</p>
      </article>
      <article>
        <span>下一步关注</span>
        <strong>${focus?.name || focus?.label || "读题与关系建模"}</strong>
        <p>系统会把这一点放进明天的题目分配里，不给学生增加额外标签。</p>
      </article>
      <article>
        <span>当前计划</span>
        <strong>${levelEvidence.value}</strong>
        <p>${cadenceReminder?.body || levelEvidence.detail || plan?.nextPracticeAllocation?.topPriority?.rationale || "每日行为只改变明日出题；正式测试才校准学习曲线。"}</p>
      </article>
    </section>
    ${renderPersonalitySupport({ personalityProfile, plan, role: workspace.role })}
    ${renderProfileSignals(learningReport?.profileSignals)}
  `;
}

function renderReport({
  workspace,
  stats,
  abilityMap,
  learningReport,
  reportSummary,
  plan,
  knowledgeMap,
  learningParameterConfig,
  curveAdjustmentDraft,
  curveAdjustmentError,
  dailyPracticePlan,
  personalityProfile,
}) {
  const enabled = new Set(workspace.enabledModules);
  const dimensions = abilityMap?.dimensions || [];
  const curve = plan?.dynamicCurve?.canUpdate ? plan.dynamicCurve : plan?.staticCurve;
  const behaviorObservation = plan?.nextPracticeAllocation?.behaviorAnalysis?.observations?.[0];
  const levelEvidence = levelEvidenceSummary({ plan, levelAttainment: learningReport?.levelAttainment });
  const peerReference = learningReport?.peerReference;
  const peerValue = peerReference?.label || reportSummary?.visualStats?.peerComparisonLabel || "温和参照";
  const peerDetail = [
    peerReference?.observerCopy || "只用于判断方法是否有效，不做压力排名。",
    peerReference?.trend?.availability === "available" ? peerReference.trend.observerCopy : null,
  ]
    .filter(Boolean)
    .join(" ");
  const currentPathLabel = dailyPracticePlan?.learningPath?.focusFamilyName || dailyPracticePlan?.task?.focus || null;
  const answerRevisionDetail = answerRevisionText(stats);
  const taggedEvidence = workspace.role === "teacher" ? learningReport?.taggedQuestionEvidence : null;
  const taggedEvidenceSummary = taggedEvidenceTile(taggedEvidence);
  const formalTransferEvidence = learningReport?.formalTransferEvidence || null;
  const formalTransferSummary = formalTransferEvidenceTile(formalTransferEvidence);
  const moduleTiles = [
    [
      "progress",
      "目标进度",
      percent(curve?.currentPoint?.progressTowardTarget || abilityMap?.overallLevel || 0),
      `${levelEvidence.value} · ${levelEvidence.detail}`,
    ],
    [
      "behavior_summary",
      "学习行为",
      stats.answerCount ? `${stats.answerCount} 次作答` : "等待作答记录",
      stats.answerCount
        ? [
            behaviorObservation || `独立完成 ${percentOrBlank(stats.independentCorrectRate)} · 提示后 ${percentOrBlank(stats.hintedAccuracy)}`,
            answerRevisionDetail,
            entryPatternText(stats),
          ]
            .filter(Boolean)
            .join(" · ")
        : "开始练习后，会在这里观察独立完成、提示和重做。",
    ],
    ["ability_trend", "能力趋势", dimensions.length ? dimensions.map((item) => `${item.name || item.label} ${percent(item.score)}`).slice(0, 3).join(" · ") : "等待测试证据", "使用多次作答与正式测试共同观察。"],
    ["formal_test_evidence", "正式测试", formalTransferSummary.value, formalTransferSummary.detail],
    ["peer_trend", "同类参照", peerValue, peerDetail],
    ["question_tag_evidence", "题型证据", taggedEvidenceSummary.value, taggedEvidenceSummary.detail],
    ["curve_options", "学习参数", `${plan?.learningGoal?.dailyStudyMinutes || 30} 分钟 / 天`, "学生确认后会形成新的曲线；支持者可以先给出建议。"],
  ];

  return `
    <section class="observer-report-intro">
      <p>${workspace.role === "teacher" ? "教学支持" : "家庭支持"}</p>
      <strong>${workspace.role === "teacher" ? "证据优先，不用感觉判断学生。" : "理解过程，不把学习变成追进度。"}</strong>
    </section>
    ${renderObserverGuidance(learningReport?.observerGuidance)}
    <section class="observer-report-tiles">
      ${moduleTiles
        .filter(([id]) => enabled.has(id))
        .map(
          ([, label, value, detail]) => `
            <article>
              <span>${label}</span>
              <strong>${value}</strong>
              <p>${detail}</p>
            </article>
          `,
        )
        .join("")}
    </section>
    ${workspace.role === "teacher" && enabled.has("question_tag_evidence") ? renderTaggedQuestionEvidence(taggedEvidence) : ""}
    ${["parent", "teacher"].includes(workspace.role) && enabled.has("formal_test_evidence") ? renderFormalTransferEvidence(formalTransferEvidence) : ""}
    ${enabled.has("ability_trend") ? renderObserverLearningTrend(learningReport?.learningTrend) : ""}
    ${renderPersonalitySupport({ personalityProfile, plan, role: workspace.role })}
    ${renderProfileSignals(learningReport?.profileSignals)}
    <section class="observer-light-map">
      <div>
        <span>知识图鉴</span>
        <strong>${
          knowledgeMap.source === "shared_math_knowledge_graph"
            ? `数学知识地图 · ${knowledgeMap.total} 个区域`
            : "数学解题方法拼图"
        }</strong>
      </div>
      <div class="observer-map-pieces ${knowledgeMap.source === "shared_math_knowledge_graph" ? "knowledge-family-map" : ""}">
        ${knowledgeMap.nodes
          .map(
            (node) =>
              `<i class="${node.lightState}${node.isCurrentFocus ? " today-focus" : ""}" style="--piece-progress: ${Math.round(Number(node.progress || 0) * 100)}%" title="${node.title}${node.atlasPosition ? ` · ${node.atlasPosition.anchorGrade}` : ""}${node.isCurrentFocus ? " · 当前学习路径" : ""}"></i>`,
          )
          .join("")}
      </div>
      <p>${
        knowledgeMap.source === "shared_math_knowledge_graph"
          ? `${currentPathLabel ? `当前路径：${currentPathLabel}。` : ""}已确认点亮 ${knowledgeMap.bright} 个，正在推进 ${knowledgeMap.partial + knowledgeMap.dim} 个；题型、知识点和作答证据来自同一套后台图谱。`
          : "亮起的是已确认掌握，柔和的是正在推进，未点亮的区域会在合适的题目中逐步出现。"
      }</p>
    </section>
    ${
      enabled.has("curve_options")
        ? renderCurveAdjustment({ plan, learningParameterConfig, curveAdjustmentDraft, curveAdjustmentError })
        : ""
    }
  `;
}

function renderMessages({ workspace, messages, student }) {
  const visibleMessages = messages.slice(0, 8);
  return `
    <section class="observer-message-compose">
      <div>
        <p class="label">${workspace.role === "teacher" ? "老师留言" : "家长留言"}</p>
        <h2>留一句学生愿意再看一眼的话。</h2>
      </div>
      <form id="observer-message-form">
        <label for="observer-message-body">给${escapeHtml(student?.name || "学生")}</label>
        <textarea id="observer-message-body" name="body" maxlength="180" placeholder="例如：今天你先找问题，再找数字，这个顺序做得很好。"></textarea>
        <button class="primary-action" type="submit">发送留言</button>
      </form>
    </section>
    <section class="observer-message-list">
      ${
        visibleMessages.length
          ? visibleMessages
              .map(
                (message) => `
                  <article>
                    <div><span>${message.fromRole === "teacher" ? "老师" : "家长"}</span><time>${new Date(message.createdAt).toLocaleDateString("zh-CN")}</time></div>
                    <strong>${escapeHtml(message.title || "给你的话")}</strong>
                    <p>${escapeHtml(message.body)}</p>
                  </article>
                `,
              )
              .join("")
          : "<p class=\"observer-empty\">还没有留言。把鼓励放在具体的努力和方法上。</p>"
      }
    </section>
  `;
}

function renderAssessmentCadenceSettings({ plan, assessmentCadenceConfig }) {
  const cadence = plan?.assessmentCadence || {};
  const configuration = assessmentCadenceConfig || {
    defaults: {
      suggestedAfterPracticeDays: 3,
      mandatoryAfterPracticeDays: 10,
      minimumPracticeDaysBetweenSuggestionAndRequired: 2,
    },
    options: {
      suggestedAfterPracticeDays: [3, 5, 7, 10],
      mandatoryAfterPracticeDays: [5, 7, 10, 14],
    },
  };
  const minimumGap = Number(configuration.defaults.minimumPracticeDaysBetweenSuggestionAndRequired) || 2;
  const suggestedAfterPracticeDays =
    Number(cadence.suggestedAfterPracticeDays) || configuration.defaults.suggestedAfterPracticeDays;
  const allowedMandatoryIntervals = configuration.options.mandatoryAfterPracticeDays.filter(
    (value) => value >= suggestedAfterPracticeDays + minimumGap,
  );
  const storedMandatoryAfterPracticeDays = Number(cadence.mandatoryAfterPracticeDays);
  const mandatoryAfterPracticeDays = allowedMandatoryIntervals.includes(storedMandatoryAfterPracticeDays)
    ? storedMandatoryAfterPracticeDays
    : allowedMandatoryIntervals[0] || configuration.defaults.mandatoryAfterPracticeDays;
  const requestIsOpen =
    cadence.observerRequestStatus === "requested" &&
    Boolean(cadence.observerRequestedAt) &&
    (!cadence.observerRequestAcknowledgedAt ||
      Date.parse(cadence.observerRequestAcknowledgedAt) < Date.parse(cadence.observerRequestedAt));
  return `
    <section class="observer-assessment-cadence">
      <div>
        <span>测试节奏</span>
        <strong>由正式测试校准曲线</strong>
      </div>
      <form id="observer-assessment-cadence-form" data-minimum-gap="${minimumGap}">
        ${renderSelect(
          "suggestedAfterPracticeDays",
          "建议测试",
          configuration.options.suggestedAfterPracticeDays,
          suggestedAfterPracticeDays,
          (value) => `完成 ${value} 次练习后`,
        )}
        ${renderSelect(
          "mandatoryAfterPracticeDays",
          "最迟测试",
          configuration.options.mandatoryAfterPracticeDays,
          mandatoryAfterPracticeDays,
          (value) => `完成 ${value} 次练习前`,
        )}
        <button class="secondary-action" type="submit">保存节奏</button>
      </form>
      <p>学生可跳过一次建议；最迟测试会保留至少 ${minimumGap} 次练习的选择空间。</p>
      ${
        !plan
          ? "<p>学生确认学习曲线后，才可以发送测试建议。</p>"
          : requestIsOpen
            ? "<p class=\"observer-request-state\">已发送一次测试建议，等待学生自行选择。</p>"
            : "<button class=\"secondary-action observer-stage-test-request\" type=\"button\" data-request-stage-assessment>建议学生做一次测试</button>"
      }
    </section>
  `;
}

function renderOnboardingPrefillSettings({ onboardingPrefill, onboardingPrefillDraft, onboardingPrefillOptions }) {
  const values = onboardingPrefillDraft?.basicInfo || {};
  const confirmationText = onboardingPrefill?.confirmationStatus === "student_confirmed" ? "学生已确认" : "等待学生确认";
  return `
    <section class="observer-onboarding-prefill">
      <div class="observer-onboarding-prefill-heading">
        <div>
          <span>学生起点</span>
          <strong>先预设，学生确认</strong>
        </div>
        <em>${confirmationText}</em>
      </div>
      <form id="observer-onboarding-prefill-form">
        <div class="observer-onboarding-prefill-fields">
          ${renderCatalogSelect("birthYear", "出生年份", onboardingPrefillOptions.birthYear, values.birthYear)}
          ${renderCatalogSelect("birthMonth", "出生月份", onboardingPrefillOptions.birthMonth, values.birthMonth)}
          ${renderCatalogSelect("birthDay", "出生日", onboardingPrefillOptions.birthDay, values.birthDay)}
          ${renderCatalogSelect("gradeLevelOptionId", "当前年级", onboardingPrefillOptions.gradeLevel, values.gradeLevelOptionId)}
          ${renderCatalogSelect("schoolCalendarStageOptionId", "当前阶段", onboardingPrefillOptions.schoolCalendarStage, values.schoolCalendarStageOptionId)}
          ${renderCatalogSelect("routinePreferenceOptionId", "作息习惯", onboardingPrefillOptions.routinePreference, values.routinePreferenceOptionId)}
          ${renderCatalogSelect("attentionSpanBandOptionId", "专注时长", onboardingPrefillOptions.attentionSpanBand, values.attentionSpanBandOptionId)}
          ${renderCatalogSelect("readingComfortOptionId", "阅读舒适度", onboardingPrefillOptions.readingComfort, values.readingComfortOptionId)}
          ${renderCatalogSelect("primaryDeviceOptionId", "主要设备", onboardingPrefillOptions.primaryDevice, values.primaryDeviceOptionId)}
          ${renderCatalogSelect("curriculumSystemOptionId", "课程体系", onboardingPrefillOptions.curriculumSystem, values.curriculumSystemOptionId)}
          <label class="observer-subject-option">
            <input name="mathSelected" type="checkbox" ${onboardingPrefillDraft?.subjectIds?.includes("math") ? "checked" : ""} />
            <span>数学</span>
          </label>
        </div>
        <button class="secondary-action" type="submit">保存学生预设</button>
      </form>
      <p>学生完成初始测试后会自己确认目标和学习时长；已关联家长可以一起看和提出建议。</p>
    </section>
  `;
}

function renderInitialGoalProposal({ plan, learningGoal, learningGoalDraft, learningGoalOptions }) {
  if (plan?.staticCurveConfirmedAt) {
    const confirmedGoal = plan.learningGoal || learningGoal;
    return `
      <section class="observer-learning-goal-draft observer-learning-goal-confirmed">
        <div class="observer-onboarding-prefill-heading">
          <div>
            <span>初始学习计划</span>
            <strong>学生已确认</strong>
          </div>
          <em>已生效</em>
        </div>
        <p>${confirmedGoal?.targetDescription || "数学学习目标"} · ${confirmedGoal?.durationWeeks || "--"} 周 · 每天 ${confirmedGoal?.dailyStudyMinutes || "--"} 分钟 · 每周 ${confirmedGoal?.weeklyStudyDays || "--"} 天</p>
        <p>之后由正式阶段测试校准动态曲线；这里不再改写已经确认的起点。</p>
      </section>
    `;
  }

  const confirmationText = learningGoalDraft?.confirmationStatus === "prefilled" ? "等待学生确认" : "可先给建议";
  const targets = learningGoalOptions?.targets || [];
  const rhythm = learningGoalOptions?.rhythm || {};
  return `
    <section class="observer-learning-goal-draft">
      <div class="observer-onboarding-prefill-heading">
        <div>
          <span>学习目标与节奏</span>
          <strong>先建议，由学生确认</strong>
        </div>
        <em>${confirmationText}</em>
      </div>
      <form id="observer-learning-goal-draft-form">
        <div class="observer-learning-goal-draft-fields">
          ${renderGoalProposalSelect(
            "targetGrade",
            "目标水平",
            targets.map((target) => ({ value: target.targetGrade, label: target.label })),
            learningGoal?.targetGrade,
          )}
          ${renderGoalProposalSelect(
            "durationWeeks",
            "学习周期",
            rhythm.durationWeeks || [],
            learningGoal?.durationWeeks,
            (value) => `${value} 周`,
          )}
          ${renderGoalProposalSelect(
            "dailyStudyMinutes",
            "每天",
            rhythm.dailyStudyMinutes || [],
            learningGoal?.dailyStudyMinutes,
            (value) => `${value} 分钟`,
          )}
          ${renderGoalProposalSelect(
            "weeklyStudyDays",
            "每周",
            rhythm.weeklyStudyDays || [],
            learningGoal?.weeklyStudyDays,
            (value) => `${value} 天`,
          )}
        </div>
        <button class="secondary-action" type="submit">保存目标建议</button>
      </form>
      <p>学生完成学科起点测试后，会在自己的页面看到这份建议，并可以调整后确认学习曲线。</p>
    </section>
  `;
}

function renderGoalProposalSelect(name, label, options, selected, formatOption = (value) => value) {
  return `
    <label>
      <span>${label}</span>
      <select name="${name}">
        ${options
          .map((option) => {
            const value = typeof option === "object" ? option.value : option;
            const copy = typeof option === "object" ? option.label : formatOption(option);
            return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${copy}</option>`;
          })
          .join("")}
      </select>
    </label>
  `;
}

function renderSettings({
  workspace,
  plan,
  learningGoal,
  learningGoalDraft,
  learningGoalOptions,
  learningParameterConfig,
  assessmentCadenceConfig,
  onboardingPrefill,
  onboardingPrefillDraft,
  onboardingPrefillOptions,
}) {
  const enabled = new Set(workspace.enabledModules);
  return `
    <section class="observer-settings-intro">
      <p class="label">自定义观察页</p>
      <h2>保留真正会帮助你支持学生的内容。</h2>
      <p>选择只影响你的观察页面；学生端不会显示这些后台分析，也不会被原始标签定义。</p>
    </section>
    <section class="observer-module-picker">
      ${observerModuleCatalog
        .filter(([id]) => workspace.role === "teacher" || !["question_tag_evidence", "class_comparison"].includes(id))
        .map(
          ([id, label]) => `
            <label>
              <input type="checkbox" data-observer-module="${id}" ${enabled.has(id) ? "checked" : ""} />
              <span>${label}</span>
            </label>
          `,
        )
        .join("")}
      </section>
      ${renderAssessmentCadenceSettings({ plan, assessmentCadenceConfig })}
      ${renderOnboardingPrefillSettings({ onboardingPrefill, onboardingPrefillDraft, onboardingPrefillOptions })}
      ${renderInitialGoalProposal({ plan, learningGoal, learningGoalDraft, learningGoalOptions })}
  `;
}

function renderPanel({ section, ...context }) {
  if (section === "report") return renderReport(context);
  if (section === "messages") return renderMessages(context);
  if (section === "settings") return renderSettings(context);
  return renderOverview(context);
}

export function renderObserverDashboard({
  activeSection = "overview",
  abilityMap,
  container,
  knowledgeGraph = null,
  knowledgePuzzleMap,
  learningGoal,
  learningGoalDraft,
  learningGoalOptions,
  learningParameterConfig,
  assessmentCadenceConfig,
  initialAssessmentStatus = null,
  messages,
  curveAdjustmentDraft,
  curveAdjustmentError,
  onAssessmentCadenceUpdate,
  onAssessmentRequest,
  onOnboardingPrefillSave,
  onLearningGoalDraftSave,
  onCurveAdjustmentPreview,
  onCurveAdjustmentConfirm,
  onMessageSubmit,
  onModuleToggle,
  onSectionChange,
  plan,
  onboardingPrefill,
  onboardingPrefillDraft,
  onboardingPrefillOptions,
  onboardingStatus = null,
  personalityProfile,
  personalityAssessmentStatus = null,
  reportSummary,
  student,
  workspace,
  behaviorEvents,
  dailyPracticePlan = null,
  learningReport = null,
}) {
  if (!container) return;
  const stats = buildBehaviorStats(behaviorEvents, learningReport);
  const currentFamilyId =
    dailyPracticePlan?.learningPath?.focusFamilyId ||
    plan?.todayQuestionQueue?.items?.[0]?.familyId ||
    plan?.nextQuestionQueue?.items?.[0]?.familyId ||
    null;
  const knowledgeMap = buildObserverKnowledgeMap({ knowledgeGraph, knowledgePuzzleMap, currentFamilyId });
  const copy = SECTION_COPY[activeSection] || SECTION_COPY.overview;
  const context = {
    abilityMap,
    curveAdjustmentDraft,
    curveAdjustmentError,
    dailyPracticePlan,
    knowledgeMap,
    learningGoal,
    learningGoalDraft,
    learningGoalOptions,
    learningParameterConfig,
    assessmentCadenceConfig,
    initialAssessmentStatus,
    messages,
    onboardingPrefill,
    onboardingPrefillDraft,
    onboardingPrefillOptions,
    onboardingStatus,
    personalityProfile,
    personalityAssessmentStatus,
    plan,
    learningReport,
    reportSummary,
    stats,
    student,
    workspace,
  };

  container.innerHTML = `
    <div class="observer-page-head">
      <div>
        <p class="label">${copy.label}</p>
        <h1>${copy.title}</h1>
      </div>
      <span class="observer-status">${workspace.role === "teacher" ? "老师端" : "家长端"} · ${escapeHtml(student.name)}</span>
    </div>
    <nav class="observer-nav" aria-label="观察页面">
      ${Object.entries(SECTION_COPY)
        .map(
          ([section, item]) => `
            <button type="button" data-observer-section="${section}" class="${section === activeSection ? "active" : ""}">${item.label}</button>
          `,
        )
        .join("")}
    </nav>
    <div class="observer-content">${renderPanel({ section: activeSection, ...context })}</div>
  `;

  container.querySelectorAll("[data-observer-section]").forEach((button) => {
    button.addEventListener("click", () => onSectionChange?.(button.dataset.observerSection));
  });
  container.querySelectorAll("[data-observer-module]").forEach((input) => {
    input.addEventListener("change", () => onModuleToggle?.(input.dataset.observerModule));
  });
  container.querySelector("#observer-message-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") || "").trim();
    if (!body) return;
    onMessageSubmit?.(body);
  });
  container.querySelector("#observer-curve-adjustment-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    onCurveAdjustmentPreview?.({
      durationWeeks: Number(values.durationWeeks),
      dailyStudyMinutes: Number(values.dailyStudyMinutes),
      weeklyStudyDays: Number(values.weeklyStudyDays),
      testIntervalPracticeDays: Number(values.testIntervalPracticeDays),
      curveAdjustmentMode: values.curveAdjustmentMode,
    });
  });
  const assessmentCadenceForm = container.querySelector("#observer-assessment-cadence-form");
  function reconcileAssessmentCadenceForm(changedField) {
    if (!assessmentCadenceForm) return;
    const suggestedSelect = assessmentCadenceForm.elements.namedItem("suggestedAfterPracticeDays");
    const mandatorySelect = assessmentCadenceForm.elements.namedItem("mandatoryAfterPracticeDays");
    if (!(suggestedSelect instanceof HTMLSelectElement) || !(mandatorySelect instanceof HTMLSelectElement)) return;
    const minimumGap = Number(assessmentCadenceForm.dataset.minimumGap) || 2;
    let suggested = Number(suggestedSelect.value);
    let mandatory = Number(mandatorySelect.value);

    if (changedField === "mandatory" && mandatory < suggested + minimumGap) {
      const compatibleSuggestions = [...suggestedSelect.options]
        .map((option) => Number(option.value))
        .filter((value) => mandatory >= value + minimumGap);
      suggested = compatibleSuggestions.at(-1) || suggested;
      suggestedSelect.value = String(suggested);
    }
    if (mandatory < suggested + minimumGap) {
      const compatibleMandatory = [...mandatorySelect.options]
        .map((option) => Number(option.value))
        .find((value) => value >= suggested + minimumGap);
      if (compatibleMandatory) mandatorySelect.value = String(compatibleMandatory);
    }
  }
  assessmentCadenceForm?.querySelector('[name="suggestedAfterPracticeDays"]')?.addEventListener("change", () => {
    reconcileAssessmentCadenceForm("suggested");
  });
  assessmentCadenceForm?.querySelector('[name="mandatoryAfterPracticeDays"]')?.addEventListener("change", () => {
    reconcileAssessmentCadenceForm("mandatory");
  });
  assessmentCadenceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    reconcileAssessmentCadenceForm("submit");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    onAssessmentCadenceUpdate?.({
      suggestedAfterPracticeDays: Number(values.suggestedAfterPracticeDays),
      mandatoryAfterPracticeDays: Number(values.mandatoryAfterPracticeDays),
    });
  });
  container.querySelector("[data-request-stage-assessment]")?.addEventListener("click", () => {
    onAssessmentRequest?.();
  });
  container.querySelector("#observer-onboarding-prefill-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    onOnboardingPrefillSave?.({
      ...values,
      birthYear: Number(values.birthYear),
      birthMonth: Number(values.birthMonth),
      birthDay: Number(values.birthDay),
      mathSelected: values.mathSelected === "on",
    });
  });
  container.querySelector("#observer-learning-goal-draft-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    onLearningGoalDraftSave?.({
      targetGrade: values.targetGrade,
      durationWeeks: Number(values.durationWeeks),
      dailyStudyMinutes: Number(values.dailyStudyMinutes),
      weeklyStudyDays: Number(values.weeklyStudyDays),
    });
  });
  container.querySelector("[data-confirm-curve-adjustment]")?.addEventListener("click", () => {
    onCurveAdjustmentConfirm?.();
  });
}
