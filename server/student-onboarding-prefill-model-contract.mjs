import assert from "node:assert/strict";
import {
  createStudentOnboardingBaseline,
  resolveStudentRuntimeIdentity,
} from "../src/services/student-runtime-identity.js";
import {
  createDefaultOnboardingPrefill,
  isCompleteOnboardingPrefill,
  isOnboardingSubjectConfirmed,
  normalizeOnboardingPrefillDraft,
  resolveOnboardingPrefill,
} from "../src/services/student-onboarding-prefill-model.js";

const demoBio = {
  studentId: "student-001",
  birthday: "2014-03-18",
  age: 12,
  grade: "六年级",
  schoolCalendarStage: "暑期提升",
  sleepPattern: "早上注意力较好",
  attentionSpanMinutes: 25,
  readingComfort: "长题干需要更明显的分段和关键词提示",
  primaryDevice: "iPad",
};

const identity = resolveStudentRuntimeIdentity({
  bootstrap: {
    user: { role: "student", studentId: "student-new", displayName: "周宁" },
    profile: { studentId: "student-new", displayName: "周宁", gradeLabel: "小学四年级" },
  },
});
const blankBio = createStudentOnboardingBaseline({ identity, demoBio });
assert.equal(blankBio.studentId, "student-new");
assert.equal(blankBio.grade, "小学四年级");
assert.equal(blankBio.birthday, null);
assert.equal(blankBio.primaryDevice, null);
assert.equal(blankBio.isBlankOnboardingBaseline, true);

const blankDefaults = createDefaultOnboardingPrefill({ studentId: identity.studentId, basicBioInfo: blankBio });
assert.equal(blankDefaults.basicInfo.birthYear, null);
assert.equal(blankDefaults.basicInfo.birthMonth, null);
assert.equal(blankDefaults.basicInfo.birthDay, null);
assert.equal(blankDefaults.basicInfo.gradeLevelOptionId, "cn_primary_4");
assert.equal(blankDefaults.basicInfo.curriculumSystemOptionId, null);
assert.deepEqual(blankDefaults.subjectIds, []);
assert.equal(isCompleteOnboardingPrefill(blankDefaults), false);

const blankResolved = resolveOnboardingPrefill({
  studentId: identity.studentId,
  basicBioInfo: blankBio,
  prefill: null,
});
assert.equal(blankResolved.bio.birthday, "待填写");
assert.equal(blankResolved.bio.primaryDevice, "待填写");
assert.equal(blankResolved.bio.grade, "小学 4 年级");
assert.equal(isCompleteOnboardingPrefill(blankResolved), false);

const completedDraft = normalizeOnboardingPrefillDraft({
  studentId: identity.studentId,
  basicBioInfo: blankBio,
  values: {
    birthYear: "2016",
    birthMonth: "5",
    birthDay: "9",
    gradeLevelOptionId: "cn_primary_4",
    schoolCalendarStageOptionId: "semester_1",
    routinePreferenceOptionId: "routine_evening",
    attentionSpanBandOptionId: "attention_20_25",
    readingComfortOptionId: "reading_flexible",
    primaryDeviceOptionId: "device_tablet",
    curriculumSystemOptionId: "curriculum_cn_school",
    subjectIds: [],
  },
});
assert.equal(isCompleteOnboardingPrefill(completedDraft), true);
assert.deepEqual(completedDraft.subjectIds, []);
assert.deepEqual(completedDraft.basicInfo, {
  birthYear: 2016,
  birthMonth: 5,
  birthDay: 9,
  gradeLevelOptionId: "cn_primary_4",
  schoolCalendarStageOptionId: "semester_1",
  routinePreferenceOptionId: "routine_evening",
  attentionSpanBandOptionId: "attention_20_25",
  readingComfortOptionId: "reading_flexible",
  primaryDeviceOptionId: "device_tablet",
  curriculumSystemOptionId: "curriculum_cn_school",
});

const demoDefaults = createDefaultOnboardingPrefill({ studentId: demoBio.studentId, basicBioInfo: demoBio });
assert.equal(demoDefaults.basicInfo.birthYear, 2014);
assert.equal(demoDefaults.basicInfo.curriculumSystemOptionId, "curriculum_cn_school");
assert.deepEqual(demoDefaults.subjectIds, []);
assert.equal(isCompleteOnboardingPrefill(demoDefaults), true);

const subjectDraft = normalizeOnboardingPrefillDraft({
  studentId: identity.studentId,
  basicBioInfo: blankBio,
  values: {
    ...completedDraft.basicInfo,
    subjectIds: ["math"],
    confirmSubjectSelection: true,
  },
});
assert.deepEqual(subjectDraft.subjectIds, ["math"]);
assert.equal(subjectDraft.confirmSubjectSelection, true);
assert.equal(isOnboardingSubjectConfirmed(subjectDraft), false);
assert.equal(
  isOnboardingSubjectConfirmed({
    ...subjectDraft,
    subjectSelectionConfirmedAt: "2026-09-06T00:00:00.000Z",
  }),
  true,
);

console.log("student-onboarding-prefill-model-contract: passed");
