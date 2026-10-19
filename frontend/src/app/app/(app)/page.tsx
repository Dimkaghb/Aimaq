"use client";

import Link from "next/link";
import s from "@/modules/search/search.module.css";
import { useRouter } from "next/navigation";
import { Questionnaire } from "@/components/Questionnaire";
import { PipelineProgress } from "@/components/PipelineProgress";
import { ResultsGrid } from "@/components/ResultsGrid";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { useSearchPolling } from "@/hooks/useSearchPolling";


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

export default function AppPage() {
  const router = useRouter();
  const appState = useLocationIQStore((s) => s.appState);
  const sessionId = useLocationIQStore((s) => s.sessionId);
  const resetSearch = useLocationIQStore((s) => s.resetSearch);
  const explanation = useLocationIQStore((s) => s.explanation);

  useSearchPolling();

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
          <Questionnaire onBack={() => router.push("/dashboard")} />
        )}

        {/* Loading — pipeline */}
        {appState === "loading" && (
          <LoadingScreen onCancel={resetSearch} />
        )}

        {/* Results — card grid */}
        {isResults && (
          <ResultsGrid
            key={sessionId}
            onStartOver={resetSearch}
            explanation={explanation}
          />
        )}
      </div>
    </>
  );
}
