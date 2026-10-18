"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardStat, EarningsMonth, Project } from "@/types/dashboard";
import type { SavedBusiness } from "@/types";
import { DISTRICT_REVERSE_MAP } from "@/types";
import { DashboardIcon, type DashboardIconName } from "./DashboardIcon";
import s from "../dashboard.module.css";

type QueryState = { isLoading: boolean; isError: boolean; onRetry: () => void };

export function QueryFeedback({ isLoading, isError, onRetry }: QueryState) {
  if (isLoading) return <div className={s.loadingBlock} role="status" aria-label="Загрузка данных"><span /><span /><span /></div>;
  if (isError) return <div className={s.errorBlock} role="alert"><p>Не удалось загрузить данные</p><button type="button" onClick={onRetry}>Попробовать снова <DashboardIcon name="arrow" size={14} /></button></div>;
  return null;
}

export function DashboardStats({ stats, ...state }: QueryState & { stats?: DashboardStat[] }) {
  const definitions: { key: string; label: string; note: string; icon: DashboardIconName }[] = [
    { key: "total_searches", label: "Всего подборов", note: "От идеи к подходящему месту", icon: "search" },
    { key: "listings_found", label: "Найдено локаций", note: "В ваших результатах поиска", icon: "pin" },
    { key: "completed_searches", label: "Готовые подборки", note: "С оценками и пояснениями", icon: "check" },
    { key: "top_business_type", label: "Ваш основной формат", note: "По истории ваших запросов", icon: "grid" },
  ];
  if (state.isError) return <section className={s.statsError}><QueryFeedback {...state} /></section>;
  return <section className={s.statsGrid} aria-label="Статистика вашего аккаунта">{definitions.map((definition) => {
    const stat = stats?.find((item) => item.key === definition.key);
    return <article className={s.statCard} key={definition.key}><div className={s.statHeader}><span>{definition.label}</span><DashboardIcon name={definition.icon} size={17} /></div>{state.isLoading ? <span className={s.statSkeleton} aria-label="Загрузка" /> : <strong className={s.statValue}>{stat?.formatted_value || "—"}</strong>}<p>{definition.note}</p></article>;
  })}</section>;
}

export function ActivityCard({ months, ...state }: QueryState & { months?: EarningsMonth[] }) {
  const [period, setPeriod] = useState(6);
  const visible = (months || []).slice(-period);
  const max = Math.max(...visible.map((month) => month.billable + month.non_billable), 1);
  const total = visible.reduce((sum, month) => sum + month.billable + month.non_billable, 0);
  return <section className={`${s.panel} ${s.activityPanel}`} aria-labelledby="activity-heading">
    <div className={s.panelHeading}><div><h2 id="activity-heading">Ваша активность</h2><p>Как движется поиск вашего места</p></div><div className={s.segmented} role="group" aria-label="Период активности">{[6, 12].map((count) => <button key={count} type="button" aria-pressed={period === count} onClick={() => setPeriod(count)}>{count} мес.</button>)}</div></div>
    <QueryFeedback {...state} />
    {!state.isLoading && !state.isError && <>
      <div className={s.chartSummary}><strong>{total}</strong><span>подборов за период</span><div className={s.chartLegend}><span><i />Завершено</span><span><i />Остальные</span></div></div>
      {total === 0 ? <div className={s.emptyChart}><div className={s.emptyChartGrid} aria-hidden="true" /><span><DashboardIcon name="chart" size={23} /><strong>Здесь появится ваша история</strong><p>Начните подбор — и первый шаг отразится на графике.</p></span></div> : <div className={s.chart} role="img" aria-label={`Подборы по месяцам: ${visible.map((month) => `${month.month}: ${month.billable} завершено, ${month.non_billable} остальных`).join('; ')}`}><div className={s.chartGrid} aria-hidden="true"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div><div className={s.chartColumns}>{visible.map((month, index) => <div className={s.chartColumn} key={`${month.month}-${index}`}><div className={s.barSpace}><div className={s.chartBar} style={{ height: `${(month.billable + month.non_billable) / max * 100}%` }} title={`${month.month}: ${month.billable} завершено, ${month.non_billable} остальных`}><span className={s.incompleteBar} style={{ flex: month.non_billable }} /><span className={s.completeBar} style={{ flex: month.billable }} /></div></div><span className={s.monthLabel}>{month.month}</span></div>)}</div></div>}
      <div className={s.chartFootnote}><span className={s.tinyDot} /> Данные из ваших поисковых запросов</div>
    </>}
  </section>;
}

const businessLabels: Record<string, string> = { cafe: "Кафе", fastfood: "Фастфуд", office: "Офис", retail: "Магазин", pharmacy: "Аптека" };

export function SavedBusinessesCard({ businesses, ...state }: QueryState & { businesses?: SavedBusiness[] }) {
  return <section className={`${s.panel} ${s.savedPanel}`} aria-labelledby="saved-heading"><div className={s.panelHeading}><div><h2 id="saved-heading">Мои бизнесы {businesses && <span className={s.countBadge}>{businesses.length}</span>}</h2><p>Всё, что вы уже сохранили</p></div><Link href="/dashboard/businesses" className={s.iconLink} aria-label="Все сохранённые бизнесы"><DashboardIcon name="arrow" size={19} /></Link></div><QueryFeedback {...state} />
    {!state.isLoading && !state.isError && (businesses?.length ? <div className={s.businessList}>{businesses.slice(0, 3).map((business) => <Link href={`/dashboard/businesses/${business.id}`} key={business.id} className={s.businessRow}><span className={s.businessIcon}><DashboardIcon name={business.business_type === "cafe" || business.business_type === "fastfood" ? "coffee" : "folder"} size={21} /></span><div><strong>{business.business_name || businessLabels[business.business_type] || "Мой бизнес"}</strong><span>{business.district ? (DISTRICT_REVERSE_MAP[business.district] || business.district) : "Тараз"} · {business.listings_count} локаций</span></div><DashboardIcon name="chevron" size={15} /></Link>)}</div> : <div className={s.emptyBusinesses}><span className={s.emptyFolder}><DashboardIcon name="folder" size={28} /></span><h3>Первое дело — впереди</h3><p>Сохраняйте результаты подбора,<br />чтобы вернуться к ним позже.</p></div>)}
    <Link href="/dashboard/businesses" className={s.savedFooter}>Открыть мои бизнесы <DashboardIcon name="arrow" size={16} /></Link>
  </section>;
}

export function LocationsTable({ projects, ...state }: QueryState & { projects?: Project[] }) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("all");
  const [sort, setSort] = useState("score");
  const rows = (projects || []).filter((project) => (district === "all" || project.client.name === district) && `${project.name} ${project.address || ""} ${DISTRICT_REVERSE_MAP[project.client.name] || project.client.name}`.toLocaleLowerCase("ru").includes(query.toLocaleLowerCase("ru").trim())).sort((a, b) => sort === "price" ? (a.price_tenge ?? Infinity) - (b.price_tenge ?? Infinity) : b.team_member_count - a.team_member_count);
  const districts = [...new Set((projects || []).map((project) => project.client.name))];
  return <section className={`${s.panel} ${s.locationsPanel}`} aria-labelledby="locations-heading">
    <div className={s.panelHeading}><div><h2 id="locations-heading">Локации, к которым стоит присмотреться</h2><p>Высокие оценки в общих результатах Aimaq · не персональный подбор</p></div><span className={s.locationCount}>{projects?.length ?? 0} локаций</span></div>
    <div className={s.tableToolbar}><label className={s.tableSearch}><DashboardIcon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Название или адрес" aria-label="Поиск по локациям" /></label><div className={s.tableFilters}><label><span className={s.srOnly}>Район</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option value="all">Все районы</option>{districts.map((item) => <option key={item} value={item}>{DISTRICT_REVERSE_MAP[item] || item}</option>)}</select></label><label><span className={s.srOnly}>Сортировка</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="score">По оценке</option><option value="price">Сначала дешевле</option></select></label></div></div>
    <QueryFeedback {...state} />
    {!state.isLoading && !state.isError && (rows.length ? <div className={s.tableScroll}><table className={s.locationTable}><thead><tr><th>Помещение</th><th>Район</th><th>Аренда / месяц</th><th>Оценка Aimaq</th><th><span className={s.srOnly}>Объявление</span></th></tr></thead><tbody>{rows.map((project, index) => <tr key={project.id}><td><div className={s.locationName}><span className={`${s.locationTile} ${index % 2 ? s.locationTileSand : ""}`}><DashboardIcon name={index % 2 ? "grid" : "pin"} size={22} /></span><div><strong>{project.name}</strong><span>{project.area_sqm ? `${project.area_sqm} м²` : "Коммерческое помещение"}{project.address ? ` · ${project.address}` : ""}</span></div></div></td><td><span className={s.districtPill}>{DISTRICT_REVERSE_MAP[project.client.name] || project.client.name}</span></td><td className={s.priceCell}>{project.deadline}</td><td><span className={s.scorePill} data-level={project.team_member_count >= 70 ? "high" : "medium"}><i />{project.team_member_count}<small>/ 100</small></span></td><td>{project.url && /^https?:\/\//i.test(project.url) ? <a href={project.url} target="_blank" rel="noopener noreferrer" className={s.iconLink} aria-label={`Открыть объявление: ${project.name}`}><DashboardIcon name="external" size={16} /></a> : <span className={s.unavailableLink} title="Ссылка на объявление недоступна">—</span>}</td></tr>)}</tbody></table></div> : <div className={s.tableEmpty}><DashboardIcon name="search" size={25} /><h3>{query || district !== "all" ? "Подходящих локаций не найдено" : "Локации пока не появились"}</h3><p>{query || district !== "all" ? "Попробуйте другой запрос или выберите все районы." : "Запустите подбор, чтобы изучить доступные помещения."}</p>{(query || district !== "all") && <button type="button" onClick={() => { setQuery(""); setDistrict("all"); }}>Сбросить фильтры</button>}</div>)}
    {!state.isLoading && !state.isError && <div className={s.tableFooter}><span>Показано {rows.length} из {projects?.length || 0}</span><Link href="/app">Подобрать под мой бизнес <DashboardIcon name="arrow" size={15} /></Link></div>}
  </section>;
}
