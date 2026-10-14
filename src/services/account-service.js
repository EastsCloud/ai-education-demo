export function buildAccountContext({
  accountProfileSettings,
  accountRoleAssignments,
  accountUsers,
  selectedStudentUserId,
  studentGuardianLinks,
  studentTeacherLinks,
}) {
  const selectedStudent = accountUsers.find((user) => user.userId === selectedStudentUserId);
  const guardianLinks = studentGuardianLinks.filter((link) => link.studentUserId === selectedStudentUserId);
  const teacherLinks = studentTeacherLinks.filter((link) => link.studentUserId === selectedStudentUserId);
  const rolesByUserId = new Map(accountRoleAssignments.map((assignment) => [assignment.userId, assignment.role]));
  const settings = accountProfileSettings.find((profileSetting) => profileSetting.userId === selectedStudentUserId);

  return {
    selectedStudent,
    guardians: guardianLinks.map((link) => ({
      ...link,
      user: accountUsers.find((user) => user.userId === link.guardianUserId),
      role: rolesByUserId.get(link.guardianUserId),
    })),
    teachers: teacherLinks.map((link) => ({
      ...link,
      user: accountUsers.find((user) => user.userId === link.teacherUserId),
      role: rolesByUserId.get(link.teacherUserId),
    })),
    settings,
    roleCount: accountRoleAssignments.length,
    guardrails: [
      "User management is backend foundation, not a student main navigation page.",
      "Parents and teachers can configure report modules and learning parameters.",
      "Student account settings stay light: avatar, nickname, page style, and accessibility.",
    ],
  };
}

