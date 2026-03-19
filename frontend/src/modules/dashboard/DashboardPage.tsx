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
} from "@/hooks/useDashboardData";
import { useAuth } from "@/lib/supabase/auth-context";
import type { UserProfile } from "@/types/dashboard";

export function DashboardPage() {
  const { user } = useAuth();
  const statsQuery = useDashboardStats();
  const earningsQuery = useEarnings();
  const projectsQuery = useProjects("ongoing");
  const teamQuery = useTeam();

  const userProfile: UserProfile | undefined = user
    ? {
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
        email: user.email ?? "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      }
    : undefined;

  return (
    <div className="flex" style={{ height: "100dvh", overflow: "hidden" }}>
      <Sidebar userName={userProfile?.name} />

      <main className="flex-1 flex flex-col overflow-y-auto" style={{ minWidth: 0 }}>
        <TopBar user={userProfile} isLoading={!user} />

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
