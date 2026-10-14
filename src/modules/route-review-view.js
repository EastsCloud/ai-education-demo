function summarizeByStage(routes) {
  return routes.reduce((summary, route) => {
    summary[route.stage] = (summary[route.stage] || 0) + 1;
    return summary;
  }, {});
}

export function renderRouteReview({ routes }) {
  const panel = document.querySelector("#route-review-panel");
  if (!panel) return;

  const stageSummary = summarizeByStage(routes);
  panel.innerHTML = `
    <div class="panel-heading compact-heading">
      <p class="label">流程检查器</p>
      <h3>按 MVP 顺序开发，不再跳页。</h3>
    </div>
    <div class="route-summary-row">
      ${Object.entries(stageSummary)
        .map(
          ([stage, count]) => `
            <article>
              <span>${stage}</span>
              <strong>${count}</strong>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="route-review-list">
      ${routes
        .map(
          (route, index) => `
            <a href="./${route.page}?v=route-review" target="_blank" rel="noreferrer">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${route.productMeaning}</strong>
              <em>${route.priority} · ${route.stage}</em>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

