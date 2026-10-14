function boundedRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1 ? numeric : null;
}

export const observerGuidanceThresholds = {
  minimumAnswerEvidence: 4,
  rapidWrongRate: 0.25,
  highHintUseRate: 0.45,
};

function adultRole(audience) {
  return audience === "teacher" ? "teacher" : "parent";
}

function action({ id, tone, title, evidence, parentAction, teacherAction, priority }) {
  return {
    id,
    tone,
    title,
    evidence,
    parentAction,
    teacherAction,
    priority,
  };
}

function nextFocusAction({ audience, nextStep }) {
  const focus = nextStep?.focus || "读题与关系建模";
  const isTeacher = adultRole(audience) === "teacher";
  return action({
    id: "next_practice_focus",
    tone: "teal",
    title: isTeacher ? "下一次只观察一个点" : "下一次只支持一个点",
    evidence: `系统下一轮会把重点放在“${focus}”。`,
    parentAction: `练习后只问一句：“这题先要找什么关系？”把“${focus}”留给学生自己说出来。`,
    teacherAction: `用一题先请学生说出“${focus}”的依据，再决定是否补充讲解。`,
    priority: 70,
  });
}

function rhythmAction({ audience, reminder }) {
  const isTeacher = adultRole(audience) === "teacher";
  return action({
    id: "restore_learning_rhythm",
    tone: "gold",
    title: reminder?.title || "先把节奏调回可完成",
    evidence: reminder?.body || "近期学习节奏需要先稳定下来。",
    parentAction: "先一起把下一周调成真正能完成的频率，不要求一次补回所有遗漏。",
    teacherAction: "把后续练习切成可完成的小段，先恢复稳定参与，再讨论加量。",
    priority: 100,
  });
}

function collectingEvidenceAction({ audience, answerCount }) {
  const isTeacher = adultRole(audience) === "teacher";
  return action({
    id: "collect_more_evidence",
    tone: "blue",
    title: "先让记录自然形成",
    evidence: `目前只有 ${answerCount} 次可信作答，暂不对学习方式下结论。`,
    parentAction: "按当前节奏完成几次练习即可；先看过程，不急着比较或调整难度。",
    teacherAction: "先收集几次独立作答和重做记录，再决定是否需要针对性介入。",
    priority: 60,
  });
}

function rapidResponseAction() {
  return action({
    id: "slow_down_before_answer",
    tone: "coral",
    title: "把“先读再答”固定下来",
    evidence: "近期有较多很短时间内的错误作答，先保护思考过程比加题更重要。",
    parentAction: "下一题先等学生把题意读完，并用一句话说出已知关系；这时先不提示答案。",
    teacherAction: "先要求学生圈出已知量和关系，再写第一步；完整讲解放在这一步之后。",
    priority: 95,
  });
}

function independentEntryAction() {
  return action({
    id: "restore_independent_entry",
    tone: "blue",
    title: "把第一步留给学生",
    evidence: "提示使用偏多，当前更需要练习先独立找关系，再决定是否打开提示。",
    parentAction: "看到犹豫时先问“题里哪两个信息有关系？”，给等待时间，不直接给下一步。",
    teacherAction: "让学生先说出关系或画出模型，再开放提示或示范；先保留独立入口。",
    priority: 85,
  });
}

function variantConsolidationAction() {
  return action({
    id: "consolidate_variants",
    tone: "gold",
    title: "先把变式走稳，再提高难度",
    evidence: "原题路径正在形成，但数字或步骤变化后还需要更稳定的迁移证据。",
    parentAction: "鼓励完成同类型的一题变式，不急着要求更多新题或更难题。",
    teacherAction: "保留一数变化和两数变化的递进，确认独立完成后再切换知识点。",
    priority: 80,
  });
}

function retryStrengthAction() {
  return action({
    id: "protect_retry_loop",
    tone: "green",
    title: "重做正在帮助理解",
    evidence: "错误后的重做已有较好回收效果，当前路径值得保持。",
    parentAction: "重做成功时只肯定方法变化，例如“你这次先找关系了”，不把重点放在快不快。",
    teacherAction: "继续让学生按原题、一个变化、两个变化完成递进，不需额外补讲整段知识。",
    priority: 72,
  });
}

function independentStrengthAction() {
  return action({
    id: "extend_independent_thinking",
    tone: "green",
    title: "独立尝试可以再往前一步",
    evidence: "近期独立完成较稳定，可以把解释关系和检查答案作为下一层练习。",
    parentAction: "答对后追问“你怎么知道这样做？”，让学生把思路说完整。",
    teacherAction: "在保持当前难度边界内，加入一次解释关系或检查答案的追问。",
    priority: 70,
  });
}

function selectBehaviorAction(learning) {
  const answerCount = Math.max(0, Number(learning?.answerCount) || 0);
  if (answerCount < observerGuidanceThresholds.minimumAnswerEvidence) {
    return collectingEvidenceAction({ audience: learning?.audience, answerCount });
  }

  const fastGuessRate = boundedRate(learning?.fastGuessRate);
  if (fastGuessRate !== null && fastGuessRate >= observerGuidanceThresholds.rapidWrongRate) return rapidResponseAction();

  const hintUseRate = boundedRate(learning?.hintUseRate);
  const noHintAccuracy = boundedRate(learning?.noHintAccuracy);
  if (
    hintUseRate !== null &&
    hintUseRate >= observerGuidanceThresholds.highHintUseRate &&
    (noHintAccuracy === null || noHintAccuracy < 0.7)
  ) {
    return independentEntryAction();
  }

  const variantAnswerCount = Math.max(0, Number(learning?.variantAnswerCount) || 0);
  const variantAccuracy = boundedRate(learning?.variantAccuracy);
  if (variantAnswerCount >= 2 && variantAccuracy !== null && variantAccuracy < 0.65) return variantConsolidationAction();

  const retryCount = Math.max(0, Number(learning?.retryCount) || 0);
  const retrySuccessRate = boundedRate(learning?.retrySuccessRate);
  if (retryCount >= 2 && retrySuccessRate !== null && retrySuccessRate >= 0.65) return retryStrengthAction();

  const independentAccuracy = boundedRate(learning?.noHintAccuracy);
  if (independentAccuracy !== null && independentAccuracy >= 0.78) return independentStrengthAction();

  return null;
}

export function buildObserverGuidance({ audience, learning = {}, nextStep = {}, plan = {} } = {}) {
  if (!["parent", "teacher", "admin"].includes(audience)) return null;

  const role = adultRole(audience);
  const decoratedLearning = { ...learning, audience: role };
  const actions = [nextFocusAction({ audience: role, nextStep })];
  const rhythm = plan?.taskCadence?.observerReminder;
  if (rhythm) actions.push(rhythmAction({ audience: role, reminder: rhythm }));
  const behaviorAction = selectBehaviorAction(decoratedLearning);
  if (behaviorAction) actions.push(behaviorAction);

  const ordered = actions
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3)
    .map(({ parentAction, teacherAction, priority, ...item }) => ({
      ...item,
      action: role === "teacher" ? teacherAction : parentAction,
    }));
  const answerCount = Math.max(0, Number(learning?.answerCount) || 0);

  return {
    version: "observer_guidance_v1",
    evidenceStatus: answerCount < observerGuidanceThresholds.minimumAnswerEvidence ? "collecting" : "ready",
    summary:
      answerCount < observerGuidanceThresholds.minimumAnswerEvidence
        ? "证据还在形成，先保持简单、稳定的支持。"
        : "根据可信作答、练习节奏和当前学习路径，保留最需要的支持动作。",
    actions: ordered,
    guardrail:
      "Guidance supports adult choices and next-practice matching. It is not a student label and cannot change the learning curve without a verified formal test.",
  };
}
