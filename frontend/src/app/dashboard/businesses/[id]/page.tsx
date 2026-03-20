"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/modules/dashboard/components/Sidebar";
import { TopBar } from "@/modules/dashboard/components/TopBar";
import { ScoreRing } from "@/components/ScoreRing";
import { useAuth } from "@/lib/supabase/auth-context";
import { fetchSavedBusiness } from "@/lib/api";
import { formatPrice, formatArea } from "@/lib/score-utils";
import type { ScoredListing } from "@/types";
import type { UserProfile } from "@/types/dashboard";

const BIZ_LABELS: Record<string, string> = {
  fastfood: "Фастфуд",
  cafe: "Кафе",
  office: "Офис",
  retail: "Магазин",
  pharmacy: "Аптека",
};

function ListingCard({ listing }: { listing: ScoredListing }) {
  return (
    <div
      className="flex flex-col rounded-2xl transition-all hover:shadow-md"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        overflow: "hidden",
      }}
    >
      <div className="flex flex-col" style={{ padding: "20px 20px 18px", gap: 14 }}>
        {/* Row: info + score */}
        <div className="flex items-start" style={{ gap: 12 }}>
          <div className="flex-1 min-w-0">
            <p
              className="font-medium leading-snug line-clamp-2"
              style={{ fontSize: 14, color: "var(--neutral-30)" }}
            >
              {listing.address}
            </p>
            {listing.district && (
              <span
                className="text-[12px]"
                style={{ color: "var(--neutral-10)", display: "block", marginTop: 2 }}
              >
                {listing.district}
              </span>
            )}
          </div>
          <ScoreRing score={listing.total_score} size={42} strokeWidth={4} />
        </div>

        {/* Price + area */}
        <div className="flex items-baseline" style={{ gap: 8 }}>
          <span className="font-semibold" style={{ fontSize: 15, color: "var(--neutral-30)" }}>
            {listing.price_tenge != null ? formatPrice(listing.price_tenge) : "—"}
          </span>
          {listing.area_sqm != null && (
            <span style={{ fontSize: 13, color: "var(--neutral-10)" }}>
              · {formatArea(listing.area_sqm)}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {listing.nearest_metro_name && (
            <span
              className="text-[12px] font-medium rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
            >
              M {listing.nearest_metro_name}
            </span>
          )}
          <span
            className="text-[12px] font-medium rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
          >
            {listing.bus_stops_nearby} ост.
          </span>
          <span
            className="text-[12px] font-medium rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
          >
            {listing.competitor_count} конкур.
          </span>
        </div>

        {/* Link */}
        {listing.url && (
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--accent-blue)", textDecoration: "none" }}
          >
            Открыть объявление →
          </a>
        )}
      </div>
    </div>
  );
}

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = params.id as string;
  const { user } = useAuth();

  const [business, setBusiness] = useState<{
    business: Record<string, string | number | null>;
    listings: ScoredListing[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const userProfile: UserProfile | undefined = user
    ? {
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
        email: user.email ?? "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }
    : undefined;

  useEffect(() => {
    if (!businessId) return;
    fetchSavedBusiness(businessId)
      .then((res) => setBusiness(res as never))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [businessId]);

  const biz = business?.business;
  const listings = business?.listings ?? [];
  const bizType = (biz?.business_type as string) ?? "";
  const title = (biz?.business_name as string) || BIZ_LABELS[bizType] || bizType;

  return (
    <div className="flex" style={{ height: "100dvh", overflow: "hidden" }}>
      <Sidebar userName={userProfile?.name} />

      <main className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0 }}>
        <TopBar user={userProfile} isLoading={!user} />

        <div className="flex flex-col" style={{ padding: "0 28px 28px", gap: 18 }}>
          {/* Breadcrumb + title */}
          <div className="flex flex-col" style={{ gap: 6 }}>
            <Link
              href="/dashboard/businesses"
              className="flex items-center gap-1.5 text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--neutral-10)", textDecoration: "none", width: "fit-content" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Мои бизнесы
            </Link>

            {loading ? (
              <div className="rounded animate-pulse" style={{ width: 200, height: 24, backgroundColor: "var(--beige-20)" }} />
            ) : (
              <div className="flex items-center" style={{ gap: 10 }}>
                <h1
                  className="font-semibold tracking-tight"
                  style={{ fontSize: 17, color: "var(--neutral-30)" }}
                >
                  {title}
                </h1>
                {bizType && (
                  <span
                    className="rounded-full font-medium"
                    style={{
                      padding: "3px 10px",
                      fontSize: 12,
                      backgroundColor: "var(--beige-10)",
                      color: "var(--neutral-10)",
                    }}
                  >
                    {BIZ_LABELS[bizType] ?? bizType}
                  </span>
                )}
                <span className="font-medium" style={{ fontSize: 13, color: "var(--neutral-10)" }}>
                  {listings.length} мест
                </span>
              </div>
            )}
          </div>

          {/* Listings grid */}
          {loading ? (
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl animate-pulse"
                  style={{ height: 190, backgroundColor: "rgba(255,255,255,0.72)" }}
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl"
              style={{
                padding: "60px 20px",
                backgroundColor: "rgba(255,255,255,0.72)",
                gap: 10,
              }}
            >
              <p className="font-medium" style={{ fontSize: 15, color: "var(--neutral-20)" }}>
                Нет сохранённых мест
              </p>
            </div>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
            >
              {listings.map((listing) => (
                <ListingCard key={listing.listing_id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
