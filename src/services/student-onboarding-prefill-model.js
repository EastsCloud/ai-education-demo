import { basicInfoOptionCatalog } from "../data/onboarding-schema.js?v=assessment-grade-routing-1";

const OPTION_GROUPS = {
  gradeLevelOptionId: "gradeLevel",
  schoolCalendarStageOptionId: "schoolCalendarStage",
  routinePreferenceOptionId: "routinePreference",
  attentionSpanBandOptionId: "attentionSpanBand",
  readingComfortOptionId: "readingComfort",
  primaryDeviceOptionId: "primaryDevice",
  curriculumSystemOptionId: "curriculumSystem",
};

function optionById(group, optionId) {
  return basicInfoOptionCatalog[group]?.find((option) => option.id === optionId || option.value === optionId) || null;
}

function calculateAge(birthday, fallback) {
  const date = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const birthdayThisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (now < birthdayThisYear) age -= 1;
  return Math.max(0, age);
}

function normalizeBirthDay(year, month, day) {
  const safeYear = Number(year) || 2014;
  const safeMonth = Math.min(12, Math.max(1, Number(month) || 1));
  const maximumDay = new Date(safeYear, safeMonth, 0).getDate();
  return Math.min(maximumDay, Math.max(1, Number(day) || 1));
}

function gradeOptionIdFromLabel(value) {
  const text = String(value || "").trim();
  const englishMatch = text.match(/(?:G|primary[_\s-]?)([1-6])/i);
  if (englishMatch) return `cn_primary_${englishMatch[1]}`;
  const chineseMatch = text.match(/(?:小学)?\s*([一二三四五六1-6])\s*年级/);
  if (chineseMatch) {
    const gradeByDigit = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
    const grade = gradeByDigit[chineseMatch[1]] || chineseMatch[1];
    return `cn_primary_${grade}`;
  }
  if (text.includes("初中 1")) return "cn_middle_1";
  if (text.includes("初中 2")) return "cn_middle_2";
  return null;
}

function datePartsFromBirthday(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return { birthDay: null, birthMonth: null, birthYear: null };

  return {
    birthYear: Number(match[1]) || null,
    birthMonth: Number(match[2]) || null,
    birthDay: Number(match[3]) || null,
  };
}

function selectedOptionId(group, value) {
  return optionById(group, value)?.id || null;
}

function hasValidBirthday({ birthYear, birthMonth, birthDay }) {
  const year = Number(birthYear);
  const month = Number(birthMonth);
  const day = Number(birthDay);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function optionalNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeSubjectIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((subjectId) => subjectId === "math"))];
}

export function isOnboardingSubjectConfirmed(prefill, subjectId = "math") {
  return Boolean(
    normalizeSubjectIds(prefill?.subjectIds).includes(subjectId) &&
      typeof prefill?.subjectSelectionConfirmedAt === "string" &&
      prefill.subjectSelectionConfirmedAt,
  );
}

export function createDefaultOnboardingPrefill({ studentId, basicBioInfo }) {
  const birthdayParts = datePartsFromBirthday(basicBioInfo?.birthday);
  const gradeOptionId = gradeOptionIdFromLabel(basicBioInfo?.grade);
  const stageOptionId = String(basicBioInfo?.schoolCalendarStage || "").includes("暑")
    ? "summer_break"
    : null;
  const attentionMinutes = Number(basicBioInfo?.attentionSpanMinutes) || null;

  return {
    studentId,
    basicInfo: {
      birthYear: birthdayParts.birthYear,
      birthMonth: birthdayParts.birthMonth,
      birthDay: birthdayParts.birthDay,
      gradeLevelOptionId: gradeOptionId,
      schoolCalendarStageOptionId: stageOptionId,
      routinePreferenceOptionId: String(basicBioInfo?.sleepPattern || "").includes("早")
        ? "routine_morning"
        : null,
      attentionSpanBandOptionId:
        attentionMinutes === null
          ? null
          : attentionMinutes <= 15
            ? "attention_10_15"
            : attentionMinutes <= 25
              ? "attention_20_25"
              : "attention_30_35",
      readingComfortOptionId: String(basicBioInfo?.readingComfort || "").includes("长")
        ? "reading_long_text_fatigue"
        : null,
      primaryDeviceOptionId: String(basicBioInfo?.primaryDevice || "").trim()
        ? String(basicBioInfo.primaryDevice).toLowerCase().includes("ipad")
          ? "device_tablet"
          : "device_desktop"
        : null,
      curriculumSystemOptionId: String(basicBioInfo?.curriculumSystem || "").includes("美国")
        ? "curriculum_us_k12"
        : String(basicBioInfo?.curriculumSystem || "").includes("国际")
          ? "curriculum_international"
          : String(basicBioInfo?.curriculumSystem || "").includes("中国")
            ? "curriculum_cn_school"
            : basicBioInfo?.isBlankOnboardingBaseline
              ? null
              : "curriculum_cn_school",
    },
    subjectIds: [],
  };
}

export function resolveOnboardingPrefill({ studentId, basicBioInfo, prefill }) {
  const defaults = createDefaultOnboardingPrefill({ studentId, basicBioInfo });
  const values = { ...defaults.basicInfo, ...(prefill?.basicInfo || {}) };
  const birthYear = optionalNumber(values.birthYear);
  const birthMonth = optionalNumber(values.birthMonth);
  const birthDay = hasValidBirthday({ birthYear, birthMonth, birthDay: values.birthDay })
    ? normalizeBirthDay(birthYear, birthMonth, values.birthDay)
    : null;
  const birthday = birthDay === null ? null : `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  values.birthYear = birthYear;
  values.birthMonth = birthMonth;
  values.birthDay = birthDay;
  Object.entries(OPTION_GROUPS).forEach(([field, group]) => {
    values[field] = selectedOptionId(group, values[field]);
  });
  const options = Object.fromEntries(
    Object.entries(OPTION_GROUPS).map(([field, group]) => [field, optionById(group, values[field])]),
  );
  const attention = options.attentionSpanBandOptionId;

  return {
    ...defaults,
    ...prefill,
    studentId,
    basicInfo: values,
    subjectIds: normalizeSubjectIds(prefill?.subjectIds ?? defaults.subjectIds),
    bio: {
      ...basicBioInfo,
      birthday: birthday || "待填写",
      age: birthday ? calculateAge(birthday, basicBioInfo?.age) : null,
      grade: options.gradeLevelOptionId?.label || basicBioInfo?.grade || "待填写",
      schoolCalendarStage: options.schoolCalendarStageOptionId?.label || basicBioInfo?.schoolCalendarStage || "待填写",
      sleepPattern: options.routinePreferenceOptionId?.label || basicBioInfo?.sleepPattern || "待填写",
      attentionSpanMinutes: attention?.minutesMax || attention?.minutesMin || basicBioInfo?.attentionSpanMinutes || null,
      readingComfort: options.readingComfortOptionId?.label || basicBioInfo?.readingComfort || "待填写",
      primaryDevice: options.primaryDeviceOptionId?.label || basicBioInfo?.primaryDevice || "待填写",
      curriculumSystem: options.curriculumSystemOptionId?.label || basicBioInfo?.curriculumSystem || "待填写",
    },
  };
}

export function getOnboardingPrefillOptions() {
  return basicInfoOptionCatalog;
}

export function isCompleteOnboardingPrefill(prefill) {
  const values = prefill?.basicInfo || {};
  return Boolean(
    Number(values.birthYear) &&
      Number(values.birthMonth) &&
      Number(values.birthDay) &&
      Object.keys(OPTION_GROUPS).every((field) => optionById(OPTION_GROUPS[field], values[field])),
  );
}

export function getOnboardingPrefillFieldGroups() {
  return { ...OPTION_GROUPS };
}

export function normalizeOnboardingPrefillDraft({ studentId, basicBioInfo, values = {} }) {
  const defaults = createDefaultOnboardingPrefill({ studentId, basicBioInfo });
  const basicInfo = {
    ...defaults.basicInfo,
    birthYear: optionalNumber(values.birthYear) ?? defaults.basicInfo.birthYear,
    birthMonth: optionalNumber(values.birthMonth) ?? defaults.basicInfo.birthMonth,
    birthDay: optionalNumber(values.birthDay) ?? defaults.basicInfo.birthDay,
  };

  if (hasValidBirthday(basicInfo)) {
    basicInfo.birthDay = normalizeBirthDay(basicInfo.birthYear, basicInfo.birthMonth, basicInfo.birthDay);
  }

  Object.keys(OPTION_GROUPS).forEach((field) => {
    const group = OPTION_GROUPS[field];
    basicInfo[field] = selectedOptionId(group, values[field]) || defaults.basicInfo[field];
  });

  const subjectIds = normalizeSubjectIds(values.subjectIds);
  return {
    studentId,
    basicInfo,
    subjectIds,
    ...(values.confirmSubjectSelection && subjectIds.includes("math") ? { confirmSubjectSelection: true } : {}),
  };
}
