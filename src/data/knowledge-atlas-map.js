const BASE_MATH_KNOWLEDGE_PUZZLE_MAP = {
  id: "math-learning-strategy-puzzle-v1",
  title: "数学解题方法拼图",
  description: "读题、找关系、验证答案，也会一点一点变熟。",
  completionRate: 0,
  pieces: [
    { id: "read_target", title: "看清问题", status: "completed", progress: 1 },
    { id: "extract_conditions", title: "提取条件", status: "current", progress: 0.62 },
    { id: "quantity_difference", title: "总量差值", status: "current", progress: 0.48 },
    { id: "set_unknown", title: "找未知量", status: "unlocked", progress: 0.28 },
    { id: "build_equation", title: "写出关系", status: "unlocked", progress: 0.24 },
    { id: "check_answer", title: "检查答案", status: "locked", progress: 0 },
    { id: "one_number_variant", title: "换 1 个数", status: "locked", progress: 0 },
    { id: "two_number_variant", title: "换 2 个数", status: "locked", progress: 0 },
    { id: "step_added_variant", title: "多一个整理步骤", status: "locked", progress: 0 },
    { id: "two_steps_added_variant", title: "多两个整理步骤", status: "locked", progress: 0 },
  ],
};

export function createBaseKnowledgePuzzleMap({ studentId = null, subjectId = "math-linear-equations" } = {}) {
  return {
    ...BASE_MATH_KNOWLEDGE_PUZZLE_MAP,
    studentId,
    subjectId,
    pieces: BASE_MATH_KNOWLEDGE_PUZZLE_MAP.pieces.map((piece) => ({ ...piece })),
  };
}
