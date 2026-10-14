import {
  MATH_ATLAS_GRADE_ORDER,
  knowledgeAtlasLightState,
  projectMathKnowledgeAtlas,
  summarizeMathKnowledgeAtlas,
} from "../services/math-atlas-projection.js?v=math-atlas-projection-2";
import { escapeHtml } from "../core/html.js?v=content-safety-1";

function familyNodesForAtlas({ knowledgeGraph, knowledgePuzzleMap, currentFamilyId = null }) {
  const graphNodes = (knowledgeGraph?.graph?.nodes || []).filter(
    (node) => node.kind === "question_family" && node.questionFamilyIds?.[0],
  );
  if (graphNodes.length) return graphNodes;
  return (knowledgePuzzleMap?.pieces || []).map((piece, index) => ({
    id: `puzzle:${piece.id || index}`,
    title: piece.title || "新的知识点",
    gradeBands: [],
    questionFamilyIds: piece.questionFamilyIds?.length
      ? piece.questionFamilyIds
      : currentFamilyId
        ? [currentFamilyId]
        : [],
    evidence: {
      attempts: Number(piece.attempts || 0),
      correct: Number(piece.correct || 0),
      independentCorrect: Number(piece.independentCorrect || 0),
      lightState: knowledgeAtlasLightState(piece),
    },
  }));
}

function nodeProgress(node) {
  const evidence = node.evidence || {};
  if (node.lightState === "bright") return 1;
  if (node.lightState === "partial") return 0.62;
  if (node.lightState === "dim") return 0.3;
  if (Number(evidence.attempts || 0)) return 0.15;
  return 0;
}

function compactMapNodes(nodes, limit = null, options = {}) {
  const projected = projectMathKnowledgeAtlas(nodes, options);
  return limit ? projected.slice(0, limit) : projected;
}

function boundedUnitValue(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(1, Math.max(0, numeric));
}

function boundedPercent(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, Math.round(numeric * 10) / 10));
}

export function renderKnowledgePuzzle({ knowledgePuzzleMap, knowledgeGraph = null, currentFamilyId = null, percent }) {
  const puzzle = document.querySelector("#knowledge-puzzle-map");
  if (!puzzle) return;

  const graphNodes = familyNodesForAtlas({ knowledgeGraph, knowledgePuzzleMap, currentFamilyId });
  const mapNodes = compactMapNodes(graphNodes, null, { currentFamilyId });
  const summary = summarizeMathKnowledgeAtlas(graphNodes, { currentFamilyId });
  const hasGraph = mapNodes.some((node) => node.questionFamilyIds?.[0]);
  const completionRate = hasGraph ? summary.completionRate : Number(knowledgePuzzleMap?.completionRate || 0);
  const piecesMarkup = hasGraph
    ? mapNodes
        .map(
          (node) => {
            const nodeLabel = `${node.title}${node.isCurrentFocus ? " · 今天从这里开始" : ""}`;
            const ariaLabel = `${node.title}${node.isCurrentFocus ? "，今天从这里开始" : ""}`;
            return `
              <i class="puzzle-piece ${escapeHtml(node.lightState)}${node.isCurrentFocus ? " today-focus" : ""}" style="--piece-progress: ${boundedUnitValue(nodeProgress(node))}" title="${escapeHtml(nodeLabel)}" aria-label="${escapeHtml(ariaLabel)}"></i>
            `;
          },
        )
        .join("")
    : (knowledgePuzzleMap?.pieces || [])
        .map(
          (piece) => `
            <article class="puzzle-piece ${escapeHtml(piece.status)}" style="--piece-progress: ${boundedUnitValue(piece.progress)}">
              <span>${Math.round(boundedUnitValue(piece.progress) * 100)}%</span>
              <strong>${escapeHtml(piece.title)}</strong>
            </article>
          `,
        )
        .join("");

  puzzle.innerHTML = `
    <div class="puzzle-progress">
      <span>${hasGraph ? "数学知识地图" : escapeHtml(knowledgePuzzleMap?.title)}</span>
      <strong>${percent(completionRate)}</strong>
      <p>${hasGraph ? `从一年级到六年级，共 ${summary.total} 个可点亮的知识区域。` : escapeHtml(knowledgePuzzleMap?.description)}</p>
    </div>
    <div class="puzzle-grid ${hasGraph ? "knowledge-family-constellation" : ""}" aria-label="${hasGraph ? "数学知识地图" : escapeHtml(knowledgePuzzleMap?.title)}">
      ${piecesMarkup}
    </div>
  `;
}

export function renderHomeKnowledgePuzzle({ knowledgePuzzleMap, knowledgeGraph = null, currentFamilyId = null, percent }) {
  const puzzle = document.querySelector("#home-knowledge-puzzle-map");
  if (!puzzle) return;

  const graphNodes = familyNodesForAtlas({ knowledgeGraph, knowledgePuzzleMap, currentFamilyId });
  const mapNodes = compactMapNodes(graphNodes, null, { currentFamilyId });
  const summary = summarizeMathKnowledgeAtlas(graphNodes, { currentFamilyId });
  const hasGraph = mapNodes.some((node) => node.questionFamilyIds?.[0]);
  const completionRate = hasGraph ? summary.completionRate : Number(knowledgePuzzleMap?.completionRate || 0);
  const nodesMarkup = hasGraph
    ? mapNodes
        .map((node) => {
          const nodeLabel = `${node.title}${node.isCurrentFocus ? " · 今天从这里开始" : ""}`;
          const ariaLabel = `${node.title}${node.isCurrentFocus ? "，今天从这里开始" : ""}`;
          return `<i class="${escapeHtml(node.lightState)}${node.isCurrentFocus ? " today-focus" : ""}" style="--node-progress: ${boundedUnitValue(nodeProgress(node))}" title="${escapeHtml(nodeLabel)}" aria-label="${escapeHtml(ariaLabel)}"></i>`;
        })
        .join("")
    : (knowledgePuzzleMap?.pieces || [])
        .map(
          (piece) =>
            `<i class="${escapeHtml(piece.status)}" style="--node-progress: ${boundedUnitValue(piece.progress)}" title="${escapeHtml(piece.title)} · ${Math.round(boundedUnitValue(piece.progress) * 100)}%" aria-label="${escapeHtml(piece.title)} · ${Math.round(boundedUnitValue(piece.progress) * 100)}%"></i>`,
        )
        .join("");

  puzzle.innerHTML = `
    <div class="home-knowledge-score">
      <strong>${percent(completionRate)}</strong>
      <span>已点亮</span>
    </div>
    <div class="home-knowledge-nodes ${hasGraph ? "knowledge-family-nodes" : ""}" role="img" aria-label="${hasGraph ? "数学知识地图" : escapeHtml(knowledgePuzzleMap?.title)}">
      ${nodesMarkup}
    </div>
  `;
}

function explorationStateLabel(lightState) {
  if (lightState === "bright") return "已经点亮";
  if (lightState === "partial" || lightState === "dim") return "正在探索";
  return "新的入口";
}

function explorationPriority(lightState) {
  return { dark: 0, dim: 1, partial: 2, bright: 3 }[lightState] ?? 4;
}

function currentNodePriority(node) {
  if (node.isCurrentFocus) return -1;
  return { partial: 0, dim: 1, dark: 2, bright: 3 }[node.evidence?.lightState] ?? 4;
}

function mapNodeLabel(node) {
  const grade = node.gradeBands?.[0];
  return grade ? grade.replace("G", "") : "·";
}

function mapStateDescription(node) {
  const evidence = node.evidence || {};
  const lightState = node.lightState || evidence.lightState || "dark";
  const currentPrefix = node.isCurrentFocus ? "这是今天练习会经过的地方。" : "";
  if (lightState === "bright") {
    return evidence.independentCorrect
      ? `${currentPrefix}已经独立完成 ${evidence.independentCorrect} 次。`
      : `${currentPrefix}这块已经被点亮。`;
  }
  if (lightState === "partial") return `${currentPrefix}已经开始练习，下一次继续把它走稳。`;
  if (lightState === "dim") return `${currentPrefix}这里刚留下记录，先回到原题把它做稳。`;
  return `${currentPrefix}这里还没有练过，可以从一题开始。`;
}

function mapLearningCue(node) {
  return node.atlas?.studentCue || "先读清题目要解决什么，再找题目里的关系。";
}

function mapExpression(node) {
  return node.atlas?.expression || node.title;
}

function focusButtonLabel(node) {
  return node.evidence?.lightState === "bright" ? "再练一题" : "练一题";
}

export function renderKnowledgeAtlasPage({
  knowledgeAtlas,
  knowledgePuzzleMap = null,
  knowledgeGraph = null,
  currentFamilyId = null,
  onExploreFamily = null,
  onRetryWrongQuestion = null,
}) {
  const familyNodes = familyNodesForAtlas({ knowledgeGraph, knowledgePuzzleMap, currentFamilyId });
  const mapNodes = compactMapNodes(familyNodes, null, { currentFamilyId });
  const mapOverview = summarizeMathKnowledgeAtlas(familyNodes, { currentFamilyId });
  const preferredFocus = [...mapNodes].sort((left, right) => {
    const priority = currentNodePriority(left) - currentNodePriority(right);
    if (priority) return priority;
    return String(left.title).localeCompare(String(right.title), "zh-CN");
  })[0];

  const mapSummary = document.querySelector("#atlas-map-summary");
  if (mapSummary) {
    mapSummary.textContent = mapOverview.bright
      ? `已经点亮 ${mapOverview.bright} 个地方，还有 ${mapOverview.partial + mapOverview.dim} 个正在慢慢变亮。`
      : `这张图有 ${mapOverview.total} 个知识区域；从一道题开始，它就会留下亮点。`;
  }

  const lightMap = document.querySelector("#atlas-light-map");
  const focusPanel = document.querySelector("#atlas-focus-panel");
  let selectedNodeId = preferredFocus?.id || null;

  function renderFocus(node) {
    if (!focusPanel || !node) return;
    const familyId = node.questionFamilyIds?.[0] || null;
    const canExplore = Boolean(familyId && onExploreFamily);
    const lightState = node.lightState || node.evidence?.lightState || "dark";
    focusPanel.innerHTML = `
      <div class="atlas-focus-copy">
        <span class="atlas-focus-orb ${escapeHtml(lightState)}" aria-hidden="true">${escapeHtml(mapNodeLabel(node))}</span>
          <div>
            <span>${node.isCurrentFocus ? "今天从这里开始" : explorationStateLabel(lightState)}</span>
            <strong>${escapeHtml(node.title)}</strong>
            <p>${escapeHtml(mapLearningCue(node))}</p>
          </div>
        </div>
      <button class="primary-action" type="button" data-atlas-focus-family="${escapeHtml(familyId || "")}" ${canExplore ? "" : "disabled"}>${focusButtonLabel(node)}</button>
      <small><b>数学表达：</b>${escapeHtml(mapExpression(node))}<br />${escapeHtml(mapStateDescription(node))} 自选练习，不占用今天的任务。</small>
    `;
    const focusButton = focusPanel.querySelector("[data-atlas-focus-family]");
    focusButton?.addEventListener("click", async () => {
      if (!canExplore) return;
      focusButton.disabled = true;
      focusButton.textContent = "正在准备";
      await onExploreFamily(familyId);
      focusButton.disabled = false;
      focusButton.textContent = focusButtonLabel(node);
    });
  }

  function selectNode(node) {
    selectedNodeId = node.id;
    renderFocus(node);
    lightMap?.querySelectorAll("[data-atlas-node]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.atlasNode === selectedNodeId);
    });
  }

  if (lightMap) {
    lightMap.innerHTML = mapNodes.length
      ? `
          <div class="atlas-map-canvas" aria-label="从一年级到六年级的数学知识地图">
            ${MATH_ATLAS_GRADE_ORDER.map(
              (grade, index) => `<div class="atlas-grade-lane" style="--grade-y: ${9 + index * 16.4}%"><span>${grade}</span></div>`,
            ).join("")}
            ${mapNodes
              .map((node) => {
            const { x, y } = node.atlasPosition || {};
            const lightState = node.lightState;
            const label = `${node.title}，${node.isCurrentFocus ? "今天从这里开始" : explorationStateLabel(lightState)}`;
            return `
              <button
                class="atlas-map-node ${escapeHtml(lightState)}${node.isCurrentFocus ? " today-focus" : ""}${node.id === selectedNodeId ? " selected" : ""}"
                type="button"
                data-atlas-node="${escapeHtml(node.id)}"
                style="--x: ${boundedPercent(x)}%; --y: ${boundedPercent(y)}%;"
                aria-label="${escapeHtml(label)}"
                title="${escapeHtml(label)}"
              ><span>${escapeHtml(String(node.atlasPosition?.anchorGrade || "").replace("G", ""))}</span></button>
            `;
              })
              .join("")}
          </div>
        `
      : `<p class="atlas-review-empty">从一道题开始，地图会慢慢亮起来。</p>`;

    lightMap.querySelectorAll("[data-atlas-node]").forEach((button) => {
      button.addEventListener("click", () => {
        const node = mapNodes.find((candidate) => candidate.id === button.dataset.atlasNode);
        if (node) selectNode(node);
      });
    });
  }
  renderFocus(preferredFocus);

  const reviewList = document.querySelector("#atlas-review-list");
  if (reviewList) {
    const wrongQuestionSet = knowledgePuzzleMap?.wrongQuestionSet || [];
    reviewList.innerHTML = wrongQuestionSet.length
      ? wrongQuestionSet
          .slice(0, 5)
          .map(
            (item) => `
              <article class="${escapeHtml(item.retryState)}">
                <div>
                  <span>${escapeHtml(item.retryLabel)}</span>
                  <strong>${escapeHtml(item.prompt)}</strong>
                </div>
                <p>${escapeHtml((item.reviewFocus || []).join(" · "))} · ${escapeHtml(item.nextAction)}</p>
                ${
                  item.retryState === "needs_original_retry" && onRetryWrongQuestion
                    ? `<button class="secondary-action" type="button" data-atlas-retry-question="${escapeHtml(item.questionId)}">重做原题</button>`
                    : `<em>${escapeHtml(item.retryLabel)}</em>`
                }
              </article>
            `,
          )
          .join("")
      : `<p class="atlas-review-empty">目前没有需要回看的题。练习中的错误会在这里变成下一次重做的入口。</p>`;

    reviewList.querySelectorAll("[data-atlas-retry-question]").forEach((button) => {
      button.addEventListener("click", () => onRetryWrongQuestion?.(button.dataset.atlasRetryQuestion));
    });
  }

  const libraryList = document.querySelector("#atlas-library-list");
  if (!libraryList) return;
  const libraryNodes = [...familyNodes]
    .sort((left, right) => {
      const stateDifference = explorationPriority(left.evidence?.lightState) - explorationPriority(right.evidence?.lightState);
      if (stateDifference) return stateDifference;
      return String(left.title).localeCompare(String(right.title), "zh-CN");
    })
    .slice(0, 3);

  libraryList.innerHTML = libraryNodes.length
    ? libraryNodes
        .map(
          (node) => `
            <article class="atlas-library-item ${escapeHtml(node.evidence?.lightState || "dark")}">
              <span class="atlas-library-light" aria-hidden="true"></span>
              <div>
                <span>${explorationStateLabel(node.evidence?.lightState)}</span>
                <strong>${escapeHtml(node.title)}</strong>
                <small>${escapeHtml((node.gradeBands || []).join(" · ") || "从这里开始")}</small>
              </div>
              <button class="secondary-action" type="button" data-atlas-explore-family="${escapeHtml(node.questionFamilyIds?.[0] || "")}" ${onExploreFamily ? "" : "disabled"}>练一题</button>
            </article>
          `,
        )
        .join("")
    : `<p class="atlas-review-empty">新的知识入口正在准备中。</p>`;

  libraryList.querySelectorAll("[data-atlas-explore-family]").forEach((button) => {
    button.addEventListener("click", () => onExploreFamily?.(button.dataset.atlasExploreFamily));
  });
}

export function renderPracticeAtlasEntry({ knowledgeAtlas, onOpenAtlas, practiceAtlasEntry }) {
  if (!practiceAtlasEntry) return;

  practiceAtlasEntry.innerHTML = `
    <article>
      <span>今日涉及</span>
      <strong>${escapeHtml(knowledgeAtlas.knowledgePoint)}</strong>
      <p>想知道今天做题背后的规律，可以打开知识图鉴看一眼；不看也没关系，系统已经记录你的练习过程。</p>
      <button class="secondary-action" type="button" id="open-today-atlas">今日涉及的知识图鉴</button>
    </article>
  `;

  practiceAtlasEntry.querySelector("#open-today-atlas")?.addEventListener("click", onOpenAtlas);
}
