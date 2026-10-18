"use client";

import { useQuery } from "@tanstack/react-query";
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
