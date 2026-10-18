"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";
import s from "../dashboard.module.css";

const links: { label: string; href: string; icon: DashboardIconName }[] = [
  { label: "Обзор", href: "/dashboard", icon: "home" },
  { label: "Мои бизнесы", href: "/dashboard/businesses", icon: "folder" },
  { label: "Подбор локаций", href: "/app", icon: "pin" },
];

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const router = useRouter();
  const resetSearch = useLocationIQStore((state) => state.resetSearch);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(false);
  const name = userName || "Мой аккаунт";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    setError(false);
    try { await signOut(); router.push("/auth"); }
    catch { setError(true); setSigningOut(false); }
  }

  return <aside className={s.sidebar}>
    <Link href="/" className={s.logo} aria-label="Aimaq — главная"><span className={s.logoMark}><DashboardIcon name="pin" size={24} /></span><span>aimaq<span className={s.logoDot}>.</span></span></Link>
    <div className={s.workspace}><span className={s.workspaceMark}><DashboardIcon name="grid" size={18} /></span><div><strong>Моё пространство</strong><span>Личный кабинет</span></div></div>
    <span className={s.navCaption}>РАБОЧЕЕ ПРОСТРАНСТВО</span>
    <nav className={s.mainNav} aria-label="Навигация по кабинету">{links.map((link) => {
      const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);
      return <Link key={link.href} href={link.href} aria-label={link.label} aria-current={active ? "page" : undefined} className={active ? s.activeNav : ""}><DashboardIcon name={link.icon} size={19} /><span>{link.label}</span>{active && <i />}</Link>;
    })}</nav>
    <Link href="/app" onClick={resetSearch} className={s.sidebarNew}><DashboardIcon name="plus" size={18} /> Новый подбор</Link>
    <div className={s.sidebarBottom}>
      <div className={s.sidebarNote}><span className={s.noteIllustration}><DashboardIcon name="pin" size={24} /></span><h3>У вашего дела<br />есть своё место.</h3><p>Сравните районы и найдите точку для следующего шага.</p><Link href="/app">Начать поиск <DashboardIcon name="arrow" size={16} /></Link></div>
      <Link href="/#questions" className={s.helpLink}><DashboardIcon name="help" size={18} /> Как работает Aimaq <DashboardIcon name="external" size={13} /></Link>
      <div className={s.sidebarProfile}><span className={s.avatar}>{initials}</span><div><strong>{name}</strong><span>{user?.email || "Личный аккаунт"}</span></div><button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Выйти из аккаунта" title="Выйти"><DashboardIcon name="logout" size={17} /></button></div>
      {error && <p className={s.signOutError} role="alert">Не удалось выйти. Попробуйте ещё раз.</p>}
    </div>
  </aside>;
}
