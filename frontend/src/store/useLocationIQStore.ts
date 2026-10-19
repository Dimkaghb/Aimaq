"use client";

import { create } from "zustand";
import type {
  AppState,
  BusinessType,
  ScoredListing,
  ContactResponse,
} from "@/types";
import type { HeatmapLayer, HeatmapPoint } from "@/lib/api";

interface LocationIQStore {
  appState: AppState;
  setAppState: (s: AppState) => void;

  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  businessType: BusinessType | null;
  district: string | null;
  budgetTenge: number;
  areaSqmMin: number;
  competitorTolerance: number;
  setBusinessType: (t: BusinessType) => void;
  setDistrict: (d: string | null) => void;
  setBudget: (b: number) => void;
  setArea: (a: number) => void;
  setCompetitorTolerance: (n: number) => void;

  listings: ScoredListing[];
  setListings: (l: ScoredListing[]) => void;
  activeListingId: string | null;
  setActiveListingId: (id: string | null) => void;
  expandedListingId: string | null;
  setExpandedListingId: (id: string | null) => void;

  explanation: string;
  setExplanation: (e: string) => void;

  contactDraft: ContactResponse | null;
  setContactDraft: (d: ContactResponse | null) => void;

  pipelineStatus: string | null;
  setPipelineStatus: (s: string | null) => void;

  // Last searched params (to detect stale results)
  lastSearchedParams: string | null;
  setLastSearchedParams: (p: string | null) => void;

  // Heatmap layer
  activeHeatmap: HeatmapLayer | null;
  setActiveHeatmap: (layer: HeatmapLayer | null) => void;
  heatmapPoints: HeatmapPoint[];
  setHeatmapPoints: (points: HeatmapPoint[]) => void;
  heatmapLoading: boolean;
  setHeatmapLoading: (loading: boolean) => void;

  // Why the last search ended without results (shown on the form); cleared when a new one starts.
  searchError: string | null;
  setSearchError: (message: string | null) => void;

  // True when the page itself pushed this search's URL (so cancelling can pop that history entry
  // instead of leaving a duplicate /app behind). False for a search opened from a link or refresh.
  searchEntryPushed: boolean;
  setSearchEntryPushed: (pushed: boolean) => void;

  /** Drop the current search and its results but keep the form answers ("Изменить запрос"). */
  resetSearch: () => void;
  /** A clean slate: no search, and the form back to its defaults. Used when /app is left. */
  resetAll: () => void;
}

/** Form defaults: what a new search starts from. */
export const FORM_DEFAULTS = {
  businessType: null,
  district: null,
  budgetTenge: 500000,
  areaSqmMin: 50,
  competitorTolerance: 3,
} as const;

/** Everything that belongs to one search (not the form answers). Fresh arrays on every call. */
const noSearch = (): Partial<LocationIQStore> => ({
  sessionId: null,
  listings: [],
  activeListingId: null,
  expandedListingId: null,
  explanation: "",
  contactDraft: null,
  pipelineStatus: null,
  appState: "idle",
  lastSearchedParams: null,
  searchError: null,
  searchEntryPushed: false,
  activeHeatmap: null,
  heatmapPoints: [],
  heatmapLoading: false,
});

export const useLocationIQStore = create<LocationIQStore>((set) => ({
  appState: "idle",
  setAppState: (s) => set({ appState: s }),

  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  ...FORM_DEFAULTS,
  setBusinessType: (t) => set({ businessType: t }),
  setDistrict: (d) => set({ district: d }),
  setBudget: (b) => set({ budgetTenge: b }),
  setArea: (a) => set({ areaSqmMin: a }),
  setCompetitorTolerance: (n) => set({ competitorTolerance: n }),

  listings: [],
  setListings: (l) => set({ listings: l }),
  activeListingId: null,
  setActiveListingId: (id) => set({ activeListingId: id }),
  expandedListingId: null,
  setExpandedListingId: (id) => set({ expandedListingId: id }),

  explanation: "",
  setExplanation: (e) => set({ explanation: e }),

  contactDraft: null,
  setContactDraft: (d) => set({ contactDraft: d }),

  pipelineStatus: null,
  setPipelineStatus: (s) => set({ pipelineStatus: s }),

  lastSearchedParams: null,
  setLastSearchedParams: (p) => set({ lastSearchedParams: p }),

  activeHeatmap: null,
  setActiveHeatmap: (layer) => set({ activeHeatmap: layer }),
  heatmapPoints: [],
  setHeatmapPoints: (points) => set({ heatmapPoints: points }),
  heatmapLoading: false,
  setHeatmapLoading: (loading) => set({ heatmapLoading: loading }),

  searchError: null,
  setSearchError: (message) => set({ searchError: message }),

  searchEntryPushed: false,
  setSearchEntryPushed: (pushed) => set({ searchEntryPushed: pushed }),

  resetSearch: () => set(noSearch()),
  resetAll: () => set({ ...noSearch(), ...FORM_DEFAULTS }),
}));
