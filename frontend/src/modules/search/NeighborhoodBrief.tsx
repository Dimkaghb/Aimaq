"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/supabase/token";
import { DashboardIcon as Icon } from "@/modules/dashboard/components/DashboardIcon";
import type { BusinessType } from "@/types";
import s from "./search.module.css";

type Brief = { text: string; sources: { title: string; uri: string }[]; location_basis: string };

export function NeighborhoodBrief({ listingId, businessType }: { listingId: string; businessType: BusinessType }) {
  const [data, setData] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function inspect() {
    if (loading) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/listings/${listingId}/neighborhood`, {
        method: "POST", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ business_type: businessType }),
      });
      if (!response.ok) throw new Error("Unavailable");
      setData(await response.json());
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return <section className={s.neighborhoodBrief} aria-label="Окружение помещения">
    <div className={s.briefHeading}><Icon name="pin" size={17} /><strong>Что вокруг</strong><span className={s.googleAttribution} translate="no">Google Maps</span></div>
    {!data && <><p>Места поблизости и что они могут значить для вашего бизнеса.</p><button type="button" onClick={inspect} disabled={loading} className={s.briefButton}>{loading ? "Изучаем окружение…" : error ? "Попробовать ещё раз" : "Изучить окружение"}<Icon name="arrow" size={15} /></button></>}
    {loading && <p role="status">Проверяем места по Google Maps.</p>}
    {error && <p role="alert">Сейчас не удалось получить данные. Объявление и подбор остаются доступны.</p>}
    {data && <><div className={s.briefText}>{data.text}</div><div className={s.briefSources}><span className={s.googleAttribution} translate="no">Google Maps</span>{data.sources.filter((source) => /^https:\/\//i.test(source.uri)).map((source) => <a key={source.uri} href={source.uri} target="_blank" rel="noopener noreferrer">{source.title}<Icon name="external" size={12} /></a>)}</div><p className={s.briefNote}>Проверьте условия на месте. Данные карт могут отличаться от текущей ситуации.</p></>}
  </section>;
}
