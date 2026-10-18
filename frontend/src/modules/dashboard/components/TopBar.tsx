"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth-context";
import type { UserProfile } from "@/types/dashboard";
import { DashboardIcon } from "./DashboardIcon";
import s from "../dashboard.module.css";

export function TopBar({ user, isLoading }: { user: UserProfile | undefined; isLoading: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const title = pathname === "/dashboard" ? "Обзор" : pathname === "/dashboard/businesses" ? "Мои бизнесы" : "Подборка локаций";
  async function handleSignOut() {
    setBusy(true); setError(false);
    try { await signOut(); router.push("/auth"); }
    catch { setBusy(false); setError(true); }
  }
  return <header className={s.topbar}>
    <div className={s.breadcrumb}><Link href="/dashboard">Рабочее пространство</Link><DashboardIcon name="chevron" size={12} /><span>{title}</span></div>
    <div className={s.topbarRight}><span className={s.cityBadge}><DashboardIcon name="pin" size={14} /> Тараз</span><span className={s.topbarDivider} />
      <details className={s.accountDropdown} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
        <summary className={s.topAvatar} aria-label="Меню аккаунта">{isLoading ? "·" : (user?.name || "A").charAt(0).toUpperCase()}</summary>
        <div className={s.accountMenu}><strong>{user?.name || "Мой аккаунт"}</strong><span>{user?.email}</span><Link href="/dashboard/businesses"><DashboardIcon name="folder" size={15} /> Мои бизнесы</Link><Link href="/#questions"><DashboardIcon name="help" size={15} /> Помощь</Link><button type="button" onClick={handleSignOut} disabled={busy}><DashboardIcon name="logout" size={15} />{busy ? "Выходим…" : "Выйти из аккаунта"}</button>{error && <p role="alert">Не удалось выйти. Попробуйте ещё раз.</p>}</div>
      </details>
    </div>
  </header>;
}
