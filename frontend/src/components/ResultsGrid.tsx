"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { ScoreRing } from "./ScoreRing";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ContactModal } from "./ContactModal";
import { formatPrice, formatArea, getScoreBadges } from "@/lib/score-utils";
import { postContact } from "@/lib/api";
import type { ScoredListing } from "@/types";

const AlmatyMap = dynamic(
  () => import("@/components/AlmatyMap").then((m) => m.AlmatyMap),
  { ssr: false, loading: () => <div className="w-full h-full" style={{ backgroundColor: "var(--beige-10)" }} /> }
);

const BIZ_LABELS: Record<string, string> = {
  fastfood: "кафе / фастфуд",
  cafe: "ресторана",
  retail: "магазина",
  pharmacy: "аптеки",
  office: "офиса",
};

// ── Sidebar card ──────────────────────────────────────────────────────────

function SidebarCard({
  listing,
  rank,
  isActive,
  isExpanded,
  onExpand,
  onCollapse,
  onShowOnMap,
}: {
  listing: ScoredListing;
  rank: number;
  isActive: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onShowOnMap: () => void;
}) {
  const sessionId = useLocationIQStore((s) => s.sessionId);
  const setContactDraft = useLocationIQStore((s) => s.setContactDraft);
  const setAppState = useLocationIQStore((s) => s.setAppState);
  const setActiveListingId = useLocationIQStore((s) => s.setActiveListingId);

  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const { top, low } = getScoreBadges(listing);

  const rankColors = ["#16a34a", "#2563eb", "#d97706", "#7c3aed", "#64748b"];
  const rankBg = rankColors[rank - 1] ?? "var(--neutral-30)";

  async function handleContact(e: React.MouseEvent) {
    e.stopPropagation();
    if (!sessionId) return;
    setContactLoading(true);
    setContactError(null);
    try {
      const draft = await postContact(sessionId, listing.listing_id);
      setContactDraft(draft);
      setActiveListingId(listing.listing_id);
      setAppState("contact");
    } catch {
      setContactError("Не удалось сгенерировать письмо.");
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div
      id={`card-${listing.listing_id}`}
      className="flex flex-col transition-all"
      style={{
        backgroundColor: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
        borderLeft: isActive ? "3px solid var(--neutral-30)" : "3px solid transparent",
        cursor: "pointer",
      }}
      onClick={() => {
        if (!isExpanded) {
          onExpand();
          setActiveListingId(listing.listing_id);
        }
      }}
      onMouseEnter={() => setActiveListingId(listing.listing_id)}
    >
      <div style={{ padding: "14px 16px" }}>
        {/* Top row: rank + district + score */}
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span
              className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
              style={{ width: 26, height: 26, backgroundColor: rankBg, fontSize: 12 }}
            >
              {rank}
            </span>
            {listing.district && (
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: "var(--neutral-10)" }}
              >
                {listing.district}
              </span>
            )}
          </div>
          <ScoreRing score={listing.total_score} size={40} strokeWidth={4} />
        </div>

        {/* Address */}
        <p
          className="font-medium leading-snug line-clamp-2"
          style={{ fontSize: 14, color: "var(--neutral-30)", marginBottom: 6 }}
        >
          {listing.address}
        </p>

        {/* Price + area */}
        <div className="flex items-center flex-wrap" style={{ gap: 6, marginBottom: 8 }}>
          <span className="font-semibold" style={{ fontSize: 13, color: "var(--neutral-30)" }}>
            {listing.price_tenge != null ? formatPrice(listing.price_tenge) : "Цена не указана"}
          </span>
          {listing.area_sqm != null && (
            <span style={{ fontSize: 12, color: "var(--neutral-10)" }}>
              {formatArea(listing.area_sqm)}
            </span>
          )}
        </div>

        {/* Factor badges */}
        <div className="flex flex-wrap" style={{ gap: 4 }}>
          {top.map((b) => (
            <span
              key={b.label}
              className="text-[11px] font-semibold rounded-full px-2 py-0.5"
              style={{ backgroundColor: "rgba(14,161,88,0.08)", color: "var(--accent-green)" }}
            >
              {b.label}
            </span>
          ))}
          {low && (
            <span
              className="text-[11px] font-semibold rounded-full px-2 py-0.5"
              style={{ backgroundColor: "rgba(207,141,19,0.08)", color: "var(--accent-yellow)" }}
            >
              {low.label}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={isExpanded ? onCollapse : onExpand}
            className="text-[13px] font-medium"
            style={{ color: "var(--neutral-10)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {isExpanded ? "Скрыть ↑" : "Подробнее ↓"}
          </button>
        </div>

        {/* Expanded */}
        {isExpanded && (
          <div
            className="flex flex-col"
            style={{ gap: 12, marginTop: 12, borderTop: "1px solid var(--stroke)", paddingTop: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {listing.nearest_metro_name && (
                <span className="text-[12px] font-medium rounded-full px-2.5 py-1"
                  style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}>
                  M {listing.nearest_metro_name}
                  {listing.metro_distance_m != null && ` · ${Math.round(listing.metro_distance_m)}м`}
                </span>
              )}
              <span className="text-[12px] font-medium rounded-full px-2.5 py-1"
                style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}>
                {listing.bus_stops_nearby} остановок
              </span>
              <span className="text-[12px] font-medium rounded-full px-2.5 py-1"
                style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}>
                {listing.competitor_count} конкурентов
              </span>
            </div>

            <ScoreBreakdown breakdown={listing.score_breakdown} />

            {contactError && (
              <p className="text-[12px]" style={{ color: "#dc2626" }}>{contactError}</p>
            )}

            <div className="flex flex-col" style={{ gap: 6 }}>
              <button
                type="button"
                onClick={handleContact}
                disabled={contactLoading}
                className="w-full rounded-lg font-semibold transition-opacity"
                style={{
                  padding: "9px 12px", fontSize: 13,
                  backgroundColor: "var(--neutral-30)", color: "#fff",
                  border: "none", cursor: contactLoading ? "not-allowed" : "pointer",
                  opacity: contactLoading ? 0.7 : 1,
                }}
              >
                {contactLoading ? "Генерируем..." : "Написать арендодателю →"}
              </button>
              <div className="flex" style={{ gap: 6 }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onShowOnMap(); }}
                  className="flex-1 rounded-lg font-medium"
                  style={{
                    padding: "7px 8px", fontSize: 12,
                    backgroundColor: "transparent", color: "var(--neutral-20)",
                    border: "1.5px solid var(--stroke)", cursor: "pointer",
                  }}
                >
                  На карте
                </button>
                {listing.url && (
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg font-medium text-center"
                    style={{
                      padding: "7px 8px", fontSize: 12,
                      backgroundColor: "var(--beige-10)", color: "var(--neutral-20)",
                      border: "1.5px solid var(--stroke)", textDecoration: "none",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Объявление ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ResultsGrid: map + sidebar ───────────────────────────────────────

interface ResultsGridProps {
  onStartOver: () => void;
  explanation: string;
}

export function ResultsGrid({ onStartOver, explanation }: ResultsGridProps) {
  const appState = useLocationIQStore((s) => s.appState);
  const listings = useLocationIQStore((s) => s.listings);
  const businessType = useLocationIQStore((s) => s.businessType);
  const activeListingId = useLocationIQStore((s) => s.activeListingId);
  const expandedListingId = useLocationIQStore((s) => s.expandedListingId);
  const setActiveListingId = useLocationIQStore((s) => s.setActiveListingId);
  const setExpandedListingId = useLocationIQStore((s) => s.setExpandedListingId);
  const setAppState = useLocationIQStore((s) => s.setAppState);

  function handleExpand(id: string) {
    setExpandedListingId(id);
    setActiveListingId(id);
    setAppState("detail");
  }

  function handleCollapse() {
    setExpandedListingId(null);
    setAppState("results");
  }

  function handleShowOnMap(id: string) {
    setActiveListingId(id);
  }

  const bizLabel = businessType ? BIZ_LABELS[businessType] : "бизнеса";

  return (
    <div className="flex" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* Map — 70% */}
      <div className="relative" style={{ flex: "7 1 0%", minWidth: 0 }}>
        <AlmatyMap isStale={false} onRefresh={() => {}} />

        {/* Floating "new search" button */}
        <button
          type="button"
          onClick={onStartOver}
          className="absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-full font-medium shadow-md transition-opacity hover:opacity-85"
          style={{
            padding: "9px 16px",
            fontSize: 13,
            backgroundColor: "rgba(255,255,255,0.95)",
            color: "var(--neutral-30)",
            border: "1.5px solid var(--stroke)",
            backdropFilter: "blur(8px)",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Новый поиск
        </button>
      </div>

      {/* Right sidebar — 30% */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          flex: "3 1 0%",
          minWidth: 320,
          maxWidth: 400,
          borderLeft: "1px solid var(--stroke)",
          backgroundColor: "rgba(244,241,238,0.5)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex-shrink-0 flex flex-col"
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--stroke)",
            gap: 4,
          }}
        >
          <h2
            className="font-semibold tracking-tight"
            style={{ fontSize: 16, color: "var(--neutral-30)" }}
          >
            Топ {listings.length} для {bizLabel}
          </h2>
          <div className="flex items-center" style={{ gap: 10 }}>
            {[
              { color: "#16a34a", label: "≥ 70" },
              { color: "#d97706", label: "45–69" },
              { color: "#dc2626", label: "< 45" },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: "var(--neutral-10)" }}
              >
                <span className="rounded-full inline-block" style={{ width: 7, height: 7, backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* AI explanation */}
        {explanation && (
          <div
            className="flex-shrink-0 flex items-start"
            style={{
              padding: "12px 16px",
              gap: 8,
              borderBottom: "1px solid var(--stroke)",
              backgroundColor: "rgba(207,141,19,0.05)",
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>✦</span>
            <p className="leading-snug" style={{ fontSize: 13, color: "var(--neutral-20)" }}>
              {explanation}
            </p>
          </div>
        )}

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto">
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6" style={{ gap: 10 }}>
              <p className="text-center" style={{ fontSize: 14, color: "var(--neutral-10)" }}>
                Ничего не найдено.
              </p>
              <button
                type="button"
                onClick={onStartOver}
                className="rounded-full font-semibold"
                style={{
                  padding: "10px 20px", fontSize: 14,
                  backgroundColor: "var(--neutral-30)", color: "#fff",
                  border: "none", cursor: "pointer",
                }}
              >
                Попробовать снова
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {listings.map((listing, index) => (
                <div
                  key={listing.listing_id}
                  style={{ borderBottom: "1px solid var(--stroke)" }}
                >
                  <SidebarCard
                    listing={listing}
                    rank={index + 1}
                    isActive={listing.listing_id === activeListingId}
                    isExpanded={listing.listing_id === expandedListingId}
                    onExpand={() => handleExpand(listing.listing_id)}
                    onCollapse={handleCollapse}
                    onShowOnMap={() => handleShowOnMap(listing.listing_id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {appState === "contact" && <ContactModal />}
    </div>
  );
}
