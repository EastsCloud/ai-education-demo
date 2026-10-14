import {
  generateMathQuestionCandidate,
  validateMathQuestionCandidate,
} from "./math-item-generator.js?v=math-help-framework-21";

export const questionSourceModes = {
  semi_ai: ["fixed_seed", "bounded_rule_generator"],
  full_ai_ready: ["ai_candidate_validated"],
};

export const questionSourceAvailability = {
  semi_ai: "active",
  full_ai_ready: "provider_required",
};

const QUESTION_SOURCE_ADAPTER_VERSION = "question-source-v4";

function resolveAiVersion(aiVersion) {
  return Object.hasOwn(questionSourceModes, aiVersion) ? aiVersion : "semi_ai";
}

function normalizeProviderResult(value) {
  if (!value || typeof value !== "object") return { candidate: null, providerId: null };
  if (value.candidate && typeof value.candidate === "object") {
    return {
      candidate: value.candidate,
      providerId: String(value.providerId || "").trim() || null,
    };
  }
  return { candidate: value, providerId: null };
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceNeutralMetadata(candidate) {
  const metadata = candidate?.metadataTags || {};
  const itemTags = metadata.itemTags || {};
  const generationTags = itemTags.generationTags || {};
  const qualityTags = itemTags.qualityTags || {};

  return {
    gradeBands: metadata.gradeBands || [],
    instructionalGrade: metadata.instructionalGrade || null,
    domain: metadata.domain || null,
    abilityTags: metadata.abilityTags || [],
    atlasNodeIds: metadata.atlasNodeIds || [],
    variantLevel: metadata.variantLevel || null,
    contextTemplateId: metadata.contextTemplateId || null,
    generationBoundary: metadata.generationBoundary || null,
    logicModel: metadata.logicModel || null,
    variantControl: metadata.variantControl || null,
    structuralVariant: metadata.structuralVariant || null,
    applicationContext: metadata.applicationContext || null,
    itemTags: {
      ...itemTags,
      generationTags: {
        ...generationTags,
        sourceTrack: undefined,
        sourceProviderId: undefined,
        sourceAdapterVersion: undefined,
      },
      qualityTags: {
        ...qualityTags,
        aiGenerated: undefined,
      },
    },
  };
}

function fullAiReferenceBindingErrors({ candidate, canonical }) {
  const errors = [];
  if (candidate?.familyId !== canonical?.familyId) errors.push("ai_candidate_family_mismatch");
  if (candidate?.familyName !== canonical?.familyName) errors.push("ai_candidate_family_name_mismatch");
  if (candidate?.prompt !== canonical?.prompt) errors.push("ai_candidate_prompt_not_canonically_bound");
  if (Number(candidate?.answer) !== Number(canonical?.answer)) errors.push("ai_candidate_answer_mismatch");
  if (candidate?.answerRule !== canonical?.answerRule) errors.push("ai_candidate_answer_rule_mismatch");
  if (stableStringify(candidate?.answerInput) !== stableStringify(canonical?.answerInput)) {
    errors.push("ai_candidate_answer_input_not_canonically_bound");
  }
  if (stableStringify(candidate?.solutionSteps) !== stableStringify(canonical?.solutionSteps)) {
    errors.push("ai_candidate_steps_not_canonically_bound");
  }
  if (stableStringify(candidate?.solutionStrategies) !== stableStringify(canonical?.solutionStrategies)) {
    errors.push("ai_candidate_strategies_not_canonically_bound");
  }
  if (stableStringify(candidate?.solutionDerivation) !== stableStringify(canonical?.solutionDerivation)) {
    errors.push("ai_candidate_solution_derivation_not_canonically_bound");
  }
  if (stableStringify(candidate?.supportStructure) !== stableStringify(canonical?.supportStructure)) {
    errors.push("ai_candidate_support_framework_not_canonically_bound");
  }
  if (stableStringify(candidate?.hintLayers) !== stableStringify(canonical?.hintLayers)) {
    errors.push("ai_candidate_hints_not_canonically_bound");
  }
  if (stableStringify(candidate?.guidedSteps) !== stableStringify(canonical?.guidedSteps)) {
    errors.push("ai_candidate_guided_steps_not_canonically_bound");
  }
  if (stableStringify(candidate?.metadataTags?.applicationContext) !== stableStringify(canonical?.metadataTags?.applicationContext)) {
    errors.push("ai_candidate_application_context_not_canonically_bound");
  }
  if (stableStringify(sourceNeutralMetadata(candidate)) !== stableStringify(sourceNeutralMetadata(canonical))) {
    errors.push("ai_candidate_metadata_not_canonically_bound");
  }
  return errors;
}

function stampSourceProvenance({ candidate, requestedAiVersion, sourceMode, providerId = null, aiCandidateUsed = false }) {
  const itemTags = candidate.metadataTags?.itemTags || {};
  return {
    ...candidate,
    sourceMode,
    metadataTags: {
      ...candidate.metadataTags,
      sourceProvenance: {
        adapterVersion: QUESTION_SOURCE_ADAPTER_VERSION,
        requestedTrack: requestedAiVersion,
        executionMode: sourceMode,
        providerId,
        aiCandidateUsed,
      },
      itemTags: {
        ...itemTags,
        generationTags: {
          ...itemTags.generationTags,
          sourceTrack: sourceMode,
          sourceProviderId: providerId,
          sourceAdapterVersion: QUESTION_SOURCE_ADAPTER_VERSION,
        },
        qualityTags: {
          ...itemTags.qualityTags,
          aiGenerated: aiCandidateUsed,
        },
      },
    },
    validatorTrace: [
      ...(candidate.validatorTrace || []),
      `question_source:${sourceMode}`,
      aiCandidateUsed ? "question_source:ai_candidate_reference_bound" : "question_source:bounded_rule_source",
    ],
  };
}

function createCanonicalCandidate({ family, seed, instructionalGrade, variantLevel }) {
  return validateMathQuestionCandidate(
    generateMathQuestionCandidate({
      aiVersion: "semi_ai",
      family,
      seed,
      instructionalGrade,
      variantLevel,
    }),
  );
}

async function resolveExternalCandidate({ aiCandidate, candidateProvider, sourceRequest }) {
  try {
    const result = typeof candidateProvider === "function" ? await candidateProvider(sourceRequest) : aiCandidate;
    return normalizeProviderResult(result);
  } catch {
    return { candidate: null, providerId: null, error: "ai_candidate_provider_failed" };
  }
}

export function createQuestionSourceContract({ aiVersion, itemFamily }) {
  const resolvedAiVersion = resolveAiVersion(aiVersion);
  const sourceModes = questionSourceModes[resolvedAiVersion];

  return {
    aiVersion: resolvedAiVersion,
    itemFamilyId: itemFamily.id,
    sourceModes,
    availability: questionSourceAvailability[resolvedAiVersion],
    deliveryGate: [
      "metadata_complete",
      "item_tag_contract_complete",
      "bounded_model_verified",
      "answer_rule_verified",
      "family_semantics_verified",
      "application_context_verified",
      "solution_derivation_verified",
      "solution_strategies_template_verified",
      "steps_verified",
      "hint_layers_verified",
      "quality_status_system_validated",
      ...(resolvedAiVersion === "full_ai_ready" ? ["server_ai_candidate_provider", "canonical_reference_binding"] : []),
    ],
    studentPayload: ["delivery_id", "prompt", "answer_input", "result_state", "revealed_hint_layers", "revealed_guided_steps"],
    hiddenBackendPayload: [
      "answer",
      "answer_rule",
      "solution_derivation",
      "variable_bounds",
      "generator_prompt",
      "validator_trace",
      "raw_profile_risk",
    ],
  };
}

// The active MVP source is deterministic and bounded. A later model may propose
// a candidate only through this server-side adapter; browser input is never a
// candidate source. Candidate semantics are validated before canonical reference
// binding. Exact binding remains the active provider boundary until a reviewed
// Full-AI generation policy permits controlled prompt variation.
export async function resolveQuestionCandidateForDelivery({
  aiCandidate = null,
  aiVersion = "semi_ai",
  candidateProvider = null,
  family,
  instructionalGrade = null,
  seed = 1,
  variantLevel = "original",
} = {}) {
  if (!family?.id) return { candidate: null, error: "question_source_family_required" };

  const requestedAiVersion = resolveAiVersion(aiVersion);
  const canonical = createCanonicalCandidate({ family, seed, instructionalGrade, variantLevel });
  if (canonical.qualityStatus !== "system_validated") {
    return { candidate: null, error: "question_source_canonical_validation_failed" };
  }

  if (requestedAiVersion === "semi_ai") {
    return {
      candidate: stampSourceProvenance({
        candidate: canonical,
        requestedAiVersion,
        sourceMode: "bounded_rule_generator",
        providerId: "math_item_model_v1",
      }),
      error: null,
    };
  }

  const sourceRequest = {
    familyId: family.id,
    instructionalGrade: canonical.metadataTags.instructionalGrade,
    seed,
    variantLevel,
    canonicalCandidateId: canonical.id,
  };
  const external = await resolveExternalCandidate({ aiCandidate, candidateProvider, sourceRequest });
  if (external.error) return { candidate: null, error: external.error };
  if (!external.candidate) return { candidate: null, error: "ai_candidate_provider_required" };
  if (!external.providerId) return { candidate: null, error: "ai_candidate_provider_identity_required" };

  const validatedCandidate = validateMathQuestionCandidate(external.candidate);
  const bindingErrors = [
    ...(validatedCandidate.qualityStatus === "system_validated" ? [] : validatedCandidate.validatorTrace || ["ai_candidate_validation_failed"]),
    ...fullAiReferenceBindingErrors({ candidate: validatedCandidate, canonical }),
  ];
  if (bindingErrors.length) {
    return {
      candidate: null,
      error: "ai_candidate_validation_failed",
      validationErrors: [...new Set(bindingErrors)],
    };
  }

  return {
    candidate: stampSourceProvenance({
      candidate: validatedCandidate,
      requestedAiVersion,
      sourceMode: "ai_candidate_validated",
      providerId: external.providerId,
      aiCandidateUsed: true,
    }),
    error: null,
  };
}

export function canDeliverQuestion(candidate) {
  return Boolean(
      candidate?.metadataTags &&
      candidate?.metadataTags?.logicModel &&
      candidate?.metadataTags?.itemTags &&
      candidate?.answerInput &&
      candidate?.answerRule &&
      candidate?.solutionDerivation &&
      candidate?.solutionSteps?.length &&
      candidate?.hintLayers?.length &&
      candidate?.validatorTrace?.includes("family_semantics_verified") &&
      candidate?.validatorTrace?.includes("application_context_verified") &&
      candidate?.qualityStatus === "system_validated",
  );
}
