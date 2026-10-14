// Every Math item is framed as a problem to solve, rather than an isolated calculation.
// This remains deterministic so a future AI proposal has to preserve a usable context.
export const MATH_APPLICATION_CONTEXT_VERSION = "math_application_context_v1";

const CONTEXT_CUES = Object.freeze([
  { id: "school", text: "学校", pattern: /学校/ },
  { id: "class", text: "班级", pattern: /班级/ },
  { id: "student", text: "同学", pattern: /同学/ },
  { id: "named_student", text: "小安", pattern: /小安|小雅|小林|小明|小雨|小周|小美|小东/ },
  { id: "library", text: "图书", pattern: /图书|阅读/ },
  { id: "garden", text: "花", pattern: /花坛|花园|花店|花圃|花盆|鲜花|黄花|红花/ },
  { id: "sport", text: "运动", pattern: /运动|操场|礼堂|跳绳|跑步|步数/ },
  { id: "art", text: "手工", pattern: /手工|美术|彩纸|纸星星|折纸/ },
  { id: "food", text: "水果", pattern: /果篮|苹果|梨|水果|糖|果汁|酸奶/ },
  { id: "stationery", text: "文具", pattern: /铅笔|钢笔|笔记本|练习本|橡皮|贴纸|水彩笔|彩笔|素描本/ },
  { id: "measurement", text: "测量物", pattern: /彩带|丝带|跳绳|小路|跑道|护栏|地垫|地砖|照片|贺卡/ },
  { id: "travel", text: "出行", pattern: /观光车|接驳车|送书车|小车|路线|城市地图|导览图|地图|路标/ },
  { id: "robot", text: "机器人", pattern: /机器人/ },
  { id: "planting", text: "种植", pattern: /植树|种子|幼苗|种植/ },
  { id: "tickets", text: "票务", pattern: /成人票|儿童票|活动票|参观卡/ },
  { id: "community", text: "场所", pattern: /科技馆|博物馆|公园|活动室|社团|器材室|图书节/ },
  { id: "container", text: "容器", pattern: /收纳盒|鱼缸|种植箱|托盘|篮子|笔盒|袋|包|书架/ },
  { id: "data", text: "数据", pattern: /统计表|积分表|试验田|数学小练习|本周读书页数/ },
  { id: "shape", text: "图形", pattern: /长方形|正方形|圆形|梯形|三角形|平角|相邻角/ },
  { id: "probability", text: "随机情境", pattern: /盒子里|抽奖袋|任意摸出|任意抽/ },
  { id: "daily_life", text: "生活物品", pattern: /外套|活动票|参观卡|水壶|种子|幼苗|卡片/ },
]);

const QUESTION_CUE_PATTERN = /多少|几(?:个|本|张|支|朵|人|米|厘米|千米|分米|升|袋|辆|次|页|题|度|杯|枝|盆|段|层|排|份|种)?|什么|哪个|哪种|怎样|如何/;

function normalizePrompt(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function promptFingerprint(value) {
  const text = normalizePrompt(value);
  let hash = 0x811c9dc5;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function narrativeCharacterCount(value) {
  return (normalizePrompt(value).match(/[\u4e00-\u9fff]/g) || []).length;
}

export function findMathApplicationContextCue(prompt) {
  const text = normalizePrompt(prompt);
  const match = CONTEXT_CUES.find((cue) => cue.pattern.test(text));
  return match ? { id: match.id, text: match.text } : null;
}

export function createMathApplicationContext({ family, generated }) {
  const prompt = generated?.prompt || "";
  return {
    version: MATH_APPLICATION_CONTEXT_VERSION,
    framing: "real_world_problem",
    familyId: family?.id || null,
    contextTemplateId: generated?.contextTemplateId || null,
    scenarioCue: findMathApplicationContextCue(prompt),
    questionPurpose: "solve_contextual_quantity",
    promptFingerprint: promptFingerprint(prompt),
  };
}

export function validateMathApplicationContext({ candidate }) {
  const errors = [];
  const prompt = normalizePrompt(candidate?.prompt);
  const applicationContext = candidate?.metadataTags?.applicationContext;
  const qualityTags = candidate?.metadataTags?.itemTags?.qualityTags;
  const resolvedCue = findMathApplicationContextCue(prompt);

  if (!applicationContext || typeof applicationContext !== "object") {
    return { valid: false, errors: ["application_context_missing"] };
  }
  if (applicationContext.version !== MATH_APPLICATION_CONTEXT_VERSION) {
    errors.push("application_context_version_mismatch");
  }
  if (applicationContext.framing !== "real_world_problem") {
    errors.push("application_context_framing_invalid");
  }
  if (applicationContext.familyId !== candidate?.familyId) {
    errors.push("application_context_family_mismatch");
  }
  if (!applicationContext.contextTemplateId || applicationContext.contextTemplateId !== candidate?.metadataTags?.contextTemplateId) {
    errors.push("application_context_template_mismatch");
  }
  if (applicationContext.questionPurpose !== "solve_contextual_quantity") {
    errors.push("application_context_question_purpose_invalid");
  }
  if (applicationContext.promptFingerprint !== promptFingerprint(prompt)) {
    errors.push("application_context_prompt_binding_mismatch");
  }
  if (narrativeCharacterCount(prompt) < 8) {
    errors.push("application_context_narrative_too_thin");
  }
  if (!QUESTION_CUE_PATTERN.test(prompt) || !/[？?]/.test(prompt)) {
    errors.push("application_context_question_goal_missing");
  }
  if (!resolvedCue) {
    errors.push("application_context_scenario_anchor_missing");
  } else if (
    applicationContext.scenarioCue?.id !== resolvedCue.id ||
    applicationContext.scenarioCue?.text !== resolvedCue.text
  ) {
    errors.push("application_context_scenario_anchor_mismatch");
  }
  if (qualityTags) {
    if (qualityTags.applicationFraming !== applicationContext.framing) {
      errors.push("application_context_quality_framing_mismatch");
    }
    if (qualityTags.applicationContextVersion !== MATH_APPLICATION_CONTEXT_VERSION) {
      errors.push("application_context_quality_version_mismatch");
    }
    if (qualityTags.applicationScenarioCueId !== applicationContext.scenarioCue?.id) {
      errors.push("application_context_quality_cue_mismatch");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    version: MATH_APPLICATION_CONTEXT_VERSION,
    scenarioCue: resolvedCue,
  };
}
