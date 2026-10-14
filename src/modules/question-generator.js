export const quantityDifferenceModel = {
  id: "quantity_total_difference",
  name: "总量与差值关系",
  seedQuestion: "甲数比乙数多 8，两个数一共 38，甲数和乙数分别是多少？",
  coreRelation: ["a + b = total", "a - b = difference"],
  variableBounds: {
    total: "20-160 的正整数",
    difference: "2-50 的正整数，且小于 total",
    legality: "(total - difference) 必须能被 2 整除",
  },
  variantLevels: [
    "L0 原题",
    "L1 换 1 个数字",
    "L2 换 2 个数字",
    "L3 改变多/少表述",
    "L4 改变问法顺序",
    "L5 改变故事场景",
  ],
};

const generatedQuestionSpecs = [
  {
    level: "L0",
    title: "原题",
    total: 38,
    difference: 8,
    context: "甲数比乙数多 8，两个数一共 38",
    ask: "甲数和乙数分别是多少？",
    variation: "保留样题。",
  },
  {
    level: "L1",
    title: "换 1 个数字",
    total: 46,
    difference: 8,
    context: "甲数比乙数多 8，两个数一共 46",
    ask: "甲数和乙数分别是多少？",
    variation: "只换 total，核心关系不变。",
  },
  {
    level: "L2",
    title: "换 2 个数字",
    total: 54,
    difference: 12,
    context: "甲数比乙数多 12，两个数一共 54",
    ask: "甲数和乙数分别是多少？",
    variation: "同时换 total 和 difference。",
  },
  {
    level: "L3",
    title: "改变表述",
    total: 64,
    difference: 14,
    context: "乙数比甲数少 14，两个数一共 64",
    ask: "甲数和乙数分别是多少？",
    variation: "从“多”改成“少”，关系仍是 a - b = difference。",
  },
  {
    level: "L4",
    title: "改变问法顺序",
    total: 72,
    difference: 18,
    context: "两个数一共 72，其中较大的数比较小的数多 18",
    ask: "先求较小的数，再求较大的数。",
    variation: "条件顺序和作答顺序改变，题型不变。",
  },
  {
    level: "L5",
    title: "改变故事场景",
    total: 90,
    difference: 16,
    context: "图书角里故事书和科普书一共 90 本，故事书比科普书多 16 本",
    ask: "故事书和科普书各有多少本？",
    variation: "替换场景，保留总量与差值关系。",
    labels: { bigger: "故事书", smaller: "科普书" },
  },
];

function solveQuantityDifference(spec) {
  const smaller = (spec.total - spec.difference) / 2;
  const bigger = smaller + spec.difference;
  const isIntegerSolution = Number.isInteger(smaller) && Number.isInteger(bigger);
  const isPositiveSolution = smaller > 0 && bigger > 0;
  const relationValid =
    bigger + smaller === spec.total && bigger - smaller === spec.difference && spec.difference < spec.total;

  return {
    bigger,
    smaller,
    isValid: isIntegerSolution && isPositiveSolution && relationValid,
    checks: [
      {
        label: "有唯一解",
        passed: isIntegerSolution && isPositiveSolution,
        detail: `(${spec.total} - ${spec.difference}) / 2 = ${smaller}`,
      },
      {
        label: "差值小于总量",
        passed: spec.difference < spec.total,
        detail: `${spec.difference} < ${spec.total}`,
      },
      {
        label: "关系成立",
        passed: relationValid,
        detail: `${bigger} + ${smaller} = ${spec.total}，${bigger} - ${smaller} = ${spec.difference}`,
      },
    ],
  };
}

function buildGeneratedQuestion(spec) {
  const solution = solveQuantityDifference(spec);
  const labels = spec.labels || { bigger: "甲数", smaller: "乙数" };

  return {
    ...spec,
    id: `generated-${spec.level.toLowerCase()}`,
    prompt: `${spec.context}。${spec.ask}`,
    answer: `${labels.bigger} = ${solution.bigger}，${labels.smaller} = ${solution.smaller}`,
    solution,
    steps: [
      `设${labels.smaller}为 x。`,
      `${labels.bigger}比${labels.smaller}多 ${spec.difference}，所以${labels.bigger}是 x + ${spec.difference}。`,
      `两个数一共 ${spec.total}，列式：x + (x + ${spec.difference}) = ${spec.total}。`,
      `2x + ${spec.difference} = ${spec.total}，所以 2x = ${spec.total - spec.difference}。`,
      `x = ${solution.smaller}，${labels.bigger} = ${solution.bigger}。`,
      `检查：${solution.bigger} + ${solution.smaller} = ${spec.total}，${solution.bigger} - ${solution.smaller} = ${spec.difference}。`,
    ],
    hints: [
      "先找题目问什么：要求两个数分别是多少。",
      `把较小的数设为 x，较大的数就可以写成 x + ${spec.difference}。`,
      `用总量列方程：x + (x + ${spec.difference}) = ${spec.total}。`,
    ],
  };
}

export function getGeneratedQuestions() {
  return generatedQuestionSpecs.map(buildGeneratedQuestion);
}
