function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveRuntimePracticeDate({ demoDate, useDemoSeedData = false, now = new Date() } = {}) {
  if (useDemoSeedData && /^\d{4}-\d{2}-\d{2}$/.test(String(demoDate || ""))) return demoDate;
  return toLocalIsoDate(now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date());
}
