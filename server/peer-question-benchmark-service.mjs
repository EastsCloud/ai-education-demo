const MINIMUM_PEER_STUDENTS = 8;
const MINIMUM_PEER_ANSWERS = 20;

function isSubjectEvent(event, subjectId) {
  const eventSubjectId = event?.subjectId || event?.payload?.subjectId || null;
  return !eventSubjectId || eventSubjectId === subjectId;
}

function isTrustedAnswerEvent(event) {
  return event?.eventType === "answer_submitted" && event?.payload?.scoringSource === "server_authoritative";
}

function targetGrade(plan) {
  return String(plan?.learningGoal?.targetGrade || "").trim().toUpperCase() || null;
}

function sameCohort(candidate, referencePlan) {
  return (
    candidate?.status === "active" &&
    candidate?.studentId &&
    targetGrade(candidate) &&
    targetGrade(candidate) === targetGrade(referencePlan)
  );
}

function calibratingBenchmark() {
  return {
    availability: "calibrating",
    source: "anonymized_question_type_reference_v1",
    label: "同类型题参考正在建立",
    studentCopy: "多一些同类型练习记录后，这里会出现温和的参考。",
    guardrail: "A question-type reference appears only after enough anonymized peer evidence exists.",
  };
}

export function buildQuestionTypeBenchmark({ database, studentId, subjectId, familyId }) {
  if (!studentId || !subjectId || !familyId) return calibratingBenchmark();
  const referencePlan = database.getPlan({ studentId, subjectId });
  if (!referencePlan || !targetGrade(referencePlan)) return calibratingBenchmark();

  const peerPlans = database
    .listPlansBySubject({ subjectId })
    .filter((plan) => plan.studentId !== studentId && sameCohort(plan, referencePlan));
  const peerAttempts = peerPlans.flatMap((plan) =>
    database
      .listBehaviorEvents({ studentId: plan.studentId, subjectId, limit: 2000 })
      .filter((event) => isSubjectEvent(event, subjectId))
      .filter(isTrustedAnswerEvent)
      .filter((event) => event.payload?.questionFamilyId === familyId),
  );
  const peerStudentCount = new Set(peerAttempts.map((event) => event.studentId)).size;
  if (peerStudentCount < MINIMUM_PEER_STUDENTS || peerAttempts.length < MINIMUM_PEER_ANSWERS) {
    return calibratingBenchmark();
  }

  const correctRate = peerAttempts.filter((event) => event.payload?.isCorrect).length / peerAttempts.length;
  return {
    availability: "available",
    source: "anonymized_question_type_reference_v1",
    label: "同类型题参考",
    peerCorrectRate: Number(correctRate.toFixed(2)),
    cohortDescription: "同目标、同阶段学习者",
    studentCopy: "这只是一个温和的参考，重点还是看你自己的下一步。",
    guardrail: "This aggregate excludes the current student and never returns peer identities, answers, or raw attempts.",
  };
}
