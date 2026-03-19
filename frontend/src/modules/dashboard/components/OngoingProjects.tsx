"use client";

import { useState } from "react";
import type { Project, ProjectPriority } from "@/types/dashboard";

interface OngoingProjectsProps {
  projects: Project[] | undefined;
  isLoading: boolean;
}

const PRIORITY_STYLES: Record<ProjectPriority, { bg: string; color: string; dot: string }> = {
  high:   { bg: "rgba(201,80,46,0.1)",   color: "var(--accent-orange)", dot: "var(--accent-orange)" },
  medium: { bg: "rgba(207,141,19,0.1)",   color: "var(--accent-yellow)", dot: "var(--accent-yellow)" },
  low:    { bg: "rgba(14,161,88,0.1)",    color: "var(--accent-green)",  dot: "var(--accent-green)" },
};

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function AvatarGroup({ count }: { count: number }) {
  return (
    <div className="flex" style={{ marginLeft: 2 }}>
      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
        <div
          key={i}
          className="rounded-full border-2 border-white"
          style={{
            width: 28,
            height: 28,
            backgroundColor: "var(--beige-30)",
            marginLeft: i > 0 ? -8 : 0,
          }}
        />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="grid items-center animate-pulse"
      style={{
        gridTemplateColumns: "minmax(180px, 1fr) 70px 90px 120px 100px",
        padding: "12px 22px",
        gap: 12,
        borderBottom: "1px solid var(--stroke)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: "var(--beige-20)" }} />
        <div className="rounded" style={{ width: 120, height: 14, backgroundColor: "var(--beige-20)" }} />
      </div>
      <div className="rounded-lg" style={{ width: 30, height: 30, backgroundColor: "var(--beige-20)" }} />
      <div className="rounded-full" style={{ width: 60, height: 22, backgroundColor: "var(--beige-20)" }} />
      <div className="rounded" style={{ width: 80, height: 14, backgroundColor: "var(--beige-20)" }} />
      <div className="flex" style={{ gap: -8 }}>
        {[0, 1].map((j) => (
          <div key={j} className="rounded-full" style={{ width: 28, height: 28, backgroundColor: "var(--beige-20)" }} />
        ))}
      </div>
    </div>
  );
}

export function OngoingProjects({ projects, isLoading }: OngoingProjectsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const count = projects?.length ?? 0;

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        backgroundColor: "rgba(255,255,255,0.72)",
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 w-full transition-colors hover:bg-black/[0.02]"
        style={{
          padding: "16px 22px",
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          borderBottom: collapsed ? "none" : "1px solid var(--stroke)",
        }}
      >
        <svg
          width="14" height="14" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            color: "var(--neutral-10)",
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span
          className="font-semibold"
          style={{ fontSize: 15, color: "var(--neutral-30)" }}
        >
          Ongoing
        </span>
        <span
          className="flex items-center justify-center rounded-full font-semibold"
          style={{
            width: 22,
            height: 22,
            fontSize: 11,
            backgroundColor: "var(--beige-10)",
            color: "var(--neutral-10)",
          }}
        >
          {count}
        </span>
      </button>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: "minmax(180px, 1fr) 70px 90px 120px 100px",
              padding: "10px 22px",
              gap: 12,
              borderBottom: "1px solid var(--stroke)",
            }}
          >
            {["Name", "Client", "Priority", "Deadline", "Assigned team"].map((h) => (
              <span
                key={h}
                className="text-[12px] font-medium"
                style={{ color: "var(--neutral-10)" }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Loading */}
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {/* Empty */}
          {!isLoading && (!projects || projects.length === 0) && (
            <div style={{ padding: "24px 22px", textAlign: "center" }}>
              <span style={{ fontSize: 14, color: "var(--neutral-10)" }}>
                No ongoing projects
              </span>
            </div>
          )}

          {/* Rows */}
          {!isLoading && projects?.map((project) => {
            const ps = PRIORITY_STYLES[project.priority];
            return (
              <div
                key={project.id}
                className="grid items-center transition-colors hover:bg-black/[0.015]"
                style={{
                  gridTemplateColumns: "minmax(180px, 1fr) 70px 90px 120px 100px",
                  padding: "12px 22px",
                  gap: 12,
                  borderBottom: "1px solid var(--stroke)",
                }}
              >
                {/* Name */}
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span
                    className="flex-shrink-0 rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: project.status_color,
                    }}
                  />
                  <span
                    className="font-medium truncate"
                    style={{ fontSize: 14, color: "var(--neutral-30)" }}
                  >
                    {project.name}
                  </span>
                </div>

                {/* Client */}
                <span
                  className="flex items-center justify-center rounded-lg font-bold flex-shrink-0 overflow-hidden"
                  style={{
                    width: 30,
                    height: 30,
                    fontSize: 12,
                    backgroundColor: project.client.color,
                    color: "#fff",
                  }}
                >
                  {project.client.icon_url ? (
                    <img
                      src={project.client.icon_url}
                      alt={project.client.name}
                      width={30}
                      height={30}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    project.client.name.slice(0, 2).toUpperCase()
                  )}
                </span>

                {/* Priority */}
                <span
                  className="flex items-center gap-1.5 rounded-full font-medium w-fit"
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    backgroundColor: ps.bg,
                    color: ps.color,
                  }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 6, height: 6, backgroundColor: ps.dot }}
                  />
                  {PRIORITY_LABELS[project.priority]}
                </span>

                {/* Deadline */}
                <span style={{ fontSize: 13, color: "var(--neutral-20)" }}>
                  {project.deadline}
                </span>

                {/* Team */}
                <AvatarGroup count={project.team_member_count} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
