export function resolveStudentRuntimeIdentity({ bootstrap, fallbackStudentId = "student-001" } = {}) {
  const user = bootstrap?.user || null;
  const profile = bootstrap?.profile || null;
  const authenticated = Boolean(user?.role === "student" && user?.studentId);
  const studentId = authenticated ? user.studentId : fallbackStudentId;
  const displayName = authenticated ? profile?.displayName || user.displayName || "学生" : null;

  return {
    authenticated,
    displayName,
    gradeLabel: authenticated ? profile?.gradeLabel || null : null,
    studentId,
    useDemoSeedData: studentId === fallbackStudentId,
  };
}

export function createStudentOnboardingBaseline({ identity, demoBio = {} } = {}) {
  if (identity?.useDemoSeedData) return demoBio;

  return {
    ...demoBio,
    studentId: identity?.studentId || null,
    // A new authenticated student must never inherit the demo student's
    // personal context. Only the account-level grade can safely prefill this step.
    birthday: null,
    age: null,
    grade: identity?.gradeLabel || null,
    schoolCalendarStage: null,
    sleepPattern: null,
    attentionSpanMinutes: null,
    readingComfort: null,
    primaryDevice: null,
    isBlankOnboardingBaseline: true,
  };
}
