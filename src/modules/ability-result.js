import { escapeHtml } from "../core/html.js?v=content-safety-1";

export function renderAbilityDimensions({ targetSelector, abilityMap, percent }) {
  const abilityDimensionMap = document.querySelector(targetSelector);
  if (!abilityDimensionMap) return;

  abilityDimensionMap.innerHTML = abilityMap.dimensions
    .map(
      (dimension) => `
        <article>
          <div>
            <strong>${escapeHtml(dimension.name)}</strong>
            <span>${escapeHtml(dimension.level)}</span>
          </div>
          <div class="dimension-meter" aria-label="${escapeHtml(dimension.name)} ${escapeHtml(percent(dimension.score))}">
            <i style="width: ${percent(dimension.score)}"></i>
          </div>
        </article>
      `,
    )
    .join("");
}

const shortDimensionLabels = {
  concept: "概念",
  reading: "读题",
  equation_building: "列式",
  calculation: "计算",
  transfer: "迁移",
  hint_dependency: "独立",
};

const constellationPositions = [
  { x: 18, y: 28, size: "wide" },
  { x: 47, y: 14, size: "small" },
  { x: 80, y: 25, size: "wide" },
  { x: 83, y: 72, size: "small" },
  { x: 47, y: 86, size: "wide" },
  { x: 17, y: 73, size: "small" },
];

function constellationState(score) {
  if (score >= 0.76) return "steady";
  if (score >= 0.56) return "growing";
  return "focus";
}

function renderConstellationRoute(dimensions) {
  return dimensions
    .map((dimension, index) => {
      const position = constellationPositions[index % constellationPositions.length];
      const score = Math.max(0, Math.min(1, Number(dimension.score) || 0));
      const state = constellationState(score);
      const controlX = 50 + (position.x - 50) * 0.36;
      const controlY = 50 + (position.y - 50) * 0.18;
      return `<path class="${state}" d="M 50 50 Q ${controlX} ${controlY} ${position.x} ${position.y}" />`;
    })
    .join("");
}

function renderAbilityConstellation({ abilityMap, percent }) {
  const dimensions = abilityMap.dimensions || [];
  const nodes = dimensions
    .map((dimension, index) => {
      const position = constellationPositions[index % constellationPositions.length];
      const score = Math.max(0, Math.min(1, Number(dimension.score) || 0));
      const state = constellationState(score);
      const label = shortDimensionLabels[dimension.id] || dimension.name;
      return `
        <article
          class="ability-constellation-node ${state} ${position.size}"
          style="--x: ${position.x}%; --y: ${position.y}%; --score: ${Math.round(score * 100)}%"
          aria-label="${escapeHtml(dimension.name)}：${escapeHtml(percent(score))}，${escapeHtml(dimension.level)}"
        >
          <i class="ability-constellation-score" aria-hidden="true"><b>${escapeHtml(percent(score))}</b></i>
          <strong>${escapeHtml(label)}</strong>
        </article>
      `;
    })
    .join("");

  return `
    <div class="ability-constellation" role="img" aria-label="数学能力起点地图">
      <svg class="ability-constellation-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${renderConstellationRoute(dimensions)}
      </svg>
      <div class="ability-constellation-center">
        <span>从这里</span>
        <strong>${percent(abilityMap.overallLevel)}</strong>
      </div>
      ${nodes}
    </div>
  `;
}

export function renderInitialAbilityResult({ abilityMap, learningGoal, percent }) {
  const resultSummary = document.querySelector("#initial-result-summary");
  if (resultSummary) {
    const focus = abilityMap.weakPoints?.[0] || "下一组数学练习";
    const strength = abilityMap.strengths?.[0] || "继续观察";
    resultSummary.innerHTML = `
      <article class="ability-result-start">
        <span>你的起点</span>
        <strong>${percent(abilityMap.overallLevel)}</strong>
        <p>从这里开始，慢慢把地图点亮。</p>
      </article>
      <article class="ability-result-direction">
        <span>先点亮这里</span>
        <strong>${escapeHtml(focus)}</strong>
        <p>已经很稳：${escapeHtml(strength)}</p>
      </article>
    `;
  }

  const abilityMapContainer = document.querySelector("#initial-ability-map");
  if (abilityMapContainer) abilityMapContainer.innerHTML = renderAbilityConstellation({ abilityMap, percent });
}
