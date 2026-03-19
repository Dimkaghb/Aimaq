"use client";

import { useState } from "react";

interface Project {
  name: string;
  clientIcon: string;
  clientBg: string;
  priority: "High" | "Medium" | "Low";
  deadline: string;
  teamCount: number;
  dotColor: string;
}

const PROJECTS: Project[] = [
  {
    name: "Asana website audit",
    clientIcon: "🎯",
    clientBg: "#f5f5f5",
    priority: "High",
    deadline: "23 Aug, 2025",
    teamCount: 3,
    dotColor: "var(--accent-orange)",
  },
  {
    name: "Marketing workshop",
    clientIcon: "in",
    clientBg: "#0077b5",
    priority: "Medium",
    deadline: "25 Aug, 2025",
    teamCount: 2,
    dotColor: "var(--accent-blue)",
  },
  {
    name: "KYC verification app",
    clientIcon: "⊞",
    clientBg: "#7b68ee",
    priority: "Low",
    deadline: "29 Aug, 2025",
    teamCount: 3,
    dotColor: "var(--accent-green)",
  },
];

const PRIORITY_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  High:   { bg: "rgba(201,80,46,0.1)",   color: "var(--accent-orange)", dot: "var(--accent-orange)" },
  Medium: { bg: "rgba(207,141,19,0.1)",   color: "var(--accent-yellow)", dot: "var(--accent-yellow)" },
  Low:    { bg: "rgba(14,161,88,0.1)",    color: "var(--accent-green)",  dot: "var(--accent-green)" },
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

export function OngoingProjects() {
  const [collapsed, setCollapsed] = useState(false);

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
          {PROJECTS.length}
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

          {/* Rows */}
          {PROJECTS.map((project) => {
            const ps = PRIORITY_STYLES[project.priority];
            return (
              <div
                key={project.name}
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
                      backgroundColor: project.dotColor,
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
                  className="flex items-center justify-center rounded-lg font-bold flex-shrink-0"
                  style={{
                    width: 30,
                    height: 30,
                    fontSize: 12,
                    backgroundColor: project.clientBg,
                    color: project.clientBg === "#f5f5f5" ? "var(--neutral-30)" : "#fff",
                  }}
                >
                  {project.clientIcon}
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
                  {project.priority}
                </span>

                {/* Deadline */}
                <span style={{ fontSize: 13, color: "var(--neutral-20)" }}>
                  {project.deadline}
                </span>

                {/* Team */}
                <AvatarGroup count={project.teamCount} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
