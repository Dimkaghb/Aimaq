"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/modules/dashboard/components/Sidebar";
import { TopBar } from "@/modules/dashboard/components/TopBar";
import { useAuth } from "@/lib/supabase/auth-context";
import { fetchSavedBusinesses, deleteSavedBusiness } from "@/lib/api";
import type { SavedBusiness } from "@/types";
import type { UserProfile } from "@/types/dashboard";

const BIZ_LABELS: Record<string, string> = {
  fastfood: "Фастфуд",
  cafe: "Кафе",
  office: "Офис",
  retail: "Магазин",
  pharmacy: "Аптека",
};

const BIZ_ICONS: Record<string, React.ReactNode> = {
  fastfood: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  ),
  cafe: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  ),
  office: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  ),
  retail: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-5zM3 7h18M16 11a4 4 0 0 1-8 0" />
    </svg>
  ),
  pharmacy: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
};

function BusinessCard({
  biz,
  onDelete,
}: {
  biz: SavedBusiness;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Удалить сохранённый бизнес?")) return;
    setDeleting(true);
    try {
      await deleteSavedBusiness(biz.id);
      onDelete(biz.id);
    } catch {
      setDeleting(false);
    }
  }

  const date = new Date(biz.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href={`/dashboard/businesses/${biz.id}`}
      className="flex flex-col rounded-2xl transition-all hover:shadow-md"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        overflow: "hidden",
        textDecoration: "none",
        opacity: deleting ? 0.4 : 1,
        pointerEvents: deleting ? "none" : "auto",
      }}
    >
      <div className="flex flex-col" style={{ padding: "22px 22px 20px", gap: 16 }}>
        {/* Header: icon + name + delete */}
        <div className="flex items-start justify-between" style={{ gap: 10 }}>
          <div className="flex items-start" style={{ gap: 12 }}>
            <span
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                backgroundColor: "var(--beige-20)",
                color: "var(--neutral-30)",
              }}
            >
              {BIZ_ICONS[biz.business_type] ?? BIZ_ICONS.office}
            </span>
            <div className="flex flex-col" style={{ gap: 3 }}>
              <span
                className="font-semibold leading-snug"
                style={{ fontSize: 15, color: "var(--neutral-30)" }}
              >
                {biz.business_name || BIZ_LABELS[biz.business_type] || biz.business_type}
              </span>
              <span
                className="font-medium"
                style={{ fontSize: 12, color: "var(--neutral-10)" }}
              >
                {BIZ_LABELS[biz.business_type] ?? biz.business_type}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
            style={{
              width: 30,
              height: 30,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--neutral-10)",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        {/* Meta tags */}
        <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
          {biz.district && (
            <span
              className="text-[12px] font-medium rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
            >
              {biz.district}
            </span>
          )}
          {biz.budget_tenge && (
            <span
              className="text-[12px] font-medium rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: "var(--beige-10)", color: "var(--neutral-20)" }}
            >
              до {(biz.budget_tenge / 1000).toFixed(0)}K ₸
            </span>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{ paddingTop: 14, borderTop: "1px solid var(--stroke)" }}
        >
          <span className="font-medium" style={{ fontSize: 13, color: "var(--neutral-10)" }}>
            {biz.listings_count} мест
          </span>
          <span style={{ fontSize: 12, color: "var(--neutral-10)" }}>
            {date}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BusinessesPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<SavedBusiness[]>([]);
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
    fetchSavedBusinesses()
      .then((res) => setBusinesses(res.businesses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleDelete(id: string) {
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="flex" style={{ height: "100dvh", overflow: "hidden" }}>
      <Sidebar userName={userProfile?.name} />

      <main className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0 }}>
        <TopBar user={userProfile} isLoading={!user} />

        <div className="flex flex-col" style={{ padding: "0 28px 28px", gap: 18 }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1
              className="font-semibold tracking-tight"
              style={{ fontSize: 17, color: "var(--neutral-30)" }}
            >
              Мои бизнесы
            </h1>
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-full font-semibold transition-opacity hover:opacity-85"
              style={{
                padding: "10px 20px",
                fontSize: 14,
                backgroundColor: "var(--neutral-30)",
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Новый поиск
            </Link>
          </div>

          {/* Grid */}
          {loading ? (
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl animate-pulse"
                  style={{ height: 190, backgroundColor: "rgba(255,255,255,0.72)" }}
                />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl"
              style={{
                padding: "60px 20px",
                backgroundColor: "rgba(255,255,255,0.72)",
                gap: 10,
              }}
            >
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--neutral-10)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <p className="font-medium" style={{ fontSize: 15, color: "var(--neutral-20)" }}>
                Сохранённых бизнесов пока нет
              </p>
              <p style={{ fontSize: 13, color: "var(--neutral-10)" }}>
                Найдите места через поиск и сохраните результаты
              </p>
            </div>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
            >
              {businesses.map((biz) => (
                <BusinessCard key={biz.id} biz={biz} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
