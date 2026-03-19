import Link from "next/link";

export function QuickActions() {
  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        minHeight: 308,
      }}
    >
      <Link
        href="/app"
        className="flex flex-col items-center justify-center rounded-2xl transition-all hover:shadow-sm"
        style={{
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1px solid var(--stroke)",
          cursor: "pointer",
          color: "var(--neutral-20)",
          textDecoration: "none",
          padding: "24px 14px",
          gap: 14,
        }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            border: "1.5px solid var(--stroke)",
            color: "var(--neutral-10)",
          }}
        >
          <svg
            width="22"
            height="22"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </span>
        <span
          className="text-center font-medium leading-snug"
          style={{ fontSize: 16, color: "var(--neutral-20)" }}
        >
          Найти места
        </span>
      </Link>
    </div>
  );
}
