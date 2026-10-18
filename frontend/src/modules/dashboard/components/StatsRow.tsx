"use client";

import type { DashboardStat } from "@/types/dashboard";

interface StatsRowProps {
  stats: DashboardStat[] | undefined;
  isLoading: boolean;
}

const STAT_ICONS: Record<string, { bg: string; icon: React.ReactNode }> = {
  total_searches: {
    bg: "var(--beige-30)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  listings_found: {
    bg: "var(--beige-20)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  completed_searches: {
    bg: "var(--beige-20)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  top_business_type: {
    bg: "var(--beige-20)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
};

const DEFAULT_ICON = {
  bg: "var(--beige-20)",
  icon: (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
};

function SkeletonCard() {
  return (
    <div
      className="flex flex-col rounded-2xl animate-pulse"
      style={{ backgroundColor: "rgba(255,255,255,0.72)", padding: "18px 20px", gap: 14 }}
    >
      <div className="flex items-center" style={{ gap: 10 }}>
        <div className="rounded-lg" style={{ width: 34, height: 34, backgroundColor: "var(--beige-20)" }} />
        <div className="rounded" style={{ width: 80, height: 14, backgroundColor: "var(--beige-20)" }} />
      </div>
      <div className="flex items-baseline justify-between">
        <div className="rounded" style={{ width: 60, height: 32, backgroundColor: "var(--beige-20)" }} />
        <div className="rounded" style={{ width: 40, height: 14, backgroundColor: "var(--beige-20)" }} />
      </div>
    </div>
  );
}

export function StatsRow({ stats, isLoading }: StatsRowProps) {
  if (isLoading || !stats) {
    return (
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 28px" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, 1fr)`, gap: 14, padding: "0 28px" }}
    >
      {stats.map((stat) => {
        const visual = STAT_ICONS[stat.key] ?? DEFAULT_ICON;
        const positive = stat.change_percent >= 0;

        return (
          <div
            key={stat.key}
            className="flex flex-col rounded-2xl"
            style={{
              backgroundColor: "rgba(255,255,255,0.72)",
              padding: "18px 20px",
              gap: 14,
            }}
          >
            <div className="flex items-center" style={{ gap: 10 }}>
              <span
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: visual.bg,
                  color: "var(--neutral-30)",
                }}
              >
                {visual.icon}
              </span>
              <span
                className="font-medium leading-snug"
                style={{ fontSize: 13, color: "var(--neutral-10)" }}
              >
                {stat.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span
                className="font-bold tracking-tight"
                style={{ fontSize: 32, color: "var(--neutral-30)", lineHeight: 1 }}
              >
                {stat.formatted_value}
              </span>
              <span
                className="font-semibold"
                style={{
                  fontSize: 13,
                  color: positive ? "var(--accent-green)" : "var(--accent-orange)",
                }}
              >
                {positive ? "+" : ""}{stat.change_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
