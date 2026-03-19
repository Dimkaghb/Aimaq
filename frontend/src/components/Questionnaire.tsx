"use client";

import { useState } from "react";
import type { BusinessType } from "@/types";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { postSearch } from "@/lib/api";
import { DISTRICT_MAP } from "@/types";
import { formatNumber } from "@/lib/score-utils";

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

const BIZ_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "fastfood", label: "Кафе / Фастфуд" },
  { value: "cafe", label: "Ресторан" },
  { value: "retail", label: "Магазин" },
  { value: "pharmacy", label: "Аптека" },
  { value: "office", label: "Офис" },
];

const DISTRICTS = [
  "Алмалы", "Медеу", "Бостандык", "Алатау",
  "Ауэзов", "Жетысу", "Турксиб", "Наурызбай",
] as const;

const QUESTIONS: Record<Step, string> = {
  1: "Тип бизнеса",
  2: "Район",
  3: "Бюджет",
  4: "Помещение",
};

// ── Pill selector (reused for biz type + district) ────────────────────────

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap" style={{ gap: 8 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className="rounded-full transition-all"
            style={{
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: active ? 600 : 400,
              border: active ? "1.5px solid var(--neutral-30)" : "1.5px solid var(--stroke)",
              backgroundColor: active ? "var(--neutral-30)" : "rgba(255,255,255,0.6)",
              color: active ? "#fff" : "var(--neutral-20)",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface QuestionnaireProps {
  onBack: () => void;
}

export function Questionnaire({ onBack }: QuestionnaireProps) {
  const {
    businessType, district, budgetTenge, areaSqmMin, competitorTolerance,
    setBusinessType, setDistrict, setBudget, setArea, setCompetitorTolerance,
    setSessionId, setAppState, setLastSearchedParams,
  } = useLocationIQStore();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOffice = businessType === "office";
  const canAdvance = step === 1 ? businessType !== null : true;

  function goNext() {
    if (!canAdvance) return;
    if (step < TOTAL_STEPS) setStep((s) => (s + 1) as Step);
  }
  function goPrev() {
    if (step > 1) setStep((s) => (s - 1) as Step);
    else onBack();
  }

  async function handleSubmit() {
    if (!businessType) return;
    setSubmitting(true);
    setError(null);
    const params = JSON.stringify({ businessType, district, budgetTenge, areaSqmMin, competitorTolerance });
    const apiDistrict = district ? (DISTRICT_MAP[district] ?? district) : null;
    try {
      const res = await postSearch({
        business_type: businessType,
        district: apiDistrict,
        budget_tenge: budgetTenge,
        area_sqm_min: areaSqmMin,
        competitor_tolerance: isOffice ? 0 : competitorTolerance,
      });
      setSessionId(res.session_id);
      setLastSearchedParams(params);
      setAppState("loading");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = step === TOTAL_STEPS;

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <div className="w-full flex flex-col" style={{ maxWidth: 440, gap: 32 }}>

        {/* Top row: back + step dots */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="flex items-center gap-1 transition-opacity hover:opacity-60"
            style={{
              fontSize: 14, fontWeight: 500,
              color: "var(--neutral-10)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {step === 1 ? "Назад" : "Назад"}
          </button>

          {/* Dot indicators */}
          <div className="flex items-center" style={{ gap: 6 }}>
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <span
                key={s}
                className="rounded-full transition-all"
                style={{
                  width: s === step ? 20 : 7,
                  height: 7,
                  backgroundColor: s <= step ? "var(--neutral-30)" : "var(--stroke)",
                }}
              />
            ))}
          </div>

          {/* Step label */}
          <span style={{ fontSize: 13, color: "var(--neutral-10)", minWidth: 50, textAlign: "right" }}>
            {step}/{TOTAL_STEPS}
          </span>
        </div>

        {/* Question */}
        <h2
          className="font-semibold tracking-[-0.02em]"
          style={{ fontSize: 24, color: "var(--neutral-30)" }}
        >
          {QUESTIONS[step]}
        </h2>

        {/* Step content */}
        <div>
          {step === 1 && (
            <PillGroup
              options={BIZ_OPTIONS.map((o) => ({ key: o.value, label: o.label }))}
              value={businessType}
              onChange={(v) => setBusinessType(v as BusinessType)}
            />
          )}

          {step === 2 && (
            <div className="flex flex-col" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={() => setDistrict(null)}
                className="rounded-full transition-all"
                style={{
                  padding: "10px 20px",
                  fontSize: 15,
                  fontWeight: district === null ? 600 : 400,
                  border: district === null ? "1.5px solid var(--neutral-30)" : "1.5px solid var(--stroke)",
                  backgroundColor: district === null ? "var(--neutral-30)" : "rgba(255,255,255,0.6)",
                  color: district === null ? "#fff" : "var(--neutral-20)",
                  cursor: "pointer",
                  width: "fit-content",
                }}
              >
                Любой район
              </button>
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {DISTRICTS.map((d) => {
                  const active = district === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDistrict(d)}
                      className="rounded-full transition-all"
                      style={{
                        padding: "10px 20px",
                        fontSize: 15,
                        fontWeight: active ? 600 : 400,
                        border: active ? "1.5px solid var(--neutral-30)" : "1.5px solid var(--stroke)",
                        backgroundColor: active ? "var(--neutral-30)" : "rgba(255,255,255,0.6)",
                        color: active ? "#fff" : "var(--neutral-20)",
                        cursor: "pointer",
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col" style={{ gap: 16 }}>
              <span
                className="font-bold tracking-tight"
                style={{ fontSize: 36, color: "var(--neutral-30)", lineHeight: 1 }}
              >
                {formatNumber(budgetTenge)} <span style={{ fontSize: 20, fontWeight: 500, color: "var(--neutral-10)" }}>₸/мес</span>
              </span>
              <input
                type="range"
                min={100000}
                max={5000000}
                step={50000}
                value={budgetTenge}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full accent-neutral-800"
              />
              <div className="flex justify-between">
                <span style={{ fontSize: 12, color: "var(--neutral-10)" }}>100 000 ₸</span>
                <span style={{ fontSize: 12, color: "var(--neutral-10)" }}>5 000 000 ₸</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col" style={{ gap: 24 }}>
              {/* Area */}
              <div className="flex flex-col" style={{ gap: 8 }}>
                <label className="font-medium" style={{ fontSize: 14, color: "var(--neutral-20)" }}>
                  Минимальная площадь
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    step={10}
                    value={areaSqmMin}
                    onChange={(e) => setArea(Math.max(10, Math.round(Number(e.target.value))))}
                    className="w-full rounded-xl"
                    style={{
                      padding: "12px 44px 12px 16px",
                      fontSize: 18, fontWeight: 600,
                      color: "var(--neutral-30)",
                      border: "1.5px solid var(--stroke)",
                      backgroundColor: "rgba(255,255,255,0.6)",
                      outline: "none",
                    }}
                  />
                  <span
                    className="absolute right-4 font-medium"
                    style={{ fontSize: 14, color: "var(--neutral-10)" }}
                  >
                    м²
                  </span>
                </div>
              </div>

              {/* Competitors */}
              <div className="flex flex-col" style={{ gap: 8, opacity: isOffice ? 0.4 : 1 }}>
                <div className="flex items-center justify-between">
                  <label className="font-medium" style={{ fontSize: 14, color: "var(--neutral-20)" }}>
                    Допустимые конкуренты
                  </label>
                  <span className="font-semibold" style={{ fontSize: 14, color: "var(--neutral-30)" }}>
                    {isOffice ? "—" : competitorTolerance}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={competitorTolerance}
                  disabled={isOffice}
                  onChange={(e) => setCompetitorTolerance(Number(e.target.value))}
                  className="w-full accent-neutral-800 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between">
                  <span style={{ fontSize: 12, color: "var(--neutral-10)" }}>Нет</span>
                  <span style={{ fontSize: 12, color: "var(--neutral-10)" }}>Не важно</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 14, color: "#dc2626" }}>{error}</p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={isLast ? handleSubmit : goNext}
          disabled={!canAdvance || submitting}
          className="w-full flex items-center justify-center gap-2 font-semibold transition-opacity hover:opacity-85"
          style={{
            padding: "16px 24px",
            fontSize: 16,
            backgroundColor: !canAdvance ? "rgba(26,22,21,0.12)" : "var(--neutral-30)",
            color: "#fff",
            borderRadius: 100,
            border: "none",
            cursor: !canAdvance ? "not-allowed" : "pointer",
            opacity: !canAdvance ? 0.5 : 1,
          }}
        >
          {submitting ? (
            <span className="inline-block rounded-full border-2 border-white border-t-transparent animate-spin" style={{ width: 16, height: 16 }} />
          ) : isLast ? (
            "Найти локации"
          ) : (
            "Далее"
          )}
        </button>
      </div>
    </div>
  );
}
