"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { DashboardIcon } from "./components/DashboardIcon";
import { ActivityCard, DashboardStats, LocationsTable, SavedBusinessesCard } from "./components/DashboardWidgets";
import { useDashboardStats, useActivity, usePopularListings } from "@/hooks/useDashboardData";
import { useAuth } from "@/lib/supabase/auth-context";
import { fetchSavedBusinesses } from "@/lib/api";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import type { UserProfile } from "@/types/dashboard";
import s from "./dashboard.module.css";

function NeighborhoodIllustration() {
  return <svg className={s.neighborhood} viewBox="0 0 470 290" fill="none" aria-hidden="true">
    <defs><pattern id="dashboard-streets" width="100" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)"><rect x="8" y="8" width="76" height="66" rx="8" fill="#cfE5eb" /><path d="M22 24h23v20H22zM53 24h17v36H53zM22 51h23v9H22z" fill="#bdd6dd" fillOpacity=".65" /></pattern><linearGradient id="dashboard-map-fade"><stop stopColor="#e3f0f3" /><stop offset="1" stopColor="#e3f0f3" stopOpacity="0" /></linearGradient></defs>
    <path d="M0 0h470v290H0z" fill="url(#dashboard-streets)" />
    <path d="M398-20c-100 57-16 128-106 171s-83 94-39 164" stroke="#b4d7e2" strokeWidth="23" />
    <path d="M-10 230 495 40M130-40l145 390" stroke="#f7fcfd" strokeWidth="20" />
    <path d="m-10 230 505-190M130-40l145 390" stroke="#c7dce1" strokeWidth="1" strokeDasharray="5 6" />
    <rect x="289" y="169" width="61" height="59" rx="13" transform="rotate(-22 289 169)" fill="#bed5c4" />
    <rect x="115" y="23" width="50" height="52" rx="10" transform="rotate(-22 115 23)" fill="#bed5c4" />
    <circle cx="252" cy="137" r="57" fill="#a9d6e5" fillOpacity=".22" stroke="#91bcc9" strokeDasharray="4 6" />
    <g transform="translate(229 96)"><path d="M46 24c0 18-23 37-23 37S0 42 0 24a23 23 0 1 1 46 0" fill="#305d6a" /><circle cx="23" cy="24" r="8" fill="#e6f3f6" /></g>
    <g transform="translate(360 52)"><path d="M30 16c0 12-15 24-15 24S0 28 0 16a15 15 0 1 1 30 0" fill="#7ea8b3" /><circle cx="15" cy="16" r="5" fill="#f6fbfc" /></g>
    <g transform="translate(124 205)"><path d="M26 14c0 10-13 21-13 21S0 24 0 14a13 13 0 1 1 26 0" fill="#7ea8b3" /><circle cx="13" cy="14" r="4" fill="#f6fbfc" /></g>
    <path d="M0 0h150v290H0z" fill="url(#dashboard-map-fade)" />
  </svg>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useDashboardStats();
  const activity = useActivity();
  const popular = usePopularListings();
  const businesses = useQuery({ queryKey: ["saved-businesses", user?.id], queryFn: fetchSavedBusinesses, enabled: !!user });
  const resetSearch = useLocationIQStore((state) => state.resetSearch);
  const name = String(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "");
  const firstName = name.trim().split(/\s+/)[0];
  const profile: UserProfile | undefined = user ? { id: user.id, name, email: user.email || "", avatar_url: user.user_metadata?.avatar_url || null } : undefined;

  return <div className={s.shell}>
    <Sidebar userName={name} />
    <main className={s.main} id="dashboard-content">
      <TopBar user={profile} isLoading={!user} />
      <div className={s.content}>
        <div className={s.pageHeading}><div><span className={s.eyebrow}>ВАШЕ ПРОСТРАНСТВО ВОЗМОЖНОСТЕЙ</span><h1>{firstName ? `С возвращением, ${firstName}.` : "Ваши планы обретают место."}</h1><p>Всё для следующего шага вашего бизнеса — здесь.</p></div><Link href="/app" onClick={resetSearch} className={s.primaryButton}><DashboardIcon name="plus" size={18} /> Новый подбор</Link></div>
        <section className={s.welcomeBanner} aria-labelledby="welcome-title"><div className={s.bannerCopy}><span className={s.bannerEyebrow}><span /> ОТ ИДЕИ — К АДРЕСУ</span><h2 id="welcome-title">Хорошему делу —<br />подходящее место.</h2><p>Сравним трафик, окружение и аренду.<br />Вам останется выбрать свой следующий адрес.</p><Link href="/app" onClick={resetSearch} className={s.bannerLink}>Найти мою локацию <DashboardIcon name="arrow" size={18} /></Link></div><NeighborhoodIllustration /></section>
        <DashboardStats stats={stats.data?.stats} isLoading={stats.isLoading} isError={stats.isError} onRetry={() => void stats.refetch()} />
        <div className={s.middleGrid}><ActivityCard months={activity.data?.months} isLoading={activity.isLoading} isError={activity.isError} onRetry={() => void activity.refetch()} /><SavedBusinessesCard businesses={businesses.data?.businesses} isLoading={businesses.isLoading} isError={businesses.isError} onRetry={() => void businesses.refetch()} /></div>
        <LocationsTable projects={popular.data?.projects} isLoading={popular.isLoading} isError={popular.isError} onRetry={() => void popular.refetch()} />
        <footer className={s.dashboardFooter}><span>aimaq<span> · </span>Место для вашего дела.</span><Link href="/#questions">Нужна помощь? <DashboardIcon name="external" size={12} /></Link></footer>
      </div>
    </main>
  </div>;
}
