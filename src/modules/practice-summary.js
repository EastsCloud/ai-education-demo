import { escapeHtml } from "../core/html.js?v=content-safety-1";
import { renderPracticeAtlasEntry } from "./knowledge-atlas.js?v=content-safety-2";

function reviewToggleCopy({ practiceDetailsVisible, reviewPromptStyle }) {
  if (practiceDetailsVisible) return reviewPromptStyle === "reflective" ? "收起本次回看" : "收起错题/对题详情";
  if (reviewPromptStyle === "reflective") return "回想一下这次怎么做的";
  if (reviewPromptStyle === "optional") return "想看时，再回看错题和对题";
  return "查看错题/对题详情";
}

function renderPracticeDetails({ practiceDetailsVisible, reviewPromptStyle, summary }) {
  const practiceSummaryDetails = document.querySelector("#practice-summary-details");
  const retryWrongQuestions = document.querySelector("#retry-wrong-questions");
  const togglePracticeDetails = document.querySelector("#toggle-practice-details");
  if (!practiceSummaryDetails || !togglePracticeDetails) return;

  practiceSummaryDetails.hidden = !practiceDetailsVisible;
  togglePracticeDetails.textContent = reviewToggleCopy({ practiceDetailsVisible, reviewPromptStyle });

  if (!practiceDetailsVisible) return;

  const detailItems = [
    {
      title: "错题",
      items: summary.wrongItems.length
        ? summary.wrongItems
        : [{ prompt: "暂时没有错题。", stageLabel: "继续保持", answerText: "可以选择同类型来几道。" }],
    },
    {
      title: "对题",
      items: summary.correctItems.length
        ? summary.correctItems
        : [{ prompt: "还没有记录对题。", stageLabel: "先完成一道题", answerText: "做对后会出现在这里。" }],
    },
  ];

  practiceSummaryDetails.innerHTML = detailItems
    .map(
      (group) => `
        <article>
          <strong>${group.title}</strong>
          ${group.items
            .map(
              (item) => `
                <div>
                  <span>${escapeHtml(item.stageLabel)}</span>
                  <p>${escapeHtml(item.prompt)}</p>
                  <em>${escapeHtml(item.answerText)}</em>
                </div>
              `,
            )
            .join("")}
        </article>
      `,
    )
    .join("");
}

function renderStageTestEntry({ cadence, onOpenStageTest }) {
  const entry = document.querySelector("#practice-stage-test-entry");
  if (!entry) return;

  const canOpenTest = Boolean(cadence?.canStart);
  entry.hidden = !canOpenTest;
  if (!canOpenTest) {
    entry.innerHTML = "";
    return;
  }

  const isMandatory = cadence?.status === "mandatory";
  entry.innerHTML = `
    <div>
      <span>阶段测试</span>
      <strong>${isMandatory ? "现在用一次测试，校准接下来的学习曲线。" : "今天练完了，也可以做一次测试看看最近的收获。"}</strong>
      <p>没有提示，也不需要赶时间。</p>
    </div>
    <button class="secondary-action" type="button" data-open-stage-test>${isMandatory ? "进入测试" : "看看测试"}</button>
  `;
  entry.querySelector("[data-open-stage-test]")?.addEventListener("click", () => {
    onOpenStageTest?.("practice_completion_stage_test_entry");
  });
}

export function renderPracticeSummary({
  knowledgeAtlas,
  onOpenAtlas,
  onOpenStageTest,
  peerQuestionTypeBenchmark,
  percent,
  practiceDetailsVisible,
  reviewPromptStyle = "light",
  stageTestCadence,
  visible,
  summary,
  wrongRetry,
}) {
  const practiceSummaryPanel = document.querySelector("#practice-summary-panel");
  const practiceSummaryStats = document.querySelector("#practice-summary-stats");
  const practiceAtlasEntry = document.querySelector("#practice-atlas-entry");
  const practiceSummaryDetails = document.querySelector("#practice-summary-details");
  const stageTestEntry = document.querySelector("#practice-stage-test-entry");
  if (!practiceSummaryPanel || !practiceSummaryStats || !practiceAtlasEntry || !practiceSummaryDetails) return;

  practiceSummaryPanel.hidden = !visible || summary.total === 0;
  if (practiceSummaryPanel.hidden) {
    if (stageTestEntry) stageTestEntry.hidden = true;
    return;
  }
  const retryWrongQuestions = document.querySelector("#retry-wrong-questions");
  const hasServerWrongRetryState = typeof wrongRetry?.available === "boolean";
  const retryUnavailable = hasServerWrongRetryState && !wrongRetry.available;
  if (retryWrongQuestions) {
    retryWrongQuestions.disabled = summary.wrongItems.length === 0 || retryUnavailable;
    retryWrongQuestions.textContent =
      summary.wrongItems.length > 0 && retryUnavailable ? "错题已安排重做" : "一键重做错题";
  }
  const hasPeerRate = Number.isFinite(peerQuestionTypeBenchmark?.peerCorrectRate);
  const peerLabel = peerQuestionTypeBenchmark?.label || "同类型题参考";
  const peerValue = hasPeerRate ? percent(peerQuestionTypeBenchmark.peerCorrectRate) : "...";
  const peerCopy = hasPeerRate
    ? `${peerQuestionTypeBenchmark.cohortDescription || "同目标、同阶段学习者"}正确率`
    : peerQuestionTypeBenchmark?.studentCopy || "同类参考正在建立";
  practiceSummaryStats.innerHTML = `
    <article>
      <span>做对</span>
      <strong>${summary.correctCount}</strong>
    </article>
    <article>
      <span>做错</span>
      <strong>${summary.wrongCount}</strong>
    </article>
    <article>
      <span>今天作答</span>
      <strong>${summary.total}</strong>
    </article>
    <article class="peer-stat${hasPeerRate ? "" : " is-calibrating"}">
      <span>${escapeHtml(peerLabel)}</span>
      <strong>${escapeHtml(peerValue)}</strong>
      <em>${escapeHtml(peerCopy)}</em>
    </article>
  `;

  renderPracticeAtlasEntry({
    knowledgeAtlas,
    onOpenAtlas,
    practiceAtlasEntry,
  });

  renderPracticeDetails({ practiceDetailsVisible, reviewPromptStyle, summary });
  renderStageTestEntry({ cadence: stageTestCadence, onOpenStageTest });
}
