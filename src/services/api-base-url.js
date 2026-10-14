import { publicDemo } from "../runtime-config.js";

export function resolveApiBaseUrl(explicitBaseUrl, location = globalThis.location) {
  if (explicitBaseUrl) return explicitBaseUrl.replace(/\/$/, "");
  // The public portfolio uses browser-local fictional data, never the team's DB.
  if (publicDemo) return null;
  if (["http:", "https:"].includes(location?.protocol) ||
      ["127.0.0.1", "localhost", "::1"].includes(location?.hostname)) return "/api";
  return null;
}
