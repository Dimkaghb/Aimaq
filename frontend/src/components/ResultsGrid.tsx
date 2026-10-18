"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { formatPrice, formatArea } from "@/lib/score-utils";
import { saveBusiness } from "@/lib/api";
import { DISTRICT_REVERSE_MAP, type ScoredListing } from "@/types";
import { DashboardIcon as Icon } from "@/modules/dashboard/components/DashboardIcon";
import { NeighborhoodBrief } from "@/modules/search/NeighborhoodBrief";
import s from "@/modules/search/search.module.css";

const CityMap = dynamic(() => import("./CityMap").then((m) => m.CityMap), {
  ssr: false, loading: () => <div className={s.mapLoading} role="status">Загружаем карту Тараза…</div>,
});
const BUSINESS: Record<string, string> = { fastfood: "Кафе / фастфуд", cafe: "Ресторан", retail: "Магазин", pharmacy: "Аптека", office: "Офис" };
const hasCoordinates = (listing: ScoredListing) => Number.isFinite(listing.lat) && Number.isFinite(listing.lng);

export function ResultsGrid({ onStartOver, explanation }: { onStartOver: () => void; explanation: string }) {
  const { listings, businessType, sessionId, activeListingId, expandedListingId, setActiveListingId, setExpandedListingId, setAppState, district, budgetTenge, areaSqmMin } = useLocationIQStore();
  const [sort, setSort] = useState("score");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  const shown = listings.filter((item) => `${item.title} ${item.address}`.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"))).sort((a, b) => sort === "price" ? (a.price_tenge ?? Infinity) - (b.price_tenge ?? Infinity) : sort === "area" ? (b.area_sqm ?? 0) - (a.area_sqm ?? 0) : b.total_score - a.total_score);
  const compared = listings.filter((item) => selected.includes(item.listing_id));
  const mapped = listings.filter(hasCoordinates).length;

  async function handleSave() {
    if (!sessionId || saving || savedId) return;
    setSaving(true); setSaveError(false);
    try { const result = await saveBusiness(sessionId); setSavedId(result.id); }
    catch { setSaveError(true); }
    finally { setSaving(false); }
  }
  function showOnMap(listing: ScoredListing) {
    setActiveListingId(listing.listing_id); setMobileView("map");
  }
  function toggleDetails(listing: ScoredListing) {
    const opening = expandedListingId !== listing.listing_id;
    setExpandedListingId(opening ? listing.listing_id : null);
    setActiveListingId(listing.listing_id); setAppState(opening ? "detail" : "results");
  }
  function toggleCompare(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
  }

  return <div className={s.resultsPage}>
    <header className={s.header}><Link href="/dashboard" className={s.logo}>aimaq<span>.</span></Link><span className={s.breadcrumb}>Подбор локации <span>/</span> Результаты</span><Link href="/dashboard/businesses" className={s.headerLink}><Icon name="folder" size={17} /> Мои бизнесы</Link></header>
    <section className={s.resultsHeading}>
      <div><div className={s.eyebrow}><Icon name="pin" size={13} /> ТАРАЗ · ВАША ПОДБОРКА</div><h1>Место для вашего дела.</h1><div className={s.criteria}><span>{BUSINESS[businessType || ""] || "Бизнес"}</span><i /><span>{district ? DISTRICT_REVERSE_MAP[district] || district : "Все районы"}</span><i /><span>до {formatPrice(budgetTenge)} / мес.</span><i /><span>от {areaSqmMin} м²</span></div></div>
      <div className={s.headingActions}><button type="button" className={s.secondaryButton} onClick={onStartOver}><Icon name="search" size={16} />Изменить запрос</button>{savedId ? <Link className={s.primaryButton} href={`/dashboard/businesses/${savedId}`}><Icon name="check" size={16} />Открыть сохранённое</Link> : <button type="button" className={s.primaryButton} onClick={handleSave} disabled={saving || !sessionId || !listings.length}><Icon name="folder" size={16} />{saving ? "Сохраняем…" : "Сохранить подборку"}</button>}{saveError && <span role="alert" className={s.inlineError}>Не удалось сохранить. Попробуйте ещё раз.</span>}</div>
    </section>
    <div className={s.mobileTabs} role="group" aria-label="Вид результатов"><button aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}>Список · {listings.length}</button><button aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>На карте · {mapped}</button></div>
    <div className={s.resultsWorkspace} data-view={mobileView}>
      <aside className={s.resultsList} aria-label="Найденные помещения">
        <div className={s.listToolbar}><div><h2>{listings.length} локаций</h2><span>Сравните и выберите, что посмотреть</span></div><label className={s.sortLabel}><span className={s.srOnly}>Сортировка</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="score">По оценке</option><option value="price">По цене</option><option value="area">По площади</option></select></label></div>
        <label className={s.resultSearch}><Icon name="search" size={16} /><input placeholder="Найти в подборке" aria-label="Поиск в подборке" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className={s.cardsScroll}>
          {explanation && <details className={s.explanation}><summary><span><Icon name="chart" size={16} />Как оценены локации</span><Icon name="plus" size={15} /></summary><p>{explanation}</p></details>}
          {shown.map((listing) => {
            const expanded = expandedListingId === listing.listing_id;
            const checked = selected.includes(listing.listing_id);
            const rank = listings.findIndex((item) => item.listing_id === listing.listing_id) + 1;
            return <article id={`card-${listing.listing_id}`} key={listing.listing_id} className={s.listingCard} data-active={activeListingId === listing.listing_id}>
              <div className={s.cardMeta}><span className={s.rank}>ВАРИАНТ {String(rank).padStart(2, "0")}</span><span className={s.score} title="Оценка соответствия вашему запросу"><strong>{Math.round(listing.total_score)}</strong><span>/100</span></span></div>
              <h3><button type="button" onClick={() => toggleDetails(listing)} aria-expanded={expanded} aria-controls={`details-${listing.listing_id}`}>{listing.address || listing.title}<Icon name="chevron" size={17} /></button></h3>
              <p className={s.cardLocation}>{listing.district ? DISTRICT_REVERSE_MAP[listing.district] || listing.district : "Тараз"}<span>·</span>{listing.area_sqm ? formatArea(listing.area_sqm) : "Площадь не указана"}</p>
              <div className={s.cardPrice}>{listing.price_tenge != null ? <><strong>{formatPrice(listing.price_tenge)}</strong><span>/ месяц</span></> : <span>Цена по запросу</span>}</div>
              <div className={s.cardActions}><button type="button" disabled={!hasCoordinates(listing)} onClick={() => showOnMap(listing)}><Icon name="pin" size={14} />{hasCoordinates(listing) ? "На карте" : "Без координат"}</button><label title={!checked && selected.length >= 3 ? "Можно сравнить до трёх помещений" : "Добавить к сравнению"}><input type="checkbox" checked={checked} disabled={!checked && selected.length >= 3} onChange={() => toggleCompare(listing.listing_id)} />Сравнить</label><button type="button" onClick={() => toggleDetails(listing)} aria-expanded={expanded}>{expanded ? "Свернуть" : "Подробнее"}</button></div>
              {expanded && <div className={s.cardDetails} id={`details-${listing.listing_id}`}>
                <div className={s.detailFacts}><span><strong>{listing.bus_stops_nearby}</strong> остановок рядом</span><span><strong>{listing.competitor_count}</strong> конкурентов найдено</span></div>
                <ScoreBreakdown breakdown={listing.score_breakdown} />
                <p className={s.dataNote}>Количество найденных объектов зависит от покрытия источников.</p>
                {businessType && <NeighborhoodBrief listingId={listing.listing_id} businessType={businessType} />}
                {listing.url && /^https?:\/\//i.test(listing.url) && <a href={listing.url} target="_blank" rel="noopener noreferrer" className={s.sourceButton}>Открыть объявление<Icon name="external" size={15} /></a>}
              </div>}
            </article>;
          })}
          {!shown.length && <div className={s.emptyResults}><Icon name="search" size={28} /><h3>{query ? "Нет совпадений" : "Пока нет подходящих помещений"}</h3><p>{query ? "Попробуйте другое название или адрес." : "Расширьте район поиска или скорректируйте бюджет и площадь."}</p><button onClick={query ? () => setQuery("") : onStartOver} className={s.secondaryButton}>{query ? "Сбросить поиск" : "Изменить запрос"}</button></div>}
          <p className={s.listFootnote}>Оценка помогает сравнить варианты. Условия аренды уточняйте у владельца.</p>
        </div>
        {selected.length > 0 && <div className={s.compareBar}><span>Выбрано {selected.length} из 3</span><button onClick={() => setCompare(true)} disabled={selected.length < 2}>Сравнить<Icon name="arrow" size={16} /></button><button aria-label="Очистить сравнение" onClick={() => setSelected([])}><Icon name="close" size={16} /></button></div>}
      </aside>
      <section className={s.mapPanel} aria-label="Карта помещений Тараза"><CityMap isStale={false} onRefresh={() => {}} /><div className={s.mapCaption}><span className={s.mapDot} />Тараз<span>{mapped} из {listings.length} на карте</span></div></section>
    </div>
    {compare && <Comparison listings={compared} onClose={() => setCompare(false)} />}
  </div>;
}

function Comparison({ listings, onClose }: { listings: ScoredListing[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={s.compareDialog} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) ref.current?.close(); }} aria-labelledby="comparison-heading"><header><div><span className={s.eyebrow}>РЯДОМ — ЗНАЧИТ НАГЛЯДНО</span><h2 id="comparison-heading">Сравните главное</h2></div><button aria-label="Закрыть сравнение" onClick={() => ref.current?.close()}><Icon name="close" /></button></header><div className={s.compareTable}><table><thead><tr><th>Помещение</th>{listings.map((item) => <th key={item.listing_id}>{item.address || item.title}</th>)}</tr></thead><tbody>{[
    ["Аренда / месяц", (item: ScoredListing) => item.price_tenge != null ? formatPrice(item.price_tenge) : "Не указана"],
    ["Площадь", (item: ScoredListing) => item.area_sqm ? formatArea(item.area_sqm) : "Не указана"],
    ["Оценка Aimaq", (item: ScoredListing) => `${Math.round(item.total_score)} / 100`],
    ["Остановок найдено", (item: ScoredListing) => item.bus_stops_nearby],
    ["Конкурентов найдено", (item: ScoredListing) => item.competitor_count],
  ].map(([label, render]) => <tr key={label as string}><th>{label as string}</th>{listings.map((item) => <td key={item.listing_id}>{(render as (item: ScoredListing) => string | number)(item)}</td>)}</tr>)}</tbody></table></div><p>Перед решением посетите помещение и уточните условия аренды.</p></dialog>;
}
