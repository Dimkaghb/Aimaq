import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { reconcileSession } from "../lib/search-session.ts";
import { FORM_DEFAULTS, useLocationIQStore } from "./useLocationIQStore.ts";
import type { ScoredListing } from "../types/index.ts";

const ID = "3f2b8c1e-5d4a-4b7e-9c10-0a1b2c3d4e5f";
const listing = { listing_id: "l1", total_score: 80 } as ScoredListing;
const store = () => useLocationIQStore.getState();

/** A user part-way through a finished search, with a map layer open. */
function finishedSearch() {
  const s = store();
  s.setBusinessType("cafe");
  s.setDistrict("Аулиеата");
  s.setBudget(300000);
  s.setSessionId(ID);
  s.setListings([listing]);
  s.setExplanation("Объяснение");
  s.setActiveListingId("l1");
  s.setExpandedListingId("l1");
  s.setAppState("results");
  s.setActiveHeatmap("transit");
  s.setHeatmapPoints([{ lat: 42.9, lng: 71.3, intensity: 1 }]);
  s.setHeatmapLoading(true);
  s.setSearchError("old error");
  s.setSearchEntryPushed(true);
}

beforeEach(() => store().resetAll());

describe("resetSearch ('Изменить запрос', cancel)", () => {
  it("drops the search, its results and the open map layer", () => {
    finishedSearch();
    store().resetSearch();
    const s = store();
    assert.equal(s.sessionId, null);
    assert.equal(s.appState, "idle");
    assert.deepEqual(s.listings, []);
    assert.equal(s.explanation, "");
    assert.equal(s.activeListingId, null);
    assert.equal(s.expandedListingId, null);
    assert.equal(s.activeHeatmap, null);
    assert.deepEqual(s.heatmapPoints, []);
    assert.equal(s.heatmapLoading, false);
    assert.equal(s.searchError, null);
    assert.equal(s.searchEntryPushed, false);
  });

  it("keeps the form answers so the request can be edited", () => {
    finishedSearch();
    store().resetSearch();
    assert.equal(store().businessType, "cafe");
    assert.equal(store().district, "Аулиеата");
    assert.equal(store().budgetTenge, 300000);
  });
});

describe("resetAll (leaving /app)", () => {
  it("also puts the form back to its defaults", () => {
    finishedSearch();
    store().resetAll();
    const s = store();
    assert.equal(s.businessType, FORM_DEFAULTS.businessType);
    assert.equal(s.district, FORM_DEFAULTS.district);
    assert.equal(s.budgetTenge, FORM_DEFAULTS.budgetTenge);
    assert.equal(s.areaSqmMin, FORM_DEFAULTS.areaSqmMin);
    assert.equal(s.competitorTolerance, FORM_DEFAULTS.competitorTolerance);
    assert.equal(s.appState, "idle");
  });

  it("does not share its empty arrays between resets", () => {
    store().resetAll();
    store().listings.push(listing); // misuse, but it must not leak into the next reset
    store().resetAll();
    assert.deepEqual(store().listings, []);
  });
});

describe("the reported bug: dashboard -> search -> back to dashboard -> 'new search'", () => {
  it("shows the form, not the last search's results and map", () => {
    finishedSearch();
    // The user leaves /app (the page's unmount cleanup runs), then returns via any link.
    store().resetAll();

    const s = store();
    assert.equal(s.appState, "idle");        // the form, not results
    assert.deepEqual(s.listings, []);        // no old pins on the map
    assert.equal(s.sessionId, null);         // nothing to poll
    assert.equal(s.activeHeatmap, null);     // no old heat layer
    assert.equal(s.businessType, null);      // a clean form
    assert.equal(reconcileSession(null, s.sessionId).action, "none"); // /app is a fresh search
  });
});

describe("a search's life in the URL", () => {
  it("starting a search is not mistaken for the URL losing it", () => {
    // Questionnaire: store first, then push the URL. The URL effect then sees the same id.
    store().setSessionId(ID);
    store().setAppState("loading");
    assert.equal(reconcileSession(ID, store().sessionId).action, "none");
  });

  it("Back to /app drops the search but keeps the answers; forward restores it", () => {
    finishedSearch();
    const back = reconcileSession(null, store().sessionId);
    assert.equal(back.action, "leave");
    store().resetSearch();
    assert.equal(store().businessType, "cafe");

    const forward = reconcileSession(ID, store().sessionId);
    assert.deepEqual(forward, { action: "restore", sessionId: ID });
    store().resetSearch();
    store().setSessionId(ID);
    store().setAppState("loading"); // polling takes over and shows the results
    assert.equal(store().appState, "loading");
    assert.equal(store().sessionId, ID);
  });

  it("a refresh (empty store, URL names the search) restores it", () => {
    store().resetAll();
    assert.deepEqual(reconcileSession(ID, store().sessionId), { action: "restore", sessionId: ID });
  });
});
