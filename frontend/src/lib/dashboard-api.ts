import type {
  DashboardStatsResponse,
  EarningsResponse,
  ProjectsResponse,
  TeamResponse,
  UserProfile,
} from "@/types/dashboard";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = (window as Window & { __locationiq_token?: string })
    .__locationiq_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getAuthHeaders(),
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

export function fetchEarnings(
  period: "month" | "week" | "year" = "month"
): Promise<EarningsResponse> {
  return fetchJSON(`/api/v1/dashboard/earnings?period=${period}`);
}

export function fetchProjects(
  status: "ongoing" | "completed" | "all" = "ongoing"
): Promise<ProjectsResponse> {
  return fetchJSON(`/api/v1/dashboard/projects?status=${status}`);
}

export function fetchTeam(): Promise<TeamResponse> {
  return fetchJSON("/api/v1/dashboard/team");
}

export function fetchUserProfile(): Promise<UserProfile> {
  return fetchJSON("/api/v1/user/me");
}
