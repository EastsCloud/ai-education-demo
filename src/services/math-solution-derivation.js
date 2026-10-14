import { answerMatchesMathRule } from "./math-answer-rule-evaluator.js";
import { createMathAnswerInput } from "./math-answer-input.js?v=math-answer-input-fraction-1";
import { getMathCoreRelation } from "./math-item-model-specification.js?v=math-item-model-v13";

export const MATH_SOLUTION_DERIVATION_VERSION = "math_solution_derivation_v2";

export const MATH_SOLUTION_PHASES = ["read_translate", "relationship", "calculation", "check"];

function numericEqual(left, right) {
  const first = Number(left);
  const second = Number(right);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return false;
  const tolerance = Math.max(1e-9, Math.abs(first) * 1e-9, Math.abs(second) * 1e-9);
  return Math.abs(first - second) <= tolerance;
}

function expectedBinding({ index, count }) {
  if (index === 0) {
    return {
      stepIndex: index,
      phase: "read_translate",
      source: "context_template",
      dependsOn: [],
    };
  }
  if (index === 1) {
    return {
      stepIndex: index,
      phase: "relationship",
      source: "answer_rule",
      dependsOn: [0],
    };
  }
  if (index === count - 1) {
    return {
      stepIndex: index,
      phase: "check",
      source: "answer_match",
      dependsOn: [index - 1],
    };
  }
  return {
    stepIndex: index,
    phase: "calculation",
    source: "restricted_rule_evaluator",
    dependsOn: [index - 1],
  };
}

function matchingArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function createStepBindings(solutionSteps) {
  return solutionSteps.map((_, index) => expectedBinding({ index, count: solutionSteps.length }));
}

export function createMathSolutionDerivation({ family, generated, answerInput = createMathAnswerInput() }) {
  const solutionSteps = Array.isArray(generated?.steps) ? generated.steps : [];
  const answerRuleCheck = answerMatchesMathRule({
    answer: generated?.answer,
    answerRule: generated?.answerRule,
  });

  return {
    version: MATH_SOLUTION_DERIVATION_VERSION,
    familyId: family?.id || null,
    coreRelation: getMathCoreRelation(family?.id),
    contextTemplateId: generated?.contextTemplateId || null,
    variableSlots: [...(family?.variableSlots || [])],
    answerRule: generated?.answerRule || null,
    answer: Number.isFinite(Number(generated?.answer)) ? Number(generated.answer) : null,
    answerInputKind: answerInput.kind,
    evaluator: {
      type: answerRuleCheck.type || null,
      computedAnswer: answerRuleCheck.valid ? answerRuleCheck.value : null,
      matchesStoredAnswer: Boolean(answerRuleCheck.matches),
    },
    stepBindings: createStepBindings(solutionSteps),
    supportPhases: [...MATH_SOLUTION_PHASES],
  };
}

export function validateMathSolutionDerivation({ candidate }) {
  const errors = [];
  const derivation = candidate?.solutionDerivation;
  const solutionSteps = Array.isArray(candidate?.solutionSteps) ? candidate.solutionSteps : [];
  const answerRuleCheck = answerMatchesMathRule({
    answer: candidate?.answer,
    answerRule: candidate?.answerRule,
  });

  if (!derivation || typeof derivation !== "object") {
    return { valid: false, errors: ["solution_derivation_missing"], answerRuleCheck };
  }
  if (derivation.version !== MATH_SOLUTION_DERIVATION_VERSION) errors.push("solution_derivation_version_mismatch");
  if (derivation.familyId !== candidate?.familyId) errors.push("solution_derivation_family_mismatch");
  if (derivation.coreRelation !== getMathCoreRelation(candidate?.familyId)) {
    errors.push("solution_derivation_core_relation_mismatch");
  }
  if (derivation.coreRelation !== candidate?.metadataTags?.logicModel?.coreRelation) {
    errors.push("solution_derivation_model_relation_mismatch");
  }
  if (derivation.contextTemplateId !== candidate?.metadataTags?.contextTemplateId) {
    errors.push("solution_derivation_context_mismatch");
  }
  if (derivation.answerRule !== candidate?.answerRule) errors.push("solution_derivation_answer_rule_mismatch");
  if (!numericEqual(derivation.answer, candidate?.answer)) errors.push("solution_derivation_answer_mismatch");
  if (derivation.answerInputKind !== (candidate?.answerInput?.kind || "numeric")) {
    errors.push("solution_derivation_answer_input_mismatch");
  }
  if (!answerRuleCheck.valid || !answerRuleCheck.matches) {
    errors.push("solution_derivation_answer_rule_not_verified");
  }
  if (derivation.evaluator?.type !== answerRuleCheck.type) errors.push("solution_derivation_evaluator_type_mismatch");
  if (!numericEqual(derivation.evaluator?.computedAnswer, answerRuleCheck.value)) {
    errors.push("solution_derivation_evaluator_result_mismatch");
  }
  if (derivation.evaluator?.matchesStoredAnswer !== true) errors.push("solution_derivation_answer_match_missing");
  if (!matchingArray(derivation.supportPhases, MATH_SOLUTION_PHASES)) {
    errors.push("solution_derivation_support_phases_mismatch");
  }
  if (!Array.isArray(derivation.variableSlots) || !derivation.variableSlots.length) {
    errors.push("solution_derivation_variable_slots_missing");
  }
  if (!Array.isArray(derivation.stepBindings) || derivation.stepBindings.length !== solutionSteps.length) {
    errors.push("solution_derivation_step_bindings_mismatch");
  } else {
    derivation.stepBindings.forEach((binding, index) => {
      const expected = expectedBinding({ index, count: solutionSteps.length });
      if (
        binding?.stepIndex !== expected.stepIndex ||
        binding?.phase !== expected.phase ||
        binding?.source !== expected.source ||
        !matchingArray(binding?.dependsOn, expected.dependsOn)
      ) {
        errors.push(`solution_derivation_step_binding_invalid:${index}`);
      }
    });
  }

  return { valid: errors.length === 0, errors, answerRuleCheck };
}
