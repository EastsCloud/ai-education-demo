import {
  basicInfoFieldMap,
  basicInfoOptionCatalog,
  onboardingDataFlow,
  studentBasicInfoRecord,
  studentDerivedBaselineRecord,
  studentLearningContextRecord,
} from "./onboarding-schema.js";
import {
  aiVersionProfiles,
  shanghaiMathItemFamilies,
  shanghaiPrimaryMathResearch,
} from "./shanghai-math-taxonomy.js?v=math-logic-library-4";
import {
  accountProfileSettings,
  accountRoleAssignments,
  accountUsers,
  studentGuardianLinks,
  studentTeacherLinks,
} from "./account-records.js";
import { roleReportConfigurations } from "./report-config.js";
import { assessmentCadenceConfig, learningParameterConfig } from "./learning-parameter-config.js";
import { createBaseKnowledgePuzzleMap } from "./knowledge-atlas-map.js";

export { aiVersionProfiles, shanghaiMathItemFamilies, shanghaiPrimaryMathResearch };
export { accountProfileSettings, accountRoleAssignments, accountUsers, studentGuardianLinks, studentTeacherLinks };
export { roleReportConfigurations };
export { assessmentCadenceConfig, learningParameterConfig };

const studentId = "student-001";
const subjectId = "math-linear-equations";
const today = "2026-07-09";

export const mvpScope = {
  id: "ai-education-mvp-scope-freeze-001",
  sourceDoc: "docs/mvp-scope-freeze.md",
  coreMethod: ["一对一", "练中学", "帮你学"],
  studentMainNavigation: [
    { id: "home", label: "首页", role: "daily_start" },
    { id: "onboarding", label: "测试", role: "initial_and_stage_assessment" },
    { id: "practice", label: "练习", role: "daily_task_and_learning_by_doing" },
    { id: "report", label: "报告", role: "progress_and_next_action" },
  ],
  secondaryEntrances: [
    {
      id: "daily_task",
      label: "每日任务",
      rule: "Daily task is the source and state of practice, not a separate student main navigation item.",
      entersFrom: ["home", "calendar", "learning_curve", "practice"],
      resolvesTo: "practice",
    },
    {
      id: "knowledge_atlas",
      label: "知识图鉴",
      rule: "Knowledge atlas is a secondary entrance from practice results, question explanation, reports, or optional exploration.",
      entersFrom: ["practice_summary", "question_explanation", "report", "optional_exploration"],
      resolvesTo: "atlas",
    },
    {
      id: "student_profile",
      label: "画像",
      rule: "Profile is not exposed as a student page; it belongs to system, parent, teacher, and backend interpretation.",
      entersFrom: ["observer_report", "backend"],
      resolvesTo: "observer_view",
    },
  ],
  defaultCurveAdjustment: "keep_study_intensity",
};

export const supportedSubjects = [
  {
    id: "math",
    name: "数学",
    status: "available",
    knowledgeClusters: [
      {
        id: subjectId,
        name: "小学数学（G1-G6）",
        assessmentModuleId: "assessment-math-linear-equations",
      },
    ],
  },
  {
    id: "english",
    name: "英语",
    status: "planned",
    knowledgeClusters: [],
  },
  {
    id: "toefl",
    name: "托福",
    status: "planned",
    knowledgeClusters: [],
  },
];

export const assessmentModules = [
  {
    id: "assessment-math-linear-equations",
    subjectId: "math",
    knowledgeClusterId: subjectId,
    name: "小学数学起点与阶段测试模块",
    questionLogicLibraryId: "question-logic-math-linear-equations",
    reusableFor: ["initial_baseline", "stage_check", "dynamic_curve_calibration", "targeted_retest"],
    dimensions: ["concept", "reading", "equation_building", "calculation", "transfer", "hint_dependency"],
    outputs: ["abilityMap", "errorPattern", "hintDependency", "curveAdjustmentSuggestion"],
  },
];

export const questionLogicLibrary = {
  id: "question-logic-math-linear-equations",
  subjectId: "math",
  knowledgeClusterId: subjectId,
  purpose: "shared_question_generation_logic",
  usedBy: ["initial_ability_test", "daily_practice", "variant_training", "stage_test", "future_realtime_ai_generation"],
  generationPrinciple:
    "Each question type is a bounded generation unit: one seed question plus variable bounds, variant boundaries, and step-extension boundaries. The system can create many controlled questions inside the boundary instead of relying on a fixed question bank.",
  boundaryPrinciple:
    "Boundaries are first legality and solvability constraints: generated questions must have a valid solution, must not violate the seed logic, and should produce results that match the teaching purpose.",
  mathContentPrinciple:
    "Even calculation-focused practice should be presented as a problem-solving scenario when possible, so students learn that calculation serves understanding and solving real questions.",
  supportModePrinciple:
    "The generator should output deterministic support structures that can expand into both layered hints and guided step-by-step mode from the same verifiable decomposition logic.",
  solutionStrategyPrinciple:
    "A question can expose multiple verifiable solution strategies, such as algebraic method, diagram/model method, table method, or logical trial-and-check.",
  logicUnits: [
    {
      id: "quantity_total_difference",
      name: "总量与差值关系",
      tests: ["reading", "equation_building", "transfer"],
      itemTags: {
        systemLevelTags: {
          educationSystems: ["US_CCSS", "CN_National"],
          gradeBands: ["US_G6", "CN_G6"],
          curriculumStandards: ["CCSS.Math.Content.6.EE", "CN.Math.G6.EquationApplication"],
          targetLevel: "grade_6_core",
          readinessLevel: "early_algebra_entry",
        },
        difficultyTags: {
          difficultyLevel: "L2_foundational_reasoning",
          cognitiveDemand: ["read_context", "model_relationship", "compute_clean_integer"],
          estimatedTimeSeconds: { assessment: 90, practice: 150 },
        },
        knowledgeTags: {
          knowledgeClusterId: "math-linear-equations",
          knowledgePointIds: ["quantity_total_difference", "linear_equation_from_word_problem"],
          prerequisiteIds: ["addition_subtraction_relation", "unknown_variable"],
        },
        atlasTags: {
          atlasEntryIds: ["atlas-quantity-total-difference"],
          commonMisconceptionIds: ["split_total_equally_without_difference", "reverse_more_less_relation"],
        },
        abilityTags: {
          abilityDimensions: ["reading", "equation_building", "calculation", "transfer"],
          evidenceTargets: [
            "can_extract_total_and_difference",
            "can_translate_language_to_equation",
            "can_compute_clean_integer_solution",
          ],
        },
        practiceTags: {
          runtimeModes: ["assessment", "practice", "stage_test", "review"],
          supportAllowedByMode: { assessment: false, practice: true, stage_test: false, review: true },
          variantLevels: ["L0", "L1", "L2", "L3", "L4", "L5"],
        },
        generationTags: {
          seedId: "seed-total-difference-001",
          validationRuleIds: [
            "total_greater_than_difference",
            "total_minus_difference_even",
            "positive_integer_solution",
          ],
        },
        solutionTags: {
          strategyIds: ["algebraic_equation", "bar_model", "logical_trial_check"],
          stepTemplateId: "steps-total-difference-v1",
          hintTemplateId: "hints-total-difference-v1",
          guidedModeId: "guided-total-difference-v1",
        },
        evidenceTags: {
          scoringRuleId: "score-total-difference-v1",
          observableBehaviors: ["answer_correctness", "response_time", "answer_revision", "uncertain_choice", "hint_depth"],
          responseFormat: "numeric_or_equation",
        },
        qualityTags: {
          reviewStatus: "system_validated",
          aiGenerated: false,
          humanVerified: false,
          version: "2026-07-12",
        },
      },
      seedQuestion: "甲数比乙数多 8，两个数一共 38，甲数和乙数分别是多少？",
      variables: ["total", "difference", "unknown_a", "unknown_b"],
      variableBounds: {
        total: { min: 20, max: 160, integer: true },
        difference: { min: 2, max: 50, integer: true, mustBeLessThan: "total" },
        validityRules: ["total_minus_difference_must_be_even", "difference_must_be_less_than_total"],
        solutionConstraint: "both_unknowns_are_positive_integers",
      },
      variantBoundaries: [
        "change_one_number",
        "change_two_numbers",
        "switch_more_less_relation",
        "reverse_question_order",
        "change_wording_without_changing_structure",
      ],
      stepExtensionBoundaries: [
        "add_intermediate_total",
        "add_unit_conversion",
        "add_pre_equation_comparison",
      ],
      transformations: ["same_structure_new_numbers", "one_condition_changed", "two_conditions_changed", "extra_step_added"],
    },
    {
      id: "price_quantity_total",
      name: "单价、数量、总价关系",
      tests: ["concept", "calculation", "transfer"],
      seedQuestion: "一本练习册 12 元，买 x 本一共 60 元，买了多少本？",
      variables: ["price", "quantity", "total"],
      variableBounds: {
        price: { min: 2, max: 80, integer: true },
        quantity: { min: 2, max: 30, integer: true },
        total: { derivesFrom: ["price", "quantity"], integer: true },
        validityRules: ["total_equals_price_times_quantity", "missing_variable_must_be_solvable"],
        solutionConstraint: "missing_variable_has_clean_integer_solution",
      },
      variantBoundaries: [
        "change_price",
        "change_quantity",
        "switch_missing_variable",
        "reverse_question",
        "add_discount_or_package_condition",
      ],
      stepExtensionBoundaries: [
        "add_two_item_comparison",
        "add_remaining_money_step",
        "add_bulk_purchase_step",
      ],
      transformations: ["new_numbers", "reverse_question", "missing_variable_switch"],
    },
    {
      id: "linear_expression_text_to_equation",
      name: "文字表达转方程",
      tests: ["concept", "equation_building", "hint_dependency"],
      seedQuestion: "一个游乐园门票套餐中，3 张儿童票再加 5 元服务费一共 26 元。每张儿童票多少钱？",
      variables: ["coefficient", "constant", "result"],
      variableBounds: {
        coefficient: { min: 2, max: 12, integer: true },
        constant: { min: -30, max: 30, integer: true },
        result: { min: -100, max: 160, integer: true },
        validityRules: ["coefficient_cannot_be_zero", "result_minus_constant_must_be_divisible_or_simple_fraction"],
        solutionConstraint: "single_unknown_with_clean_integer_or_simple_fraction_solution",
      },
      variantBoundaries: [
        "plus_to_minus",
        "change_operation_order",
        "change_text_context",
        "move_unknown_to_both_sides",
      ],
      stepExtensionBoundaries: [
        "add_parentheses",
        "add_like_terms",
        "add_two_sentence_condition_extraction",
      ],
      transformations: ["plus_to_minus", "order_changed", "wording_changed"],
    },
  ],
  generationModes: [
    "baseline_probe",
    "original_retry",
    "one_number_variant",
    "two_number_variant",
    "condition_variant",
    "step_added_variant",
    "stage_check",
  ],
  guardrail:
    "题面可以动态生成，但知识逻辑、变量约束、能力维度、变式规则和评分证据必须稳定；这样以后可以从题库过渡到实时 AI 出题。",
};

export const peerQuestionTypeBenchmark = {
  id: "peer-benchmark-quantity-total-difference",
  subjectId: "math",
  knowledgeClusterId: subjectId,
  questionTypeId: "quantity_total_difference",
  label: "同类型题",
  cohortDescription: "同年级、同目标、同阶段学生",
  peerCorrectRate: 0.68,
  displayRule:
    "Show as a gentle reference, not a ranking. Student-facing copy should avoid pressure and focus on what to practice next.",
};

export const behaviorAwareQuestionEngine = {
  id: "behavior-aware-question-engine",
  purpose: "connect_question_logic_library_with_user_behavior_patterns",
  phase: "methodology_next_step",
  firstPhaseApproach: "explainable_rule_engine",
  futureApproach: "machine_learning_optimization",
  historyInputPolicy: {
    scope: "all_questions_attempted_today",
    feedsInto: "tomorrow_question_logic",
    includes: [
      "required_daily_practice",
      "correct_answers",
      "wrong_answers",
      "hint_assisted_answers",
      "wrong_question_retry",
      "same_type_extra_practice",
      "optional_extra_practice",
    ],
    guardrail:
      "Tomorrow's question logic must use the full practice history, not only wrong questions.",
  },
  behaviorPatterns: [
    "lucky_correct",
    "wrong_answer_retry",
    "hint_dependent_correct",
    "fast_guessing",
    "slow_but_accurate",
    "repeated_stuck_point",
    "long_text_high_cost",
    "weak_variant_transfer",
  ],
  initialBuckets: [
    {
      id: "correct_review",
      defaultRatio: 0.25,
      purpose: "sample a portion of yesterday's correct answers to confirm reproducibility; correct still means correct",
    },
    {
      id: "wrong_retry",
      defaultRatio: 0.4,
      purpose: "retry yesterday's wrong questions until solved without hints",
    },
    {
      id: "new_stage_questions",
      defaultRatio: 0.25,
      purpose: "add new questions from the current stage of the learning curve",
    },
    {
      id: "challenge_extension",
      defaultRatio: 0.1,
      purpose: "add a small number of harder or extended questions when the student is ready",
    },
  ],
  dynamicAdjustmentRules: [
    {
      condition: "correct_review_reproduction_rate_high",
      action: "temporarily_reduce_correct_review_ratio",
      reason: "If the student repeatedly reproduces correct answers, reduce repeated checks and give more room to new or challenge questions.",
    },
    {
      condition: "wrong_retry_load_high",
      action: "increase_wrong_retry_ratio_and_reduce_new_questions",
      reason: "If many items are still unsolved, stabilize before pushing new content.",
    },
    {
      condition: "challenge_success_high",
      action: "increase_challenge_or_step_extension_ratio",
      reason: "If challenge questions are handled well, the system can test whether the student is ready to move faster.",
    },
  ],
  allocationAlgorithm: {
    strategy: "explainable_rule_engine_first",
    observationWindow: "last_3_practice_sessions",
    buckets: {
      wrong_retry: {
        defaultRatio: 0.4,
        minRatio: 0.2,
        maxRatio: 0.6,
      },
      correct_review: {
        defaultRatio: 0.25,
        minRatio: 0.05,
        maxRatio: 0.3,
      },
      new_stage_questions: {
        defaultRatio: 0.25,
        minRatio: 0.15,
        maxRatio: 0.45,
      },
      challenge_extension: {
        defaultRatio: 0.1,
        minRatio: 0,
        maxRatio: 0.2,
      },
    },
    signals: [
      "wrongRate",
      "retrySuccessRate",
      "correctReproductionRate",
      "repeatedCorrectThenWrongRate",
      "hintFreeCorrectRate",
      "hintDepthAverage",
      "fastGuessRate",
      "slowAccurateRate",
      "variantTransferRate",
      "independentControlledVariantStabilityRate",
      "voluntaryPracticeCount",
      "challengeSuccessRate",
      "independentChallengeTransferEvidenceCount",
      "independentChallengeTransferSuccessRate",
      "fatigueSignal",
    ],
    dailyMaxChange: 0.1,
    rules: [
      {
        when: "wrongRate_high_or_retrySuccessRate_low",
        adjust: {
          wrong_retry: "+0.10_to_+0.20",
          new_stage_questions: "-0.05_to_-0.15",
          challenge_extension: "-0.05",
        },
      },
      {
        when: "correctReproductionRate_high",
        adjust: {
          correct_review: "-0.05_to_-0.15",
          new_stage_questions: "+0.05_to_+0.10",
          challenge_extension: "+0_to_+0.05",
        },
      },
      {
        when: "correctReproductionRate_low",
        adjust: {
          correct_review: "+0.05_to_+0.10",
          new_stage_questions: "-0.05",
        },
      },
      {
        when: "repeated_correct_then_wrong_pattern",
        profileSignal: "guessing_tendency",
        adjust: {
          correct_review: "+0.05_to_+0.10",
          wrong_retry: "+0.05",
          new_stage_questions: "-0.05_to_-0.10",
          challenge_extension: "-0.05",
        },
      },
      {
        when: "hintDepthAverage_high_or_hintFreeCorrectRate_low",
        adjust: {
          wrong_retry: "+0.05_to_+0.10",
          challenge_extension: "-0.05",
        },
      },
      {
        when: "independentControlledVariantStabilityRate_high_with_two_or_more_observations_and_hintFreeCorrectRate_high",
        adjust: {
          new_stage_questions: "+0.05",
          challenge_extension: "+0.05",
          correct_review: "-0.05",
        },
      },
      {
        when: "fastGuessRate_high",
        adjust: {
          wrong_retry: "+0.05",
          correct_review: "+0.05",
          new_stage_questions: "-0.05",
          challenge_extension: "-0.05",
        },
      },
      {
        when: "fatigueSignal_high",
        adjust: {
          challenge_extension: "-0.05_to_-0.10",
          new_stage_questions: "no_increase",
        },
      },
      {
        when: "voluntaryPracticeCount_high_and_independentChallengeTransferEvidenceCount_at_least_two_and_independentChallengeTransferSuccessRate_high",
        adjust: {
          challenge_extension: "+0.05",
          new_stage_questions: "+0.05",
        },
      },
    ],
    normalization: "After adjustments, clamp each bucket to min/max and normalize total to 100%.",
    smoothing:
      "Each bucket can change by at most 10 percentage points per day to avoid sudden difficulty shifts.",
    guardrail:
      "If correct answers repeatedly become wrong during reproduction, record it as a backend guessing-tendency profile signal. Do not expose this as a harsh student-facing label. Hint-supported challenge completion can retain help but cannot raise challenge pacing; only independent verified transfer can do that. ML can later optimize ratios and ordering, but cannot bypass question legality boundaries or update the dynamic learning curve directly.",
  },
  guardrail:
    "The default mix is a starting recipe, not a fixed rule. The core education method should be rule-defined first; machine learning can later optimize proportions, ordering, and timing.",
};

export const psychologicalPersonalityLibrary = {
  id: "psychological-personality-logic",
  version: "psychological-personality-support-v1",
  name: "心理性格测试 v1：学习支持测评",
  purpose: "generate_learning_support_personality_questions",
  professionalAnchors: [
    "Big Five / OCEAN",
    "OECD social and emotional skills",
    "CASEL social and emotional learning",
  ],
  dimensions: [
    {
      id: "exploration_curiosity",
      name: "探索与好奇",
      mapsTo: ["Big Five openness", "OECD open-mindedness"],
      systemActions: ["variant_challenge_access", "knowledge_atlas_extension", "exploration_prompt_frequency"],
    },
    {
      id: "self_management",
      name: "自我管理",
      mapsTo: ["Big Five conscientiousness", "CASEL self-management"],
      systemActions: ["task_chunking", "reminder_frequency", "daily_start_design"],
    },
    {
      id: "frustration_recovery",
      name: "挫折恢复",
      mapsTo: ["Big Five emotional stability", "CASEL self-awareness"],
      systemActions: ["wrong_answer_feedback_intensity", "recovery_task", "difficulty_ramp_speed"],
    },
    {
      id: "interaction_help_seeking",
      name: "互动与求助",
      mapsTo: ["Big Five extraversion", "CASEL relationship skills"],
      systemActions: ["teacher_parent_message_timing", "ai_response_frequency", "independent_thinking_window"],
    },
    {
      id: "feedback_receptivity",
      name: "接受反馈方式",
      mapsTo: ["Big Five agreeableness", "CASEL responsible decision-making"],
      systemActions: ["feedback_tone", "hint_layer_default", "guided_steps_availability"],
    },
  ],
  itemPolicy: {
    combinedWithLearningTendencyMaxItems: 12,
    plannedPsychologicalItems: 6,
    plannedLearningTendencyItems: 6,
    minEvidencePerDimension: 1,
    lowConfidencePolicy:
      "Do not extend onboarding beyond 12 items. Mark low-confidence dimensions and refine them later through learning behavior and lightweight micro-checks.",
    longTermProfileSource:
      "The onboarding result is only the initial seed. The system continuously refines profile dimensions from practice behavior, hint usage, retry behavior, variant transfer, review choices, voluntary practice, and observer input.",
    studentProgressDisplay: "fuzzy_progress_only",
  },
  stopRules: [
    "The combined psychological + learning personality onboarding test must not exceed 12 items.",
    "Each product dimension should receive at least one direct scenario signal during onboarding when possible.",
    "Low-confidence or conflicting dimensions are flagged for later behavior-based refinement, not extra onboarding questions.",
    "If fatigue signal is high, stop early and let later behavior data refine the profile.",
  ],
  continuousRefinementSignals: [
    "answer_time_pattern",
    "hint_depth",
    "hint_free_retry_success",
    "wrong_question_retry_choice",
    "same_type_extra_practice_choice",
    "harder_variant_choice",
    "variant_transfer_success",
    "knowledge_atlas_open_or_skip",
    "practice_detail_open_or_close",
    "session_time_pattern",
    "parent_teacher_observation",
  ],
  sceneTypes: [
    "new_task_or_new_topic",
    "long_task_start",
    "unexpected_low_result",
    "needing_help",
    "receiving_correction",
    "choosing_next_action_after_mistake",
  ],
  optionTypes: [
    "try_to_analyze_independently",
    "ask_for_companion_analysis",
    "take_recovery_pause",
    "switch_to_easier_task",
    "request_light_hint",
    "request_step_guidance",
  ],
  generationRule:
    "用生活和校园场景生成题目，不直接问人格标签。每道题必须映射到一个产品维度、选项类型、评分规则和系统动作。",
  guardrail:
    "心理性格测试只用于学习支持和沟通策略，不做疾病筛查、人格定论或公开标签。学生端不显示后台风险标签；结果只是初始假设，后续由真实学习行为校正。",
};

export const personalityLogicLibrary = {
  id: "learning-personality-logic-v1",
  purpose: "generate_learning_personality_questions",
  dimensions: [
    "hint_dependency",
    "challenge_tolerance",
    "expression_preference",
    "error_response",
    "self_review_tendency",
  ],
  productDimensions: [
    {
      id: "hint_dependency",
      name: "提示依赖度",
      systemActions: ["hint_layer_default", "early_solution_guardrail", "independent_retry_window"],
    },
    {
      id: "challenge_tolerance",
      name: "挑战耐受度",
      systemActions: ["variant_ramp_speed", "challenge_access_timing", "recovery_question_ratio"],
    },
    {
      id: "expression_preference",
      name: "表达偏好",
      systemActions: ["question_explanation_format", "hint_format", "knowledge_atlas_format"],
    },
    {
      id: "error_response",
      name: "错误反应",
      systemActions: ["wrong_answer_feedback_strategy", "redo_entry", "same_type_recommendation"],
    },
    {
      id: "self_review_tendency",
      name: "自主复盘倾向",
      systemActions: ["atlas_exposure_level", "review_prompt_style", "summary_depth"],
    },
  ],
  sceneTypes: [
    "wrong_answer",
    "hard_question",
    "hint_choice",
    "review_after_practice",
    "variant_exploration",
    "daily_task_completion",
  ],
  optionTypes: [
    "try_again_independently",
    "open_light_hint",
    "step_by_step_guidance",
    "see_full_solution",
    "switch_to_easier_variant",
    "try_harder_variant",
  ],
  onboardingItems: [
    {
      id: "learning_personality_1",
      dimension: "hint_dependency",
      sceneType: "hint_choice",
      prompt: "一道题卡住了，你希望系统先怎么帮你？",
      options: ["让我自己再试一下", "给我一个很轻的提示", "一步一步带我做", "先看完整解析"],
    },
    {
      id: "learning_personality_2",
      dimension: "error_response",
      sceneType: "wrong_answer",
      prompt: "连续错了两次，你下一步更想怎么做？",
      options: ["原题再做一次", "看看之前类似题", "做简单一点的", "先跳过，等会儿再说"],
    },
    {
      id: "learning_personality_3",
      dimension: "challenge_tolerance",
      sceneType: "variant_exploration",
      prompt: "刚做对一类题，系统让你选下一步，你会选？",
      options: ["再稳几道", "换一个数字", "换两个数字", "来一道更难的"],
    },
    {
      id: "learning_personality_4",
      dimension: "expression_preference",
      sceneType: "hint_choice",
      prompt: "你更容易看懂哪种帮助？",
      options: ["一句话提示", "图示关系", "分步骤", "类似例题"],
    },
    {
      id: "learning_personality_5",
      dimension: "self_review_tendency",
      sceneType: "review_after_practice",
      prompt: "今天练完后，你更愿意看什么？",
      options: ["只看结果", "看错题", "看知识图鉴", "看自己进步图"],
    },
    {
      id: "learning_personality_6",
      dimension: "error_response",
      sceneType: "wrong_answer",
      prompt: "一道题你觉得自己会，但又错了，你更可能怎么做？",
      options: ["马上重做", "找哪里看错", "要一个提示", "换一题先做"],
    },
  ],
  scoringRules: [
    {
      sceneType: "wrong_answer",
      optionType: "try_again_independently",
      effects: { hint_dependency: -0.16, error_response_retry: 0.2, answer_dependency_risk: -0.1 },
    },
    {
      sceneType: "wrong_answer",
      optionType: "open_light_hint",
      effects: { hint_dependency: 0.06, challenge_tolerance: 0.08, hint_fit: 0.15 },
    },
    {
      sceneType: "wrong_answer",
      optionType: "step_by_step_guidance",
      effects: { expression_preference_steps: 0.18, hint_dependency: 0.1 },
    },
    {
      sceneType: "wrong_answer",
      optionType: "see_full_solution",
      effects: { answer_dependency_risk: 0.18, challenge_tolerance: -0.08 },
    },
  ],
  confidenceRule:
    "Page 04 is the second layer of personality testing, not subject ability testing. It produces an initial learning personality seed; low-confidence dimensions are refined by later practice behavior instead of adding more onboarding questions.",
  generationRule:
    "根据学生年龄、阅读舒适度和历史行为生成学习场景题；题面可变，但维度和评分映射保持稳定。Subject ability questions are generated only after subject selection.",
};

export const basicBioInfo = {
  studentId,
  birthday: "2014-03-18",
  age: 12,
  grade: "六年级",
  schoolCalendarStage: "暑期提升",
  sleepPattern: "22:30 前睡觉，早晨注意力较好",
  attentionSpanMinutes: 25,
  readingComfort: "长题干需要更明显的分段和关键词提示",
  primaryDevice: "iPad",
  notes: "基本生理信息只用于估计任务强度、界面密度和学习节奏，不直接判断能力。",
  dataModel: {
    optionCatalogSource: "basicInfoOptionCatalog",
    fieldMapSource: "basicInfoFieldMap",
    databaseTables: ["student_basic_info", "student_learning_context", "student_derived_baseline"],
    sourceRule: "Parent / teacher can prefill; student confirms or adjusts before tests.",
  },
};

export const onboardingDataModel = {
  basicInfoOptionCatalog,
  basicInfoFieldMap,
  onboardingDataFlow,
  studentBasicInfoRecord,
  studentLearningContextRecord,
  studentDerivedBaselineRecord,
};

export const optionalBirthdayCultureModel = {
  enabled: true,
  modelName: "生日文化模型",
  source: "周易/生日分析可选参考",
  confidence: "low",
  role: "初始画像启发式参数",
  hypotheses: [
    "可能更适合短周期反馈，而不是长时间单向讲解。",
    "遇到抽象表达时需要先给结构，再进入细节。",
    "对任务节奏的稳定性较敏感，适合固定时间段学习。",
  ],
  guardrail:
    "该模型只提出初始观察假设，不能直接决定学生性格或能力；后续以测试结果和行为数据校正。",
};

export const personalityAssessment = {
  assessmentId: "personality-20260709-001",
  logicLibraryId: "personality-learning-style-logic",
  studentId,
  completedAt: "2026-07-09T09:12:00-07:00",
  dimensions: [
    {
      id: "feedback_preference",
      name: "反馈偏好",
      score: 0.78,
      label: "短反馈 + 具体下一步",
      evidence: "学生更容易接受一句明确提示，而不是长篇解释。",
    },
    {
      id: "challenge_tolerance",
      name: "挑战耐受",
      score: 0.58,
      label: "中等挑战",
      evidence: "连续两题失败后需要降低变化幅度或增加轻提示。",
    },
    {
      id: "pace_preference",
      name: "节奏偏好",
      score: 0.72,
      label: "短任务连续推进",
      evidence: "25-30 分钟任务完成度更高。",
    },
    {
      id: "interface_density",
      name: "页面密度",
      score: 0.44,
      label: "中低信息密度",
      evidence: "练习页应突出题目、答案和提示，减少同时展示的信息。",
    },
  ],
  summary: "适合步骤化提示、短任务反馈和中等难度挑战。",
};

export const subjectSelection = {
  studentId,
  subjectId,
  subjectName: "数学",
  targetKnowledgeCluster: "小学数学（G1-G6）",
  selectedFrom: "supportedSubjects",
  assessmentModuleId: "assessment-math-linear-equations",
  selectedAt: "2026-07-09T09:16:00-07:00",
};

export const professionalAbilityAssessment = {
  assessmentId: "math-baseline-20260709-001",
  moduleId: "assessment-math-linear-equations",
  purpose: "initial_baseline",
  studentId,
  subjectId,
  completedAt: "2026-07-09T09:32:00-07:00",
  resultSummary: "基础计算稳定，应用题读题和等量关系提取不稳定。",
  sampleSize: {
    questions: 12,
    minutes: 22,
  },
  dimensions: [
    {
      id: "concept",
      name: "方程概念",
      score: 0.68,
      level: "接近掌握",
      evidence: "知道可以设 x，但遇到差值关系时容易漏条件。",
    },
    {
      id: "reading",
      name: "读题与信息提取",
      score: 0.46,
      level: "需要补弱",
      evidence: "长题干中容易先处理数字，忽略题目最终问什么。",
    },
    {
      id: "equation_building",
      name: "等量关系与列式",
      score: 0.52,
      level: "不稳定",
      evidence: "总价、差值、数量三个条件同时出现时错误率升高。",
    },
    {
      id: "calculation",
      name: "计算稳定性",
      score: 0.82,
      level: "稳定",
      evidence: "一元一次方程求解正确率较高。",
    },
    {
      id: "transfer",
      name: "变式迁移",
      score: 0.48,
      level: "需要练习",
      evidence: "换数字可以完成，换条件或换题干表达后正确率下降。",
    },
    {
      id: "hint_dependency",
      name: "提示依赖",
      score: 0.56,
      level: "中等",
      evidence: "打开 2 层提示后通常能继续推进。",
    },
  ],
};

export const professionalAbilityEvidence = [
  {
    questionId: "baseline-q1",
    answeredCorrectly: true,
    responseTimeSeconds: 42,
    dimensionScores: [
      { dimensionId: "concept", value: 0.72, weight: 1 },
      { dimensionId: "calculation", value: 0.86, weight: 1 },
    ],
  },
  {
    questionId: "baseline-q2",
    answeredCorrectly: false,
    responseTimeSeconds: 35,
    dimensionScores: [
      { dimensionId: "reading", value: 0.42, weight: 1.3 },
      { dimensionId: "concept", value: 0.62, weight: 0.7 },
    ],
  },
  {
    questionId: "baseline-q3",
    answeredCorrectly: true,
    responseTimeSeconds: 68,
    dimensionScores: [
      { dimensionId: "equation_building", value: 0.58, weight: 1.2 },
      { dimensionId: "calculation", value: 0.78, weight: 0.8 },
    ],
  },
  {
    questionId: "baseline-q4",
    answeredCorrectly: false,
    responseTimeSeconds: 91,
    dimensionScores: [
      { dimensionId: "transfer", value: 0.44, weight: 1.2 },
      { dimensionId: "equation_building", value: 0.5, weight: 0.8 },
    ],
  },
  {
    questionId: "baseline-q5",
    answeredCorrectly: true,
    responseTimeSeconds: 74,
    dimensionScores: [
      { dimensionId: "hint_dependency", value: 0.56, weight: 1 },
      { dimensionId: "transfer", value: 0.52, weight: 0.7 },
    ],
  },
];

export const initialAbilityQuestionSet = [
  {
    id: "baseline-q1",
    stage: "基础概念",
    targetDimension: "方程概念",
    prompt: "小明买了 3 支相同的笔，一共 18 元。每支笔多少钱？",
    checks: ["是否会把未知数量看成 x", "是否理解总价和单价的关系"],
    expectedSignal: "能直接完成，说明基础数量关系较稳定。",
  },
  {
    id: "baseline-q2",
    stage: "读题提取",
    targetDimension: "读题与信息提取",
    prompt: "甲数比乙数多 8，两个数一共 38。题目最终要求什么？",
    checks: ["是否先看问题", "是否区分已知条件和目标"],
    expectedSignal: "如果先算数字而不回答目标，说明读题阶段易跳步。",
  },
  {
    id: "baseline-q3",
    stage: "标准列式",
    targetDimension: "等量关系与列式",
    prompt: "一个数的 3 倍加 5 等于 26。请列出方程。",
    checks: ["是否能设 x", "是否能把文字条件转成方程"],
    expectedSignal: "列式正确但解释不清，说明概念有基础但表达需练习。",
  },
  {
    id: "baseline-q4",
    stage: "变式迁移",
    targetDimension: "变式迁移",
    prompt: "把上一题改成“3 倍少 5 等于 25”，方程应该怎样变？",
    checks: ["换条件后是否仍能迁移", "是否只机械套原题"],
    expectedSignal: "换条件出错，说明不能直接推进到复杂变式。",
  },
  {
    id: "baseline-q5",
    stage: "提示反应",
    targetDimension: "提示依赖",
    prompt: "如果你卡住了，系统先只提示“找等量关系”，你能继续吗？",
    checks: ["需要几层提示", "是否能从轻提示恢复"],
    expectedSignal: "轻提示后能推进，说明适合“先试 + 一层提示”的练习节奏。",
  },
];

export const abilityMap = {
  studentId,
  subjectId,
  generatedFrom: professionalAbilityAssessment.assessmentId,
  generatedAt: "2026-07-09T09:35:00-07:00",
  overallLevel: 0.58,
  targetReadiness: 0.52,
  dimensions: professionalAbilityAssessment.dimensions,
  strengths: ["基础计算稳定", "轻提示后能继续推进", "换数字题已接近稳定"],
  weakPoints: ["读题阶段易跳步", "等量关系提取不稳定", "换条件题迁移弱"],
  watchList: ["过快处理数字", "漏掉差值条件", "连续失败后提示依赖上升"],
};

export const learningGoal = {
  goalId: "goal-linear-equations-6w",
  studentId,
  subjectId,
  title: "6 周数学学习计划",
  selectedBy: ["student", "parent"],
  targetType: "grade_level_equivalent",
  targetDescription: "向小学六年级数学目标稳步推进",
  targetGrade: "G6",
  targetLevel: 0.88,
  currentBaseline: abilityMap.overallLevel,
  initialGapToTarget: 0.3,
  durationWeeks: 6,
  currentWeek: 1,
  dailyStudyMinutes: 30,
  weeklyStudyDays: 5,
  totalPlannedMinutes: 900,
  priority: "先稳住数学关系理解，再逐步提高变式迁移",
  milestoneTests: [
    { week: 2, title: "基础列式小测" },
    { week: 4, title: "换条件变式小测" },
    { week: 6, title: "综合应用题测评" },
  ],
};

export const statisticalBaseline = {
  baselineId: "baseline-cn-grade6-linear-equation",
  matchedBy: ["age", "grade", "subject", "targetKnowledgeCluster"],
  peerGroup: "同年龄/同年级/同目标学生",
  referenceWeeklyMinutes: 150,
  referenceCycleWeeks: 6,
  referenceLevelGain: 0.3,
  expectedWeeklyGrowth: [0.08, 0.1, 0.09, 0.08, 0.07, 0.06],
  commonWeakPoints: ["读题跳步", "差值关系漏条件", "变式迁移不稳定"],
  commonRecoveryPattern:
    "每天 25-35 分钟、每周 5 天练习时，通常第 2-3 周出现列式稳定，第 4 周开始观察迁移。",
};

export const initialLearningCurve = {
  curveId: "curve-initial-20260709-001",
  studentId,
  generatedAt: "2026-07-09T09:42:00-07:00",
  sourceInputs: [
    "basicBioInfo",
    "personalityAssessment",
    "professionalAbilityAssessment",
    "abilityMap",
    "learningGoal",
    "statisticalBaseline",
    "optionalBirthdayCultureModel",
  ],
  initialCurve: [0.58, 0.64, 0.7, 0.76, 0.82, 0.88],
  adjustedCurve: [0.58, 0.64, 0.7, 0.76, 0.82, 0.88],
  gapCurve: [0.3, 0.24, 0.18, 0.12, 0.06, 0],
  progressCurve: [0.7, 0.76, 0.82, 0.88, 0.94, 1],
  dynamicProgressCurve: [0.7, 0.78, 0.85, 0.91, 0.98, 1.04],
  internalAxisMeaning: "gap_to_target",
  displayAxisMeaning: "progress_toward_target",
  currentPoint: {
    week: 1,
    level: 0.58,
    gapToTarget: 0.3,
    progressTowardTarget: 0.7,
  },
  assumptions: [
    "目标由学生确认；已关联家长可以共同参与，系统根据测试起点计算差距。",
    "每天 30 分钟、每周 5 天可支撑 6 周目标。",
    "第 1-2 周优先修复读题和等量关系提取。",
    "第 3 周后逐步增加换条件和换表达题。",
  ],
  aheadOfPlanOptions: [
    {
      id: "keep_original_goal",
      title: "继续原目标",
      result: "预计 5 周达成",
      description: "目标不变，学习时间缩短，后续任务以巩固和轻复测为主。",
      isDefault: false,
    },
    {
      id: "keep_study_intensity",
      title: "强度不变",
      result: "目标提高到 104%",
      description: "默认选择。每日学习时长和每周频率不变，把多出来的能力空间用于更高阶变式。",
      isDefault: true,
    },
  ],
  updatePolicy: {
    dailyPracticeAffects: ["next_question_logic", "variant_level", "hint_strategy", "daily_task_sequence"],
    curveUpdatesOnlyFrom: ["stage_test", "dynamic_calibration_test", "targeted_retest"],
    assessmentCadence: {
      configuredBy: ["parent", "teacher"],
      suggestedAfterPracticeDays: assessmentCadenceConfig.defaults.suggestedAfterPracticeDays,
      mandatoryAfterPracticeDays: assessmentCadenceConfig.defaults.mandatoryAfterPracticeDays,
      defaultIntervalDays: 7,
      skipPolicy: "学生可以跳过建议测试，但到强制测试窗口必须完成。",
      nextSuggestedTest: "连续练习 3 天后建议小测",
      nextMandatoryTest: "连续练习 10 天内必须完成一次阶段测试",
    },
    reason:
      "每日练习有状态波动，只用于调整下一次出题；动态曲线必须等正式测试确认水平后再更新。",
  },
  guardrail:
    "每日练习只影响下一次出题逻辑；动态曲线只能由阶段测试、动态校准测试或专项复测发起更新。",
};

export const learningPlan = {
  target: learningGoal.title,
  durationWeeks: learningGoal.durationWeeks,
  currentWeek: 1,
  initialCurve: initialLearningCurve.initialCurve,
  adjustedCurve: initialLearningCurve.adjustedCurve,
  adjustmentReason: [
    "当前为初始静态曲线，尚未经过真实学习行为校正。",
    "先用入学测试和统计基准生成第一版每日任务。",
    "每日练习数据用于调整下一次出题逻辑；曲线更新必须等待阶段测试或校准测试。",
  ],
  stages: [
    {
      weekRange: "第 1-2 周",
      focus: "读题、设未知数、基础列式",
      targetLevel: 0.7,
    },
    {
      weekRange: "第 3-4 周",
      focus: "换数字、换条件、换题干表达",
      targetLevel: 0.8,
    },
    {
      weekRange: "第 5-6 周",
      focus: "多步骤综合题和迁移题",
      targetLevel: 0.88,
    },
  ],
};

export const dailyTasks = {
  date: today,
  generatedFrom: initialLearningCurve.curveId,
  entryPoints: ["home", "calendar", "menu", "curve"],
  focus: "数学关系与问题解决",
  estimatedMinutes: learningGoal.dailyStudyMinutes,
  rationale: [
    "多维能力图显示读题与信息提取是当前需要支持的地方。",
    "静态曲线第 1 周先稳住数学关系理解。",
    "每天 30 分钟任务应控制在错题回访 + 主练习 + 轻变式。",
  ],
  tasks: [
    {
      id: "task-review-001",
      type: "review",
      title: "错题回访",
      description: "复盘入学测试中“总数 + 差值”题型。",
      estimatedMinutes: 6,
      status: "done",
      statusLabel: "完成",
    },
    {
      id: "task-practice-001",
      type: "practice",
      title: "数学问题练习",
      description: "先做题，错后看 steps 和分层提示。",
      estimatedMinutes: 16,
      status: "current",
      statusLabel: "进行",
    },
    {
      id: "task-variant-001",
      type: "variant",
      title: "变式练习",
      description: "先换 1 个数字，再观察是否能独立列式。",
      estimatedMinutes: 8,
      status: "next",
      statusLabel: "待做",
    },
  ],
};

export const questionLogic = [
  {
    id: "logic-linear-total-difference",
    subjectId,
    knowledgePoint: "一次方程应用题",
    questionType: "总数 + 差值",
    targetSkill: "从题干中找到等量关系",
    progressionRule: [
      "原题重复",
      "不变数字再做",
      "换 1 个数字",
      "换 2 个数字",
      "换表达方式",
      "增加 1 个步骤",
      "迁移到相关题型",
    ],
    advanceWhen: "答对、用时稳定、提示深度不超过 2 层",
    holdWhen: "答对但提示深度较深，或答题时间明显偏长",
    stepBackWhen: "答错、过快答错、连续漏掉同一条件",
  },
];

export const questions = [
  {
    id: "q-linear-001",
    logicId: "logic-linear-total-difference",
    variantLevel: "original",
    knowledgePoint: "一次方程应用题",
    purpose: "练习从题干中找到等量关系",
    prompt: "一支钢笔和 3 支铅笔一共 21 元。钢笔比一支铅笔贵 9 元。一支铅笔多少钱？",
    answer: 3,
    unit: "元",
    steps: ["找逻辑关系", "读题翻译", "设未知数", "列方程", "求解", "检查"],
    diagnosticTags: ["读题", "差值关系", "总价关系", "列方程"],
    solutionStrategies: [
      {
        id: "algebra",
        name: "代数法",
        bestFor: "适合已经能接受 x 和方程的学生。",
        steps: ["设铅笔为 x", "表示钢笔为 x + 9", "列出 (x + 9) + 3x = 21", "解出 x = 3"],
      },
      {
        id: "bar_model",
        name: "画图法",
        bestFor: "适合需要把数量关系看出来的学生。",
        steps: ["画 3 份铅笔", "钢笔画成 1 份铅笔再多 9", "总长度是 21", "先去掉多出的 9，再平均分成 4 份"],
      },
      {
        id: "logical_trial",
        name: "有逻辑的试猜",
        bestFor: "适合还没稳定掌握方程，但能用关系验证答案的学生。",
        steps: ["从可能的铅笔价格开始试", "用铅笔 + 9 得到钢笔价格", "检查钢笔 + 3 支铅笔是否等于 21", "找到满足两个关系的数"],
      },
    ],
    previousAttemptReference: {
      recallKind: "previous_independent_correct_attempt",
      intro: "你之前做过相近的关系，可以先回忆一下当时的思路。",
      sourcePrompt: "一支钢笔和 3 支铅笔一共 21 元。钢笔比一支铅笔贵 9 元。一支铅笔多少钱？",
      studentAnswer: "3 元",
      availableBeforeHints: true,
    },
    guidedMode: {
      available: true,
      purpose: "Train the student to follow the correct problem-solving flow step by step.",
      exportResult: true,
      steps: [
        {
          id: "translate_goal",
          prompt: "题目问的是什么？",
          expected: "一支铅笔多少钱",
        },
        {
          id: "find_relationships",
          prompt: "题目里有哪些相等关系？",
          expected: "钢笔 + 3 支铅笔 = 21；钢笔 = 铅笔 + 9",
        },
        {
          id: "define_unknown",
          prompt: "把哪个数量设为 x？",
          expected: "设一支铅笔为 x 元",
        },
        {
          id: "build_equation",
          prompt: "根据相等关系列出方程。",
          expected: "(x + 9) + 3x = 21",
        },
        {
          id: "solve",
          prompt: "解出 x。",
          expected: "x = 3",
        },
        {
          id: "check_and_export",
          prompt: "把答案放回题目检查，并导出完整过程。",
          expected: "钢笔 12 元，3 支铅笔 9 元，一共 21 元；一支铅笔 3 元",
        },
      ],
    },
    hints: [
      {
        level: 1,
        title: "提示 1：先找相等关系",
        body: "先不要急着算数字。这里有两个关系：钢笔 + 3 支铅笔 = 21；钢笔 = 铅笔 + 9。题目问一支铅笔多少钱。",
      },
      {
        level: 2,
        title: "提示 2：选择一个未知数",
        body: "可以先把一支铅笔的价格设为 x 元。这样钢笔价格就可以表示成 x + 9。",
      },
      {
        level: 3,
        title: "提示 3：列出等量关系",
        body: "一支钢笔和 3 支铅笔一共 21 元，所以 (x + 9) + 3x = 21。",
      },
      {
        level: 4,
        title: "提示 4：展示部分过程",
        body: "合并同类项得到 4x + 9 = 21，再把 9 移到右边。",
      },
      {
        level: 5,
        title: "完整解析",
        body: "4x + 9 = 21，4x = 12，x = 3。所以一支铅笔 3 元。",
      },
    ],
    variants: [
      {
        id: "q-linear-001-v1",
        variantLevel: "change_one_number",
        prompt: "一支钢笔和 3 支铅笔一共 25 元。钢笔比一支铅笔贵 9 元。一支铅笔多少钱？",
        answer: 4,
        changeReason: "只改变总价，观察学生是否真正会列方程。",
      },
      {
        id: "q-linear-001-v2",
        variantLevel: "change_two_numbers",
        prompt: "一支钢笔和 4 支铅笔一共 34 元。钢笔比一支铅笔贵 10 元。一支铅笔多少钱？",
        answer: 6,
        changeReason: "改变数量和差值，观察学生是否能重新建立等量关系。",
      },
    ],
  },
];

export const questionSessions = [
  {
    sessionId: "qs-20260709-001",
    studentId,
    taskId: "task-practice-001",
    questionId: "q-linear-001",
    startedAt: "2026-07-09T10:04:00-07:00",
    completedAt: null,
    attempts: [],
    highestHintLevelOpened: 0,
    recommendationState: "original",
  },
];

export const behaviorEvents = [
  {
    eventId: "event-20260709-001",
    studentId,
    subjectId,
    sessionId: "session-20260709-morning",
    eventType: "onboarding_completed",
    timestamp: "2026-07-09T09:42:00-07:00",
    page: "onboarding",
    targetId: "curve-initial-20260709-001",
    payload: {
      subjectId,
      abilityMapId: abilityMap.generatedFrom,
      dailyStudyMinutes: learningGoal.dailyStudyMinutes,
      weeklyStudyDays: learningGoal.weeklyStudyDays,
    },
  },
  {
    eventId: "event-20260709-002",
    studentId,
    subjectId,
    sessionId: "session-20260709-morning",
    eventType: "training_opened",
    timestamp: "2026-07-09T10:00:00-07:00",
    page: "home",
    targetId: "training-practice-001",
    payload: {
      subjectId,
      entryPoint: "home",
    },
  },
];

export const knowledgeAtlas = {
  atlasId: "atlas-linear-equations-student-001",
  studentId,
  subjectId,
  mode: "personal_map_plus_library",
  knowledgePoint: "小学数学知识地图",
  professionalDefinition: "把数学知识按年级、关系和方法组织起来，并通过做题形成可验证的理解。",
  studentUnderstanding: "不能一看到数字就算，要先看题目问什么，再找数量之间的关系。",
  aiSummary: "学生正在形成先读题、找关系、再计算的数学思路。",
  masteryState: "初始练习中",
  examples: {
    wrong: "直接平均分配总价。",
    correct: "换数字后能独立列式。",
    breakthrough: "换条件后仍能找到等量关系。",
  },
  timeline: [
    "入学测试：会求解方程，但读题时容易漏条件。",
    "第一次练习：先尝试原题，观察是否能找到等量关系。",
    "下一步：答对原题后进入换 1 个数字的变式。",
  ],
  library: {
    purpose: "Let students explore known and new knowledge points like a library, not only review what practice has already touched.",
    clusters: [
      {
        id: "linear_equation_word_problems",
        title: "一次方程应用题",
        status: "current",
        nodes: [
          {
            id: "quantity_total_difference",
            title: "总量与差值关系",
            status: "practiced",
            questionLogicIds: ["quantity_total_difference"],
            sampleQuestionIds: ["q-linear-001"],
            wrongQuestionSet: [
              {
                questionId: "q-linear-001-original-20260708",
                prompt: "一支钢笔和 3 支铅笔一共 21 元。钢笔比一支铅笔贵 9 元。一支铅笔多少钱？",
                studentAnswer: "平均分成 4 份",
                correctAnswer: "3 元",
                errorTags: ["直接处理数字", "没有先找相等关系"],
                retryState: "needs_original_retry",
                nextAction: "先原题重做，再进入换 1 个数字。",
              },
            ],
          },
          {
            id: "price_quantity_total",
            title: "单价、数量、总价",
            status: "available",
            questionLogicIds: ["price_quantity_total"],
            sampleQuestionIds: [],
          },
          {
            id: "linear_expression_text_to_equation",
            title: "文字转方程",
            status: "available",
            questionLogicIds: ["linear_expression_text_to_equation"],
            sampleQuestionIds: [],
          },
          {
            id: "ratio_relation_intro",
            title: "比例关系入门",
            status: "locked_preview",
            questionLogicIds: [],
            sampleQuestionIds: [],
          },
        ],
      },
    ],
  },
};

export const knowledgePuzzleMap = createBaseKnowledgePuzzleMap({ studentId, subjectId });

export const reportSummary = {
  reportId: "report-student-20260709",
  studentId,
  generatedFrom: ["abilityMap", "initialLearningCurve", "behaviorEvents"],
  framework: "docs/report-framework.md",
  visualStats: {
    studyMinutesThisWeek: 142,
    averageDailyMinutes: 28,
    overallCorrectRate: 0.72,
    peerPercentile: 0.64,
    peerComparisonLabel: "同目标学生中等偏上",
    abilityTrend: [
      { dimension: "读题翻译", previous: 0.38, current: 0.46 },
      { dimension: "相等关系", previous: 0.44, current: 0.52 },
      { dimension: "列方程", previous: 0.48, current: 0.56 },
      { dimension: "计算", previous: 0.8, current: 0.82 },
      { dimension: "变式迁移", previous: 0.4, current: 0.48 },
    ],
    chartTypes: ["study_time_bar", "correct_rate_line", "peer_level_badge", "ability_trend_radar"],
  },
  reportCards: [
    "current_level_and_goal_gap",
    "static_dynamic_curve",
    "study_time",
    "accuracy_and_reproduction",
    "ability_dimension_trends",
    "next_actions",
  ],
  progress: "已完成入学测试，系统生成了第一条静态学习曲线。当前优先补强读题和等量关系提取。",
  problem: "初始能力图显示：计算稳定，但长题干和差值关系容易导致列式错误。",
  nextStep: "今天先完成原题练习。若能在 2 层提示以内做对，下一题进入换 1 个数字的变式。",
  studentFacingTone: "给方向，不贴标签。",
};

export const messages = [
  {
    id: "message-teacher-001",
    fromRole: "teacher",
    toStudentId: studentId,
    createdAt: "2026-07-09T09:50:00-07:00",
    title: "今天先稳住读题",
    body: "做题前先说一句：题目问的是什么。这个动作比直接算更重要。",
    linkedTrainingId: "training-practice-001",
  },
];

export const settings = {
  studentId,
  avatarUrl: null,
  displayName: "林安",
  theme: "focus-light",
  informationDensity: "medium-low",
  preferredStudyWindow: "09:30-10:00",
};

export const studentProfile = {
  id: studentId,
  name: settings.displayName,
  goal: learningGoal.title,
  currentLevel: abilityMap.overallLevel,
  streakDays: 18,
  commonHintDepth: 2,
  strengths: abilityMap.strengths,
  weaknesses: abilityMap.weakPoints,
  learningStyle: personalityAssessment.dimensions.map((dimension) => dimension.label),
  behaviorTags: abilityMap.watchList,
  currentSuggestion: "先拆目标，再处理数字。",
  initialProfile: {
    onboardingDataModel,
    basicBioInfo,
    personalityAssessment,
    personalityLogicLibrary,
    subjectSelection,
    supportedSubjects,
    assessmentModules,
    professionalAbilityAssessment,
    abilityMap,
    optionalBirthdayCultureModel,
  },
};

export const aiEducationMockData = {
  accountUsers,
  accountRoleAssignments,
  studentGuardianLinks,
  studentTeacherLinks,
  accountProfileSettings,
  roleReportConfigurations,
  assessmentCadenceConfig,
  learningParameterConfig,
  mvpScope,
  onboardingDataModel,
  basicBioInfo,
  optionalBirthdayCultureModel,
  personalityAssessment,
  personalityLogicLibrary,
  supportedSubjects,
  assessmentModules,
  subjectSelection,
  professionalAbilityAssessment,
  professionalAbilityEvidence,
  abilityMap,
  learningGoal,
  statisticalBaseline,
  initialLearningCurve,
  learningPlan,
  dailyTasks,
  questionLogic,
  questions,
  shanghaiPrimaryMathResearch,
  shanghaiMathItemFamilies,
  aiVersionProfiles,
  questionSessions,
  behaviorEvents,
  knowledgeAtlas,
  knowledgePuzzleMap,
  reportSummary,
  messages,
  settings,
  studentProfile,
};
