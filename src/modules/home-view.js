import { setText } from "../core/dom.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function curvePoints(values = []) {
  const usableValues = values.map((value) => Math.max(0, Math.min(1.15, Number(value) || 0)));
  if (!usableValues.length) return [];
  const lastIndex = Math.max(usableValues.length - 1, 1);
  return usableValues.map((value, index) => ({
    x: 10 + (130 * index) / lastIndex,
    y: 46 - (value / 1.15) * 38,
  }));
}

function smoothPath(points = []) {
  if (!points.length) return "M10 46 H140";
  if (points.length === 1) return `M${points[0].x} ${points[0].y} L140 ${points[0].y}`;
  let path = `M${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpointX = (previous.x + current.x) / 2;
    const midpointY = (previous.y + current.y) / 2;
    path += ` Q${previous.x} ${previous.y} ${midpointX} ${midpointY}`;
  }
  const finalPoint = points.at(-1);
  return `${path} T${finalPoint.x} ${finalPoint.y}`;
}

function renderTopCurve({ learningCurve, currentWeek }) {
  const root = document.querySelector(".top-curve");
  if (!root || !learningCurve) return;
  const plannedPoints = curvePoints(learningCurve.progressCurve || []);
  if (!plannedPoints.length) return;
  const activePoints = curvePoints(learningCurve.dynamicProgressCurve || learningCurve.progressCurve || []);
  const planPath = root.querySelector(".mini-plan");
  const currentPath = root.querySelector(".mini-current");
  const marker = root.querySelector("circle");
  if (planPath) planPath.setAttribute("d", smoothPath(plannedPoints));
  const isDynamic = learningCurve.curveType === "dynamic" && activePoints.length > 0;
  if (currentPath) {
    currentPath.setAttribute("d", smoothPath(activePoints));
    currentPath.style.opacity = isDynamic ? "1" : "0";
  }
  const weekIndex = Math.max(0, Math.min(plannedPoints.length - 1, Number(currentWeek || 1) - 1));
  const markerPoint = (isDynamic ? activePoints : plannedPoints)[weekIndex] || plannedPoints[weekIndex];
  if (marker && markerPoint) {
    marker.setAttribute("cx", String(markerPoint.x));
    marker.setAttribute("cy", String(markerPoint.y));
  }
}

export function renderHomeView({
  currentLevel,
  dateParts,
  durationWeeks,
  learningGoal,
  learningCurve,
  messages,
  practicePlan,
  settings,
  taskCadence,
  currentWeek,
  stageTestCadence,
  onOpenStageTest,
}) {
  setText(".sidebar-summary strong", learningGoal.title);
  setText(".sidebar-summary span", `今日重点：${practicePlan.focus}`);
  setText(".curve-copy strong", `第 ${currentWeek} / ${durationWeeks} 周 · ${currentLevel}`);
  renderTopCurve({ learningCurve, currentWeek });

  setText("#home .hero-band .label", `学生：${settings.displayName}`);
  setText("#home-title", "今天只做一件事：专心做这一组题。");
  setText(
    "#home .hero-band p:not(.label)",
    `从“${practicePlan.focus}”开始，一题一题慢慢来。`,
  );

  const heroMetrics = document.querySelectorAll(".hero-metrics div");
  if (heroMetrics[0]) {
    heroMetrics[0].querySelector("strong").textContent = currentLevel;
    heroMetrics[0].querySelector("span").textContent = learningCurve?.curveType === "dynamic" ? "当前进度" : "学习起点";
  }
  if (heroMetrics[1]) {
    heroMetrics[1].querySelector("strong").textContent = `${learningGoal.dailyStudyMinutes}分钟`;
    heroMetrics[1].querySelector("span").textContent = "每日学习时间";
  }
  if (heroMetrics[2]) {
    heroMetrics[2].querySelector("strong").textContent = `${learningGoal.weeklyStudyDays}天`;
    heroMetrics[2].querySelector("span").textContent = "每周学习频率";
  }

  setText(".calendar-card span", dateParts.month);
  setText(".calendar-card strong", dateParts.day);
  const calendarCard = document.querySelector(".calendar-card");
  if (calendarCard) {
    calendarCard.setAttribute("aria-label", `${dateParts.full}，${taskCadence?.makeUpTask ? "补做练习" : "今日练习"}，开始练习`);
  }

  const makeUpTask = taskCadence?.makeUpTask;
  setText("#home-practice-focus", makeUpTask ? "补上上一组练习" : practicePlan.focus);
  setText("#home-practice-duration", makeUpTask ? "从上次停下的地方继续" : `约 ${practicePlan.estimatedMinutes} 分钟`);

  const cadenceStrip = document.querySelector("#home-cadence-strip");
  if (cadenceStrip) {
    const labels = {
      completed: "已完成",
      missed: "尚未完成",
      make_up: "今天补做一组",
      today: "今天练习",
      upcoming: "之后的学习日",
      rest: "休息日",
    };
    cadenceStrip.innerHTML = (taskCadence?.calendar || [])
      .map(
        (day) =>
          `<i class="${escapeHtml(day.status)}" title="${escapeHtml(day.date)}：${labels[day.status] || "学习节奏"}" aria-label="${escapeHtml(day.date)}：${labels[day.status] || "学习节奏"}"></i>`,
      )
      .join("");
    cadenceStrip.setAttribute("aria-label", "最近与接下来的学习节奏");
  }

  const stageTestEntry = document.querySelector("#home-stage-test-entry");
  if (stageTestEntry) {
    const canOpenTest = Boolean(stageTestCadence?.canStart);
    stageTestEntry.hidden = !canOpenTest;
    if (canOpenTest) {
      const isMandatory = stageTestCadence?.status === "mandatory";
      stageTestEntry.innerHTML = `
        <div>
          <span>阶段测试</span>
          <strong>${isMandatory ? "用一次测试，把接下来的路走得更准。" : "现在可以用一次测试，看看最近学会了什么。"}</strong>
          <p>${isMandatory ? "做完后，会更清楚接下来该走哪一步。" : "没有提示，也不需要赶时间。"}</p>
        </div>
        <button class="secondary-action" type="button" data-open-stage-test>${isMandatory ? "进入测试" : "看看测试"}</button>
      `;
      stageTestEntry.querySelector("[data-open-stage-test]")?.addEventListener("click", () => {
        onOpenStageTest?.("home_stage_test_entry");
      });
    } else {
      stageTestEntry.innerHTML = "";
    }
  }

  const sidebarGoal = document.querySelector(".sidebar-summary");
  if (sidebarGoal && messages[0]) {
    sidebarGoal.title = messages[0].body;
  }

  const messageBanner = document.querySelector("#student-message-banner");
  if (messageBanner) {
    const latest = messages[0];
    messageBanner.hidden = !latest;
    if (latest) {
      const sender = latest.fromRole === "teacher" ? "老师" : "家长";
      messageBanner.innerHTML = `
        <span>${sender}给你留了一句话</span>
        <strong>${escapeHtml(latest.title || "今天继续加油")}</strong>
        <p>${escapeHtml(latest.body)}</p>
      `;
    }
  }
}
