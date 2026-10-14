function boundedText(value, { fallback = null, maxLength = 120 } = {}) {
  const text = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, maxLength) : fallback;
}

function currentFocus({ practicePlan, reportSummary }) {
  return (
    boundedText(practicePlan?.focus) ||
    boundedText(reportSummary?.nextStep) ||
    "继续完成今天的练习"
  );
}

function matchedNextStep({ nextStep, nextPracticeAllocation, reportSummary, practicePlan }) {
  const focus =
    boundedText(nextStep?.focus) ||
    boundedText(nextPracticeAllocation?.topPriority?.label) ||
    boundedText(reportSummary?.nextStep) ||
    boundedText(practicePlan?.focus);
  if (!focus) return null;
  return {
    focus,
    rationale:
      boundedText(nextStep?.rationale) ||
      boundedText(nextPracticeAllocation?.topPriority?.rationale) ||
      "下一次开始时，系统会按这个重点安排练习。",
  };
}

// A student's report should never pull attention away from the required work
// that is already in front of them. Matching guidance appears only after it is
// relevant, and stays as a short next action rather than a behavior label.
export function resolveStudentReportNextAction({
  nextPracticeAllocation = null,
  nextStep = null,
  practicePlan = null,
  reportSummary = null,
  requiredPracticeCompleted = false,
} = {}) {
  if (!requiredPracticeCompleted) {
    return {
      id: "continue_today_practice",
      label: "继续练",
      focus: currentFocus({ practicePlan, reportSummary }),
      rationale: "先完成今天的练习，系统会据此安排下一次。",
      source: "current_required_practice",
    };
  }

  const next = matchedNextStep({ nextStep, nextPracticeAllocation, reportSummary, practicePlan });
  if (next) {
    return {
      id: "next_practice_focus",
      label: "下一次练",
      ...next,
      source: nextStep?.source || nextPracticeAllocation?.topPriority?.source || "matching_or_learning_path",
    };
  }

  return {
    id: "continue_learning_path",
    label: "下一次练",
    focus: "沿着当前学习路径继续练习",
    rationale: "下一次开始时，系统会准备好合适的题目。",
    source: "learning_path_fallback",
  };
}
