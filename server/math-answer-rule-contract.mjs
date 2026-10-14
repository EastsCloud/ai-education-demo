import assert from "node:assert/strict";
import { answerMatchesMathRule, evaluateMathAnswerRule } from "../src/services/math-answer-rule-evaluator.js";
import { shanghaiMathItemFamilies } from "../src/data/shanghai-math-taxonomy.js";
import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "../src/services/math-item-generator.js";

const arithmetic = evaluateMathAnswerRule("(24 + 18) / 3 * 2");
assert.equal(arithmetic.valid, true);
assert.equal(arithmetic.value, 28);

const percent = evaluateMathAnswerRule("320 * 85%");
assert.equal(percent.valid, true);
assert.equal(percent.value, 272);

const ceiling = evaluateMathAnswerRule("ceil(23 / 5)");
assert.equal(ceiling.valid, true);
assert.equal(ceiling.value, 5);

const rounded = evaluateMathAnswerRule("round(3.14159, 1 decimal place)");
assert.equal(rounded.valid, true);
assert.equal(rounded.value, 3.1);
assert.equal(evaluateMathAnswerRule("round(2.15, 1 decimal place)").value, 2.2);

const equation = evaluateMathAnswerRule("x + 9 + 3x = 45");
assert.equal(equation.valid, true);
assert.equal(equation.type, "linear_equation");
assert.equal(equation.value, 9);

assert.equal(answerMatchesMathRule({ answer: 272, answerRule: "320 * 85%" }).matches, true);
assert.equal(answerMatchesMathRule({ answer: 273, answerRule: "320 * 85%" }).matches, false);
assert.equal(evaluateMathAnswerRule("process.exit(1)").valid, false);
assert.equal(evaluateMathAnswerRule("1 / 0").valid, false);

const family = shanghaiMathItemFamilies.find((item) => item.id === "part_whole_add_subtract");
const generated = generateMathQuestionCandidate({ family, instructionalGrade: "G1", seed: 7, variantLevel: "original" });
assert.equal(validateMathQuestionCandidate(generated).qualityStatus, "system_validated");
assert.equal(validateMathQuestionCandidate({ ...generated, answer: generated.answer + 1 }).qualityStatus, "needs_review");

console.log("math-answer-rule-contract: passed");
