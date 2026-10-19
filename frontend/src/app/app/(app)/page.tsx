"use client";

import { Suspense } from "react";
import Link from "next/link";
import s from "@/modules/search/search.module.css";
import { useRouter } from "next/navigation";
import { Questionnaire } from "@/components/Questionnaire";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ResultsGrid } from "@/components/ResultsGrid";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { useSearchPolling } from "@/hooks/useSearchPolling";
import { useSearchSession } from "@/hooks/useSearchSession";
import { APP_PATH } from "@/lib/search-session";


// ─── Loading screen ───────────────────────────────────────────────────────

function LoadingScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: 520,
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(8px)",
          overflow: "hidden",
        }}
      >
        <PipelineProgress />

        <div
          className="px-5 pb-5 flex justify-center"
          style={{ paddingTop: 4 }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full font-medium transition-all"
            style={{
              padding: "8px 24px",
              fontSize: 13,
              backgroundColor: "transparent",
              color: "var(--neutral-10)",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.04)";
              e.currentTarget.style.color = "var(--accent-orange)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--neutral-10)";
            }}
          >
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

// useSearchParams needs a Suspense boundary (the page is prerendered).
export default function AppPage() {
  return (
    <Suspense fallback={null}>
      <SearchApp />
    </Suspense>
  );
}

function SearchApp() {
  const router = useRouter();
  const appState = useLocationIQStore((s) => s.appState);
  const sessionId = useLocationIQStore((s) => s.sessionId);
  const resetSearch = useLocationIQStore((s) => s.resetSearch);
  const explanation = useLocationIQStore((s) => s.explanation);
  const searchError = useLocationIQStore((s) => s.searchError);

  useSearchSession();
  useSearchPolling();

  // "Изменить запрос": back to the form with the answers kept. A pushed entry, so the browser's
  // Back button returns to these results.
  const editRequest = () => {
    resetSearch();
    router.push(APP_PATH);
  };
  // "Отменить": abandon the search so Back does not return to a cancelled one. If this page pushed
  // the search's history entry, pop it (replacing would leave a duplicate /app, and Back would
  // need two presses to leave); for a search opened from a link there is nothing to pop.
  const cancelSearch = () => {
    const pushedHere = useLocationIQStore.getState().searchEntryPushed;
    resetSearch();
    if (pushedHere) router.back();
    else router.replace(APP_PATH);
  };

  const isResults =
    appState === "results" || appState === "detail" || appState === "contact";

  return (
    <>
      <style>{`
        .pipeline-spinner {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      <div className={s.page}>
        {!isResults && <header className={s.header}><Link href="/dashboard" className={s.logo}>aimaq<span>.</span></Link><span className={s.breadcrumb}>Подбор локации</span><Link href="/dashboard" className={s.headerLink}>В личный кабинет ↗</Link></header>}

        {/* Idle / Form — questionnaire (no hero step) */}
        {(appState === "idle" || appState === "form") && (
          <>
            {searchError && <p role="alert" className={s.searchNotice}>{searchError}</p>}
            <Questionnaire onBack={() => router.push("/dashboard")} />
          </>
        )}

        {/* Loading — pipeline */}
        {appState === "loading" && (
          <LoadingScreen onCancel={cancelSearch} />
        )}

        {/* Results — card grid */}
        {isResults && (
          <ResultsGrid
            key={sessionId}
            onStartOver={editRequest}
            explanation={explanation}
          />
        )}
      </div>
    </>
  );
}
