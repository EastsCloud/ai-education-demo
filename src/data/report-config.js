export const roleReportConfigurations = [
  {
    configId: "report-config-student-default",
    role: "student",
    visibleModules: ["progress", "practice_summary", "knowledge_light_map", "peer_trend"],
    hiddenModules: ["raw_profile", "risk_signals", "teacher_notes_internal"],
    firstScreenMetricLimit: 4,
  },
  {
    configId: "report-config-parent-default",
    role: "parent",
    visibleModules: ["progress", "behavior_summary", "ability_trend", "formal_test_evidence", "peer_trend", "curve_options", "messages"],
    hiddenModules: ["raw_algorithm_trace"],
    firstScreenMetricLimit: 6,
  },
  {
    configId: "report-config-teacher-default",
    role: "teacher",
    visibleModules: ["progress", "behavior_summary", "ability_trend", "formal_test_evidence", "question_tag_evidence", "curve_options", "class_comparison"],
    hiddenModules: ["private_family_notes"],
    firstScreenMetricLimit: 6,
  },
];
