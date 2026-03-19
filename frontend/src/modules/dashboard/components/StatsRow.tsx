interface StatCard {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  iconBg: string;
  icon: React.ReactNode;
}

const STATS: StatCard[] = [
  {
    label: "Total projects",
    value: "455",
    change: "+16.4%",
    positive: true,
    iconBg: "var(--beige-30)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Active projects",
    value: "55",
    change: "-4.8%",
    positive: false,
    iconBg: "var(--beige-20)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    label: "Completed projects",
    value: "400",
    change: "+12.8%",
    positive: true,
    iconBg: "var(--beige-20)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "Total hours worked",
    value: "600hrs",
    change: "-1.2%",
    positive: false,
    iconBg: "var(--beige-20)",
    icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function StatsRow() {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 14, padding: "0 28px" }}
    >
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col rounded-2xl"
          style={{
            backgroundColor: "rgba(255,255,255,0.72)",
            padding: "18px 20px",
            gap: 14,
          }}
        >
          {/* Top: icon + label */}
          <div className="flex items-center" style={{ gap: 10 }}>
            <span
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 34,
                height: 34,
                backgroundColor: stat.iconBg,
                color: "var(--neutral-30)",
              }}
            >
              {stat.icon}
            </span>
            <span
              className="font-medium leading-snug"
              style={{ fontSize: 13, color: "var(--neutral-10)" }}
            >
              {stat.label}
            </span>
          </div>

          {/* Bottom: value + change */}
          <div className="flex items-baseline justify-between">
            <span
              className="font-bold tracking-tight"
              style={{ fontSize: 32, color: "var(--neutral-30)", lineHeight: 1 }}
            >
              {stat.value}
            </span>
            <span
              className="font-semibold"
              style={{
                fontSize: 13,
                color: stat.positive ? "var(--accent-green)" : "var(--accent-orange)",
              }}
            >
              {stat.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
