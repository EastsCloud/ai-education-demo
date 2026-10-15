export const accountUsers = [
  {
    userId: "user-student-001",
    displayName: "林安",
    loginName: "lin.an",
    roleHint: "student",
    timezone: "Asia/Shanghai",
    accountStatus: "active",
  },
  {
    userId: "user-parent-001",
    displayName: "林安妈妈",
    loginName: "parent.lin",
    roleHint: "parent",
    timezone: "Asia/Shanghai",
    accountStatus: "active",
  },
  {
    userId: "user-teacher-001",
    displayName: "王老师",
    loginName: "teacher.wang",
    roleHint: "teacher",
    timezone: "Asia/Shanghai",
    accountStatus: "active",
  },
];

export const accountRoleAssignments = [
  {
    assignmentId: "role-student-001",
    userId: "user-student-001",
    role: "student",
    assignedByUserId: "system",
  },
  {
    assignmentId: "role-parent-001",
    userId: "user-parent-001",
    role: "parent",
    assignedByUserId: "system",
  },
  {
    assignmentId: "role-teacher-001",
    userId: "user-teacher-001",
    role: "teacher",
    assignedByUserId: "system",
  },
];

export const studentGuardianLinks = [
  {
    linkId: "guardian-link-001",
    studentUserId: "user-student-001",
    guardianUserId: "user-parent-001",
    relationship: "mother",
    permissionLevel: "view_report_and_configure_learning_parameters",
  },
];

export const studentTeacherLinks = [
  {
    linkId: "teacher-link-001",
    studentUserId: "user-student-001",
    teacherUserId: "user-teacher-001",
    subjectId: "math",
    permissionLevel: "view_report_and_configure_learning_parameters",
  },
];

export const accountProfileSettings = [
  {
    userId: "user-student-001",
    avatarMode: "uploaded_or_generated",
    pageStyle: "warm_light_e",
    studentVisibleSettings: ["avatar", "nickname", "page_style"],
    hiddenFromStudent: ["backend_profile_signals", "risk_labels", "raw_behavior_classification"],
  },
];

