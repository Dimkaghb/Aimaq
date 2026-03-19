"use client";

import type { TeamMember, TeamMemberStatus } from "@/types/dashboard";

interface MyTeamProps {
  members: TeamMember[] | undefined;
  isLoading: boolean;
}

const STATUS_STYLES: Record<TeamMemberStatus, { bg: string; color: string }> = {
  online:  { bg: "rgba(14,161,88,0.12)", color: "var(--accent-green)" },
  idle:    { bg: "var(--beige-10)",       color: "var(--neutral-10)" },
  offline: { bg: "var(--beige-10)",       color: "var(--neutral-10)" },
};

const STATUS_LABELS: Record<TeamMemberStatus, string> = {
  online: "Онлайн",
  idle: "В паузе",
  offline: "Офлайн",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SkeletonMember() {
  return (
    <div
      className="flex items-center animate-pulse"
      style={{ padding: "12px 20px", gap: 12, borderBottom: "1px solid var(--stroke)" }}
    >
      <div className="rounded-full" style={{ width: 38, height: 38, backgroundColor: "var(--beige-20)" }} />
      <div className="flex flex-col flex-1" style={{ gap: 4 }}>
        <div className="rounded" style={{ width: 80, height: 14, backgroundColor: "var(--beige-20)" }} />
        <div className="rounded" style={{ width: 120, height: 12, backgroundColor: "var(--beige-20)" }} />
      </div>
      <div className="rounded-full" style={{ width: 50, height: 22, backgroundColor: "var(--beige-20)" }} />
    </div>
  );
}

export function MyTeam({ members, isLoading }: MyTeamProps) {
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
          Недавние места
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
          Смотреть все
        </button>
      </div>

      {/* Members */}
      <div className="flex flex-col">
        {isLoading && (
          <>
            <SkeletonMember />
            <SkeletonMember />
            <SkeletonMember />
          </>
        )}

        {!isLoading && (!members || members.length === 0) && (
          <div style={{ padding: "24px 20px", textAlign: "center" }}>
            <span style={{ fontSize: 14, color: "var(--neutral-10)" }}>
              Нет недавних мест
            </span>
          </div>
        )}

        {!isLoading && members?.map((member) => {
          const ss = STATUS_STYLES[member.status];
          return (
            <div
              key={member.id}
              className="flex items-center transition-colors hover:bg-black/[0.015]"
              style={{
                padding: "12px 20px",
                gap: 12,
                borderBottom: "1px solid var(--stroke)",
              }}
            >
              {/* Avatar */}
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.name}
                  className="rounded-full flex-shrink-0"
                  style={{ width: 38, height: 38, objectFit: "cover" }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 font-semibold"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: "var(--beige-40)",
                    fontSize: 13,
                    color: "var(--neutral-30)",
                  }}
                >
                  {getInitials(member.name)}
                </div>
              )}

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
                {STATUS_LABELS[member.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
