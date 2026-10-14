import assert from "node:assert/strict";
import { mathKnowledgeGraph } from "../src/data/math-knowledge-graph.js";
import {
  MATH_ATLAS_GRADE_ORDER,
  projectMathKnowledgeAtlas,
  summarizeMathKnowledgeAtlas,
} from "../src/services/math-atlas-projection.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";

const familyNodes = mathKnowledgeGraph.nodes.filter((node) => node.kind === "question_family");
const projected = projectMathKnowledgeAtlas(familyNodes);

assert.equal(projected.length, shanghaiMathItemFamilies.length);
assert.equal(new Set(projected.map((node) => node.id)).size, shanghaiMathItemFamilies.length);
assert.equal(new Set(projected.map((node) => `${node.atlasPosition.x}:${node.atlasPosition.y}`)).size, shanghaiMathItemFamilies.length);

projected.forEach((node) => {
  assert.ok(MATH_ATLAS_GRADE_ORDER.includes(node.atlasPosition.anchorGrade));
  assert.ok(node.gradeBands.includes(node.atlasPosition.anchorGrade));
  assert.ok(node.atlasPosition.x >= 12 && node.atlasPosition.x <= 95);
  assert.ok(node.atlasPosition.y >= 7 && node.atlasPosition.y <= 94);
  assert.equal(node.lightState, "dark");
});

const evidenceNodes = familyNodes.map((node, index) => ({
  ...node,
  evidence: {
    ...(node.evidence || {}),
    lightState: index === 0 ? "bright" : index === 1 ? "partial" : index === 2 ? "dim" : "dark",
  },
}));
const summary = summarizeMathKnowledgeAtlas(evidenceNodes);
assert.deepEqual(
  { bright: summary.bright, partial: summary.partial, dim: summary.dim, dark: summary.dark },
  { bright: 1, partial: 1, dim: 1, dark: shanghaiMathItemFamilies.length - 3 },
);
assert.ok(summary.completionRate > 0 && summary.completionRate < 1);

const focusedFamilyId = familyNodes[4].questionFamilyIds[0];
const focused = projectMathKnowledgeAtlas(familyNodes, { currentFamilyId: focusedFamilyId });
assert.equal(focused.filter((node) => node.isCurrentFocus).length, 1);
assert.equal(focused.find((node) => node.isCurrentFocus)?.questionFamilyIds[0], focusedFamilyId);

const fallback = projectMathKnowledgeAtlas([
  {
    id: "fallback-piece",
    title: "Fallback piece",
    gradeBands: [],
    evidence: { attempts: 1, lightState: "partial" },
  },
]);
assert.equal(fallback.length, 1);
assert.equal(fallback[0].atlasPosition.anchorGrade, "G6");
assert.equal(fallback[0].lightState, "partial");

console.log(`math-atlas-projection-contract: passed (${projected.length} family nodes)`);
