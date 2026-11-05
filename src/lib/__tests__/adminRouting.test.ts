import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAdminAccess } from "../adminRouting";

test("a signed-out user is sent to login from any admin page", () => {
  assert.equal(resolveAdminAccess("/admin", false), "login");
  assert.equal(resolveAdminAccess("/admin/money/accounts", false), "login");
});

test("a signed-in user passes through admin pages and is bounced off the login page", () => {
  assert.equal(resolveAdminAccess("/admin/money/accounts", true), "allow");
  assert.equal(resolveAdminAccess("/admin/login", true), "home");
  assert.equal(resolveAdminAccess("/admin/login", false), "allow");
});

test("admin API calls are never redirected — their handlers answer 401 themselves", () => {
  // They are matched only so the session cookie is renewed by API activity.
  assert.equal(resolveAdminAccess("/api/admin/money/entries", false), "allow");
  assert.equal(resolveAdminAccess("/api/admin/money/entries", true), "allow");
});

test("anything outside the admin is left alone", () => {
  assert.equal(resolveAdminAccess("/", false), "allow");
  assert.equal(resolveAdminAccess("/api/booking/config", false), "allow");
});
