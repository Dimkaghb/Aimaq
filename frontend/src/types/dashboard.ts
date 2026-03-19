export interface DashboardStat {
  key: string;
  label: string;
  value: number;
  formatted_value: string;
  change_percent: number;
}

export interface DashboardStatsResponse {
  stats: DashboardStat[];
}

export interface EarningsMonth {
  month: string;
  billable: number;
  non_billable: number;
}

export interface EarningsResponse {
  months: EarningsMonth[];
  currency: string;
}

export type ProjectPriority = "high" | "medium" | "low";

export interface ProjectClient {
  name: string;
  icon_url: string | null;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  client: ProjectClient;
  priority: ProjectPriority;
  deadline: string;
  team_member_count: number;
  status_color: string;
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
}

export type TeamMemberStatus = "online" | "idle" | "offline";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: TeamMemberStatus;
  avatar_url: string | null;
}

export interface TeamResponse {
  members: TeamMember[];
  total: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}
