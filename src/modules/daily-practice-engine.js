function buildPracticeSequence(baseQuestion) {
  return [
    {
      ...baseQuestion,
      stageLabel: "原题",
      changeReason: "先确认学生能不能完成原题。",
    },
    ...baseQuestion.variants.map((variant, index) => ({
      ...variant,
      stageLabel: index === 0 ? "换一个数字" : "换两个数字",
    })),
  ];
}

function buildQueueUnit({ candidates, fallbackQuestion, queueItem, unitIndex, unitCount }) {
  const baseQuestion = toPracticeQuestion(candidates?.[0], fallbackQuestion, candidates?.slice(1, 3));
  const sequence = buildPracticeSequence(baseQuestion).map((question, stageIndex, stages) => ({
    ...question,
    queueItem,
    queueItemId: queueItem?.id || `single-unit-${unitIndex + 1}`,
    queueUnitIndex: unitIndex,
    queueUnitCount: unitCount,
    queueStageIndex: stageIndex,
    isQueueUnitLast: stageIndex === stages.length - 1,
  }));

  return { baseQuestion, sequence };
}

const SERVER_OWNED_PROGRESS_STAGES = [
  {
    variantLevel: "original",
    stageLabel: "原题",
    changeReason: "先独立完成当前题目。",
  },
  {
    variantLevel: "change_one_number",
    stageLabel: "换一个数字",
    changeReason: "换 1 个数字，检查是否真正理解关系。",
  },
  {
    variantLevel: "change_two_numbers",
    stageLabel: "换两个数字",
    changeReason: "换 2 个数字，检查是否能迁移。",
  },
];

function buildServerOwnedQueueUnit({ fallbackQuestion, queueItem, unitIndex, unitCount }) {
  const queueItemId = queueItem?.id || `server-placeholder-unit-${unitIndex + 1}`;
  const baseQuestion = {
    id: `server-placeholder-${queueItemId}-original`,
    logicId: queueItem?.familyId || fallbackQuestion.logicId,
    variantLevel: "original",
    knowledgePoint: queueItem?.familyName || fallbackQuestion.knowledgePoint || "数学关系",
    prompt: "题目正在准备中",
    answer: null,
    steps: [],
    hints: [],
    diagnosticTags: [],
    solutionStrategies: [],
    guidedMode: { steps: [] },
    generationMetadata: {
      sourceMode: "server_owned_daily_delivery",
      qualityStatus: "pending_server_delivery",
      atlasNodeIds: [],
      abilityTags: [],
      variantControl: null,
      itemTags: null,
    },
  };
  const sequence = SERVER_OWNED_PROGRESS_STAGES.map((stage, stageIndex) => ({
    ...baseQuestion,
    id: `server-placeholder-${queueItemId}-${stage.variantLevel}`,
    ...stage,
    queueItem,
    queueItemId,
    queueUnitIndex: unitIndex,
    queueUnitCount: unitCount,
    queueStageIndex: stageIndex,
    isQueueUnitLast: stageIndex === SERVER_OWNED_PROGRESS_STAGES.length - 1,
  }));

  return { baseQuestion, sequence };
}

function toHintObjects(hintLayers) {
  return hintLayers.map((body, index) => ({
    level: index + 1,
    title: index === hintLayers.length - 1 ? "完整解析" : `提示 ${index + 1}`,
    body,
  }));
}

function createGeneratedSolutionStrategies(candidate) {
  if (Array.isArray(candidate.solutionStrategies) && candidate.solutionStrategies.length) {
    return candidate.solutionStrategies.map((strategy) => ({
      ...strategy,
      steps: [...(strategy.steps || [])],
    }));
  }
  const coreSteps = candidate.solutionSteps || [];
  const relationshipStep = candidate.answerRule ? `关系式：${candidate.answerRule}` : coreSteps[1] || "先找出数量之间的关系。";

  return [
    {
      id: "generated_relation",
      name: "关系式法",
      bestFor: "适合先把题意翻译成数学关系。",
      steps: [coreSteps[0] || "读懂题目", relationshipStep, coreSteps.at(-1) || "代回题目检查"],
    },
    {
      id: "generated_visual",
      name: "画图 / 表格法",
      bestFor: "适合先把数量、单位或份数看清楚。",
      steps: ["画出或列出题目中的条件", coreSteps[1] || "标出数量关系", coreSteps.at(-1) || "检查结果"],
    },
    {
      id: "generated_trial_check",
      name: "有逻辑的试猜",
      bestFor: "适合暂时不熟悉列式，但愿意逐步验证。",
      steps: ["提出一个可能的结果", relationshipStep, "把结果代回全部条件检查"],
    },
  ];
}

function toGeneratedQuestionFields(candidate, fallbackQuestion) {
  return {
    id: candidate.id,
    logicId: candidate.familyId,
    variantLevel: candidate.metadataTags.variantLevel,
    knowledgePoint: candidate.familyName || fallbackQuestion.knowledgePoint,
    prompt: candidate.prompt,
    answer: candidate.answer,
    steps: candidate.solutionSteps,
    hints: toHintObjects(candidate.hintLayers),
    diagnosticTags: candidate.metadataTags.abilityTags,
    solutionStrategies: createGeneratedSolutionStrategies(candidate),
    guidedMode: {
      ...fallbackQuestion.guidedMode,
      steps: candidate.guidedSteps.map((step) => ({
        id: step.stepId,
        prompt: step.prompt,
        expected: step.expected,
      })),
    },
    generationMetadata: {
      sourceMode: candidate.sourceMode,
      qualityStatus: candidate.qualityStatus,
      atlasNodeIds: candidate.metadataTags.atlasNodeIds,
      abilityTags: candidate.metadataTags.abilityTags,
      variantControl: candidate.metadataTags.variantControl,
      itemTags: candidate.metadataTags.itemTags,
    },
  };
}

function toPracticeQuestion(candidate, fallbackQuestion, variantCandidates = []) {
  if (!candidate) return fallbackQuestion;

  return {
    ...fallbackQuestion,
    ...toGeneratedQuestionFields(candidate, fallbackQuestion),
    variants: variantCandidates.map((variant, index) => ({
      ...toGeneratedQuestionFields(variant, fallbackQuestion),
      changeReason: index === 0 ? "换 1 个数字，检查是否真正理解关系。" : "换 2 个数字，检查是否能迁移。",
    })),
  };
}

export function createGeneratedPracticeQuestion({
  candidate,
  fallbackQuestion,
  stageLabel = "自主练习",
  changeReason = "这是你主动选择的一题。",
} = {}) {
  if (!candidate || !fallbackQuestion) return null;
  return {
    ...fallbackQuestion,
    ...toGeneratedQuestionFields(candidate, fallbackQuestion),
    variants: [],
    stageLabel,
    changeReason,
  };
}

function getActiveTask(dailyTasks) {
  return dailyTasks.tasks.find((task) => task.status === "current") || dailyTasks.tasks[0];
}

function getAllocationBuckets(behaviorAwareQuestionEngine) {
  return behaviorAwareQuestionEngine.initialBuckets.map((bucket) => ({
    id: bucket.id,
    ratio: bucket.defaultRatio,
    purpose: bucket.purpose,
  }));
}

function getDefaultProgressionRule(questionLogic) {
  return questionLogic[0]?.progressionRule || ["原题重做", "换 1 个数字", "换 2 个数字", "都对后推进"];
}

export function createDailyPracticePlan({
  allocation,
  behaviorAwareQuestionEngine,
  dailyTasks,
  generatedCandidates,
  generatedCandidateUnits,
  generatedTodayTask,
  initialLearningCurve,
  questionQueue,
  questionLogic,
  questions,
  serverOwned = false,
}) {
  const activeTask = getActiveTask(dailyTasks);
  const activeQueueItem = questionQueue?.items?.[0] || generatedCandidateUnits?.[0]?.queueItem || null;
  const candidateUnits =
    serverOwned
      ? (questionQueue?.items?.length ? questionQueue.items : [null]).map((queueItem) => ({ queueItem, candidates: [] }))
      : generatedCandidateUnits?.length
      ? generatedCandidateUnits
      : [
          {
            queueItem: activeQueueItem,
            candidates: generatedCandidates,
          },
        ];
  const builtUnits = candidateUnits.map((unit, index) => {
    const args = {
      fallbackQuestion: questions[0],
      queueItem: unit.queueItem,
      unitIndex: index,
      unitCount: candidateUnits.length,
    };
    return serverOwned
      ? buildServerOwnedQueueUnit(args)
      : buildQueueUnit({
          ...args,
          candidates: unit.candidates,
        });
  });
  const baseQuestion =
    builtUnits[0]?.baseQuestion ||
    (serverOwned
      ? buildServerOwnedQueueUnit({ fallbackQuestion: questions[0], queueItem: null, unitIndex: 0, unitCount: 1 }).baseQuestion
      : toPracticeQuestion(generatedCandidates?.[0], questions[0], generatedCandidates?.slice(1, 3)));
  const practiceSequence = builtUnits.flatMap((unit) => unit.sequence);
  const allocationBuckets = allocation
    ? Object.entries(allocation.buckets).map(([id, ratio]) => ({
        id,
        ratio,
        purpose: behaviorAwareQuestionEngine.initialBuckets.find((bucket) => bucket.id === id)?.purpose || "rule generated",
      }))
    : getAllocationBuckets(behaviorAwareQuestionEngine);

  return {
    id: `daily-practice-${dailyTasks.date}`,
    date: dailyTasks.date,
    generatedFrom: dailyTasks.generatedFrom,
    generatedFromCurveId: generatedTodayTask?.generatedFromCurveId,
    generatedTask: generatedTodayTask,
    activeTask,
    focus: activeQueueItem?.familyName || generatedTodayTask?.focus || dailyTasks.focus,
    estimatedMinutes: generatedTodayTask?.estimatedMinutes || dailyTasks.estimatedMinutes,
    rationale: generatedTodayTask?.rationale || dailyTasks.rationale,
    entryPoints: dailyTasks.entryPoints,
    baseQuestion,
    practiceSequence,
    allocationBuckets,
    questionQueue: questionQueue || null,
    activeQueueItem,
    queueUnitCount: builtUnits.length,
    allocationSource: allocation?.source || "default_behavior_engine",
    serverOwned: Boolean(serverOwned),
    progressionRule: getDefaultProgressionRule(questionLogic),
    guardrails: [
      "今天学生端只看到一件事：开始做题。",
      "内部包含错题回访、对题抽查、当前阶段新题和轻挑战。",
      "错了先原题重做，再换 1 个数字，再换 2 个数字；都对后才推进。",
      initialLearningCurve.guardrail,
      behaviorAwareQuestionEngine.historyInputPolicy.guardrail,
    ],
    curvePolicy: {
      dailyPracticeAffects: initialLearningCurve.updatePolicy.dailyPracticeAffects,
      curveUpdatesOnlyFrom: initialLearningCurve.updatePolicy.curveUpdatesOnlyFrom,
      assessmentCadence: initialLearningCurve.updatePolicy.assessmentCadence,
    },
  };
}

export function appendGeneratedExtraPractice({
  practicePlan,
  candidates,
  mode = "same_type",
  challengeRoute = "same_family_deeper_variant",
}) {
  const startIndex = practicePlan.practiceSequence.length;
  const isChallenge = mode === "harder";
  const items = candidates.map((candidate, index) => ({
    ...toGeneratedQuestionFields(candidate, practicePlan.baseQuestion),
    stageLabel: isChallenge ? `自愿挑战 · 第 ${index + 1} 题` : `同类型加练 · 第 ${index + 1} 题`,
    changeReason: isChallenge
      ? challengeRoute === "knowledge_graph_successor"
        ? "这道题会带你试试和刚才知识点相连的新关系。"
        : candidate.metadataTags?.variantLevel === "multi_step_extension"
          ? "这道题保留核心关系，并增加了一个需要真正计算的新条件。"
          : candidate.metadataTags?.variantLevel === "reverse_question"
            ? "这道题保留核心关系，但把要求的未知量换了一个位置。"
            : candidate.metadataTags?.variantLevel === "two_steps_added_variant"
              ? "这道题保留核心关系，但多了两个需要整理和规划的步骤。"
              : "这道题保留核心关系，但多了一个需要先整理的信息步骤。"
      : "这是同类型的新题，先换场景或少量条件，继续验证你是否理解关系。",
    extraPracticeMode: mode,
    optionalChallengeRoute: isChallenge ? challengeRoute : null,
  }));

  practicePlan.practiceSequence.push(...items);
  return {
    startIndex,
    count: items.length,
    mode,
    challengeRoute: isChallenge ? challengeRoute : null,
  };
}

export function getQuestionFromPracticePlan(practicePlan, currentQuestionIndex) {
  const sequenceItem = practicePlan.practiceSequence[currentQuestionIndex];

  return {
    ...practicePlan.baseQuestion,
    ...sequenceItem,
    unit: sequenceItem.unit || practicePlan.baseQuestion.unit,
  };
}
