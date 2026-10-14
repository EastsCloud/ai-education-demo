import assert from "node:assert/strict";
import {
  personalityLogicLibrary,
  psychologicalPersonalityLibrary,
} from "../src/data/mock-data.js";
import { generatePersonalityQuestionSets } from "../src/services/personality-assessment-engine.js";

function generate(studentId) {
  return generatePersonalityQuestionSets({
    studentId,
    psychologicalLibrary: psychologicalPersonalityLibrary,
    learningLibrary: personalityLogicLibrary,
  });
}

const first = generate("student-template-a");
const repeated = generate("student-template-a");
const second = generate("student-template-b");
const firstLearningTemplateIds = first.learningQuestions.map((question) => question.metadata?.templateId);
const repeatedLearningTemplateIds = repeated.learningQuestions.map((question) => question.metadata?.templateId);
const secondLearningTemplateIds = second.learningQuestions.map((question) => question.metadata?.templateId);

assert.equal(first.psychologicalQuestions.length, 6);
assert.equal(first.learningQuestions.length, 6);
assert.equal(first.psychologicalQuestions.length + first.learningQuestions.length, 12);
assert.deepEqual(firstLearningTemplateIds, repeatedLearningTemplateIds);
assert.notDeepEqual(firstLearningTemplateIds, secondLearningTemplateIds);
assert.ok(firstLearningTemplateIds.every(Boolean));
assert.ok(first.learningQuestions.every((question) => question.options.length === 4 && question.optionScores.length === 4));
assert.ok(first.learningQuestions.every((question) => question.metadata?.sourceItemId));

console.log("personality-template-logic-contract: passed");
