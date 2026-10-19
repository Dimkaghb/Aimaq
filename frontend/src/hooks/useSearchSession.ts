"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APP_PATH, SESSION_PARAM, pollFailureMessage, reconcileSession } from "@/lib/search-session";
import { useLocationIQStore } from "@/store/useLocationIQStore";

/**
 * Keeps the /app page and the URL in step (rules in lib/search-session.ts):
 *   /app          always a fresh search
 *   /app?s=<id>   that search: resumed if running, shown if finished
 * and clears everything when the page is left, so coming back never shows the last search.
 */
export function useSearchSession(): { urlSession: string | null } {
  const router = useRouter();
  const urlSession = useSearchParams().get(SESSION_PARAM);
  const searchError = useLocationIQStore((s) => s.searchError);

  // URL -> page. Depends on the URL only: starting a search sets the store and then pushes the
  // URL, which must not look like "the URL lost its search".
  useEffect(() => {
    const store = useLocationIQStore.getState();
    const sync = reconcileSession(urlSession, store.sessionId);
    switch (sync.action) {
      case "restore":
        store.resetSearch();
        store.setSessionId(sync.sessionId);
        store.setAppState("loading"); // polling takes over
        break;
      case "leave": // browser Back to the form
        store.resetSearch();
        break;
      case "invalid":
        store.resetSearch();
        store.setSearchError(pollFailureMessage("not-found"));
        break;
      case "none":
        break;
    }
  }, [urlSession]);

  // Leaving /app (dashboard link, sidebar, address bar...) clears the search and the form, whatever
  // the way out, so the next visit starts new. Only the URL keeps a search across a visit.
  useEffect(() => () => useLocationIQStore.getState().resetAll(), []);

  // A search that ended in an error must not keep its id in the URL (a refresh would retry it).
  useEffect(() => {
    if (searchError && urlSession) router.replace(APP_PATH);
  }, [searchError, urlSession, router]);

  return { urlSession };
}
