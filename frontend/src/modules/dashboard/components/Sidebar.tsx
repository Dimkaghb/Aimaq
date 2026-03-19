"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";

function AimaqLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M11 2C11 2 4 5.5 4 12C4 15.866 7.134 19 11 19C14.866 19 18 15.866 18 12C18 8.5 15 5 11 2Z"
        fill="rgb(26, 22, 21)"
      />
      <path
        d="M11 6C11 6 7 8.5 7 12C7 14.209 8.791 16 11 16C13.209 16 15 14.209 15 12C15 9.5 13 7 11 6Z"
        fill="rgb(249, 248, 248)"
      />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const MAIN_NAV: NavItem[] = [
  {
    label: "Главная",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Поставщики",
    href: "/dashboard/vendors",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h12l-1.5 7h-9L6 2z" />
        <path d="M5 9v13h14V9" />
        <path d="M9 13h6" />
      </svg>
    ),
  },
  {
    label: "Бизнесы",
    href: "/dashboard/businesses",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Карта",
    href: "/app",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10z" />
        <circle cx="12" cy="11" r="3" />
      </svg>
    ),
  },
];

function getAdminNav(displayName: string): NavItem[] {
  return [
    {
      label: "Поддержка",
      href: "/dashboard/support",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      label: displayName,
      href: "/dashboard/profile",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-xl transition-colors"
      style={{
        padding: "10px 12px",
        fontSize: 15,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--neutral-30)" : "var(--neutral-20)",
        backgroundColor: active ? "var(--beige-20)" : "transparent",
      }}
    >
      <span style={{ color: active ? "var(--neutral-30)" : "var(--neutral-10)", flexShrink: 0 }}>
        {item.icon}
      </span>
      {!collapsed && item.label}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: "var(--neutral-10)", padding: "4px 12px" }}
    >
      {label}
    </span>
  );
}

interface SidebarProps {
  userName?: string;
}

export function Sidebar({ userName }: SidebarProps) {
  const [activePath] = useState("/dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  const width = collapsed ? 64 : 200;

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-full overflow-y-auto"
      style={{
        width,
        backgroundColor: "var(--beige-10)",
        borderRight: "1px solid var(--stroke)",
        transition: "width 200ms ease",
      }}
    >
      {/* Logo row */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: "16px 14px 8px" }}
      >
        <Link href="/" className="flex items-center gap-2">
          {!collapsed && <AimaqLogo />}
          {!collapsed && (
            <span
              className="font-semibold tracking-[-0.02em]"
              style={{ fontSize: 16, color: "var(--neutral-30)" }}
            >
              Aimaq
            </span>
          )}
        </Link>
        <button
          type="button"
          className="flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
          style={{
            width: 26,
            height: 26,
            border: "1.5px solid var(--stroke)",
            backgroundColor: "rgba(255,255,255,0.72)",
            cursor: "pointer",
            color: "var(--neutral-10)",
          }}
          aria-label={collapsed ? "Открыть сайдбар" : "Закрыть сайдбар"}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="10 17 15 12 10 7" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="14 17 9 12 14 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col flex-1" style={{ padding: "4px 8px", gap: 2 }}>
        <div className="flex flex-col" style={{ gap: 1 }}>
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={activePath === item.href}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Find places CTA */}
        <Link
          href="/app"
          className="flex items-center gap-2.5 rounded-xl font-semibold transition-opacity hover:opacity-85"
          style={{
            padding: "10px 12px",
            marginTop: 14,
            fontSize: 14,
            color: "#fff",
            backgroundColor: "var(--neutral-30)",
          }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {!collapsed && "Найти места"}
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin */}
        <div className="flex flex-col" style={{ gap: 1, marginBottom: 12 }}>
          {!collapsed && <SectionLabel label="Администрирование" />}
          {getAdminNav(userName ?? "Профиль").map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={activePath === item.href}
              collapsed={collapsed}
            />
          ))}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/auth");
            }}
            className="flex items-center gap-3 rounded-xl transition-colors hover:bg-red-50"
            style={{
              padding: "10px 12px",
              fontSize: 15,
              color: "#dc2626",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && "Выйти"}
          </button>
        </div>
      </nav>
    </aside>
  );
}
