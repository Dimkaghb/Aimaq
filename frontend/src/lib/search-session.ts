/**
 * How the /app page keeps a search and the URL in step. Pure functions, no imports, so the
 * rules can be unit-tested on their own (see search-session.test.ts).
 *
 * The URL is the source of truth:
 *   /app          -> a fresh search (the form)
 *   /app?s=<id>   -> one specific search: running, or finished (survives refresh and Back/forward)
 */

export const APP_PATH = "/app";
export const SESSION_PARAM = "s";

/** Pause before showing results of a search the user watched finish (the "preparing" beat). */
export const RESULTS_DELAY_MS = 1200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(id: string | null | undefined): id is string {
  return typeof id === "string" && UUID.test(id);
}

export function sessionUrl(id: string | null): string {
  return id ? `${APP_PATH}?${SESSION_PARAM}=${encodeURIComponent(id)}` : APP_PATH;
}

export type SessionSync =
  | { action: "none" }
  /** The URL names a search the page does not hold yet (refresh, forward, shared link). */
  | { action: "restore"; sessionId: string }
  /** The URL has no search but the page still holds one (browser Back to the form). */
  | { action: "leave" }
  /** The URL names something that cannot be a search id. */
  | { action: "invalid" };

/**
 * What to do when the URL's search id changes.
 * `held` is the search the page currently holds. Runs on URL changes only, so starting a search
 * (store set, then URL pushed) never looks like "the URL lost its search".
 */
export function reconcileSession(urlSession: string | null, held: string | null): SessionSync {
  if (urlSession === null) return held === null ? { action: "none" } : { action: "leave" };
  if (!isValidSessionId(urlSession)) return { action: "invalid" };
  return urlSession === held ? { action: "none" } : { action: "restore", sessionId: urlSession };
}

/** A search the user watched finish gets the short pause; one opened already finished does not. */
export function resultsDelay(watchedItRun: boolean): number {
  return watchedItRun ? RESULTS_DELAY_MS : 0;
}

export type PollFailure = "not-found" | "unreachable";

export function classifyPollError(error: unknown): PollFailure {
  return error instanceof Error && /\b404\b/.test(error.message) ? "not-found" : "unreachable";
}

export function pollFailureMessage(kind: PollFailure | "failed"): string {
  switch (kind) {
    case "not-found":
      return "Этот подбор не найден или больше недоступен. Начните новый.";
    case "unreachable":
      return "Не удалось получить результаты подбора. Проверьте соединение и запустите подбор ещё раз.";
    case "failed":
      return "Подбор не удалось завершить. Попробуйте ещё раз.";
  }
}
