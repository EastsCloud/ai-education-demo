import { shanghaiMathItemFamilies } from "../data/shanghai-math-taxonomy.js";

// Strategy content is authored from the same bounded solution steps as the
// answer rule. It gives students meaningful ways in without exposing an answer.
export const MATH_SOLUTION_STRATEGY_VERSION = "math_solution_strategy_templates_v1";

const VISUAL_STRATEGIES_BY_DOMAIN = Object.freeze({
  number_and_operation: {
    id: "bar_or_group_model",
    name: "线段图 / 分组图",
    bestFor: "适合把数量的多少、部分和分组关系画清楚。",
    opening: "画出每一部分或每一组，用同样的长度和单位标清数量。",
  },
  quantity_relationship: {
    id: "quantity_relation_table",
    name: "数量关系表",
    bestFor: "适合把已知量、未知量和单位逐行排清楚。",
    opening: "列出“已知什么、要求什么、它们怎样相连”的小表。",
  },
  equation_and_algebra_seed: {
    id: "balance_or_relation_map",
    name: "等量关系图",
    bestFor: "适合先看清左右两边怎样保持相等。",
    opening: "把相等的两边或对应的量画成关系图，再标出未知量。",
  },
  fraction_decimal_percent: {
    id: "part_whole_strip",
    name: "分数条 / 位值表",
    bestFor: "适合把整体、等份和小数位看得更直观。",
    opening: "画出整体的等分格或列出位值表，把每个条件放到对应位置。",
  },
  measurement_and_units: {
    id: "unit_conversion_table",
    name: "单位换算表",
    bestFor: "适合先统一单位，再决定怎样计算。",
    opening: "列出数量和单位，先把能够比较或相加的量换成同一种单位。",
  },
  geometry_and_space: {
    id: "labeled_diagram",
    name: "标注图形法",
    bestFor: "适合把边、角、面积或空间关系标清楚。",
    opening: "画出简图，把已知边、角或面积标在对应的位置。",
  },
  statistics_and_probability: {
    id: "data_table_or_chart",
    name: "数据表 / 图表法",
    bestFor: "适合先读清数据的对象、单位和比较关系。",
    opening: "把题目里的数据整理成小表或在图上圈出要比较的量。",
  },
  comprehensive_application: {
    id: "problem_flow_table",
    name: "问题流程表",
    bestFor: "适合把连续发生的条件按先后顺序整理。",
    opening: "按发生顺序列出每一步的数量变化，再标出最后要找的量。",
  },
});

export const MATH_SOLUTION_STRATEGY_IDS = Object.freeze([
  "relation_model",
  ...Object.values(VISUAL_STRATEGIES_BY_DOMAIN).map((strategy) => strategy.id),
  "logical_trial_check",
  "reverse_check",
]);

export const MATH_SOLUTION_STRATEGY_LABELS = Object.freeze({
  relation_model: "关系式法",
  ...Object.fromEntries(Object.values(VISUAL_STRATEGIES_BY_DOMAIN).map((strategy) => [strategy.id, strategy.name])),
  logical_trial_check: "有逻辑的试猜",
  reverse_check: "逆向检查法",
});

const KNOWN_MATH_SOLUTION_STRATEGY_IDS = new Set(MATH_SOLUTION_STRATEGY_IDS);

export function isKnownMathSolutionStrategyId(value) {
  return KNOWN_MATH_SOLUTION_STRATEGY_IDS.has(String(value || "").trim());
}

export function mathSolutionStrategyLabel(value) {
  return MATH_SOLUTION_STRATEGY_LABELS[String(value || "").trim()] || null;
}

function cleanStep(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function coreSteps(generated) {
  const steps = Array.isArray(generated?.steps) ? generated.steps : [];
  return {
    read: cleanStep(steps[0], "读清题目中的已知量和问题。"),
    relationship: cleanStep(steps[1], "先找出数量、等量或对应关系。"),
    calculation: cleanStep(steps[Math.max(2, steps.length - 2)], "根据关系一步一步计算。"),
    check: cleanStep(steps.at(-1), "把结果代回题目检查单位和关系。"),
  };
}

function visualStrategy({ family, steps }) {
  const template = VISUAL_STRATEGIES_BY_DOMAIN[family.domain] || VISUAL_STRATEGIES_BY_DOMAIN.quantity_relationship;
  return {
    id: template.id,
    name: template.name,
    bestFor: template.bestFor,
    steps: [template.opening, steps.relationship, `${steps.calculation}，再对照图或表检查。`],
  };
}

function verificationStrategy({ family, steps }) {
  const trialFriendlyDomains = new Set(["number_and_operation", "quantity_relationship", "comprehensive_application"]);
  if (trialFriendlyDomains.has(family.domain)) {
    return {
      id: "logical_trial_check",
      name: "有逻辑的试猜",
      bestFor: "适合暂时不熟悉列式，但愿意一步步验证关系。",
      steps: ["先提出一个符合题意的可能结果。", steps.relationship, "把结果逐条代回所有条件；不符合就根据差异调整。"],
    };
  }
  return {
    id: "reverse_check",
    name: "逆向检查法",
    bestFor: "适合算出结果后，从答案倒回已知条件确认关系。",
    steps: [steps.calculation, "把得到的结果代回原来的数量、单位或图形关系。", steps.check],
  };
}

export function createMathSolutionStrategies({ family, generated }) {
  if (!family?.id) return [];
  const steps = coreSteps(generated);
  return [
    {
      id: "relation_model",
      name: "关系式法",
      bestFor: "适合先把题意翻译成数学关系，再稳定地计算。",
      steps: [steps.read, steps.relationship, steps.calculation, steps.check],
    },
    visualStrategy({ family, steps }),
    verificationStrategy({ family, steps }),
  ];
}

function matchingStrategies(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateMathSolutionStrategies({ candidate }) {
  const family = shanghaiMathItemFamilies.find((item) => item.id === candidate?.familyId) || null;
  if (!family) return { valid: false, errors: ["solution_strategy_family_missing"] };

  const expectedStrategies = createMathSolutionStrategies({ family, generated: { steps: candidate?.solutionSteps } });
  const strategyIds = expectedStrategies.map((strategy) => strategy.id);
  const candidateStrategies = candidate?.solutionStrategies;
  const solutionTags = candidate?.metadataTags?.itemTags?.solutionTags;
  const errors = [];

  if (!matchingStrategies(candidateStrategies, expectedStrategies)) {
    errors.push("solution_strategies_not_template_bound");
  }
  if (JSON.stringify(solutionTags?.strategyIds || []) !== JSON.stringify(strategyIds)) {
    errors.push("solution_strategy_ids_mismatch");
  }
  if (solutionTags?.strategyTemplateVersion !== MATH_SOLUTION_STRATEGY_VERSION) {
    errors.push("solution_strategy_template_version_mismatch");
  }

  return { valid: errors.length === 0, errors, strategyIds, version: MATH_SOLUTION_STRATEGY_VERSION };
}
