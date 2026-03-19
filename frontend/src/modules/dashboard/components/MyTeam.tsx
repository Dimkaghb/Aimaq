interface TeamMember {
  name: string;
  role: string;
  status: "Online" | "Idle" | "Offline";
  initials: string;
  avatarBg: string;
}

const MEMBERS: TeamMember[] = [
  { name: "Tiana Jeff", role: "VP Design", status: "Online", initials: "TJ", avatarBg: "var(--beige-40)" },
  { name: "John Kay", role: "Director of Engineering", status: "Idle", initials: "JK", avatarBg: "var(--blue-10)" },
  { name: "Matt Gillilip", role: "Lead Developer", status: "Online", initials: "MG", avatarBg: "var(--beige-30)" },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Online:  { bg: "rgba(14,161,88,0.12)", color: "var(--accent-green)" },
  Idle:    { bg: "var(--beige-10)",       color: "var(--neutral-10)" },
  Offline: { bg: "var(--beige-10)",       color: "var(--neutral-10)" },
};

export function MyTeam() {
  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        width: 260,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--stroke)",
        }}
      >
        <h3
          className="font-semibold"
          style={{ fontSize: 15, color: "var(--neutral-30)" }}
        >
          My team
        </h3>
        <button
          type="button"
          className="font-medium transition-colors hover:underline"
          style={{
            fontSize: 13,
            color: "var(--neutral-10)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          See all
        </button>
      </div>

      {/* Members */}
      <div className="flex flex-col">
        {MEMBERS.map((member) => {
          const ss = STATUS_STYLES[member.status];
          return (
            <div
              key={member.name}
              className="flex items-center transition-colors hover:bg-black/[0.015]"
              style={{
                padding: "12px 20px",
                gap: 12,
                borderBottom: "1px solid var(--stroke)",
              }}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 font-semibold"
                style={{
                  width: 38,
                  height: 38,
                  backgroundColor: member.avatarBg,
                  fontSize: 13,
                  color: "var(--neutral-30)",
                }}
              >
                {member.initials}
              </div>

              {/* Name + role */}
              <div className="flex flex-col flex-1 min-w-0" style={{ gap: 1 }}>
                <span
                  className="font-medium truncate"
                  style={{ fontSize: 14, color: "var(--neutral-30)" }}
                >
                  {member.name}
                </span>
                <span
                  className="truncate"
                  style={{ fontSize: 12, color: "var(--neutral-10)" }}
                >
                  {member.role}
                </span>
              </div>

              {/* Status badge */}
              <span
                className="flex-shrink-0 rounded-full font-semibold"
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  backgroundColor: ss.bg,
                  color: ss.color,
                }}
              >
                {member.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
