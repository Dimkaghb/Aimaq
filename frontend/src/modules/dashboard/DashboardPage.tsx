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
  useActivity,
  usePopularListings,
  useRecentListings,
} from "@/hooks/useDashboardData";
import { useAuth } from "@/lib/supabase/auth-context";
import type { UserProfile } from "@/types/dashboard";

export function DashboardPage() {
  const { user } = useAuth();
  const statsQuery = useDashboardStats();
  const activityQuery = useActivity();
  const popularQuery = usePopularListings();
  const recentQuery = useRecentListings();

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
            <EarningsChart months={activityQuery.data?.months} isLoading={activityQuery.isLoading} />
            <QuickActions />
          </div>

          <div className="flex" style={{ padding: "0 28px", gap: 14 }}>
            <OngoingProjects projects={popularQuery.data?.projects} isLoading={popularQuery.isLoading} />
            <MyTeam members={recentQuery.data?.members} isLoading={recentQuery.isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}
