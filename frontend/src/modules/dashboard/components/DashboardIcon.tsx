import type { ReactNode } from "react";

export type DashboardIconName = "home" | "folder" | "pin" | "search" | "plus" | "arrow" | "external" | "chevron" | "logout" | "help" | "check" | "chart" | "grid" | "coffee" | "menu" | "close";

export function DashboardIcon({ name, size = 20 }: { name: DashboardIconName; size?: number }) {
  const paths: Record<DashboardIconName, ReactNode> = {
    home: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
    external: <><path d="M14 3h7v7M21 3l-9 9M10 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    logout: <><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M10 12h11m-5-5 5 5-5 5" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8a2.5 2.5 0 1 1 3 3.9c-.5.2-.5 1-.5 1.6M12 17h.01" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chart: <><path d="M4 4v16h16M8 15v-4m4 4V6m4 9V9" /></>,
    grid: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 3v18M4 9h16M4 15h16" /></>,
    coffee: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
