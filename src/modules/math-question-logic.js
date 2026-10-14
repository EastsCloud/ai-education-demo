import { shanghaiMathItemFamilies } from "../data/shanghai-math-taxonomy.js?v=math-logic-library-4";

export function buildItemModelIndex(itemFamilies = shanghaiMathItemFamilies) {
  return itemFamilies.reduce((index, family) => {
    index[family.id] = {
      ...family,
      deliveryRequirements: [
        "metadata_complete",
        "item_tag_contract_complete",
        "bounded_model_verified",
        "answer_rule_verified",
        "solution_derivation_verified",
        "steps_verified",
        "hint_layers_verified",
        "quality_status_system_validated",
      ],
    };
    return index;
  }, {});
}

export function getItemFamiliesByGrade(grade, itemFamilies = shanghaiMathItemFamilies) {
  return itemFamilies.filter((family) => family.gradeBands.includes(grade));
}

export function getItemFamiliesByDomain(domain, itemFamilies = shanghaiMathItemFamilies) {
  return itemFamilies.filter((family) => family.domain === domain);
}

export function createQuestionDeliveryContract({ aiVersion = "semi_ai", family }) {
  return {
    sourceMode: aiVersion === "full_ai_ready" ? "ai_candidate_validated" : "bounded_rule_generator",
    familyId: family.id,
    requiredPayload: {
      prompt: true,
      answerRule: true,
      validationRules: true,
      metadataTags: true,
      itemTagContract: true,
      solutionSteps: true,
      hintLayers: true,
      guidedSteps: true,
      qualityStatus: "system_validated",
    },
    frontendMayShow: ["prompt", "answer_input", "feedback", "hint_layers", "guided_steps"],
    frontendMustHide: ["generator_prompt", "variable_bounds", "raw_behavior_risk", "validator_trace"],
  };
}

export function summarizeMathLogicCoverage(itemFamilies = shanghaiMathItemFamilies) {
  const grades = ["G1", "G2", "G3", "G4", "G5", "G6"];
  return grades.map((grade) => ({
    grade,
    itemFamilyCount: getItemFamiliesByGrade(grade, itemFamilies).length,
    families: getItemFamiliesByGrade(grade, itemFamilies).map((family) => family.id),
  }));
}
