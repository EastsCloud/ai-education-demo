import { escapeHtml } from "../core/html.js?v=content-safety-1";
import { resolveStudentReportNextAction } from "../services/student-report-next-action-engine.js";

function boundedCurveProgress(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1.15, numeric)) : 0;
}

function curveValues(values) {
  return Array.isArray(values) ? values.map((value) => boundedCurveProgress(value)) : [];
}

function curvePath(values, { width, height, paddingX, paddingY, maximum }) {
  const points = values.length ? values : [0];
  const usableWidth = Math.max(1, width - paddingX * 2);
  const usableHeight = Math.max(1, height - paddingY * 2);
  return points
    .map((value, index) => {
      const x = paddingX + (points.length === 1 ? 0 : (index / (points.length - 1)) * usableWidth);
      const y = height - paddingY - (boundedCurveProgress(value) / maximum) * usableHeight;
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function curveMarker(values, currentWeek, geometry) {
  const points = values.length ? values : [0];
  const index = Math.max(0, Math.min(points.length - 1, Math.round(Number(currentWeek || 1) - 1)));
  const usableWidth = Math.max(1, geometry.width - geometry.paddingX * 2);
  const usableHeight = Math.max(1, geometry.height - geometry.paddingY * 2);
  return {
    x: geometry.paddingX + (points.length === 1 ? 0 : (index / (points.length - 1)) * usableWidth),
    y: geometry.height - geometry.paddingY - (boundedCurveProgress(points[index]) / geometry.maximum) * usableHeight,
  };
}

function boundedRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
}

function trendPath(values, { width = 120, height = 42, padding = 5 } = {}) {
  const safeValues = values.length ? values : [0];
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  return safeValues
    .map((value, index) => {
      const x = padding + (safeValues.length === 1 ? 0 : (index / (safeValues.length - 1)) * usableWidth);
      const y = height - padding - boundedRate(value) * usableHeight;
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderStudentPracticeTrend(learningTrend) {
  const practice = learningTrend?.practice;
  if (practice?.availability !== "observed") {
    return `
      <div class="student-practice-trend is-collecting">
        <div><span>最近练习</span><strong>${escapeHtml(learningTrend?.studentCopy || "记录会慢慢连成你的变化轨迹。")}</strong></div>
      </div>
    `;
  }

  const checkpoints = practice.checkpoints || [];
  const correctPath = trendPath(checkpoints.map((item) => item.correctRate));
  const independentPath = trendPath(checkpoints.map((item) => item.independentCompletionRate));
  return `
    <div class="student-practice-trend">
      <div><span>最近练习</span><strong>${escapeHtml(practice.studentCopy || learningTrend?.studentCopy || "继续一步一步来。")}</strong></div>
      <svg viewBox="0 0 120 42" role="img" aria-label="最近练习趋势">
        <path class="student-trend-independent" d="${independentPath}"></path>
        <path class="student-trend-correct" d="${correctPath}"></path>
      </svg>
    </div>
  `;
}

export function renderStudentLearningCurve({ staticCurve = null, dynamicCurve = null, activeCurve = null } = {}) {
  const staticValues = curveValues(staticCurve?.progressCurve || activeCurve?.progressCurve);
  const hasDynamicCurve = Boolean(dynamicCurve?.canUpdate && Array.isArray(dynamicCurve?.dynamicProgressCurve));
  const activeValues = curveValues(
    hasDynamicCurve ? dynamicCurve.dynamicProgressCurve : activeCurve?.progressCurve || staticCurve?.progressCurve,
  );
  const values = [...staticValues, ...activeValues];
  if (!values.length) {
    return `
      <div class="mini-curve-copy is-empty">
        <span>学习曲线</span>
        <strong>目标确认后，这里会慢慢画出你的学习路径。</strong>
      </div>
    `;
  }

  const geometry = {
    width: 320,
    height: 160,
    paddingX: 22,
    paddingY: 18,
    maximum: Math.max(1, ...values),
  };
  const visibleValues = activeValues.length ? activeValues : staticValues;
  const marker = curveMarker(
    visibleValues,
    (hasDynamicCurve ? dynamicCurve : activeCurve || staticCurve)?.currentPoint?.week,
    geometry,
  );
  const staticPath = curvePath(staticValues.length ? staticValues : visibleValues, geometry);
  const activePath = curvePath(visibleValues, geometry);

  return `
    <svg viewBox="0 0 ${geometry.width} ${geometry.height}" role="img" aria-label="学习曲线">
      <path class="curve-base" d="${staticPath}"></path>
      <path class="curve-live ${hasDynamicCurve ? "dynamic" : "static"}" d="${activePath}"></path>
      <circle cx="${marker.x.toFixed(1)}" cy="${marker.y.toFixed(1)}" r="7"></circle>
    </svg>
    <div class="mini-curve-copy">
      <span>${hasDynamicCurve ? "正式测试后的路径" : "正在按初始路径前进"}</span>
      <strong>${hasDynamicCurve ? "测试确认了新的位置；每天练习会继续帮助下一题更适合你。" : "每天练习会调整下一题，测试才会更新这条学习路径。"}</strong>
    </div>
  `;
}

export function renderStudentLevelAttainment(levelAttainment = null) {
  if (!levelAttainment?.studentCopy?.label) return "";
  const lanes = (levelAttainment.visualProgress?.lanes || []).slice(0, 5);
  const targetGrade = escapeHtml(levelAttainment.targetGrade || "目标");
  const label = escapeHtml(levelAttainment.studentCopy.label);
  const detail = escapeHtml(levelAttainment.studentCopy.detail || "正式测试会慢慢确认你的变化。");
  const status = levelAttainment.officiallyReached ? "is-confirmed" : "is-collecting";
  const laneMarkup = lanes.length
    ? lanes
        .map((lane) => {
          const laneStatus = lane.status === "ready" ? "is-ready" : "is-collecting";
          const laneLabel = escapeHtml(`${lane.label}：${lane.status === "ready" ? "已积累" : "正在积累"}`);
          return `<i class="${laneStatus}" role="img" aria-label="${laneLabel}" title="${laneLabel}"></i>`;
        })
        .join("")
    : "<i class=\"is-collecting\" role=\"img\" aria-label=\"等待正式测试\"></i>";
  return `
    <div class="student-level-evidence ${status}">
      <div class="student-level-evidence-copy">
        <span>目标确认</span>
        <strong>${label}</strong>
        <p>${detail}</p>
      </div>
      <div class="student-level-evidence-path" aria-label="${targetGrade} 目标确认路径">${laneMarkup}</div>
    </div>
  `;
}

export function renderReportDashboard({
  abilityMap,
  behaviorStats,
  dynamicCurve,
  generatedStaticCurve,
  initialLearningCurve,
  knowledgeCoverage = null,
  knowledgePuzzleMap,
  learningReport,
  learningTrend = null,
  latestMessage = null,
  nextStep = null,
  onOpenAtlas,
  onOpenPracticeReview,
  peerReference = null,
  nextPracticeAllocation,
  practicePlan,
  practiceSummary,
  requiredPracticeCompleted = false,
  reportSummary,
  studentProfile,
  testHistory = [],
  levelAttainment = null,
  percent,
  stageTestCadence,
  onOpenStageTest,
}) {
  const stats = reportSummary.visualStats;
  const activeCurve = dynamicCurve?.canUpdate ? dynamicCurve : generatedStaticCurve || initialLearningCurve;
  const activeProgress = Number(activeCurve?.currentPoint?.progressTowardTarget || 0);
  const behavior = behaviorStats || {};
  const learning = learningReport || {
    hasEvidence: Number(behavior.answerCount || 0) > 0,
    answerCount: Number(behavior.answerCount || 0),
    noHintAnswerCount: Number(behavior.answerCount || 0),
    noHintAccuracy: behavior.hintFreeCorrectRate ?? null,
    hintedAnswerCount: 0,
    hintedAccuracy: behavior.hintedCorrectRate ?? null,
    hintUseRate: behavior.hintUseRate ?? null,
    retryCount: Number(behavior.retryCount || 0),
    retrySuccessRate: behavior.redoSuccessRate ?? null,
    correctRate: behavior.correctRate ?? null,
    sessionCount: 0,
    recentStudyMinutes: Number(behavior.durationMinutes || 0),
    totalStudyMinutes: Number(behavior.durationMinutes || 0),
    shortestSessionMinutes: 0,
    longestSessionMinutes: 0,
  };
  const metricPercent = (value) => (typeof value === "number" && Number.isFinite(value) ? percent(value) : "--");
  const sessionRange =
    learning.sessionCount > 0
      ? `单次 ${learning.shortestSessionMinutes}-${learning.longestSessionMinutes} 分钟`
      : "开始练习后显示节奏";
  const metricGrid = document.querySelector("#report-metric-grid");
  if (metricGrid) {
    const metrics = [
      {
        label: "这周练习",
        value: learning.hasEvidence ? `${learning.recentStudyMinutes} 分钟` : "--",
        detail: learning.sessionCount ? `${learning.sessionCount} 次进入` : "从第一次练习开始",
      },
      {
        label: "独立完成",
        value: metricPercent(learning.noHintAccuracy),
        detail: learning.noHintAnswerCount ? `${learning.noHintAnswerCount} 次不看提示` : "慢慢积累自己的方法",
      },
      {
        label: "地图点亮",
        value: percent(Number.isFinite(knowledgeCoverage) ? knowledgeCoverage : knowledgePuzzleMap.completionRate),
        detail: "每一道题都留下新的亮点",
      },
    ];
    metricGrid.innerHTML = metrics
      .map(
        (metric) => `
          <article>
            <span>${metric.label}</span>
            <strong>${metric.value}</strong>
            <em>${metric.detail}</em>
          </article>
        `,
      )
      .join("");
  }

  const testHistoryContainer = document.querySelector("#report-test-history");
  if (testHistoryContainer) {
    testHistoryContainer.innerHTML = testHistory.length
      ? testHistory
          .slice(0, 3)
          .map(
            (item) => `
          <article class="${item.status || "recorded"}">
            <span>${item.dateLabel}</span>
            <div>
              <strong>${item.title}</strong>
              <p>${item.summary}</p>
            </div>
            <b>${item.scoreLabel}</b>
          </article>
        `,
          )
          .join("")
      : `<p class="report-test-empty">第一轮测试后，这里会显示你的变化。</p>`;
  }

  const progressRing = document.querySelector("#report-progress-ring");
  if (progressRing) {
    progressRing.style.setProperty("--report-progress", `${Math.round(activeProgress * 100)}%`);
    progressRing.querySelector("strong").textContent = percent(activeProgress);
  }

  const levelEvidence = document.querySelector("#report-level-evidence");
  if (levelEvidence) levelEvidence.innerHTML = renderStudentLevelAttainment(levelAttainment);

  const heroTitle = document.querySelector("#report-hero-title");
  const heroCopy = document.querySelector("#report-hero-copy");
  const strongestDimension = abilityMap?.dimensions?.slice().sort((left, right) => right.score - left.score)[0];
  if (heroTitle) {
    heroTitle.textContent = learning.hasEvidence
      ? `已经留下 ${learning.answerCount} 次认真作答。`
      : "从今天的一道题开始。";
  }
  if (heroCopy) {
    heroCopy.textContent = strongestDimension
      ? `你在${strongestDimension.name || strongestDimension.label}上正在变得更稳。`
      : "练习会一点一点变成你的数学地图。";
  }

  const abilityTrend = document.querySelector("#report-ability-trend");
  if (abilityTrend) {
    const trendItems = abilityMap?.dimensionTrend?.length
      ? abilityMap.dimensionTrend.map((item) => ({
          dimension: item.name || item.dimensionId,
          previous: item.previousScore,
          current: item.currentScore,
          change: item.change,
          firstEvidence: item.status === "first_evidence",
        }))
      : stats.abilityTrend;

    abilityTrend.innerHTML = trendItems
      .slice(0, 3)
      .map((item) => {
        const hasPrevious = typeof item.previous === "number" && Number.isFinite(item.previous);
        const change = typeof item.change === "number" ? item.change : hasPrevious ? item.current - item.previous : null;
        const direction = change === null ? "neutral" : change >= 0 ? "up" : "down";
        const detail = item.firstEvidence || change === null
          ? `${percent(item.current)} · 已建立第一条证据`
          : `${percent(item.current)} · ${change >= 0 ? "+" : ""}${Math.round(change * 100)}%`;
        return `
          <article>
            <div>
              <strong>${item.dimension}</strong>
              <span>${detail}</span>
            </div>
            <div class="trend-bars">
              ${hasPrevious ? `<i class="previous" style="width: ${percent(item.previous)}"></i>` : ""}
              <i class="current ${direction}" style="width: ${percent(item.current)}"></i>
            </div>
          </article>
        `;
      })
          .join("");
  }

  const practiceTrend = document.querySelector("#report-practice-trend");
  if (practiceTrend) practiceTrend.innerHTML = renderStudentPracticeTrend(learningTrend);

  const reportMessage = document.querySelector("#report-message");
  if (reportMessage) {
    const body = String(latestMessage?.body || "").trim();
    const sender = latestMessage?.fromRole === "teacher" ? "老师" : "家长";
    reportMessage.hidden = !body;
    reportMessage.innerHTML = body
      ? `<span>${sender}留给你的一句话</span><strong>${escapeHtml(latestMessage?.title || "继续往前走")}</strong><p>${escapeHtml(body)}</p>`
      : "";
  }

  const peerBand = document.querySelector("#report-peer-band");
  if (peerBand) {
    const hasLivePeerReference = peerReference?.availability === "available";
    const isPeerReferenceCalibrating = peerReference?.availability === "calibrating";
    const peerPercentile = hasLivePeerReference
      ? Math.max(0.05, Math.min(0.95, Number(peerReference.percentile) || 0.5))
      : Math.max(0.05, Math.min(0.95, stats.peerPercentile + (learning.correctRate || 0) * 0.08));
    const peerLabel = hasLivePeerReference
      ? peerReference.label
      : isPeerReferenceCalibrating
        ? peerReference.label
        : stats.peerComparisonLabel;
    const peerCopy = hasLivePeerReference
      ? peerReference.studentCopy
      : isPeerReferenceCalibrating
        ? peerReference.studentCopy
        : "和同年龄、同目标、同阶段的同学一起看变化。";
    const peerTrendCopy = peerReference?.trend?.availability === "available" ? peerReference.trend.studentCopy : "";
    peerBand.innerHTML = `
      <div class="peer-scale ${isPeerReferenceCalibrating ? "is-calibrating" : ""}" style="--peer-position: ${percent(peerPercentile)}">
        ${isPeerReferenceCalibrating ? "" : "<i></i>"}
      </div>
      <div class="peer-labels">
        <span>刚开始</span>
        <strong>${peerLabel} · 继续向前</strong>
        <span>走得更远</span>
      </div>
      <p>${[peerCopy, peerTrendCopy].filter(Boolean).join(" ")}</p>
    `;
  }

  const miniCurve = document.querySelector("#report-mini-curve");
  if (miniCurve) {
    miniCurve.innerHTML = renderStudentLearningCurve({
      staticCurve: generatedStaticCurve || initialLearningCurve,
      dynamicCurve,
      activeCurve,
    });
  }

  const nextActions = document.querySelector("#report-next-actions");
  if (nextActions) {
    const nextAction = resolveStudentReportNextAction({
      nextPracticeAllocation,
      nextStep,
      practicePlan,
      reportSummary,
      requiredPracticeCompleted,
    });
    const canOpenTest = Boolean(stageTestCadence?.canStart);
    const isMandatory = stageTestCadence?.status === "mandatory";
    const canReviewPractice = Boolean(practiceSummary?.total);
    nextActions.innerHTML = `
      <article><strong>${escapeHtml(nextAction.label)}</strong><span>${escapeHtml(nextAction.focus)}</span></article>
      ${
        canReviewPractice
          ? `<article class="report-review-entry"><strong>回看一下</strong><span>想看时，回到今天的对题和错题。</span><button class="text-action" type="button" data-open-practice-review>查看这次练习</button></article>`
          : ""
      }
      <article class="report-atlas-entry"><strong>想一想</strong><span>想看时，再打开今天涉及的知识地图。</span><button class="text-action" type="button" data-open-atlas>打开知识地图</button></article>
      <article class="report-stage-entry">
        <strong>测试</strong>
        <span>${canOpenTest ? (isMandatory ? "现在做一次测试，确认最近走到了哪里。" : "可以做一次测试，看看最近的变化。") : "练一段时间后，会有一次小测试帮你确认变化。"}</span>
        ${canOpenTest ? `<button class="text-action" type="button" data-open-stage-test>${isMandatory ? "进入测试" : "看看测试"}</button>` : ""}
      </article>
    `;
    nextActions.querySelector("[data-open-stage-test]")?.addEventListener("click", () => {
      onOpenStageTest?.("report_stage_test_entry");
    });
    nextActions.querySelector("[data-open-atlas]")?.addEventListener("click", () => {
      onOpenAtlas?.("student_report");
    });
    nextActions.querySelector("[data-open-practice-review]")?.addEventListener("click", () => {
      onOpenPracticeReview?.("student_report");
    });
  }
}
