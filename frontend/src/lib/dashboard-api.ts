import type {
  DashboardStatsResponse,
  EarningsResponse,
  ProjectsResponse,
  TeamResponse,
} from "@/types/dashboard";
import { getAccessToken } from "@/lib/supabase/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchDashboardStats(): Promise<DashboardStatsResponse> {
  return fetchJSON("/api/v1/dashboard/stats");
}

export function fetchActivity(): Promise<EarningsResponse> {
  return fetchJSON("/api/v1/dashboard/activity");
}

export function fetchPopularListings(): Promise<ProjectsResponse> {
  return fetchJSON("/api/v1/dashboard/popular");
}

export function fetchRecentListings(): Promise<TeamResponse> {
  return fetchJSON("/api/v1/dashboard/recent");
}
