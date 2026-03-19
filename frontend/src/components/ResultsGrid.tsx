"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { ScoreRing } from "./ScoreRing";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ContactModal } from "./ContactModal";
import { formatPrice, formatArea, getScoreBadges, scoreToColor } from "@/lib/score-utils";
import { postContact } from "@/lib/api";
import type { ScoredListing } from "@/types";

const AlmatyMap = dynamic(
  () => import("@/components/AlmatyMap").then((m) => m.AlmatyMap),
  { ssr: false, loading: () => <div className="w-full h-full rounded-2xl" style={{ backgroundColor: "var(--beige-10)" }} /> }
);

// ─── Biz type labels ──────────────────────────────────────────────────────

const BIZ_LABELS: Record<string, string> = {
  fastfood: "кафе / фастфуд",
  cafe: "ресторана",
  retail: "магазина",
  pharmacy: "аптеки",
  office: "офиса",
};

// ─── Single result card for grid ─────────────────────────────────────────

interface GridCardProps {
  listing: ScoredListing;
  rank: number;
  isActive: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onShowOnMap: () => void;
}

function GridCard({
  listing,
  rank,
  isActive,
  isExpanded,
  onExpand,
  onCollapse,
  onShowOnMap,
}: GridCardProps) {
  const sessionId = useLocationIQStore((s) => s.sessionId);
  const setContactDraft = useLocationIQStore((s) => s.setContactDraft);
  const setAppState = useLocationIQStore((s) => s.setAppState);
  const setActiveListingId = useLocationIQStore((s) => s.setActiveListingId);

  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const { top, low } = getScoreBadges(listing);
  const rankColors = ["#16a34a", "#2563eb", "#d97706", "#7c3aed", "#dc2626"];
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
      className="flex flex-col rounded-2xl transition-all"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(8px)",
        border: isActive
          ? "2px solid var(--accent-blue)"
          : "2px solid transparent",
        boxShadow: isActive
          ? "0 4px 20px rgba(21,108,194,0.12)"
          : "0 2px 12px rgba(26,22,21,0.06)",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => {
        if (!isExpanded) {
          onExpand();
          setActiveListingId(listing.listing_id);
        }
      }}
    >
      {/* Card top: rank stripe + score */}
      <div
        className="flex items-center justify-between px-4 pt-4"
        style={{ gap: 12 }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <span
            className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              backgroundColor: rankBg,
              fontSize: 13,
            }}
          >
            {rank}
          </span>
          <div className="flex flex-col" style={{ gap: 2 }}>
            {listing.district && (
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em] rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: "var(--beige-10)",
                  color: "var(--neutral-10)",
                  width: "fit-content",
                }}
              >
                {listing.district}
              </span>
            )}
          </div>
        </div>
        <ScoreRing score={listing.total_score} size={48} />
      </div>

      {/* Address */}
      <div className="px-4 pt-3 pb-2">
        <p
          className="font-semibold leading-snug line-clamp-2"
          style={{ fontSize: 14, color: "var(--neutral-30)" }}
        >
          {listing.address}
        </p>
      </div>

      {/* Price + area row */}
      <div className="px-4 pb-3 flex items-center flex-wrap" style={{ gap: 8 }}>
        <span className="font-semibold" style={{ fontSize: 14, color: "var(--neutral-30)" }}>
          {listing.price_tenge != null ? formatPrice(listing.price_tenge) : "Цена не указана"}
        </span>
        {listing.area_sqm != null && (
          <span
            className="rounded-full text-[12px] font-medium px-2 py-0.5"
            style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-10)" }}
          >
            {formatArea(listing.area_sqm)}
          </span>
        )}
      </div>

      {/* Factor badges */}
      <div className="px-4 pb-3 flex flex-wrap" style={{ gap: 5 }}>
        {top.map((b) => (
          <span
            key={b.label}
            className="text-[11px] font-semibold rounded-full px-2.5 py-0.5"
            style={{
              backgroundColor: "rgba(14,161,88,0.1)",
              color: "var(--accent-green)",
            }}
          >
            {b.label}
          </span>
        ))}
        {low && (
          <span
            className="text-[11px] font-semibold rounded-full px-2.5 py-0.5"
            style={{
              backgroundColor: "rgba(207,141,19,0.1)",
              color: "var(--accent-yellow)",
            }}
          >
            {low.label}
          </span>
        )}
      </div>

      {/* Expand toggle */}
      <div
        className="px-4 pb-3 flex items-center justify-between border-t"
        style={{ borderColor: "var(--stroke)", paddingTop: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={isExpanded ? onCollapse : onExpand}
          className="text-[13px] font-medium transition-colors"
          style={{ color: "var(--accent-blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {isExpanded ? "Скрыть ↑" : "Подробнее ↓"}
        </button>
        {listing.nearest_metro_name && (
          <span
            className="flex items-center gap-1 text-[11px] font-medium"
            style={{ color: "var(--neutral-10)" }}
          >
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 17l4-8 4 8M8 13h8" />
            </svg>
            {listing.nearest_metro_name}
            {listing.metro_distance_m != null && ` · ${Math.round(listing.metro_distance_m)}м`}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div
          className="flex flex-col px-4 pb-4 border-t"
          style={{ gap: 14, borderColor: "var(--stroke)", paddingTop: 14 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Transit info */}
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <span
              className="flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1"
              style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
            >
              🚌 {listing.bus_stops_nearby} остановок
            </span>
            <span
              className="flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1"
              style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
            >
              🏪 {listing.competitor_count} конкурентов
            </span>
          </div>

          {/* Score breakdown */}
          <ScoreBreakdown breakdown={listing.score_breakdown} />

          {contactError && (
            <p className="text-[12px]" style={{ color: "#dc2626" }}>
              {contactError}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={handleContact}
              disabled={contactLoading}
              className="w-full rounded-xl font-semibold transition-opacity"
              style={{
                padding: "10px 14px",
                fontSize: 14,
                backgroundColor: "var(--neutral-30)",
                color: "#fff",
                border: "none",
                cursor: contactLoading ? "not-allowed" : "pointer",
                opacity: contactLoading ? 0.7 : 1,
              }}
            >
              {contactLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block rounded-full border-2 border-white border-t-transparent animate-spin" style={{ width: 12, height: 12 }} />
                  Генерируем письмо...
                </span>
              ) : (
                "Написать арендодателю →"
              )}
            </button>

            <div className="flex" style={{ gap: 8 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onShowOnMap(); }}
                className="flex-1 rounded-xl font-medium transition-colors"
                style={{
                  padding: "8px 10px",
                  fontSize: 13,
                  backgroundColor: "transparent",
                  color: "var(--accent-blue)",
                  border: "1.5px solid var(--blue-30)",
                  cursor: "pointer",
                }}
              >
                На карте
              </button>
              {listing.url && (
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl font-medium text-center transition-colors"
                  style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    backgroundColor: "var(--beige-10)",
                    color: "var(--neutral-20)",
                    border: "1.5px solid var(--stroke)",
                    textDecoration: "none",
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
  );
}

// ─── Score color legend ───────────────────────────────────────────────────

function ScoreLegend() {
  return (
    <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
      {[
        { color: "#16a34a", label: "≥ 70 — отлично" },
        { color: "#d97706", label: "45–69 — хорошо" },
        { color: "#dc2626", label: "< 45 — слабо" },
      ].map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--neutral-10)" }}
        >
          <span
            className="rounded-full inline-block"
            style={{ width: 10, height: 10, backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ─── Map view with listing markers ────────────────────────────────────────

function MapView({ onClose }: { onClose: () => void }) {
  const listings = useLocationIQStore((s) => s.listings);
  const activeListingId = useLocationIQStore((s) => s.activeListingId);
  const setActiveListingId = useLocationIQStore((s) => s.setActiveListingId);
  const setExpandedListingId = useLocationIQStore((s) => s.setExpandedListingId);
  const setAppState = useLocationIQStore((s) => s.setAppState);

  return (
    <div className="relative w-full" style={{ height: "calc(100dvh - 48px)" }}>
      <AlmatyMap isStale={false} onRefresh={() => {}} />

      {/* Overlay listing chips */}
      <div
        className="absolute bottom-6 left-1/2 z-[1000] flex flex-wrap justify-center"
        style={{ transform: "translateX(-50%)", gap: 8, maxWidth: "90vw" }}
      >
        {listings.map((l, i) => {
          const isActive = l.listing_id === activeListingId;
          return (
            <button
              key={l.listing_id}
              type="button"
              onClick={() => {
                setActiveListingId(l.listing_id);
                setExpandedListingId(l.listing_id);
                setAppState("detail");
                onClose();
              }}
              className="flex items-center gap-2 rounded-full font-semibold transition-all"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                backgroundColor: isActive ? scoreToColor(l.total_score) : "rgba(255,255,255,0.95)",
                color: isActive ? "#fff" : "var(--neutral-30)",
                border: `2px solid ${isActive ? scoreToColor(l.total_score) : "var(--stroke)"}`,
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                backdropFilter: "blur(6px)",
                cursor: "pointer",
              }}
            >
              <span
                className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  fontSize: 11,
                  backgroundColor: isActive ? "rgba(255,255,255,0.3)" : scoreToColor(l.total_score),
                }}
              >
                {i + 1}
              </span>
              {l.address.split(",")[0]}
            </button>
          );
        })}
      </div>

      {/* Back to grid */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-[1000] flex items-center gap-2 rounded-full font-semibold shadow-md transition-opacity hover:opacity-85"
        style={{
          padding: "10px 16px",
          fontSize: 13,
          backgroundColor: "rgba(255,255,255,0.95)",
          color: "var(--neutral-30)",
          border: "1.5px solid var(--stroke)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        Список
      </button>
    </div>
  );
}

// ─── Main ResultsGrid ─────────────────────────────────────────────────────

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

  const [mapView, setMapView] = useState(false);

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
    setMapView(true);
  }

  const bizLabel = businessType ? BIZ_LABELS[businessType] : "бизнеса";

  if (mapView) {
    return (
      <>
        <MapView onClose={() => setMapView(false)} />
        {appState === "contact" && <ContactModal />}
      </>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 48px)" }}>
      {/* Results header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 flex-wrap"
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--stroke)",
          gap: 12,
        }}
      >
        <div className="flex flex-col" style={{ gap: 2 }}>
          <h2
            className="font-semibold tracking-tight"
            style={{ fontSize: 18, color: "var(--neutral-30)" }}
          >
            Топ {listings.length} локаций для {bizLabel}
          </h2>
          <ScoreLegend />
        </div>

        <div className="flex items-center" style={{ gap: 10 }}>
          {/* Map toggle */}
          <button
            type="button"
            onClick={() => setMapView(true)}
            className="flex items-center gap-2 rounded-full font-medium transition-colors"
            style={{
              padding: "8px 16px",
              fontSize: 13,
              backgroundColor: "var(--beige-10)",
              color: "var(--neutral-20)",
              border: "1.5px solid var(--stroke)",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
            Карта
          </button>

          {/* Start over */}
          <button
            type="button"
            onClick={onStartOver}
            className="flex items-center gap-1.5 rounded-full font-medium transition-colors"
            style={{
              padding: "8px 16px",
              fontSize: 13,
              backgroundColor: "transparent",
              color: "var(--neutral-20)",
              border: "1.5px solid var(--stroke)",
              cursor: "pointer",
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Новый поиск
          </button>
        </div>
      </div>

      {/* AI explanation banner */}
      {explanation && (
        <div
          className="mx-6 mt-6 rounded-2xl px-5 py-4 flex items-start"
          style={{
            backgroundColor: "rgba(21,108,194,0.06)",
            border: "1px solid var(--blue-20)",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20, flexShrink: 0 }}>✨</span>
          <p
            className="leading-relaxed"
            style={{ fontSize: 14, color: "var(--neutral-20)" }}
          >
            {explanation}
          </p>
        </div>
      )}

      {/* Card grid */}
      <div className="flex-1 p-6">
        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ gap: 12 }}>
            <span style={{ fontSize: 48 }}>🔍</span>
            <p className="text-center" style={{ fontSize: 16, color: "var(--neutral-10)" }}>
              Ничего не найдено. Попробуйте изменить параметры.
            </p>
            <button
              type="button"
              onClick={onStartOver}
              className="rounded-full font-semibold"
              style={{
                padding: "12px 24px",
                fontSize: 15,
                backgroundColor: "var(--neutral-30)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Начать заново
            </button>
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
              maxWidth: 1072,
              margin: "0 auto",
            }}
          >
            {listings.map((listing, index) => (
              <div key={listing.listing_id} id={`card-${listing.listing_id}`}>
                <GridCard
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

      {appState === "contact" && <ContactModal />}
    </div>
  );
}
