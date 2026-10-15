export const mvpRouteMap = [
  { id: "entry", page: "entry-page-01.html", stage: "entry", priority: "P0", productMeaning: "Entry / role" },
  { id: "basic_info", page: "entry-page-02.html", stage: "entry", priority: "P0", productMeaning: "Basic information" },
  { id: "psychological_personality", page: "entry-page-03.html", stage: "entry", priority: "P0", productMeaning: "Psychological personality" },
  { id: "learning_personality", page: "entry-page-04.html", stage: "entry", priority: "P0", productMeaning: "Learning personality" },
  { id: "subject_selection", page: "entry-page-05.html", stage: "entry", priority: "P0", productMeaning: "Subject selection" },
  { id: "initial_ability_test", page: "entry-page-06.html", stage: "entry", priority: "P0", productMeaning: "Initial subject ability test" },
  { id: "ability_map", page: "entry-page-07.html", stage: "entry", priority: "P0", productMeaning: "Profile seed + ability map" },
  { id: "goal_confirmation", page: "entry-page-08.html", stage: "entry", priority: "P0", productMeaning: "Goal confirmation" },
  { id: "learning_rhythm", page: "entry-page-09.html", stage: "entry", priority: "P0", productMeaning: "Learning rhythm" },
  { id: "static_curve", page: "entry-page-10.html", stage: "entry", priority: "P0", productMeaning: "Static learning curve" },
  { id: "today_task", page: "entry-page-11.html", stage: "daily", priority: "P0", productMeaning: "Today task / calendar entry" },
  { id: "practice_runtime", page: "entry-page-12.html", stage: "daily", priority: "P0", productMeaning: "Practice runtime" },
  { id: "practice_complete", page: "entry-page-13.html", stage: "daily", priority: "P0", productMeaning: "Practice completion + extra practice" },
  { id: "question_detail", page: "entry-page-14.html", stage: "daily", priority: "P0", productMeaning: "Question detail / review" },
  { id: "atlas_entry", page: "entry-page-15.html", stage: "daily", priority: "P0", productMeaning: "Knowledge atlas entry" },
  { id: "stage_test_reminder", page: "entry-page-16.html", stage: "calibration", priority: "P1", productMeaning: "Stage test reminder" },
  { id: "stage_test", page: "entry-page-17.html", stage: "calibration", priority: "P1", productMeaning: "Stage test runtime" },
  { id: "dynamic_curve", page: "entry-page-18.html", stage: "calibration", priority: "P1", productMeaning: "Dynamic curve update" },
  { id: "atlas_overview", page: "entry-page-19.html", stage: "evidence", priority: "P1", productMeaning: "Knowledge atlas overview" },
  { id: "role_report", page: "entry-page-20.html", stage: "evidence", priority: "P1", productMeaning: "Student / parent / teacher report" },
];

export const studentMainNav = [
  { id: "home", label: "首页" },
  { id: "onboarding", label: "测试" },
  { id: "practice", label: "练习" },
  { id: "report", label: "报告" },
];

export function getRoutesByStage(stage) {
  return mvpRouteMap.filter((route) => route.stage === stage);
}

export function getNextRoute(routeId) {
  const index = mvpRouteMap.findIndex((route) => route.id === routeId);
  return index >= 0 ? mvpRouteMap[index + 1] || null : null;
}
