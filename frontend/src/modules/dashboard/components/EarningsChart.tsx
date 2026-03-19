"use client";

import { useState } from "react";
import type { EarningsMonth } from "@/types/dashboard";

interface EarningsChartProps {
  months: EarningsMonth[] | undefined;
  isLoading: boolean;
}

export function EarningsChart({ months, isLoading }: EarningsChartProps) {
  const [period, setPeriod] = useState<"month" | "week" | "year">("month");

  const maxVal =
    months && months.length > 0
      ? Math.max(...months.map((m) => m.billable + m.non_billable), 1)
      : 1;

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        padding: "22px 24px",
        gap: 18,
        flex: 1,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="font-semibold tracking-[-0.02em]"
          style={{ fontSize: 17, color: "var(--neutral-30)" }}
        >
          Earning over time
        </h3>
        <div className="flex items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              const next = { month: "week", week: "year", year: "month" } as const;
              setPeriod(next[period]);
            }}
            className="flex items-center gap-1.5 rounded-full transition-colors hover:bg-black/5"
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--neutral-20)",
              border: "1.5px solid var(--stroke)",
              backgroundColor: "transparent",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {period}
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
            style={{
              width: 32,
              height: 32,
              border: "1.5px solid var(--stroke)",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "var(--neutral-10)",
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center" style={{ gap: 16 }}>
        <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: "var(--neutral-20)" }}>
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: "var(--accent-blue)" }} />
          Billable
        </span>
        <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: "var(--neutral-20)" }}>
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: "var(--beige-40)" }} />
          Non Billable
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-end" style={{ gap: 0, minHeight: 180 }}>
        {isLoading || !months ? (
          [35, 50, 28, 45, 60, 42, 55, 30, 48, 38, 52, 25].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center" style={{ gap: 6 }}>
              <div className="flex flex-col items-center w-full" style={{ gap: 2, height: 160 }}>
                <div className="flex-1" />
                <div
                  className="w-3/5 rounded-t-sm animate-pulse"
                  style={{
                    height: `${h}%`,
                    backgroundColor: "var(--beige-20)",
                  }}
                />
              </div>
              <div
                className="rounded animate-pulse"
                style={{ width: 20, height: 10, backgroundColor: "var(--beige-20)" }}
              />
            </div>
          ))
        ) : (
          months.map((m) => {
            const bH = (m.billable / maxVal) * 100;
            const nbH = (m.non_billable / maxVal) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center" style={{ gap: 6 }}>
                <div className="flex flex-col items-center w-full" style={{ gap: 2, height: 160 }}>
                  <div className="flex-1" />
                  <div
                    className="w-3/5 rounded-t-sm"
                    style={{
                      height: `${nbH}%`,
                      backgroundColor: "var(--beige-40)",
                      minHeight: nbH > 0 ? 3 : 0,
                    }}
                  />
                  <div
                    className="w-3/5 rounded-t-sm"
                    style={{
                      height: `${bH}%`,
                      backgroundColor: "var(--accent-blue)",
                      minHeight: bH > 0 ? 3 : 0,
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "var(--neutral-10)" }}>
                  {m.month}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
