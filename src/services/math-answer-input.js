export const MATH_ANSWER_INPUT_VERSION = "math_answer_input_v1";

const CLOCK_MINUTES_PER_DAY = 24 * 60;
const MAX_NUMERIC_ANSWER = 1_000_000_000;
const MAX_FRACTION_DENOMINATOR = 1_000;
const MAX_FRACTION_NUMERATOR = 1_000_000_000;

const ANSWER_INPUT_DEFINITIONS = Object.freeze({
  numeric: Object.freeze({
    version: MATH_ANSWER_INPUT_VERSION,
    kind: "numeric",
    htmlInputType: "number",
    inputMode: "decimal",
    step: "any",
    placeholder: "输入数字",
    displayFormat: "numeric",
  }),
  clock_time: Object.freeze({
    version: MATH_ANSWER_INPUT_VERSION,
    kind: "clock_time",
    htmlInputType: "time",
    inputMode: null,
    step: 60,
    placeholder: "选择时刻",
    displayFormat: "HH:MM",
  }),
  fraction: Object.freeze({
    version: MATH_ANSWER_INPUT_VERSION,
    kind: "fraction",
    htmlInputType: "text",
    inputMode: "text",
    step: null,
    placeholder: "例如 3/4",
    displayFormat: "fraction",
  }),
});

function copyDefinition(definition) {
  return { ...definition };
}

function numberWithinBounds(value, { minimum, maximum, integer = false }) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) return null;
  if (integer && !Number.isInteger(number)) return null;
  return number;
}

function parseClockTime(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

function formatClockTime(totalMinutes) {
  const normalized = numberWithinBounds(totalMinutes, {
    minimum: 0,
    maximum: CLOCK_MINUTES_PER_DAY - 1,
    integer: true,
  });
  if (normalized === null) return null;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function greatestCommonDivisor(left, right) {
  let first = Math.abs(Math.trunc(left));
  let second = Math.abs(Math.trunc(right));
  while (second) {
    const remainder = first % second;
    first = second;
    second = remainder;
  }
  return first || 1;
}

function parseFraction(value) {
  const match = String(value || "")
    .trim()
    .match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (
    !Number.isInteger(numerator) ||
    !Number.isInteger(denominator) ||
    Math.abs(numerator) > MAX_FRACTION_NUMERATOR ||
    denominator < 1 ||
    denominator > MAX_FRACTION_DENOMINATOR
  ) {
    return null;
  }
  return numerator / denominator;
}

function formatFraction(value) {
  const number = numberWithinBounds(value, {
    minimum: -MAX_NUMERIC_ANSWER,
    maximum: MAX_NUMERIC_ANSWER,
  });
  if (number === null) return "";
  if (Number.isInteger(number)) return String(number);

  const sign = number < 0 ? -1 : 1;
  const absolute = Math.abs(number);
  for (let denominator = 2; denominator <= MAX_FRACTION_DENOMINATOR; denominator += 1) {
    const numerator = Math.round(absolute * denominator);
    if (Math.abs(absolute - numerator / denominator) > 1e-10) continue;
    const divisor = greatestCommonDivisor(numerator, denominator);
    return `${sign < 0 ? "-" : ""}${numerator / divisor}/${denominator / divisor}`;
  }
  return String(number);
}

export function createMathAnswerInput({ kind = "numeric" } = {}) {
  return copyDefinition(ANSWER_INPUT_DEFINITIONS[kind] || ANSWER_INPUT_DEFINITIONS.numeric);
}

export function normalizeMathAnswerValue({ answerInput, value, allowCanonicalNumber = false } = {}) {
  const kind = answerInput?.kind || "numeric";
  if (kind === "numeric") {
    return numberWithinBounds(value, { minimum: -MAX_NUMERIC_ANSWER, maximum: MAX_NUMERIC_ANSWER });
  }
  if (kind === "clock_time") {
    if (allowCanonicalNumber) {
      return numberWithinBounds(value, {
        minimum: 0,
        maximum: CLOCK_MINUTES_PER_DAY - 1,
        integer: true,
      });
    }
    return parseClockTime(value);
  }
  if (kind === "fraction") {
    if (allowCanonicalNumber && typeof value === "number") {
      return numberWithinBounds(value, { minimum: -MAX_NUMERIC_ANSWER, maximum: MAX_NUMERIC_ANSWER });
    }
    return parseFraction(value);
  }
  return null;
}

export function formatMathAnswerValue({ answerInput, value } = {}) {
  const kind = answerInput?.kind || "numeric";
  if (kind === "clock_time") {
    return formatClockTime(value) || "--:--";
  }
  if (kind === "fraction") return formatFraction(value);
  const number = numberWithinBounds(value, { minimum: -MAX_NUMERIC_ANSWER, maximum: MAX_NUMERIC_ANSWER });
  return number === null ? "" : String(number);
}

export function mathAnswerValuesMatch({ answerInput, actual, expected } = {}) {
  const normalizedActual = normalizeMathAnswerValue({ answerInput, value: actual, allowCanonicalNumber: true });
  const normalizedExpected = normalizeMathAnswerValue({ answerInput, value: expected, allowCanonicalNumber: true });
  if (normalizedActual === null || normalizedExpected === null) return false;
  if ((answerInput?.kind || "numeric") === "clock_time") return normalizedActual === normalizedExpected;
  const tolerance = Math.max(1e-9, Math.abs(normalizedActual) * 1e-9, Math.abs(normalizedExpected) * 1e-9);
  return Math.abs(normalizedActual - normalizedExpected) <= tolerance;
}

export function validateMathAnswerInput({ answerInput, answer } = {}) {
  const errors = [];
  const kind = answerInput?.kind;
  const expected = ANSWER_INPUT_DEFINITIONS[kind];
  if (!expected) {
    return { valid: false, errors: ["answer_input_kind_invalid"] };
  }
  if (JSON.stringify(answerInput) !== JSON.stringify(expected)) {
    errors.push("answer_input_definition_mismatch");
  }
  if (normalizeMathAnswerValue({ answerInput: expected, value: answer, allowCanonicalNumber: true }) === null) {
    errors.push("answer_input_answer_format_invalid");
  }
  return { valid: errors.length === 0, errors, version: MATH_ANSWER_INPUT_VERSION };
}
