import assert from "node:assert/strict";
import {
  createSignInDestination,
  getEntryActionForUser,
  getPostSignInDestination,
} from "../src/services/app-entry-route-policy.js";

assert.equal(getEntryActionForUser(null), "sign_in");
assert.equal(getEntryActionForUser({ role: "student" }), "student");
assert.equal(getEntryActionForUser({ role: "admin" }), "student");
assert.equal(getEntryActionForUser({ role: "parent" }), "observer");
assert.equal(getEntryActionForUser({ role: "teacher" }), "observer");

assert.equal(
  getPostSignInDestination({ user: { role: "student" }, next: "/index.html?from=calendar" }),
  "/index.html?from=calendar",
);
assert.equal(getPostSignInDestination({ user: { role: "student" }, next: "/observer.html" }), "./index.html");
assert.equal(getPostSignInDestination({ user: { role: "student" }, next: "https://example.com" }), "./index.html");
assert.equal(getPostSignInDestination({ user: { role: "student" }, next: "//example.com" }), "./index.html");
assert.equal(getPostSignInDestination({ user: { role: "parent" }, next: "/observer.html?tab=report" }), "/observer.html?tab=report");
assert.equal(getPostSignInDestination({ user: { role: "parent" }, next: "/index.html" }), "./observer.html");
assert.equal(getPostSignInDestination({ user: { role: "unknown" }, next: "/index.html" }), "./signin.html");

const signInDestination = createSignInDestination({
  href: "http://127.0.0.1:4188/index.html?from=calendar#today",
  pathname: "/index.html",
  search: "?from=calendar",
  hash: "#today",
});
const signInUrl = new URL(signInDestination);
assert.equal(signInUrl.pathname, "/signin.html");
assert.equal(signInUrl.searchParams.get("next"), "/index.html?from=calendar#today");

console.log("app-entry-route-policy-contract: passed");
