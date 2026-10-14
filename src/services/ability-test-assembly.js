import { generateMathQuestionCandidate, validateMathQuestionCandidate } from "./math-item-generator.js?v=math-help-framework-21";
import { READING_FORM_TRANSFER_VARIANT_LEVELS } from "./variant-evidence-policy.js?v=variant-evidence-policy-1";

const DIMENSION_LABELS = {
  read_context: "读题理解",
  extract_conditions: "信息提取",
  identify_unknown: "目标识别",
  translate_to_math_language: "数学翻译",
  select_operation_or_model: "模型选择",
  build_equation_or_relation: "关系建模",
  compute_stably: "稳定计算",
  handle_units: "单位意识",
  draw_or_use_visual_model: "图形表达",
  explain_or_check_answer: "解释检查",
  transfer_variant: "变式迁移",
  resist_distractor: "抗干扰",
};

const GRADE_ORDER = ["G1", "G2", "G3", "G4", "G5", "G6"];
const CHINESE_GRADE_DIGITS = {
  一: "G1",
  二: "G2",
  三: "G3",
  四: "G4",
  五: "G5",
  六: "G6",
};

function normalizeAssessmentSeed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.abs(Math.trunc(numeric)) >>> 0;
}

function stableSeedHash(seed, identity) {
  let hash = (normalizeAssessmentSeed(seed) || 0x811c9dc5) >>> 0;
  for (const character of String(identity || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function choosePrimaryTag(family, usedTags) {
  return family.abilityTags.find((tag) => !usedTags.has(tag)) || family.abilityTags[0];
}

function gradeIndex(grade) {
  const index = GRADE_ORDER.indexOf(grade);
  return index >= 0 ? index : GRADE_ORDER.length - 1;
}

function gradeFromLabel(value) {
  const text = String(value || "").trim();
  const direct = text.match(/G([1-6])/i);
  if (direct) return `G${direct[1]}`;
  const primary = text.match(/primary[_\s-]?([1-6])/i);
  if (primary) return `G${primary[1]}`;
  const chinese = Object.entries(CHINESE_GRADE_DIGITS).find(([digit]) => text.includes(`${digit}年级`));
  return chinese?.[1] || null;
}

export function resolveInitialAssessmentGrade({ gradeLevelOptionId, gradeLabel, fallbackGrade = "G6" } = {}) {
  const fromOption = gradeFromLabel(gradeLevelOptionId);
  if (fromOption) return fromOption;
  const fromLabel = gradeFromLabel(gradeLabel);
  if (fromLabel) return fromLabel;
  return GRADE_ORDER.includes(fallbackGrade) ? fallbackGrade : "G6";
}

function gradeRoutingForFamily(family, targetGrade) {
  const targetIndex = gradeIndex(targetGrade);
  const grades = (family.gradeBands || []).filter((grade) => GRADE_ORDER.includes(grade));
  const lower = Math.min(...grades.map(gradeIndex));
  const upper = Math.max(...grades.map(gradeIndex));
  if (targetIndex >= lower && targetIndex <= upper) {
    return { role: "target", distance: 0, score: 0 };
  }
  if (targetIndex > upper) {
    const distance = targetIndex - upper;
    return { role: "prerequisite", distance, score: 2 + distance * 2 };
  }
  const distance = lower - targetIndex;
  return { role: "stretch", distance, score: 8 + distance * 4 };
}

function rankFamilyCandidates({ candidates, selected, selectedDomains, selectedTags, assessmentSeed }) {
  const variationSeed = normalizeAssessmentSeed(assessmentSeed);
  return candidates
    .filter((candidate) => !selected.some((item) => item.family.id === candidate.family.id))
    .map((candidate) => ({
      ...candidate,
      score:
        candidate.routing.score +
        (selectedDomains.has(candidate.family.domain) ? 0.7 : 0) +
        candidate.family.abilityTags.filter((tag) => selectedTags.has(tag)).length * 0.12,
      variationRank: variationSeed
        ? stableSeedHash(variationSeed, `${candidate.family.id}:${selected.length}`)
        : candidate.index,
    }))
    .sort((left, right) => left.score - right.score || left.variationRank - right.variationRank || left.index - right.index);
}

function addNextFamily({ candidates, selected, selectedDomains, selectedTags, assessmentSeed }) {
  const next = rankFamilyCandidates({ candidates, selected, selectedDomains, selectedTags, assessmentSeed })[0];
  if (!next) return false;
  selected.push(next);
  selectedDomains.add(next.family.domain);
  next.family.abilityTags.forEach((tag) => selectedTags.add(tag));
  return true;
}

export function selectInitialAbilityFamilies({
  assessmentSeed = null,
  families = [],
  targetGrade = "G6",
  maxQuestions = 8,
  allowStretch = false,
} = {}) {
  const selected = [];
  const selectedDomains = new Set();
  const selectedTags = new Set();
  const candidates = families
    .filter((family) => Array.isArray(family?.gradeBands) && family.gradeBands.length)
    .map((family, index) => ({
      family,
      index,
      routing: gradeRoutingForFamily(family, targetGrade),
    }));

  const cap = Math.min(maxQuestions, candidates.length);
  const targetCandidates = candidates.filter((candidate) => candidate.routing.role === "target");
  const immediatePrerequisites = candidates.filter(
    (candidate) => candidate.routing.role === "prerequisite" && candidate.routing.distance === 1,
  );
  const eligibleStretch = candidates.filter(
    (candidate) => candidate.routing.role === "stretch" && candidate.routing.distance === 1,
  );

  while (
    selected.length < cap &&
    addNextFamily({ candidates: targetCandidates, selected, selectedDomains, selectedTags, assessmentSeed })
  ) {
    // Prefer breadth across the selected grade before looking backward.
  }

  while (
    selected.length < cap &&
    addNextFamily({ candidates: immediatePrerequisites, selected, selectedDomains, selectedTags, assessmentSeed })
  ) {
    // A first diagnostic may check directly adjacent prerequisites, never distant gaps.
  }

  if (allowStretch) {
    while (
      selected.length < cap &&
      addNextFamily({ candidates: eligibleStretch, selected, selectedDomains, selectedTags, assessmentSeed })
    ) {
      // Stretch evidence is deliberately opt-in for a future adaptive diagnostic.
    }
  }

  return selected;
}

function expandInitialAssessmentProbes({ assessmentSeed, selectedFamilies, targetGrade, minQuestions, maxQuestions }) {
  const probes = selectedFamilies.map((item) => ({ ...item, probeIndex: 0, probeRole: "first_evidence" }));
  const targetFamilies = selectedFamilies.filter((item) => item.routing.role === "target");
  const repeatableFamilies = targetFamilies.length ? targetFamilies : selectedFamilies;
  const desiredCount = Math.min(
    maxQuestions,
    Math.max(minQuestions, probes.length + (probes.length < maxQuestions ? 1 : 0)),
  );

  let cursor = 0;
  while (probes.length < desiredCount && repeatableFamilies.length) {
    const source = repeatableFamilies[cursor % repeatableFamilies.length];
    const priorProbeCount = probes.filter((probe) => probe.family.id === source.family.id).length;
    probes.push({
      ...source,
      probeIndex: priorProbeCount,
      probeRole: "controlled_form_transfer",
    });
    cursor += 1;
  }

  const variationSeed = normalizeAssessmentSeed(assessmentSeed);
  return probes.map((probe, index) => {
    const baseSeed = (gradeIndex(targetGrade) + 1) * 100 + probe.index * 10 + index + 1;
    const runVariation = variationSeed
      ? stableSeedHash(variationSeed, `${targetGrade}:${probe.family.id}:${probe.probeIndex}:${index}`)
      : 0;
    const variantLevel =
      probe.probeIndex === 0
        ? "original"
        : READING_FORM_TRANSFER_VARIANT_LEVELS[
            (stableSeedHash(
              variationSeed || 0x811c9dc5,
              `${targetGrade}:${probe.family.id}:${probe.probeIndex}:${index}`,
            ) + probe.probeIndex - 1) % READING_FORM_TRANSFER_VARIANT_LEVELS.length
          ];
    return {
      ...probe,
      seed: baseSeed + runVariation,
      probeRole: variantLevel === "original" ? "first_evidence" : `controlled_transfer_${variantLevel}`,
      variantLevel,
    };
  });
}

export function assembleInitialAbilityTest({
  assessmentSeed = null,
  aiVersion = "semi_ai",
  families,
  maxQuestions = 8,
  minQuestions = 4,
  subjectId = "math",
  targetGrade = "G6",
}) {
  const usedTags = new Set();
  // Reserve one bounded same-family form change when the diagnostic is long enough.
  // That keeps breadth while giving the starting ability map a real transfer signal.
  const familySelectionCap = maxQuestions >= 5 ? Math.max(1, maxQuestions - 1) : maxQuestions;
  const selectedFamilies = selectInitialAbilityFamilies({
    assessmentSeed,
    families,
    targetGrade,
    maxQuestions: familySelectionCap,
  });
  const selectedProbes = expandInitialAssessmentProbes({
    assessmentSeed,
    selectedFamilies,
    targetGrade,
    minQuestions,
    maxQuestions,
  });

  const questions = selectedProbes.map(({ family, routing, probeIndex, probeRole, seed, variantLevel }, index) => {
    const targetTag = choosePrimaryTag(family, usedTags);
    usedTags.add(targetTag);
    const candidate = validateMathQuestionCandidate(
      generateMathQuestionCandidate({
        aiVersion,
        family,
        seed,
        instructionalGrade: targetGrade,
        variantLevel,
      }),
    );

    return {
      id: `initial-${targetGrade}-${index + 1}-${candidate.id}`,
      sourceCandidateId: candidate.id,
      familyId: candidate.familyId,
      subjectId,
      stage: `${targetGrade} 起点 · ${family.gradeBands.join("/")}`,
      targetDimension: DIMENSION_LABELS[targetTag] || targetTag,
      prompt: candidate.prompt,
      expectedSignal: `${family.name} · ${candidate.qualityStatus === "system_validated" ? "已通过后台校验" : "需复核"}`,
      checks: family.abilityTags.map((tag) => DIMENSION_LABELS[tag] || tag),
      metadataTags: {
        ...candidate.metadataTags,
        assessmentRouting: {
          targetGrade,
          familyRole: routing.role,
          gradeDistance: routing.distance,
          probeRole,
          probeIndex,
        },
      },
      answer: candidate.answer,
      qualityStatus: candidate.qualityStatus,
    };
  });

  return {
    assessmentMode: "generated_from_logic_library",
    maxQuestions,
    minQuestions,
    subjectId,
    routing: {
      targetGrade,
      familySelection: "current_grade_then_adjacent_prerequisite_no_default_stretch",
      probePolicy: "preserve_grade_breadth_then_add_one_bounded_same_structure_form_transfer_probe",
      runVariation: normalizeAssessmentSeed(assessmentSeed)
        ? "private_run_seed_within_same_educational_priority"
        : "deterministic_fallback_without_private_run_seed",
    },
    questions,
    coverage: {
      questionCount: questions.length,
      familyCount: new Set(selectedFamilies.map((item) => item.family.id)).size,
      abilityTagCount: usedTags.size,
      qualityPassed: questions.filter((question) => question.qualityStatus === "system_validated").length,
      targetGradeFamilies: selectedFamilies.filter((item) => item.routing.role === "target").length,
      prerequisiteFamilies: selectedFamilies.filter((item) => item.routing.role === "prerequisite").length,
      stretchFamilies: selectedFamilies.filter((item) => item.routing.role === "stretch").length,
      controlledTransferQuestionCount: questions.filter((question) => question.metadataTags?.variantLevel !== "original").length,
      controlledTransferVariantLevels: [
        ...new Set(
          questions
            .map((question) => question.metadataTags?.variantLevel)
            .filter((variantLevel) => READING_FORM_TRANSFER_VARIANT_LEVELS.includes(variantLevel)),
        ),
      ],
    },
    guardrail:
      "Initial ability test uses generated questions from the same logic library as later practice and stage tests. A private per-run seed varies legal item contexts and equally suitable family choices without changing grade boundaries. It first samples current-grade evidence, then only direct prerequisites; it never uses advanced-grade stretch items by default. A bounded same-family form change checks whether the learner can retain the relationship when the scene, wording, or question order changes, without inflating difficulty.",
  };
}
