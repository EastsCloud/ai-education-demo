function priorWrongRetrySourceIds(run) {
  return new Set(
    (run?.optionalPracticeSessions || [])
      .filter((session) => session.mode === "wrong_retry")
      .flatMap((session) => session.sourceDeliveryIds || [])
      .filter(Boolean),
  );
}

export function isEligibleWrongRetrySource({ delivery, run, previouslyRetriedIds = priorWrongRetrySourceIds(run) }) {
  const request = delivery?.generationRequest || {};
  if (
    !delivery ||
    !run ||
    delivery.studentId !== run.studentId ||
    delivery.subjectId !== run.subjectId ||
    delivery.mode !== "practice" ||
    request.practiceRunId !== run.id ||
    request.practiceMode === "wrong_retry" ||
    previouslyRetriedIds.has(delivery.id)
  ) {
    return false;
  }
  if (!Array.isArray(delivery.attempts) || !delivery.attempts.some((attempt) => attempt?.isCorrect === false)) return false;
  return Boolean(
    request.familyId &&
      request.instructionalGrade &&
      request.variantLevel &&
      Number.isFinite(Number(request.seed)) &&
      delivery.privateCandidate?.id,
  );
}

export function listEligibleWrongRetrySourceDeliveries({ database, run, limit = 8 }) {
  if (!database || !run?.id || !run?.studentId || !run?.subjectId) return [];
  const maximum = Math.max(1, Math.min(500, Math.floor(Number(limit) || 8)));
  const previouslyRetriedIds = priorWrongRetrySourceIds(run);
  return database
    .listQuestionDeliveries({
      studentId: run.studentId,
      subjectId: run.subjectId,
      limit: 500,
    })
    .filter((delivery) => isEligibleWrongRetrySource({ delivery, run, previouslyRetriedIds }))
    .slice(0, maximum);
}

// Only a count is returned to student-facing summary code. Source delivery IDs,
// answer keys, and generation records remain private to the server.
export function summarizeWrongRetryAvailability({ database, run }) {
  const eligibleCount = listEligibleWrongRetrySourceDeliveries({ database, run, limit: 500 }).length;
  return {
    available: eligibleCount > 0,
    eligibleCount,
  };
}
