const EPSILON = 1e-9;
const MAX_RULE_LENGTH = 320;
const FUNCTION_NAMES = new Set(["ceil", "round"]);

function finite(value) {
  if (!Number.isFinite(value)) throw new Error("non_finite_result");
  return value;
}

function linear(constant, coefficient = 0) {
  return { constant: finite(constant), coefficient: finite(coefficient) };
}

function add(left, right) {
  return linear(left.constant + right.constant, left.coefficient + right.coefficient);
}

function subtract(left, right) {
  return linear(left.constant - right.constant, left.coefficient - right.coefficient);
}

function multiply(left, right) {
  if (Math.abs(left.coefficient) > EPSILON && Math.abs(right.coefficient) > EPSILON) {
    throw new Error("nonlinear_expression");
  }
  return linear(
    left.constant * right.constant,
    left.constant * right.coefficient + left.coefficient * right.constant,
  );
}

function divide(left, right) {
  if (Math.abs(right.coefficient) > EPSILON) throw new Error("variable_denominator_not_supported");
  if (Math.abs(right.constant) <= EPSILON) throw new Error("division_by_zero");
  return linear(left.constant / right.constant, left.coefficient / right.constant);
}

function constantValue(value, code) {
  if (Math.abs(value.coefficient) > EPSILON) throw new Error(code);
  return value.constant;
}

function roundHalfUp(value, precision) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function tokenize(rule) {
  const source = String(rule || "")
    .replace(/(\d+)\s+decimal\s+places?/gi, "$1")
    .trim();
  if (!source || source.length > MAX_RULE_LENGTH) throw new Error("invalid_rule_length");

  const tokens = [];
  let cursor = 0;
  while (cursor < source.length) {
    const remaining = source.slice(cursor);
    const whitespace = remaining.match(/^\s+/);
    if (whitespace) {
      cursor += whitespace[0].length;
      continue;
    }
    const number = remaining.match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      cursor += number[0].length;
      continue;
    }
    const identifier = remaining.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifier) {
      tokens.push({ type: "identifier", value: identifier[0] });
      cursor += identifier[0].length;
      continue;
    }
    const symbol = remaining[0];
    const types = {
      "+": "plus",
      "-": "minus",
      "*": "multiply",
      "/": "divide",
      "%": "percent",
      "(": "open",
      ")": "close",
      ",": "comma",
      "=": "equals",
    };
    if (!types[symbol]) throw new Error("unsupported_rule_token");
    tokens.push({ type: types[symbol], value: symbol });
    cursor += 1;
  }
  return addImplicitMultiplication(tokens);
}

function canEndValue(token) {
  return ["number", "identifier", "close", "percent"].includes(token?.type);
}

function canStartValue(token) {
  return ["number", "identifier", "open"].includes(token?.type);
}

function addImplicitMultiplication(tokens) {
  return tokens.reduce((result, token) => {
    const previous = result.at(-1);
    const isFunctionCall = previous?.type === "identifier" && FUNCTION_NAMES.has(previous.value) && token.type === "open";
    if (previous && canEndValue(previous) && canStartValue(token) && !isFunctionCall) {
      result.push({ type: "multiply", value: "*" });
    }
    result.push(token);
    return result;
  }, []);
}

class RuleParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
  }

  current() {
    return this.tokens[this.cursor] || { type: "eof", value: null };
  }

  match(type) {
    if (this.current().type !== type) return false;
    this.cursor += 1;
    return true;
  }

  expect(type) {
    if (!this.match(type)) throw new Error(`expected_${type}`);
  }

  parseCompleteExpression() {
    const value = this.parseExpression();
    if (this.current().type !== "eof") throw new Error("unexpected_rule_token");
    return value;
  }

  parseExpression() {
    let value = this.parseTerm();
    while (["plus", "minus"].includes(this.current().type)) {
      const operator = this.current().type;
      this.cursor += 1;
      const right = this.parseTerm();
      value = operator === "plus" ? add(value, right) : subtract(value, right);
    }
    return value;
  }

  parseTerm() {
    let value = this.parsePostfix();
    while (["multiply", "divide"].includes(this.current().type)) {
      const operator = this.current().type;
      this.cursor += 1;
      const right = this.parsePostfix();
      value = operator === "multiply" ? multiply(value, right) : divide(value, right);
    }
    return value;
  }

  parsePostfix() {
    let value = this.parsePrimary();
    while (this.match("percent")) value = divide(value, linear(100));
    return value;
  }

  parsePrimary() {
    if (this.match("plus")) return this.parsePrimary();
    if (this.match("minus")) {
      const value = this.parsePrimary();
      return linear(-value.constant, -value.coefficient);
    }
    const token = this.current();
    if (token.type === "number") {
      this.cursor += 1;
      return linear(token.value);
    }
    if (token.type === "open") {
      this.cursor += 1;
      const value = this.parseExpression();
      this.expect("close");
      return value;
    }
    if (token.type !== "identifier") throw new Error("expected_value");
    this.cursor += 1;
    if (token.value === "x") return linear(0, 1);
    if (!FUNCTION_NAMES.has(token.value)) throw new Error("unsupported_rule_identifier");
    this.expect("open");
    const argument = this.parseExpression();
    let precision = null;
    if (this.match("comma")) precision = constantValue(this.parseExpression(), "function_precision_requires_constant");
    this.expect("close");
    const numericArgument = constantValue(argument, "function_argument_requires_constant");
    if (token.value === "ceil") {
      if (precision !== null) throw new Error("ceil_argument_count");
      return linear(Math.ceil(numericArgument));
    }
    if (precision === null || !Number.isInteger(precision) || precision < 0 || precision > 6) {
      throw new Error("round_precision_invalid");
    }
    return linear(roundHalfUp(numericArgument, precision));
  }
}

function parseExpressionTokens(tokens) {
  return new RuleParser(tokens).parseCompleteExpression();
}

export function evaluateMathAnswerRule(answerRule) {
  try {
    const tokens = tokenize(answerRule);
    const equalIndexes = tokens.reduce((indexes, token, index) => (token.type === "equals" ? [...indexes, index] : indexes), []);
    if (equalIndexes.length > 1) throw new Error("multiple_equations_not_supported");

    if (!equalIndexes.length) {
      const value = parseExpressionTokens(tokens);
      return { valid: true, value: constantValue(value, "unresolved_variable"), type: "arithmetic" };
    }

    const equalIndex = equalIndexes[0];
    if (!equalIndex || equalIndex === tokens.length - 1) throw new Error("incomplete_equation");
    const left = parseExpressionTokens(tokens.slice(0, equalIndex));
    const right = parseExpressionTokens(tokens.slice(equalIndex + 1));
    const coefficientDifference = left.coefficient - right.coefficient;
    if (Math.abs(coefficientDifference) <= EPSILON) throw new Error("equation_not_uniquely_solved");
    return {
      valid: true,
      value: finite((right.constant - left.constant) / coefficientDifference),
      type: "linear_equation",
    };
  } catch (error) {
    return {
      valid: false,
      value: null,
      type: null,
      error: String(error?.message || "answer_rule_evaluation_failed").slice(0, 96),
    };
  }
}

export function answerMatchesMathRule({ answer, answerRule }) {
  const evaluation = evaluateMathAnswerRule(answerRule);
  const actual = Number(answer);
  if (!evaluation.valid || !Number.isFinite(actual)) return { ...evaluation, matches: false };
  const tolerance = Math.max(EPSILON, Math.abs(evaluation.value) * EPSILON);
  return {
    ...evaluation,
    matches: Math.abs(actual - evaluation.value) <= tolerance,
  };
}
