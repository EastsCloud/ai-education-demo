import { createInitialPersonalitySupportActionPolicy } from "./personality-support-action-policy.js?v=personality-support-policy-1";

const PSYCHOLOGICAL_TEMPLATE_LIBRARY = {
  exploration_curiosity: [
    {
      id: "new-topic-free-hour",
      prompt: "周末多出一小时，你更愿意怎么安排？",
      options: ["试试一个没接触过的新主题", "把最近学过的内容整理一下", "和朋友一起完成熟悉的小项目", "做一件已经很确定的事"],
      optionScores: [0.9, 0.68, 0.58, 0.34],
    },
    {
      id: "new-tool-classroom",
      prompt: "老师带来一个没用过的新工具，你通常会？",
      options: ["想先摸索它能做什么", "先看一个简单示例再试", "等熟悉的人带我一起做", "更愿意继续用原来的方法"],
      optionScores: [0.9, 0.72, 0.52, 0.32],
    },
  ],
  self_management: [
    {
      id: "one-week-task",
      prompt: "一个任务一周后要完成，你通常会怎么开始？",
      options: ["先拆成几步，每天做一点", "先做最容易的一小部分", "等快到时间再集中做", "需要别人提醒才会开始"],
      optionScores: [0.92, 0.7, 0.38, 0.2],
    },
    {
      id: "after-school-plan",
      prompt: "放学后有几件事要做，你更接近哪一种做法？",
      options: ["先排一下顺序再开始", "先做最想做的一件", "看当时心情决定", "常常忘记原来要做什么"],
      optionScores: [0.92, 0.64, 0.42, 0.2],
    },
  ],
  frustration_recovery: [
    {
      id: "unexpected-low-result",
      prompt: "一次结果比自己预期低很多，你第一反应更像哪一种？",
      options: ["找一找哪里出了问题，下次调整", "会有点失落，但愿意听建议", "觉得自己可能不适合这件事", "暂时不想再看这次结果"],
      optionScores: [0.9, 0.66, 0.34, 0.22],
    },
    {
      id: "repeated-error",
      prompt: "同一件事试了两次都没成功时，你更可能？",
      options: ["停一下，换个办法再试", "先休息一会儿，再回来", "希望有人马上替我解决", "不太想继续碰它"],
      optionScores: [0.9, 0.65, 0.46, 0.22],
    },
  ],
  interaction_help_seeking: [
    {
      id: "stuck-on-problem",
      prompt: "遇到一个不理解的问题时，你通常会？",
      options: ["先自己想一会儿，再决定要不要问", "直接说明哪里不懂，请别人一起看", "先看别人怎么做", "先放着，尽量不让别人知道"],
      optionScores: [0.82, 0.86, 0.54, 0.24],
    },
    {
      id: "group-project",
      prompt: "小组任务里发现自己没听懂时，你更可能？",
      options: ["先整理问题，再向大家说明", "当场请同伴解释一下", "先跟着做，之后再想", "尽量不说，怕拖慢大家"],
      optionScores: [0.86, 0.82, 0.5, 0.22],
    },
  ],
  feedback_receptivity: [
    {
      id: "receive-correction",
      prompt: "别人指出你这里可以做得更好时，你更希望对方怎么说？",
      options: ["告诉我具体哪里可以调整", "先肯定我做对的地方，再给建议", "给我一个例子让我自己对照", "先别说太多，我想自己缓一缓"],
      optionScores: [0.9, 0.8, 0.72, 0.42],
    },
    {
      id: "feedback-after-try",
      prompt: "完成一件事后收到建议，你更可能？",
      options: ["马上看看下一次怎样试", "先问清楚建议的原因", "过一会儿再回来看", "不太想继续讨论这件事"],
      optionScores: [0.9, 0.82, 0.58, 0.25],
    },
  ],
};

const LEARNING_OPTION_SCORES = {
  learning_personality_1: [0.92, 0.7, 0.42, 0.22],
  learning_personality_2: [0.9, 0.76, 0.5, 0.28],
  learning_personality_3: [0.56, 0.72, 0.86, 0.7],
  learning_personality_4: [0.62, 0.68, 0.78, 0.66],
  learning_personality_5: [0.3, 0.72, 0.9, 0.76],
  learning_personality_6: [0.76, 0.92, 0.58, 0.3],
};

// Each learning-style slot has equivalent scenarios. The chosen scenario is
// deterministic per student so an interrupted server-owned run stays stable.
const LEARNING_TEMPLATE_LIBRARY = {
  learning_personality_1: [
    {
      id: "hint-choice-first-step",
      prompt: "一道题卡住了，你希望系统先怎么帮你？",
      options: ["让我自己再试一下", "给我一个很轻的提示", "一步一步带我做", "先看完整解析"],
    },
    {
      id: "hint-choice-unclear-start",
      prompt: "看完题后还不知道第一步，你更愿意选择？",
      options: ["先自己把题目再读一遍", "看到一句方向提示后再想", "跟着分步问题慢慢做", "直接看完整做法"],
    },
  ],
  learning_personality_2: [
    {
      id: "error-response-repeat-mistake",
      prompt: "连续错了两次，你下一步更想怎么做？",
      options: ["原题再做一次", "看看之前类似题", "做简单一点的", "先跳过，等会儿再说"],
    },
    {
      id: "error-response-result-different",
      prompt: "发现自己的答案和正确结果不一样时，你更可能？",
      options: ["回到原题找哪里错了", "看一题相似的例子", "先练一道更简单的", "先放一会儿再说"],
    },
  ],
  learning_personality_3: [
    {
      id: "challenge-variant-after-correct",
      prompt: "刚做对一类题，系统让你选下一步，你会选？",
      options: ["再稳几道", "换一个数字", "换两个数字", "来一道更难的"],
    },
    {
      id: "challenge-method-familiar",
      prompt: "一种解题方法已经会用了，你更愿意怎样继续？",
      options: ["用同样方法再练几道", "只换一个条件试试", "换两个条件再试", "试一题步骤更多的"],
    },
  ],
  learning_personality_4: [
    {
      id: "expression-preference-help-format",
      prompt: "你更容易看懂哪种帮助？",
      options: ["一句话提示", "图示关系", "分步骤", "类似例题"],
    },
    {
      id: "expression-preference-long-question",
      prompt: "题目看起来有点长时，哪种提示更能帮到你？",
      options: ["先告诉我最关键的一句", "把条件画成关系图", "把它拆成几个小问题", "给一个相近的小例子"],
    },
  ],
  learning_personality_5: [
    {
      id: "review-preference-after-practice",
      prompt: "今天练完后，你更愿意看什么？",
      options: ["只看结果", "看错题", "看知识图鉴", "看自己进步图"],
    },
    {
      id: "review-preference-before-leaving",
      prompt: "准备结束今天的练习时，你最想先回看什么？",
      options: ["知道今天完成了多少", "看看哪道题没做对", "看看这类题的知识点", "看看学习地图亮了哪里"],
    },
  ],
  learning_personality_6: [
    {
      id: "error-response-familiar-but-wrong",
      prompt: "一道题你觉得自己会，但又错了，你更可能怎么做？",
      options: ["马上重做", "找哪里看错", "要一个提示", "换一题先做"],
    },
    {
      id: "error-response-confident-slip",
      prompt: "本来很有把握的一题做错了，你更愿意下一步？",
      options: ["再算一遍看看", "一步一步找出哪里偏了", "先看一句提示", "换一道题后再回来"],
    },
  ],
};

function stableIndex(seed, length) {
  let hash = 0;
  for (const character of String(seed)) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return length ? hash % length : 0;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function responseFor(responses, step, questionId) {
  return responses.find((response) => response.step === step && response.questionId === questionId);
}

function scoreLabel(layer, dimensionId, score) {
  if (score === null) return "等待回答";
  const labels = {
    exploration_curiosity: score >= 0.72 ? "愿意探索" : score >= 0.5 ? "稳步尝试" : "先熟悉再探索",
    self_management: score >= 0.72 ? "能主动安排" : score >= 0.5 ? "需要清晰起点" : "适合小步启动",
    frustration_recovery: score >= 0.72 ? "恢复较快" : score >= 0.5 ? "需要短暂停顿" : "需要温和复原",
    interaction_help_seeking: score >= 0.72 ? "愿意表达问题" : score >= 0.5 ? "先独立再求助" : "适合私人化提示",
    feedback_receptivity: score >= 0.72 ? "能接住具体建议" : score >= 0.5 ? "适合短反馈" : "先肯定再建议",
    hint_dependency: score >= 0.72 ? "愿意先独立尝试" : score >= 0.5 ? "轻提示更合适" : "分步支持更合适",
    challenge_tolerance: score >= 0.72 ? "愿意尝试变化" : score >= 0.5 ? "小步变式更合适" : "先稳住基础",
    expression_preference: score >= 0.72 ? "偏好结构化帮助" : "有自己的理解入口",
    error_response: score >= 0.72 ? "愿意回看错误" : score >= 0.5 ? "需要轻引导" : "先降低压力",
    self_review_tendency: score >= 0.72 ? "愿意主动复盘" : score >= 0.5 ? "适合轻复盘" : "从一个小回看开始",
  };
  return labels[dimensionId] || (layer === "psychological" ? "正在形成" : "正在了解");
}

function dimensionMetaFromLibrary(library, key) {
  const dimensions = [...(library?.dimensions || []), ...(library?.productDimensions || [])].filter(
    (dimension) => dimension && typeof dimension === "object",
  );
  return dimensions.find((dimension) => dimension.id === key) || { id: key, name: key };
}

function learningTemplateFor({ item, studentId, index }) {
  const templates = LEARNING_TEMPLATE_LIBRARY[item.id] || [];
  const candidate = templates[stableIndex(`${studentId}-${item.id}-${item.dimension}-${index}`, templates.length)] || null;
  if (candidate?.prompt && Array.isArray(candidate.options) && candidate.options.length === 4) return candidate;
  return {
    id: item.id,
    prompt: item.prompt,
    options: item.options,
  };
}

export function generatePersonalityQuestionSets({ studentId = "student", psychologicalLibrary, learningLibrary } = {}) {
  const psychologicalDimensions = (psychologicalLibrary?.dimensions || []).map((dimension) => dimension.id);
  const psychologicalOrder = [...psychologicalDimensions, "feedback_receptivity"];
  const psychologicalQuestions = psychologicalOrder.map((dimensionId, index) => {
    const templates = PSYCHOLOGICAL_TEMPLATE_LIBRARY[dimensionId] || [];
    const template = templates[stableIndex(`${studentId}-${dimensionId}-${index}`, templates.length)] || templates[0];
    const dimension = dimensionMetaFromLibrary(psychologicalLibrary, dimensionId);
    return {
      id: `psychological_personality-${index + 1}`,
      layer: "psychological",
      dimensionId,
      dimension: dimension.name,
      anchor: dimension.mapsTo?.join(" / ") || "学习支持框架",
      prompt: template.prompt,
      options: template.options,
      optionScores: template.optionScores,
      metadata: { templateId: template.id, logicLibraryId: psychologicalLibrary?.id || "psychological-personality-logic" },
    };
  });

  const learningQuestions = (learningLibrary?.onboardingItems || []).slice(0, 6).map((item, index) => {
    const dimension = dimensionMetaFromLibrary(learningLibrary, item.dimension);
    const template = learningTemplateFor({ item, studentId, index });
    return {
      id: `learning_personality-${index + 1}`,
      sourceItemId: item.id,
      layer: "learning",
      dimensionId: item.dimension,
      dimension: dimension.name,
      prompt: template.prompt,
      options: template.options,
      optionScores: LEARNING_OPTION_SCORES[item.id] || [0.5, 0.5, 0.5, 0.5],
      metadata: {
        templateId: template.id,
        sourceItemId: item.id,
        logicLibraryId: learningLibrary?.id || "learning-personality-logic-v1",
        sceneType: item.sceneType,
      },
    };
  });

  return {
    psychologicalQuestions,
    learningQuestions,
    combinedItemCap: psychologicalLibrary?.itemPolicy?.combinedWithLearningTendencyMaxItems || 12,
  };
}

function scoreLayer({ questions, responses, step, dimensions, library, layer }) {
  return dimensions.map((dimensionId) => {
    const relatedQuestions = questions.filter((question) => question.dimensionId === dimensionId);
    const answeredScores = relatedQuestions.flatMap((question) => {
      const answer = Number(responseFor(responses, step, question.id)?.answer);
      return Number.isInteger(answer) && answer >= 0 && answer < question.optionScores.length ? [question.optionScores[answer]] : [];
    });
    const score = average(answeredScores);
    const dimension = dimensionMetaFromLibrary(library, dimensionId);
    return {
      id: dimensionId,
      name: dimension.name,
      score: score === null ? null : Number(score.toFixed(2)),
      confidence: relatedQuestions.length ? Number((answeredScores.length / relatedQuestions.length).toFixed(2)) : 0,
      label: scoreLabel(layer, dimensionId, score),
      systemActions: dimension.systemActions || [],
    };
  });
}

export function scorePersonalityQuestionSets({ questionSets, responses = [], psychologicalLibrary, learningLibrary } = {}) {
  const psychologicalQuestions = questionSets?.psychologicalQuestions || [];
  const learningQuestions = questionSets?.learningQuestions || [];
  const psychologicalDimensions = scoreLayer({
    questions: psychologicalQuestions,
    responses,
    step: "psychological_personality",
    dimensions: [...new Set(psychologicalQuestions.map((question) => question.dimensionId))],
    library: psychologicalLibrary,
    layer: "psychological",
  });
  const learningDimensions = scoreLayer({
    questions: learningQuestions,
    responses,
    step: "learning_personality",
    dimensions: [...new Set(learningQuestions.map((question) => question.dimensionId))],
    library: learningLibrary,
    layer: "learning",
  });
  const answeredPsychological = psychologicalQuestions.filter((question) => responseFor(responses, "psychological_personality", question.id)).length;
  const answeredLearning = learningQuestions.filter((question) => responseFor(responses, "learning_personality", question.id)).length;
  const completedCount = answeredPsychological + answeredLearning;
  const totalCount = psychologicalQuestions.length + learningQuestions.length;
  const dimensionById = new Map([...psychologicalDimensions, ...learningDimensions].map((dimension) => [dimension.id, dimension]));
  const curiosity = dimensionById.get("exploration_curiosity")?.score || 0;
  const selfManagement = dimensionById.get("self_management")?.score || 0;
  const independentTry = dimensionById.get("hint_dependency")?.score || 0;
  const studentType =
    curiosity >= 0.72
      ? { id: "explorer", name: "探索型", cue: "先试，再找规律", recommendation: "轻提示 + 变式", steps: ["试", "想", "变"] }
      : selfManagement >= 0.7 || independentTry >= 0.72
        ? { id: "steady", name: "稳步型", cue: "先稳，再升级", recommendation: "短任务 + 连续对", steps: ["稳", "对", "升"] }
        : { id: "structured", name: "结构型", cue: "先拆，再推进", recommendation: "分段 + 条件图", steps: ["拆", "连", "进"] };
  const hintPreference = dimensionById.get("hint_dependency")?.score;
  const supportMode =
    hintPreference === null || hintPreference === undefined
      ? { id: "try_then_light_hint", label: "先尝试，再给轻提示", hintDepthTarget: 1.5 }
      : hintPreference >= 0.72
        ? { id: "independent_retry", label: "先独立重试，再给轻提示", hintDepthTarget: 1 }
        : hintPreference >= 0.5
          ? { id: "try_then_light_hint", label: "先尝试，再给轻提示", hintDepthTarget: 1.5 }
          : { id: "guided_when_needed", label: "必要时进入分步引导", hintDepthTarget: 2.2 };
  const initialActionPolicy = createInitialPersonalitySupportActionPolicy({
    psychologicalDimensions,
    learningDimensions,
  });

  return {
    complete: totalCount > 0 && completedCount === totalCount,
    psychologicalComplete: psychologicalQuestions.length > 0 && answeredPsychological === psychologicalQuestions.length,
    learningComplete: learningQuestions.length > 0 && answeredLearning === learningQuestions.length,
    completedCount,
    totalCount,
    psychologicalDimensions,
    learningDimensions,
    studentType,
    supportProfile: {
      id: "onboarding-personality-support-profile",
      source: "psychological_and_learning_personality_logic",
      responseCount: completedCount,
      supportMode,
      taskChunking: initialActionPolicy.taskChunking,
      feedbackStyle: initialActionPolicy.feedbackStyle,
      challengePacing: initialActionPolicy.challengePacing,
      guidedStructurePreferred: initialActionPolicy.guidedStructurePreferred,
      helpEntryStyle: initialActionPolicy.helpEntryStyle,
      reviewPromptStyle: initialActionPolicy.reviewPromptStyle,
      initialActionPolicy,
      confidence: Number(Math.min(0.72, 0.18 + completedCount * 0.045).toFixed(2)),
      guardrail: "This is a starting support preference, not a fixed student label. Later practice behavior can refine it.",
    },
    guardrail:
      "This is an initial learning-support hypothesis, not a personality label. Real practice behavior continues to refine the profile.",
  };
}
