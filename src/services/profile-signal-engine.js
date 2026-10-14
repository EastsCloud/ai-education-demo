import { analyzeLearningBehavior } from "./behavior-analysis-engine.js";
import { buildLearningReport } from "./learning-report-engine.js";
import { hasIndependentChallengeTransferReadiness } from "./challenge-evidence-policy.js";

const MIN_ACTIONABLE_ANSWER_EVIDENCE = 4;

function boundedRate(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1 ? numeric : null;
}

function confidenceBand(answerCount, supportingEvents = 0) {
  const score = Math.max(0, Number(answerCount) || 0) + Math.max(0, Number(supportingEvents) || 0) * 0.5;
  if (score >= 18) return "high";
  if (score >= 7) return "medium";
  return "low";
}

function countEvents(events, types) {
  const allowed = new Set(types);
  return events.filter((event) => allowed.has(event?.eventType)).length;
}

function signal({ id, title, evidence, action, systemUse, priority, confidence }) {
  return { id, title, evidence, action, systemUse, priority, confidence };
}

function compactSignals(signals) {
  return signals
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))
    .slice(0, 3)
    .map(({ priority, ...item }) => item);
}

const FEATURE_LABELS = {
  "domain:quantity_relationship": "数量关系",
  "domain:measurement_and_units": "单位与测量",
  "domain:geometry_and_space": "图形与空间关系",
  "domain:fraction_decimal_percent": "分数、小数或百分数关系",
  "domain:statistics_and_probability": "数据与可能性",
  "reasoning:unit_handling": "单位处理",
  "reasoning:math_translation": "题意翻译",
  "reasoning:relationship_model": "数量关系建模",
  "representation:visual_model": "图示或表格表达",
  "load:multi_step": "多步骤关系",
  "operation:addition": "加法关系",
  "operation:subtraction": "减法关系",
  "operation:multiplication": "乘法关系",
  "operation:division": "除法关系",
  "number:contains_zero": "含 0 的数量",
  "number:decimal_value": "含小数的数量",
  "number:single_digit": "一位数数量",
  "number:two_digit": "两位数数量",
  "number:three_digit": "三位数数量",
  "number:four_digit_or_more": "较大数量",
};

function featureLabel(featureId) {
  if (FEATURE_LABELS[featureId]) return FEATURE_LABELS[featureId];
  if (/^number:digit_\d$/.test(featureId)) return `含数字 ${featureId.at(-1)} 的数量`;
  return "某类已验证题目结构";
}

function featureFocusText(featureIds = []) {
  return [...new Set(featureIds.map(featureLabel))].slice(0, 2).join("、") || "某类已验证题目结构";
}

// This is an adult-facing transparency layer over the same confidence-bounded
// behavior evidence that shapes the adaptive support profile. It is never a diagnosis.
export function buildProfileSignalSnapshot({ behaviorEvents = [] } = {}) {
  const events = Array.isArray(behaviorEvents) ? behaviorEvents : [];
  const learning = buildLearningReport({ behaviorEvents: events });
  const behavior = analyzeLearningBehavior(events);
  const answerCount = Math.max(0, Number(learning.answerCount) || 0);
  const reviewCount = countEvents(events, [
    "practice_detail_opened",
    "previous_attempt_opened",
    "today_atlas_opened",
    "solution_strategy_opened",
  ]);
  const reviewOfferCount = countEvents(events, ["practice_summary_options_offered"]);
  const explorationCount = countEvents(events, [
    "same_type_more_requested",
    "harder_extra_practice_requested",
    "atlas_related_practice_requested",
  ]);
  const signalConfidence = confidenceBand(answerCount, reviewCount + explorationCount);

  if (answerCount < MIN_ACTIONABLE_ANSWER_EVIDENCE) {
    return {
      version: "profile_signal_snapshot_v1",
      source: "trusted_learning_behavior_evidence",
      evidenceStatus: "collecting",
      answerCount,
      confidence: signalConfidence,
      summary: "真实练习证据还在形成，先沿用初始支持方式，不急着给学习方式下结论。",
      signals: [],
      guardrail:
        "This snapshot is a confidence-bounded adult support aid. It is not a student label, does not expose raw private signals, and cannot change the dynamic learning curve.",
    };
  }

  const signals = [];
  const noHintAccuracy = boundedRate(learning.noHintAccuracy);
  const hintUseRate = boundedRate(learning.hintUseRate);
  const fastGuessRate = boundedRate(learning.fastGuessRate);
  const retrySuccessRate = boundedRate(learning.retrySuccessRate);
  const revisionRate = boundedRate(learning.answerRevisionRate);
  const independentEvidence = Math.max(0, Number(learning.noHintAnswerCount) || 0);
  const retryCount = Math.max(0, Number(learning.retryCount) || 0);
  const voluntaryPracticeCount = Math.max(0, Number(learning.voluntaryPracticeCount) || 0);
  const independentChallengeTransferEvidenceCount = Math.max(
    0,
    Number(behavior.allocationInputs?.independentChallengeTransferEvidenceCount) || 0,
  );
  const independentChallengeTransferSuccessRate = boundedRate(
    behavior.allocationInputs?.independentChallengeTransferSuccessRate,
  );
  const fatigueSignal = boundedRate(behavior.allocationInputs?.fatigueSignal);
  const slowAccurateRate = boundedRate(behavior.allocationInputs?.slowAccurateRate);
  const repeatedCorrectThenWrongRate = boundedRate(behavior.allocationInputs?.repeatedCorrectThenWrongRate);
  const featureEvidence = behavior.questionFeatureEvidence || null;
  const focusFeatureIds = Array.isArray(featureEvidence?.focusFeatureIds) ? featureEvidence.focusFeatureIds : [];
  const independentChallengeReady = hasIndependentChallengeTransferReadiness({
    voluntaryPracticeCount,
    independentChallengeTransferEvidenceCount,
    independentChallengeTransferSuccessRate,
    fatigueSignal,
    independentCorrectRate: noHintAccuracy,
  });

  if (fastGuessRate !== null && fastGuessRate >= 0.25) {
    signals.push(
      signal({
        id: "protect_reading_time",
        title: "先把读题时间留出来",
        evidence: "近期有一些很快作答后出错的记录，先保护读题和关系判断。",
        action: "下一次先请学生说出题目中的关系，再进入计算；此时不要急着追加新题。",
        systemUse: "下一轮优先保留读题与核对入口。",
        priority: 100,
        confidence: signalConfidence,
      }),
    );
  }

  if (hintUseRate !== null && hintUseRate >= 0.45 && (noHintAccuracy === null || noHintAccuracy < 0.7)) {
    signals.push(
      signal({
        id: "keep_layered_support",
        title: "分层提示仍然有用",
        evidence: "提示使用较多，独立完成证据还没有稳定到可以撤掉支持入口。",
        action: "保留先尝试、再打开一层提示的节奏；成人先提问，不直接给下一步。",
        systemUse: "继续保留轻提示和分步引导入口。",
        priority: 92,
        confidence: signalConfidence,
      }),
    );
  } else if (noHintAccuracy !== null && noHintAccuracy >= 0.72 && independentEvidence >= 4) {
    signals.push(
      signal({
        id: "protect_independent_entry",
        title: "独立尝试正在有效",
        evidence: "近期不打开提示时也能稳定完成，值得把第一步继续留给学生。",
        action: "答对后追问“你先看到了什么关系？”，再决定是否增加一点变化。",
        systemUse: "优先保留独立入口，再提供轻提示。",
        priority: 84,
        confidence: signalConfidence,
      }),
    );
  }

  if (retryCount >= 2 && retrySuccessRate !== null && retrySuccessRate >= 0.65) {
    signals.push(
      signal({
        id: "retry_loop_works",
        title: "重做正在带来回收",
        evidence: "错误后的重做已有较好的成功记录，当前递进路径值得保留。",
        action: "继续按原题、一个变化、两个变化推进，不需要重新讲完整知识点。",
        systemUse: "维持原题到变式的重做顺序。",
        priority: 80,
        confidence: signalConfidence,
      }),
    );
  } else if (repeatedCorrectThenWrongRate !== null && repeatedCorrectThenWrongRate >= 0.25) {
    signals.push(
      signal({
        id: "stabilize_before_extension",
        title: "先把变化前的结构走稳",
        evidence: "题目发生数字或步骤变化后，原来答对的方法还需要更多复现证据。",
        action: "先保留一题原结构和一题小变化，确认独立完成后再增加新难度。",
        systemUse: "增加复现与小变化，暂缓更大的延展。",
        priority: 78,
        confidence: signalConfidence,
      }),
    );
  }

  if (focusFeatureIds.length) {
    const featureSignal = (featureEvidence?.signals || []).find((item) => focusFeatureIds.includes(item.featureId));
    const focusText = featureFocusText(focusFeatureIds);
    signals.push(
      signal({
        id: "feature_pattern_reinforcement",
        title: "一类题目结构值得多走一遍",
        evidence: `近期在${focusText}中出现了更集中的错误记录；系统会继续观察，不把它当作固定结论。`,
        action: "下次先保留一题同结构复现，再确认能独立完成后推进变化。成人不需要把这类提示变成额外压力。",
        systemUse: "在当前题族和年级范围内优先选择覆盖该结构的合法变式。",
        priority: 76,
        confidence: featureSignal?.confidence || signalConfidence,
      }),
    );
  }

  if (reviewCount >= 2) {
    signals.push(
      signal({
        id: "reflection_entry",
        title: "会主动回看过程",
        evidence: `近期主动打开题目详情、知识图鉴或解题方法 ${reviewCount} 次，回看与比较入口正在被使用。`,
        action: "反馈后留一个简短问题，让学生先说出这道题的关系或检查方法。",
        systemUse: "保留可选回看与知识图鉴入口。",
        priority: 66,
        confidence: confidenceBand(answerCount, reviewCount),
      }),
    );
  }

  if (reviewOfferCount >= 2 && reviewCount === 0) {
    signals.push(
      signal({
        id: "keep_reflection_optional",
        title: "回看先保持自愿",
        evidence: `已有 ${reviewOfferCount} 次练习结束后的回看入口，但学生暂时没有主动打开详情或图鉴。`,
        action: "不用把归纳变成额外任务；先让练习本身继续形成理解，需要时再轻轻邀请回看。",
        systemUse: "保留详情和图鉴作为第二入口，不增加强制解释。",
        priority: 42,
        confidence: confidenceBand(answerCount, reviewOfferCount),
      }),
    );
  }

  if (independentChallengeReady) {
    signals.push(
      signal({
        id: "exploration_window",
        title: "主动加练可以留一扇窗口",
        evidence: "学生会主动多练，并且在无提示的真实变式中已有稳定完成记录。",
        action: "在核心练习完成后提供少量自选变式，不把加练变成新的必做任务。",
        systemUse: "稳定时保留少量探索题。",
        priority: 64,
        confidence: confidenceBand(answerCount, explorationCount),
      }),
    );
  }

  if (revisionRate !== null && revisionRate >= 0.35) {
    signals.push(
      signal({
        id: "answer_checking",
        title: "提交前会重新核对",
        evidence: "多次作答记录显示，学生会在提交前调整答案，这是有价值的自我检查行为。",
        action: "可以把“为什么改”变成一句短追问，帮助把检查过程说出来。",
        systemUse: "将答前核对保留为可见但不施压的步骤。",
        priority: 58,
        confidence: signalConfidence,
      }),
    );
  }

  if (fatigueSignal !== null && fatigueSignal >= 0.6) {
    signals.push(
      signal({
        id: "shorter_recovery_chunks",
        title: "后段更适合短一些",
        evidence: "同一次练习的后段出现了用时或错误上升的信号，先保护完成感。",
        action: "把下一次练习切成更短的小段；完成一段后再决定是否继续。",
        systemUse: "将任务组织成更短的恢复型小段。",
        priority: 90,
        confidence: signalConfidence,
      }),
    );
  } else if (slowAccurateRate !== null && slowAccurateRate >= 0.35 && noHintAccuracy !== null && noHintAccuracy >= 0.7) {
    signals.push(
      signal({
        id: "protect_deliberate_pace",
        title: "慢一点，但方法是对的",
        evidence: "独立准确表现稳定，即使作答节奏较慢，也没有必要额外加压。",
        action: "先肯定清楚地找关系和核对；速度会在熟悉后自然提升。",
        systemUse: "保持稳步推进，不因较慢速度加大负荷。",
        priority: 56,
        confidence: signalConfidence,
      }),
    );
  }

  const compact = compactSignals(signals);
  return {
    version: "profile_signal_snapshot_v1",
    source: "trusted_learning_behavior_evidence",
    evidenceStatus: "ready",
    answerCount,
    confidence: signalConfidence,
    summary: compact.length
      ? "这些观察来自真实练习，用来调整支持方式，而不是给学生贴标签。"
      : "已有基础作答记录；系统继续通过后续练习观察更适合的支持方式。",
    signals: compact,
    guardrail:
      "This snapshot is a confidence-bounded adult support aid. It is not a student label, does not expose raw private signals, and cannot change the dynamic learning curve.",
  };
}
