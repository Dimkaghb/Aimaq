export function TopBar() {
  return (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{ padding: "16px 28px", gap: 16 }}
    >
      {/* Greeting */}
      <div className="flex flex-col" style={{ gap: 2 }}>
        <h1
          className="font-semibold tracking-[-0.02em]"
          style={{ fontSize: 22, color: "var(--neutral-30)" }}
        >
          Hello, Leonardo
        </h1>
        <p style={{ fontSize: 14, color: "var(--neutral-10)" }}>
          What are you working on?
        </p>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center" style={{ maxWidth: 300 }}>
        <div
          className="flex items-center gap-2 w-full rounded-full"
          style={{
            padding: "9px 16px",
            backgroundColor: "rgba(255,255,255,0.72)",
            border: "1.5px solid var(--stroke)",
          }}
        >
          <svg
            width="16" height="16" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--neutral-10)", flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: 14, color: "var(--neutral-10)" }}>Search</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center" style={{ gap: 8 }}>
        {/* Icon buttons */}
        {[
          <svg key="copy" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>,
          <svg key="notif" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>,
          <svg key="settings" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>,
        ].map((icon, i) => (
          <button
            key={i}
            type="button"
            className="flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
            style={{
              width: 36,
              height: 36,
              border: "1.5px solid var(--stroke)",
              backgroundColor: "rgba(255,255,255,0.72)",
              cursor: "pointer",
              color: "var(--neutral-20)",
            }}
          >
            {icon}
          </button>
        ))}

        {/* Timer */}
        <span
          className="font-mono font-medium"
          style={{ fontSize: 14, color: "var(--neutral-20)", marginLeft: 4 }}
        >
          0:00:00
        </span>

        {/* Play button */}
        <button
          type="button"
          className="flex items-center justify-center rounded-full transition-opacity hover:opacity-85"
          style={{
            width: 36,
            height: 36,
            backgroundColor: "var(--neutral-30)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
