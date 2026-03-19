"use client";

import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { StatsRow } from "./components/StatsRow";
import { EarningsChart } from "./components/EarningsChart";
import { QuickActions } from "./components/QuickActions";
import { OngoingProjects } from "./components/OngoingProjects";
import { MyTeam } from "./components/MyTeam";

export function DashboardPage() {
  return (
    <div className="flex" style={{ height: "100dvh", overflow: "hidden" }}>
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0 }}>
        <TopBar />

        <div className="flex flex-col" style={{ padding: "0 0 28px", gap: 18 }}>
          <StatsRow />

          {/* Middle row: chart + quick actions */}
          <div
            className="flex"
            style={{ padding: "0 28px", gap: 14 }}
          >
            <EarningsChart />
            <QuickActions />
          </div>

          {/* Bottom row: ongoing + team */}
          <div
            className="flex"
            style={{ padding: "0 28px", gap: 14 }}
          >
            <OngoingProjects />
            <MyTeam />
          </div>
        </div>
      </main>
    </div>
  );
}
