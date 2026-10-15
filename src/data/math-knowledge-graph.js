import { shanghaiMathItemFamilies } from "./shanghai-math-taxonomy.js?v=math-taxonomy-4";

const GRADE_ORDER = ["G1", "G2", "G3", "G4", "G5", "G6"];

const CONCEPT_TITLES = {
  addition_subtraction: "Addition and subtraction",
  angle_measure: "Angle measure",
  average: "Average",
  bar_chart: "Bar chart",
  circle_area: "Circle area",
  circle_circumference: "Circle circumference",
  comparison: "Comparison",
  coordinate: "Coordinate movement",
  counting: "Counting",
  data_table_chart: "Data tables and charts",
  decimal_place_value: "Decimal place value",
  equal_groups: "Equal groups",
  fraction_operation: "Fraction operations",
  fraction_part_whole: "Fractions as part and whole",
  geometry_reasoning: "Geometry reasoning",
  length_measure: "Length measurement",
  linear_equation_word_problem: "Linear equation word problems",
  more_less: "More and less relationships",
  multi_step_reasoning: "Multi-step reasoning",
  multiply_divide_seed: "Multiplication and division foundations",
  part_whole: "Part and whole",
  percent_change: "Percent change",
  place_value: "Place value",
  position_language: "Position language",
  probability: "Probability",
  quantity_relationship: "Quantity relationships",
  quantity_total_difference: "Total and difference",
  ratio: "Ratio",
  rate_seed: "Rate foundations",
  rectangle_area_seed: "Rectangle area",
  shape_recognition: "Shape recognition",
  square_perimeter: "Square perimeter",
  table_reading: "Table reading",
  triangle_area: "Triangle area",
  time_money_seed: "Time and money",
  unit_conversion_seed: "Unit conversion",
  unit_quantity: "Unit quantity",
  unknown_variable: "Unknown variable",
  volume: "Volume",
  division_remainder: "Division with remainders",
  estimation_rounding: "Estimation and rounding",
  fraction_equivalence: "Equivalent fractions",
  operation_order: "Order of operations",
  scale: "Map scale",
  trapezoid_area: "Trapezoid area",
};

const FAMILY_ATLAS_COPY = {
  compare_more_less: { studentCue: "先看谁多、谁少，再找相差多少。", expression: "较大数 = 较小数 + 相差数" },
  part_whole_add_subtract: { studentCue: "先分清整体和其中的部分。", expression: "整体 = 部分 + 部分" },
  equal_groups_multiply_divide: { studentCue: "看有几组，每一组有多少。", expression: "总数 = 每组数量 × 组数" },
  measurement_conversion: { studentCue: "先把单位变成同一种，再计算。", expression: "同量先统一单位" },
  time_elapsed_simple: { studentCue: "在时间线上找开始、结束和经过。", expression: "经过时间 = 结束时刻 - 开始时刻" },
  money_price_total: { studentCue: "先分清一件多少钱和一共有几件。", expression: "总价 = 单价 × 数量" },
  operation_structure_distributive: { studentCue: "看到相同的组数，可以把它们合起来想。", expression: "a × (b + c) = a × b + a × c" },
  perimeter_area_rectangle: { studentCue: "周长绕一圈，面积铺满里面。", expression: "面积 = 长 × 宽" },
  fraction_part_whole: { studentCue: "先找整体被平均分成几份。", expression: "分数 = 部分 / 整体" },
  decimal_money_measure: { studentCue: "小数点要对齐，单位也要一致。", expression: "同一数位对齐后再计算" },
  multi_step_total_quantity: { studentCue: "不要一次算完，先找到第一步的结果。", expression: "把一个大问题拆成两步关系" },
  average_total_count: { studentCue: "平均数背后一定有总数和个数。", expression: "总数 = 平均数 × 个数" },
  ratio_rate_unit: { studentCue: "先看两个量在比较什么，再看每一份。", expression: "比表示两个量的关系" },
  geometry_angle_reasoning: { studentCue: "先找到完整的角，再看还缺多少。", expression: "平角 = 180°" },
  volume_rectangular_prism: { studentCue: "想象把小方块一层一层铺满。", expression: "体积 = 长 × 宽 × 高" },
  distance_speed_time: { studentCue: "先分清走多快、走多久和走多远。", expression: "路程 = 速度 × 时间" },
  probability_event_decimal: { studentCue: "先数所有可能，再数想要的情况。", expression: "可能性 = 有利情况 / 所有情况" },
  coordinate_movement: { studentCue: "先横着走，再竖着走。", expression: "位置用 (横坐标, 纵坐标) 表示" },
  percent_change: { studentCue: "先找到整体，再看其中占了多少。", expression: "百分比 = 部分 / 整体 × 100%" },
  linear_equation_word_problem: { studentCue: "不要急着算，先找谁和谁相等。", expression: "设未知数，根据等量关系列方程" },
  data_table_chart: { studentCue: "先读标题、单位和每一列表示什么。", expression: "数据要放回图表的单位里理解" },
  number_composition_place_value: { studentCue: "把十和一分开看，再合成完整的数。", expression: "数 = 十位上的数 × 10 + 个位上的数" },
  unknown_part_add_subtract: { studentCue: "已知整体和一部分时，另一部分可以倒着找。", expression: "未知部分 = 整体 - 已知部分" },
  fraction_add_same_denominator: { studentCue: "同样大小的份可以直接合起来。", expression: "a/n + b/n = (a + b)/n" },
  decimal_multiply_unit_price: { studentCue: "先把单价和数量配对，再算总价。", expression: "总价 = 单价 × 数量" },
  ratio_total_split: { studentCue: "先把总份数找出来，再求每一份。", expression: "每一份 = 总量 / 总份数" },
  circle_area_application: { studentCue: "先找到半径，再看有几个同样的圆。", expression: "圆面积 = π × 半径²" },
  square_perimeter_intro: { studentCue: "正方形四条边一样长，围一圈就是把四条边加起来。", expression: "周长 = 边长 × 4" },
  division_remainder_grouping: { studentCue: "有余下的数量时，别忘了它还要占一组。", expression: "至少组数 = 向上取整(总数 / 每组最多数)" },
  fraction_subtract_same_denominator: { studentCue: "同分母表示每一份一样大，先看相差几份。", expression: "a/n - b/n = (a - b)/n" },
  decimal_divide_equal_share: { studentCue: "平均分时，用总量除以份数。", expression: "每一份 = 总量 ÷ 份数" },
  data_range_comparison: { studentCue: "先找到最大值和最小值，再看它们相差多少。", expression: "极差 = 最大值 - 最小值" },
  triangle_area_application: { studentCue: "三角形面积是同底同高长方形面积的一半。", expression: "面积 = 底 × 高 ÷ 2" },
  addition_subtraction_regrouping: { studentCue: "十位和个位要分别看，进位或退位时别漏掉一组十。", expression: "按位计算，必要时进位或退位" },
  multiplication_division_inverse: { studentCue: "乘法和除法是一组相反的关系，先看题目要找总数还是每份。", expression: "总数 = 每份 × 份数" },
  integer_operation_order: { studentCue: "题目里有成组的量，先算成组的部分，再和剩下的量合起来。", expression: "先乘除，后加减" },
  fraction_equivalent_compare: { studentCue: "比较不同分母的分数时，先把每一份变成一样大。", expression: "先通分，再比较分子" },
  decimal_rounding_estimation: { studentCue: "要保留到哪一位，就看它后一位决定进还是舍。", expression: "四舍五入到指定数位" },
  circle_circumference_application: { studentCue: "围着圆走一圈是周长，公式里用半径。", expression: "周长 = 2 × π × 半径" },
  trapezoid_area_application: { studentCue: "把两条底先合起来，再乘高，最后除以 2。", expression: "面积 = (上底 + 下底) × 高 ÷ 2" },
  proportion_scale_application: { studentCue: "先看图上 1 厘米代表多远，再按图上长度放大。", expression: "实际距离 = 图上距离 × 比例尺" },
};

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function sortGrades(grades) {
  return unique(grades).sort((left, right) => GRADE_ORDER.indexOf(left) - GRADE_ORDER.indexOf(right));
}

function familyNodeId(familyId) {
  return `family:${familyId}`;
}

function conceptNodeId(conceptId) {
  return `concept:${conceptId}`;
}

function conceptTitle(conceptId) {
  return CONCEPT_TITLES[conceptId] || String(conceptId || "knowledge_concept").replaceAll("_", " ");
}

function familyAtlasCopy(family) {
  return (
    FAMILY_ATLAS_COPY[family.id] || {
      studentCue: "先读清题目要解决什么，再找数量或图形之间的关系。",
      expression: family.name,
    }
  );
}

function nodeReferenceId(referenceId, familyIds) {
  return familyIds.has(referenceId) ? familyNodeId(referenceId) : conceptNodeId(referenceId);
}

export function buildMathKnowledgeGraph({ families = shanghaiMathItemFamilies } = {}) {
  const familyIds = new Set(families.map((family) => family.id));
  const conceptSources = new Map();
  const familyBindings = {};
  const familyNodes = families.map((family) => {
    const conceptIds = unique(family.atlasNodeIds);
    const prerequisiteNodeIds = unique((family.prerequisiteIds || []).map((id) => nodeReferenceId(id, familyIds)));
    conceptIds.forEach((conceptId) => {
      const current = conceptSources.get(conceptId) || { gradeBands: [], questionFamilyIds: [] };
      conceptSources.set(conceptId, {
        gradeBands: [...current.gradeBands, ...(family.gradeBands || [])],
        questionFamilyIds: [...current.questionFamilyIds, family.id],
      });
    });
    (family.prerequisiteIds || [])
      .filter((id) => !familyIds.has(id))
      .forEach((conceptId) => {
        if (!conceptSources.has(conceptId)) conceptSources.set(conceptId, { gradeBands: [], questionFamilyIds: [] });
      });
    familyBindings[family.id] = {
      familyNodeId: familyNodeId(family.id),
      conceptIds,
      conceptNodeIds: conceptIds.map(conceptNodeId),
      prerequisiteNodeIds,
    };
    return {
      id: familyNodeId(family.id),
      kind: "question_family",
      title: family.name,
      domain: family.domain,
      gradeBands: sortGrades(family.gradeBands),
      atlas: familyAtlasCopy(family),
      questionFamilyIds: [family.id],
      conceptNodeIds: conceptIds.map(conceptNodeId),
      prerequisiteNodeIds,
      nextNodeIds: [],
    };
  });

  const conceptNodes = [...conceptSources.entries()].map(([conceptId, source]) => ({
    id: conceptNodeId(conceptId),
    kind: "knowledge_concept",
    title: conceptTitle(conceptId),
    domain: null,
    gradeBands: sortGrades(source.gradeBands),
    questionFamilyIds: unique(source.questionFamilyIds),
    conceptNodeIds: [],
    prerequisiteNodeIds: [],
    nextNodeIds: [],
  }));

  const nodes = [...familyNodes, ...conceptNodes];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = [];
  familyNodes.forEach((familyNode) => {
    familyNode.prerequisiteNodeIds.forEach((prerequisiteNodeId) => {
      if (!nodeById.has(prerequisiteNodeId)) return;
      edges.push({ from: prerequisiteNodeId, to: familyNode.id, relation: "prerequisite_for" });
      const prerequisite = nodeById.get(prerequisiteNodeId);
      prerequisite.nextNodeIds = unique([...prerequisite.nextNodeIds, familyNode.id]);
    });
    familyNode.conceptNodeIds.forEach((conceptId) => {
      if (nodeById.has(conceptId)) edges.push({ from: familyNode.id, to: conceptId, relation: "assesses_concept" });
    });
  });

  return {
    id: "cn-shanghai-primary-math-knowledge-graph-v1",
    subjectId: "math",
    gradeBands: [...GRADE_ORDER],
    nodes,
    edges,
    familyBindings,
  };
}

export const mathKnowledgeGraph = buildMathKnowledgeGraph();

export function getMathQuestionFamilyGraphBinding(familyId, graph = mathKnowledgeGraph) {
  const binding = graph?.familyBindings?.[familyId];
  return binding
    ? {
        familyNodeId: binding.familyNodeId,
        conceptIds: [...binding.conceptIds],
        conceptNodeIds: [...binding.conceptNodeIds],
        prerequisiteNodeIds: [...binding.prerequisiteNodeIds],
      }
    : null;
}

export function validateMathKnowledgeGraph(graph = mathKnowledgeGraph) {
  const errors = [];
  const nodeIds = new Set();
  (graph?.nodes || []).forEach((node) => {
    if (!node?.id || nodeIds.has(node.id)) errors.push(`duplicate_or_missing_node:${node?.id || "unknown"}`);
    nodeIds.add(node.id);
  });
  Object.entries(graph?.familyBindings || {}).forEach(([familyId, binding]) => {
    if (!nodeIds.has(binding.familyNodeId)) errors.push(`missing_family_node:${familyId}`);
    if (!binding.conceptNodeIds?.length) errors.push(`missing_concept_binding:${familyId}`);
    binding.conceptNodeIds.forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) errors.push(`missing_concept_node:${familyId}:${nodeId}`);
    });
    binding.prerequisiteNodeIds.forEach((nodeId) => {
      if (!nodeIds.has(nodeId)) errors.push(`missing_prerequisite_node:${familyId}:${nodeId}`);
    });
  });
  (graph?.edges || []).forEach((edge) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push(`edge_references_missing_node:${edge.from}:${edge.to}`);
  });
  return {
    valid: errors.length === 0,
    errors,
    familyCount: Object.keys(graph?.familyBindings || {}).length,
    conceptCount: (graph?.nodes || []).filter((node) => node.kind === "knowledge_concept").length,
    edgeCount: (graph?.edges || []).length,
  };
}
