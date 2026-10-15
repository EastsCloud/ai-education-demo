export const basicInfoOptionCatalog = {
  birthYear: [
    { id: "birth_year_2014", value: 2014, label: "2014 年" },
    { id: "birth_year_2015", value: 2015, label: "2015 年" },
    { id: "birth_year_2016", value: 2016, label: "2016 年" },
    { id: "birth_year_2017", value: 2017, label: "2017 年" },
    { id: "birth_year_2018", value: 2018, label: "2018 年" },
  ],
  birthMonth: Array.from({ length: 12 }, (_, index) => ({
    id: `birth_month_${index + 1}`,
    value: index + 1,
    label: `${index + 1} 月`,
  })),
  birthDay: Array.from({ length: 31 }, (_, index) => ({
    id: `birth_day_${index + 1}`,
    value: index + 1,
    label: `${index + 1} 日`,
  })),
  gradeLevel: [
    { id: "cn_primary_1", value: "primary_1", label: "小学 1 年级", system: "cn_school" },
    { id: "cn_primary_2", value: "primary_2", label: "小学 2 年级", system: "cn_school" },
    { id: "cn_primary_3", value: "primary_3", label: "小学 3 年级", system: "cn_school" },
    { id: "cn_primary_4", value: "primary_4", label: "小学 4 年级", system: "cn_school" },
    { id: "cn_primary_5", value: "primary_5", label: "小学 5 年级", system: "cn_school" },
    { id: "cn_primary_6", value: "primary_6", label: "小学 6 年级", system: "cn_school" },
    { id: "cn_middle_1", value: "middle_1", label: "初中 1 年级", system: "cn_school" },
    { id: "cn_middle_2", value: "middle_2", label: "初中 2 年级", system: "cn_school" },
  ],
  schoolCalendarStage: [
    { id: "semester_1", value: "first_semester", label: "上学期" },
    { id: "semester_2", value: "second_semester", label: "下学期" },
    { id: "winter_break", value: "winter_break", label: "寒假" },
    { id: "summer_break", value: "summer_break", label: "暑假" },
    { id: "transition", value: "transition", label: "转学 / 过渡期" },
  ],
  routinePreference: [
    { id: "routine_evening", value: "evening_stable", label: "晚上更稳定" },
    { id: "routine_morning", value: "morning_stable", label: "早上更稳定" },
    { id: "routine_afternoon", value: "afternoon_stable", label: "下午更稳定" },
    { id: "routine_variable", value: "variable", label: "不固定" },
  ],
  attentionSpanBand: [
    { id: "attention_10_15", value: "10_15", label: "10-15 分钟", minutesMin: 10, minutesMax: 15 },
    { id: "attention_20_25", value: "20_25", label: "20-25 分钟", minutesMin: 20, minutesMax: 25 },
    { id: "attention_30_35", value: "30_35", label: "30-35 分钟", minutesMin: 30, minutesMax: 35 },
    { id: "attention_45_plus", value: "45_plus", label: "45 分钟以上", minutesMin: 45, minutesMax: null },
  ],
  readingComfort: [
    { id: "reading_short_sentences", value: "short_sentences", label: "短句更舒服" },
    { id: "reading_long_text_fatigue", value: "long_text_fatigue", label: "长题干容易累" },
    { id: "reading_visual_support", value: "visual_support", label: "图示辅助更舒服" },
    { id: "reading_flexible", value: "flexible", label: "都可以" },
  ],
  primaryDevice: [
    { id: "device_tablet", value: "tablet", label: "平板" },
    { id: "device_desktop", value: "desktop", label: "电脑" },
    { id: "device_phone", value: "phone", label: "手机" },
    { id: "device_mixed", value: "mixed", label: "多设备混用" },
  ],
  curriculumSystem: [
    { id: "curriculum_cn_school", value: "cn_school", label: "中国校内体系" },
    { id: "curriculum_us_k12", value: "us_k12", label: "美国 K-12 体系" },
    { id: "curriculum_international", value: "international", label: "国际学校体系" },
    { id: "curriculum_unknown", value: "unknown", label: "暂不确定" },
  ],
};

export const basicInfoFieldMap = [
  {
    uiFieldId: "birthday",
    label: "生日",
    component: "year_month_day_selects",
    optionGroups: ["birthYear", "birthMonth", "birthDay"],
    storesTo: "student_basic_info.birth_date",
    derivedTo: ["student_derived_baseline.age", "student_derived_baseline.age_cohort"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "gradeLevel",
    label: "当前年级",
    component: "select",
    optionGroup: "gradeLevel",
    storesTo: "student_basic_info.grade_level_option_id",
    derivedTo: ["student_derived_baseline.grade_band", "assessment_routing.initial_difficulty_band"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "schoolCalendarStage",
    label: "当前阶段",
    component: "select",
    optionGroup: "schoolCalendarStage",
    storesTo: "student_basic_info.school_calendar_stage_option_id",
    derivedTo: ["assessment_context.school_pressure", "assessment_context.vacation_mode"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "routinePreference",
    label: "作息习惯",
    component: "select",
    optionGroup: "routinePreference",
    storesTo: "student_learning_context.routine_preference_option_id",
    derivedTo: ["notification_timing.default_window"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "attentionSpanBand",
    label: "单次专注时长",
    component: "select",
    optionGroup: "attentionSpanBand",
    storesTo: "student_learning_context.attention_span_band_option_id",
    derivedTo: ["assessment_session.default_chunk_size", "practice_session.default_question_count"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "readingComfort",
    label: "阅读舒适度",
    component: "select",
    optionGroup: "readingComfort",
    storesTo: "student_learning_context.reading_comfort_option_id",
    derivedTo: ["ui_adaptation.problem_text_density", "question_rendering.visual_support_level"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "primaryDevice",
    label: "主要设备",
    component: "select",
    optionGroup: "primaryDevice",
    storesTo: "student_learning_context.primary_device_option_id",
    derivedTo: ["ui_adaptation.input_mode", "ui_adaptation.layout_density"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
  {
    uiFieldId: "curriculumSystem",
    label: "课程体系",
    component: "select",
    optionGroup: "curriculumSystem",
    storesTo: "student_basic_info.curriculum_system_option_id",
    derivedTo: ["statistical_baseline.curriculum_cohort", "subject_goal_catalog.available_targets"],
    sourcePriority: ["parent_prefill", "teacher_prefill", "student_confirmed"],
  },
];

export const studentBasicInfoRecord = {
  table: "student_basic_info",
  studentId: "student-001",
  sourceRole: "parent",
  sourceUserId: "parent-001",
  confirmationStatus: "student_confirmed",
  confirmedByStudentAt: "2026-07-12T09:20:00-07:00",
  fields: {
    birthDate: "2014-03-18",
    gradeLevelOptionId: "cn_primary_6",
    schoolCalendarStageOptionId: "summer_break",
    curriculumSystemOptionId: "curriculum_cn_school",
  },
};

export const studentLearningContextRecord = {
  table: "student_learning_context",
  studentId: "student-001",
  sourceRole: "parent",
  confirmationStatus: "student_confirmed",
  fields: {
    routinePreferenceOptionId: "routine_morning",
    attentionSpanBandOptionId: "attention_20_25",
    readingComfortOptionId: "reading_long_text_fatigue",
    primaryDeviceOptionId: "device_tablet",
  },
};

export const studentDerivedBaselineRecord = {
  table: "student_derived_baseline",
  studentId: "student-001",
  derivedFrom: ["student_basic_info", "student_learning_context", "standard_option_catalog"],
  fields: {
    age: 12,
    ageCohort: "age_12",
    gradeBand: "primary_upper",
    curriculumCohort: "cn_primary_6",
    defaultAssessmentChunkMinutes: 20,
    defaultUiDensity: "medium_low",
    defaultProblemTextDensity: "segmented_long_text",
  },
  recalculationRule:
    "Recalculate when confirmed basic info changes; later adjust display and pacing with real assessment and behavior data.",
};

export const onboardingDataFlow = {
  pageId: "entry-page-02-basic-information",
  frontendInputs: basicInfoFieldMap.map((field) => field.uiFieldId),
  writes: ["student_basic_info", "student_learning_context", "student_profile_confirmation_events"],
  derives: ["student_derived_baseline", "statistical_baseline_match", "assessment_context", "ui_adaptation"],
  downstreamConsumers: [
    "psychological_personality_test_generation",
    "learning_personality_test_generation",
    "subject_selection_defaults",
    "initial_ability_test_routing",
    "statistical_baseline",
    "static_learning_curve_inputs",
  ],
};
