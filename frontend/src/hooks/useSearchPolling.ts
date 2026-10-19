"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { pollSearch } from "@/lib/api";
import { classifyPollError, pollFailureMessage, resultsDelay, type PollFailure } from "@/lib/search-session";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import type { BusinessType } from "@/types";

const BUSINESS_TYPES: readonly string[] = ["fastfood", "cafe", "office", "retail", "pharmacy"];

/** End a search that cannot produce results: back to the form, with the reason shown there. */
function failSearch(kind: PollFailure | "failed") {
  const store = useLocationIQStore.getState();
  store.resetSearch();
  store.setSearchError(pollFailureMessage(kind));
}

export function useSearchPolling() {
  const sessionId = useLocationIQStore((s) => s.sessionId);
  const appState = useLocationIQStore((s) => s.appState);

  const isPolling = appState === "loading" && sessionId !== null;

  const query = useQuery({
    queryKey: ["search-poll", sessionId],
    queryFn: () => pollSearch(sessionId!),
    enabled: isPolling,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      return data.status === "complete" || data.status === "failed" ? false : 2000;
    },
    retry: 2,
  });

  const watchedRun = useRef<string | null>(null); // the search whose progress we saw
  const handledEnd = useRef<string | null>(null); // the search whose ending we already applied
  const resultsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resultsTimer.current) clearTimeout(resultsTimer.current); }, []);

  useEffect(() => {
    const data = query.data;
    // A response for a search that is no longer the current one (cancelled, replaced) is ignored.
    if (!data || data.session_id !== sessionId) return;
    const store = useLocationIQStore.getState();
    store.setPipelineStatus(data.status);

    // A search opened from its URL has no form answers; take what the server knows.
    if (store.businessType === null && BUSINESS_TYPES.includes(data.business_type)) {
      store.setBusinessType(data.business_type as BusinessType);
    }

    if (data.status === "failed") {
      if (handledEnd.current === data.session_id) return;
      handledEnd.current = data.session_id;
      failSearch("failed");
      return;
    }

    if (data.status !== "complete") {
      watchedRun.current = data.session_id;
      return;
    }

    if (handledEnd.current === data.session_id) return;
    handledEnd.current = data.session_id;

    // Always replace, even with nothing: an empty result must not leave the previous
    // search's listings on screen.
    store.setListings(data.results ?? []);
    store.setExplanation(data.explanation ?? "");
    const id = data.session_id;
    resultsTimer.current = setTimeout(() => {
      const current = useLocationIQStore.getState();
      if (current.sessionId === id) current.setAppState("results"); // not if cancelled meanwhile
    }, resultsDelay(watchedRun.current === id));
  }, [query.data, sessionId]);

  // The connection dropped for good, or the search does not exist: say so instead of spinning.
  useEffect(() => {
    if (query.isError && sessionId) failSearch(classifyPollError(query.error));
  }, [query.isError, query.error, sessionId]);

  return query;
}
