export function setText(selector, value, root = document) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}
