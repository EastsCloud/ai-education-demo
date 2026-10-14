export function percent(value) {
  return `${Math.round(value * 100)}%`;
}

export function formatDateParts(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }),
    day: String(date.getDate()).padStart(2, "0"),
    full: dateValue.replaceAll("-", "."),
  };
}
