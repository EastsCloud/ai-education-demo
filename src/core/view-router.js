export function createViewRouter({ navItems, views, title, viewTitles, onNavigate }) {
  function showView(viewId, payload = {}) {
    views.forEach((view) => {
      view.classList.toggle("active", view.id === viewId);
    });

    navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewId);
    });

    if (title) title.textContent = viewTitles[viewId] || "AI Education";
    onNavigate?.(viewId, payload);
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetView = item.dataset.view;
      showView(targetView);
    });
  });

  return { showView };
}
