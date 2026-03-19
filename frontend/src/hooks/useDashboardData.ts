"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  fetchEarnings,
  fetchProjects,
  fetchTeam,
  fetchUserProfile,
} from "@/lib/dashboard-api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useEarnings(period: "month" | "week" | "year" = "month") {
  return useQuery({
    queryKey: ["dashboard-earnings", period],
    queryFn: () => fetchEarnings(period),
    staleTime: 60_000,
    retry: 2,
  });
}

export function useProjects(
  status: "ongoing" | "completed" | "all" = "ongoing"
) {
  return useQuery({
    queryKey: ["dashboard-projects", status],
    queryFn: () => fetchProjects(status),
    staleTime: 30_000,
    retry: 2,
  });
}

export function useTeam() {
  return useQuery({
    queryKey: ["dashboard-team"],
    queryFn: fetchTeam,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchUserProfile,
    staleTime: 120_000,
    retry: 2,
  });
}
