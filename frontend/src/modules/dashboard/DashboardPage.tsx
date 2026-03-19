"use client";

import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { StatsRow } from "./components/StatsRow";
import { EarningsChart } from "./components/EarningsChart";
import { QuickActions } from "./components/QuickActions";
import { OngoingProjects } from "./components/OngoingProjects";
import { MyTeam } from "./components/MyTeam";
import {
  useDashboardStats,
  useEarnings,
  useProjects,
  useTeam,
  useUserProfile,
} from "@/hooks/useDashboardData";

export function DashboardPage() {
  const userQuery = useUserProfile();
  const statsQuery = useDashboardStats();
  const earningsQuery = useEarnings();
  const projectsQuery = useProjects("ongoing");
  const teamQuery = useTeam();

  return (
    <div className="flex" style={{ height: "100dvh", overflow: "hidden" }}>
      <Sidebar userName={userQuery.data?.name} />

      <main className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0 }}>
        <TopBar user={userQuery.data} isLoading={userQuery.isLoading} />

        <div className="flex flex-col" style={{ padding: "0 0 28px", gap: 18 }}>
          <StatsRow stats={statsQuery.data?.stats} isLoading={statsQuery.isLoading} />

          <div className="flex" style={{ padding: "0 28px", gap: 14 }}>
            <EarningsChart months={earningsQuery.data?.months} isLoading={earningsQuery.isLoading} />
            <QuickActions />
          </div>

          <div className="flex" style={{ padding: "0 28px", gap: 14 }}>
            <OngoingProjects projects={projectsQuery.data?.projects} isLoading={projectsQuery.isLoading} />
            <MyTeam members={teamQuery.data?.members} isLoading={teamQuery.isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
