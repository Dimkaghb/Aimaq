import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESULTS_DELAY_MS,
  classifyPollError,
  isValidSessionId,
  pollFailureMessage,
  reconcileSession,
  resultsDelay,
  sessionUrl,
} from "./search-session.ts";

const A = "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f";
const B = "9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";

describe("reconcileSession (the URL names the search; /app is always fresh)", () => {
  it("does nothing on a fresh /app", () => {
    assert.deepEqual(reconcileSession(null, null), { action: "none" });
  });

  it("restores a search named by the URL that the page does not hold (refresh, forward, shared link)", () => {
    assert.deepEqual(reconcileSession(A, null), { action: "restore", sessionId: A });
  });

  it("switches when the URL names a different search than the one held", () => {
    assert.deepEqual(reconcileSession(B, A), { action: "restore", sessionId: B });
  });

  it("does nothing when the URL already names the held search (the search was just started)", () => {
    assert.deepEqual(reconcileSession(A, A), { action: "none" });
  });

  it("leaves the search when the URL loses it (browser Back to the form)", () => {
    assert.deepEqual(reconcileSession(null, A), { action: "leave" });
  });

  it("rejects ids that cannot be searches instead of calling the API with junk", () => {
    for (const junk of ["", "abc", "../../etc/passwd", "1", `${A}x`, "<script>"]) {
      assert.deepEqual(reconcileSession(junk, null), { action: "invalid" }, junk);
    }
  });
});

describe("session ids and URLs", () => {
  it("validates UUIDs only", () => {
    assert.equal(isValidSessionId(A), true);
    assert.equal(isValidSessionId(A.toUpperCase()), true);
    assert.equal(isValidSessionId(null), false);
    assert.equal(isValidSessionId(undefined), false);
    assert.equal(isValidSessionId("nope"), false);
  });

  it("builds /app for no search and /app?s=<id> for one", () => {
    assert.equal(sessionUrl(null), "/app");
    assert.equal(sessionUrl(A), `/app?s=${A}`);
  });
});

describe("results delay", () => {
  it("shows results at once for a search that was already finished when opened", () => {
    assert.equal(resultsDelay(false), 0);
  });

  it("keeps the short 'preparing' pause for a search the user watched finish", () => {
    assert.equal(resultsDelay(true), RESULTS_DELAY_MS);
  });
});

describe("poll failures", () => {
  it("tells a missing search from a lost connection", () => {
    assert.equal(classifyPollError(new Error("HTTP 404")), "not-found");
    assert.equal(classifyPollError(new Error("HTTP 500")), "unreachable");
    assert.equal(classifyPollError(new TypeError("Failed to fetch")), "unreachable");
    assert.equal(classifyPollError("weird"), "unreachable");
  });

  it("has a distinct, non-empty message for each failure", () => {
    const messages = (["not-found", "unreachable", "failed"] as const).map(pollFailureMessage);
    assert.equal(new Set(messages).size, 3);
    assert.ok(messages.every((m) => m.length > 10));
  });
});
