import { setText } from "../core/dom.js";

export function buildBehaviorReportText({ activeQuestion, stats }) {
  const latestState =
    stats.latestCorrect === true
      ? "最近一次作答正确"
      : stats.latestCorrect === false
        ? "最近一次作答仍需调整"
        : "尚未提交答案";

  return `本次学习：作答 ${stats.answerCount} 次，提示最深打开到第 ${stats.highestHintLevel} 层，重做 ${stats.retryCount} 次。${latestState}。当前推进：${activeQuestion.stageLabel}。`;
}

export function renderBehaviorSummary({ activeQuestion, hintNote, practiceRuntime, revealedHints }) {
  const stats = practiceRuntime.getStats();
  const profileSummary = document.querySelector("#report-profile-summary");
  const reportText = buildBehaviorReportText({ activeQuestion, stats });

  if (profileSummary) {
    let behaviorCard = profileSummary.querySelector("[data-behavior-report]");
    if (!behaviorCard) {
      behaviorCard = document.createElement("article");
      behaviorCard.dataset.behaviorReport = "true";
      behaviorCard.innerHTML = `
        <span>行为记录</span>
        <strong>本次学习过程</strong>
        <p></p>
      `;
      profileSummary.appendChild(behaviorCard);
    }

    setText("p", reportText, behaviorCard);
  }

  if (hintNote && revealedHints > 0) hintNote.textContent = `已打开 ${revealedHints} 层提示，前面的提示会保留在这里。`;
}
