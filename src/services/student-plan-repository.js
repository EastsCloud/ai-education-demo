import { createLocalApiClient } from "./local-api-client.js?v=initial-learning-plan-1";

const STORAGE_KEY = "ai-education-student-plan-records-v1";

function getBrowserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readRecords(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createStudentPlanRepository({ storage = getBrowserStorage(), apiClient = createLocalApiClient() } = {}) {
  let records = readRecords(storage);

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The prototype keeps the in-memory record if browser storage is unavailable.
    }
  }

  function findLatest(studentId, subjectId) {
    return records.find((record) => record.studentId === studentId && record.subjectId === subjectId) || null;
  }

  function save(record, { mirror = true } = {}) {
    records = [record, ...records.filter((item) => item.id !== record.id)];
    persist();
    if (mirror && !record.serverAuthoritative) apiClient.mirrorPlan?.(record);
    return record;
  }

  function replace(record) {
    if (!record?.id) return null;
    return save(record, { mirror: false });
  }

  function upsertInitialPlan({
    studentId,
    subjectId,
    learningGoal,
    staticCurve,
    todayTask,
    todayQuestionQueue = null,
    dailyAllocation,
    supportProfile,
    taskCadence = null,
    assessmentCadence = null,
  }) {
    const existing = findLatest(studentId, subjectId);
    const now = new Date().toISOString();
    return save({
      id: existing?.id || `student-plan-${studentId}-${subjectId}`,
      studentId,
      subjectId,
      status: "active",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      learningGoal,
      staticCurve,
      todayTask,
      todayQuestionQueue: todayQuestionQueue || existing?.todayQuestionQueue || null,
      dailyAllocation,
      supportProfile,
      taskCadence: taskCadence || existing?.taskCadence || null,
      assessmentCadence: assessmentCadence || existing?.assessmentCadence || null,
      curveProposalHistory: existing?.curveProposalHistory || [],
      stageAssessmentHistory: existing?.stageAssessmentHistory || [],
      dynamicCurve: existing?.dynamicCurve || null,
      staticCurveConfirmedAt: now,
      persistence: "browser_local_record",
    });
  }

  function appendConfirmedProposal({ studentId, subjectId, confirmation }) {
    const existing = findLatest(studentId, subjectId);
    const now = new Date().toISOString();
    return save({
      id: existing?.id || `student-plan-${studentId}-${subjectId}`,
      studentId,
      subjectId,
      status: existing?.status || "planning",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      learningGoal: existing?.learningGoal || null,
      staticCurve: existing?.staticCurve || null,
      todayTask: existing?.todayTask || null,
      todayQuestionQueue: existing?.todayQuestionQueue || null,
      dailyAllocation: existing?.dailyAllocation || null,
      supportProfile: existing?.supportProfile || null,
      taskCadence: existing?.taskCadence || null,
      assessmentCadence: existing?.assessmentCadence || null,
      curveProposalHistory: [...(existing?.curveProposalHistory || []), confirmation],
      stageAssessmentHistory: existing?.stageAssessmentHistory || [],
      dynamicCurve: existing?.dynamicCurve || null,
      staticCurveConfirmedAt: existing?.staticCurveConfirmedAt || null,
      persistence: "browser_local_record",
    });
  }

  function updateNextPracticeAllocation({ studentId, subjectId, allocation, questionQueue = null, supportProfile = null }) {
    const existing = findLatest(studentId, subjectId);
    if (!existing) return null;
    return save({
      ...existing,
      updatedAt: new Date().toISOString(),
      nextPracticeAllocation: {
        ...allocation,
        createdAt: new Date().toISOString(),
      },
      nextQuestionQueue: questionQueue || existing.nextQuestionQueue || null,
      supportProfile: supportProfile || existing.supportProfile || null,
    });
  }

  function updateTaskCadence({ studentId, subjectId, taskCadence }) {
    const existing = findLatest(studentId, subjectId);
    if (!existing) return null;
    return save({
      ...existing,
      updatedAt: new Date().toISOString(),
      taskCadence,
    });
  }

  function updateAssessmentCadence({ studentId, subjectId, assessmentCadence }) {
    const existing = findLatest(studentId, subjectId);
    if (!existing) return null;
    return save({
      ...existing,
      updatedAt: new Date().toISOString(),
      assessmentCadence,
    });
  }

  function recordStageAssessment({ studentId, subjectId, stageResult, dynamicCurve, nextDynamicTask = null }) {
    const existing = findLatest(studentId, subjectId);
    if (!existing) return null;

    return save({
      ...existing,
      updatedAt: new Date().toISOString(),
      stageAssessmentHistory: [...(existing.stageAssessmentHistory || []), stageResult],
      dynamicCurve: dynamicCurve?.canUpdate ? dynamicCurve : existing.dynamicCurve || null,
      nextDynamicTask: nextDynamicTask || existing.nextDynamicTask || null,
    });
  }

  async function confirmCurveAdjustment({ studentId, subjectId, parameters }) {
    try {
      const response = await apiClient.confirmCurveAdjustment?.({ studentId, subjectId, parameters });
      if (!response?.record) return null;
      return replace(response.record);
    } catch {
      return null;
    }
  }

  async function hydrateLatest(studentId, subjectId) {
    try {
      const response = await apiClient.getPlan?.({ studentId, subjectId });
      if (!response?.record) return findLatest(studentId, subjectId);
      const record = response.record;
      records = [record, ...records.filter((item) => item.id !== record.id)];
      persist();
      return record;
    } catch {
      return findLatest(studentId, subjectId);
    }
  }

  async function saveRemote(record) {
    try {
      const response = await apiClient.savePlan?.(record);
      if (!response?.record) return null;
      return replace(response.record);
    } catch {
      return null;
    }
  }

  async function skipStageAssessment({ studentId, subjectId, practiceDate }) {
    try {
      const response = await apiClient.skipStageAssessment?.({ studentId, subjectId, practiceDate });
      if (!response?.record) return null;
      return replace(response.record);
    } catch {
      return null;
    }
  }

  return {
    appendConfirmedProposal,
    confirmCurveAdjustment,
    findLatest,
    hydrateLatest,
    recordStageAssessment,
    replace,
    saveRemote,
    skipStageAssessment,
    upsertInitialPlan,
    updateAssessmentCadence,
    updateNextPracticeAllocation,
    updateTaskCadence,
  };
}
