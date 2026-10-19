"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import {
  fetchDashboardStats,
  fetchActivity,
  fetchPopularListings,
  fetchRecentListings,
} from "@/lib/dashboard-api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 60_000,
    retry: 2,
  });
}

export function useActivity() {
  return useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: fetchActivity,
    staleTime: 60_000,
    retry: 2,
  });
}

export function usePopularListings() {
  return useQuery({
    queryKey: ["dashboard-popular"],
    queryFn: fetchPopularListings,
    staleTime: 30_000,
    retry: 2,
  });
}

export function useRecentListings() {
  return useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: fetchRecentListings,
    staleTime: 30_000,
    retry: 2,
  });
}

/** Query keys shown on the dashboard home. */
const DASHBOARD_KEYS = ["saved-businesses", "dashboard-stats", "dashboard-activity", "dashboard-popular", "dashboard-recent"];

/**
 * Mark everything the dashboard home shows as stale. Call after a change (e.g. a deleted saved
 * business): otherwise the home page keeps serving its cache for 30-60 s and still lists it.
 */
export function invalidateDashboardData(queryClient: QueryClient): Promise<void[]> {
  return Promise.all(DASHBOARD_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
}
