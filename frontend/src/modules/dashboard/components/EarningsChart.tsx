"use client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BILLABLE =     [58, 42, 55, 50, 62, 68, 52, 45, 38, 30, 55, 20];
const NON_BILLABLE = [10, 12,  8, 14, 10, 15, 12,  8, 10,  6, 10,  5];

const MAX_VAL = 80;

export function EarningsChart() {
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
            className="flex items-center gap-1.5 rounded-full transition-colors hover:bg-black/5"
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--neutral-20)",
              border: "1.5px solid var(--stroke)",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Month
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
        {MONTHS.map((month, i) => {
          const bH = (BILLABLE[i] / MAX_VAL) * 100;
          const nbH = (NON_BILLABLE[i] / MAX_VAL) * 100;
          return (
            <div key={month} className="flex-1 flex flex-col items-center" style={{ gap: 6 }}>
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
                {month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
