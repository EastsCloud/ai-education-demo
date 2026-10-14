export const MATH_ATLAS_GRADE_ORDER = Object.freeze(["G1", "G2", "G3", "G4", "G5", "G6"]);

const DOMAIN_ORDER = Object.freeze([
  "number_and_operation",
  "quantity_relationship",
  "measurement_and_units",
  "geometry_and_space",
  "fraction_decimal_percent",
  "statistics_and_probability",
  "equation_and_algebra_seed",
  "comprehensive_application",
]);

const DOMAIN_POSITION = new Map(DOMAIN_ORDER.map((domain, index) => [domain, index]));

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function rounded(value) {
  return Number(value.toFixed(2));
}

function gradeIndex(grade) {
  const index = MATH_ATLAS_GRADE_ORDER.indexOf(grade);
  return index === -1 ? MATH_ATLAS_GRADE_ORDER.length - 1 : index;
}

function firstGrade(gradeBands = []) {
  return [...new Set(gradeBands || [])]
    .filter((grade) => MATH_ATLAS_GRADE_ORDER.includes(grade))
    .sort((left, right) => gradeIndex(left) - gradeIndex(right))[0] || MATH_ATLAS_GRADE_ORDER.at(-1);
}

function compareNodes(left, right) {
  const domainDifference = (DOMAIN_POSITION.get(left.domain) ?? DOMAIN_ORDER.length) - (DOMAIN_POSITION.get(right.domain) ?? DOMAIN_ORDER.length);
  if (domainDifference) return domainDifference;
  const familyDifference = String(left.questionFamilyIds?.[0] || left.id || "").localeCompare(
    String(right.questionFamilyIds?.[0] || right.id || ""),
    "en",
  );
  if (familyDifference) return familyDifference;
  return String(left.title || "").localeCompare(String(right.title || ""), "zh-CN");
}

function familyNodeList(nodes = []) {
  const seen = new Set();
  return (nodes || []).filter((node) => {
    if (!node?.id || seen.has(node.id)) return false;
    if (node.kind && node.kind !== "question_family") return false;
    seen.add(node.id);
    return true;
  });
}

export function knowledgeAtlasLightState(node) {
  const state = node?.evidence?.lightState;
  if (["bright", "partial", "dim", "dark"].includes(state)) return state;
  if (node?.status === "completed") return "bright";
  if (node?.status === "current") return "partial";
  if (node?.attempts) return "dim";
  return "dark";
}

export function projectMathKnowledgeAtlas(nodes = [], { currentFamilyId = null } = {}) {
  const grouped = new Map(MATH_ATLAS_GRADE_ORDER.map((grade) => [grade, []]));
  familyNodeList(nodes).forEach((node) => {
    const anchorGrade = firstGrade(node.gradeBands);
    grouped.get(anchorGrade).push({ ...node, anchorGrade });
  });

  return MATH_ATLAS_GRADE_ORDER.flatMap((anchorGrade, gradeRowIndex) => {
    const row = grouped.get(anchorGrade).sort(compareNodes);
    const count = row.length;
    return row.map((node, index) => {
      const horizontalSpace = 78;
      const x = count === 1 ? 56 : 17 + (index / (count - 1)) * horizontalSpace;
      const y = 9 + gradeRowIndex * 16.4;
      return {
        ...node,
        lightState: knowledgeAtlasLightState(node),
        isCurrentFocus: Boolean(currentFamilyId && node.questionFamilyIds?.includes(currentFamilyId)),
        atlasPosition: {
          x: rounded(clamp(x, 12, 95)),
          y: rounded(clamp(y, 7, 94)),
          anchorGrade,
          gradeRowIndex,
          rowIndex: index,
          rowSize: count,
        },
      };
    });
  });
}

export function summarizeMathKnowledgeAtlas(nodes = [], options = {}) {
  const projectedNodes = projectMathKnowledgeAtlas(nodes, options);
  const counts = projectedNodes.reduce(
    (summary, node) => {
      summary[node.lightState] += 1;
      return summary;
    },
    { bright: 0, partial: 0, dim: 0, dark: 0 },
  );
  const weightedCoverage = counts.bright + counts.partial * 0.58 + counts.dim * 0.22;
  return {
    total: projectedNodes.length,
    ...counts,
    completionRate: projectedNodes.length ? Number((weightedCoverage / projectedNodes.length).toFixed(2)) : 0,
  };
}
