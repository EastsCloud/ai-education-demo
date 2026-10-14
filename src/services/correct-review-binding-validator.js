const CORRECT_REVIEW_VARIANTS = new Set(["context_change", "change_one_number", "change_two_numbers"]);

function hasIndependentCorrect(delivery) {
  return (delivery?.attempts || []).some(
    (attempt) => attempt?.isCorrect === true && Number(attempt?.hintDepth || 0) === 0,
  );
}

function sameNumber(left, right) {
  return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Number(left) === Number(right);
}

export function validateCorrectReviewBinding({ candidate, request, sourceDelivery } = {}) {
  const sourceDeliveryId = String(request?.correctReviewSourceDeliveryId || "").trim();
  if (!sourceDeliveryId) return { valid: true, errors: [] };

  const errors = [];
  const sourceRequest = sourceDelivery?.generationRequest || {};
  const sourceCandidate = sourceDelivery?.privateCandidate || {};
  const variantLevel = String(request?.variantLevel || "");

  if (!sourceDelivery) errors.push("correct_review_source_not_found");
  if (request?.mode !== "practice") errors.push("correct_review_mode_invalid");
  if (!CORRECT_REVIEW_VARIANTS.has(variantLevel)) errors.push("correct_review_variant_invalid");
  if (sourceDelivery && sourceDelivery.studentId !== request?.studentId) errors.push("correct_review_source_student_mismatch");
  if (sourceDelivery && sourceDelivery.subjectId !== request?.subjectId) errors.push("correct_review_source_subject_mismatch");
  if (sourceDelivery && sourceDelivery.mode !== "practice") errors.push("correct_review_source_mode_invalid");
  if (sourceDelivery && sourceRequest.variantLevel !== "original") errors.push("correct_review_source_not_original");
  if (sourceDelivery && !hasIndependentCorrect(sourceDelivery)) errors.push("correct_review_source_not_independent_correct");
  if (sourceDelivery && sourceRequest.familyId !== request?.familyId) errors.push("correct_review_family_mismatch");
  if (sourceDelivery && sourceRequest.instructionalGrade !== request?.instructionalGrade) {
    errors.push("correct_review_grade_mismatch");
  }
  if (sourceDelivery && !sameNumber(sourceRequest.seed, request?.seed)) errors.push("correct_review_seed_mismatch");
  if (candidate?.familyId !== request?.familyId) errors.push("correct_review_candidate_family_mismatch");
  if (candidate?.metadataTags?.instructionalGrade !== request?.instructionalGrade) {
    errors.push("correct_review_candidate_grade_mismatch");
  }
  if (candidate?.metadataTags?.variantLevel !== variantLevel) errors.push("correct_review_candidate_variant_mismatch");

  if (variantLevel === "context_change" && sourceDelivery) {
    if (!sameNumber(candidate?.answer, sourceCandidate.answer)) errors.push("correct_review_context_answer_mismatch");
    if (String(candidate?.answerRule || "") !== String(sourceCandidate.answerRule || "")) {
      errors.push("correct_review_context_relation_mismatch");
    }
    if (!candidate?.prompt || candidate.prompt === sourceCandidate.prompt) errors.push("correct_review_context_prompt_not_refreshed");
    const sourceTemplateId = sourceCandidate?.metadataTags?.contextTemplateId;
    const candidateTemplateId = candidate?.metadataTags?.contextTemplateId;
    if (!sourceTemplateId || !candidateTemplateId || sourceTemplateId === candidateTemplateId) {
      errors.push("correct_review_context_template_not_changed");
    }
  }

  if (variantLevel === "change_one_number" || variantLevel === "change_two_numbers") {
    const expectedChanges = variantLevel === "change_one_number" ? 1 : 2;
    if (candidate?.metadataTags?.variantControl?.expectedIndependentChangeCount !== expectedChanges) {
      errors.push("correct_review_variant_control_mismatch");
    }
  }

  return { valid: errors.length === 0, errors };
}
