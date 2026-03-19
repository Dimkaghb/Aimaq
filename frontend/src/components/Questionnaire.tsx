"use client";

import { useState } from "react";
import type { BusinessType } from "@/types";
import { useLocationIQStore } from "@/store/useLocationIQStore";
import { postSearch } from "@/lib/api";
import { DISTRICT_MAP } from "@/types";
import { formatNumber } from "@/lib/score-utils";

// ─── Types ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

// ─── Business type tiles ─────────────────────────────────────────────────

interface BizTile {
  value: BusinessType;
  label: string;
  emoji: string;
}

const BIZ_TILES: BizTile[] = [
  { value: "fastfood", label: "Кафе / Фастфуд", emoji: "☕" },
  { value: "cafe",     label: "Ресторан",        emoji: "🍽️" },
  { value: "retail",   label: "Магазин",          emoji: "🛍️" },
  { value: "pharmacy", label: "Аптека",           emoji: "💊" },
  { value: "office",   label: "Офис",             emoji: "💼" },
];

const DISTRICTS = [
  "Алмалы", "Медеу", "Бостандык", "Алатау",
  "Ауэзов", "Жетысу", "Турксиб", "Наурызбай",
] as const;

// ─── Step metadata ────────────────────────────────────────────────────────

const STEP_QUESTIONS: Record<Step, string> = {
  1: "Какой у вас тип бизнеса?",
  2: "В каком районе Алматы?",
  3: "Каков бюджет на аренду?",
  4: "Требования к помещению",
};

const STEP_HINTS: Record<Step, string> = {
  1: "Выберите ближайший к вашему формату вариант",
  2: "Можно выбрать «Любой» — ИИ найдёт лучшие районы",
  3: "Укажите максимальный комфортный бюджет",
  4: "Остальное мы подберём автоматически",
};

// ─── Progress bar ─────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 10, width: "100%", maxWidth: 420 }}>
      <div className="flex items-center justify-between w-full">
        <span
          className="text-[12px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--neutral-10)" }}
        >
          Шаг {step} из {TOTAL_STEPS}
        </span>
        <span
          className="text-[12px] font-medium"
          style={{ color: "var(--neutral-10)" }}
        >
          {Math.round((step / TOTAL_STEPS) * 100)}%
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 4, backgroundColor: "var(--stroke)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${(step / TOTAL_STEPS) * 100}%`,
            backgroundColor: "var(--accent-blue)",
            transition: "width 0.35s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Step 1: Business type ────────────────────────────────────────────────

function StepBusinessType({
  value,
  onChange,
}: {
  value: BusinessType | null;
  onChange: (v: BusinessType) => void;
}) {
  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}
    >
      {BIZ_TILES.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className="flex flex-col items-center justify-center rounded-2xl transition-all"
            style={{
              padding: "16px 8px",
              gap: 8,
              fontSize: 24,
              border: active
                ? "2px solid var(--accent-blue)"
                : "2px solid var(--stroke)",
              backgroundColor: active
                ? "rgba(21,108,194,0.07)"
                : "rgba(255,255,255,0.72)",
              cursor: "pointer",
              minHeight: 92,
            }}
          >
            <span>{t.emoji}</span>
            <span
              className="text-center leading-tight font-medium"
              style={{
                fontSize: 13,
                color: active ? "var(--accent-blue)" : "var(--neutral-20)",
                fontWeight: active ? 600 : 500,
              }}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: District ─────────────────────────────────────────────────────

function StepDistrict({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (d: string | null) => void;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: 12 }}>
      {/* "Any" option */}
      <button
        type="button"
        onClick={() => onChange(null)}
        className="w-full rounded-2xl font-semibold transition-all"
        style={{
          padding: "14px 20px",
          fontSize: 15,
          border: value === null
            ? "2px solid var(--accent-blue)"
            : "2px solid var(--stroke)",
          backgroundColor: value === null
            ? "rgba(21,108,194,0.07)"
            : "rgba(255,255,255,0.72)",
          color: value === null ? "var(--accent-blue)" : "var(--neutral-20)",
          cursor: "pointer",
        }}
      >
        🗺️ Любой район — ИИ выберет лучший
      </button>

      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {DISTRICTS.map((d) => {
          const active = value === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className="rounded-full font-medium transition-all"
              style={{
                padding: "9px 16px",
                fontSize: 14,
                border: active
                  ? "1.5px solid var(--accent-blue)"
                  : "1.5px solid var(--stroke)",
                backgroundColor: active
                  ? "rgba(21,108,194,0.07)"
                  : "rgba(255,255,255,0.72)",
                color: active ? "var(--accent-blue)" : "var(--neutral-20)",
                cursor: "pointer",
                fontWeight: active ? 600 : 500,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Budget ───────────────────────────────────────────────────────

function StepBudget({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const PRESETS = [250000, 500000, 1000000, 2000000];

  return (
    <div className="flex flex-col w-full" style={{ gap: 20 }}>
      {/* Big display */}
      <div className="text-center">
        <span
          className="font-bold leading-none tracking-tight"
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            color: "var(--neutral-30)",
          }}
        >
          {formatNumber(value)}
        </span>
        <span
          className="font-semibold ml-2"
          style={{ fontSize: 22, color: "var(--neutral-10)" }}
        >
          ₸/мес
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={100000}
        max={5000000}
        step={50000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
        style={{ height: 6 }}
      />
      <div className="flex justify-between">
        <span className="text-[12px]" style={{ color: "var(--neutral-10)" }}>
          100 000 ₸
        </span>
        <span className="text-[12px]" style={{ color: "var(--neutral-10)" }}>
          5 000 000 ₸
        </span>
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap justify-center" style={{ gap: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className="rounded-full font-medium transition-all"
            style={{
              padding: "7px 14px",
              fontSize: 13,
              border: value === p
                ? "1.5px solid var(--accent-blue)"
                : "1.5px solid var(--stroke)",
              backgroundColor: value === p
                ? "rgba(21,108,194,0.07)"
                : "rgba(255,255,255,0.72)",
              color: value === p ? "var(--accent-blue)" : "var(--neutral-20)",
              cursor: "pointer",
              fontWeight: value === p ? 600 : 400,
            }}
          >
            {formatNumber(p)} ₸
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Area + competitors ───────────────────────────────────────────

function StepRequirements({
  area,
  onAreaChange,
  competitors,
  onCompetitorsChange,
  isOffice,
}: {
  area: number;
  onAreaChange: (n: number) => void;
  competitors: number;
  onCompetitorsChange: (n: number) => void;
  isOffice: boolean;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: 24 }}>
      {/* Area */}
      <div
        className="flex flex-col rounded-2xl p-5"
        style={{
          gap: 12,
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1.5px solid var(--stroke)",
        }}
      >
        <label
          className="font-semibold"
          style={{ fontSize: 14, color: "var(--neutral-30)" }}
        >
          Минимальная площадь
        </label>
        <div className="relative flex items-center">
          <input
            type="number"
            min={10}
            max={5000}
            step={10}
            value={area}
            onChange={(e) =>
              onAreaChange(Math.max(10, Math.round(Number(e.target.value))))
            }
            className="w-full rounded-xl"
            style={{
              padding: "12px 48px 12px 16px",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--neutral-30)",
              border: "1.5px solid var(--stroke)",
              backgroundColor: "transparent",
              outline: "none",
            }}
          />
          <span
            className="absolute right-4 font-semibold"
            style={{ fontSize: 16, color: "var(--neutral-10)" }}
          >
            м²
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--neutral-10)" }}>
          Укажите минимум — мы покажем всё, что подходит
        </p>
      </div>

      {/* Competitor tolerance */}
      <div
        className="flex flex-col rounded-2xl p-5"
        style={{
          gap: 12,
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1.5px solid var(--stroke)",
          opacity: isOffice ? 0.5 : 1,
        }}
      >
        <div className="flex items-center justify-between">
          <label
            className="font-semibold"
            style={{ fontSize: 14, color: "var(--neutral-30)" }}
          >
            Допустимые конкуренты
          </label>
          <span
            className="text-[13px] font-bold rounded-full px-3 py-1"
            style={{
              backgroundColor: "var(--blue-10)",
              color: "var(--accent-blue)",
            }}
          >
            {isOffice ? "N/A" : competitors}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={competitors}
          disabled={isOffice}
          onChange={(e) => onCompetitorsChange(Number(e.target.value))}
          className="w-full accent-blue-600 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between">
          <span className="text-[12px]" style={{ color: "var(--neutral-10)" }}>
            0 — Нет конкурентов
          </span>
          <span className="text-[12px]" style={{ color: "var(--neutral-10)" }}>
            10 — Не важно
          </span>
        </div>
        {isOffice && (
          <p
            className="text-[12px] rounded-lg px-3 py-1.5 text-center"
            style={{
              color: "var(--neutral-10)",
              backgroundColor: "var(--beige-10)",
            }}
          >
            Для офиса конкуренты не важны
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Questionnaire ───────────────────────────────────────────────────

interface QuestionnaireProps {
  onBack: () => void;
}

export function Questionnaire({ onBack }: QuestionnaireProps) {
  const {
    businessType,
    district,
    budgetTenge,
    areaSqmMin,
    competitorTolerance,
    setBusinessType,
    setDistrict,
    setBudget,
    setArea,
    setCompetitorTolerance,
    setSessionId,
    setAppState,
    setLastSearchedParams,
  } = useLocationIQStore();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOffice = businessType === "office";

  // Validation per step
  function canAdvance(): boolean {
    if (step === 1) return businessType !== null;
    return true;
  }

  function goNext() {
    if (!canAdvance()) return;
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

    const params = JSON.stringify({
      businessType,
      district,
      budgetTenge,
      areaSqmMin,
      competitorTolerance,
    });

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
      setError(
        err instanceof Error ? err.message : "Произошла ошибка. Попробуйте снова."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isLastStep = step === TOTAL_STEPS;
  const nextDisabled = !canAdvance() || submitting;

  return (
    <div className="flex flex-col items-center flex-1 px-6 py-10" style={{ gap: 0 }}>
      {/* Back link */}
      <div className="w-full flex justify-start" style={{ maxWidth: 520, marginBottom: 24 }}>
        <button
          type="button"
          onClick={goPrev}
          className="flex items-center gap-1.5 font-medium transition-opacity hover:opacity-70"
          style={{
            fontSize: 14,
            color: "var(--neutral-10)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {step === 1 ? "На главную" : "Назад"}
        </button>
      </div>

      {/* Progress */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 32 }}>
        <ProgressBar step={step} />
      </div>

      {/* Question + hint */}
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 520, gap: 6, marginBottom: 28 }}
      >
        <h2
          className="font-semibold leading-tight tracking-[-0.02em]"
          style={{
            fontSize: "clamp(22px, 3vw, 30px)",
            color: "var(--neutral-30)",
          }}
        >
          {STEP_QUESTIONS[step]}
        </h2>
        <p style={{ fontSize: 14, color: "var(--neutral-10)" }}>
          {STEP_HINTS[step]}
        </p>
      </div>

      {/* Step content */}
      <div style={{ width: "100%", maxWidth: 520, marginBottom: 28 }}>
        {step === 1 && (
          <StepBusinessType value={businessType} onChange={setBusinessType} />
        )}
        {step === 2 && (
          <StepDistrict value={district} onChange={setDistrict} />
        )}
        {step === 3 && (
          <StepBudget value={budgetTenge} onChange={setBudget} />
        )}
        {step === 4 && (
          <StepRequirements
            area={areaSqmMin}
            onAreaChange={setArea}
            competitors={competitorTolerance}
            onCompetitorsChange={setCompetitorTolerance}
            isOffice={isOffice}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{ width: "100%", maxWidth: 520, marginBottom: 16 }}
        >
          <p
            className="rounded-xl px-4 py-3 text-[14px]"
            style={{ color: "#dc2626", backgroundColor: "rgba(220,38,38,0.08)" }}
          >
            {error}
          </p>
        </div>
      )}

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 520 }}>
        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={nextDisabled}
            className="w-full flex items-center justify-center gap-2 font-semibold transition-opacity"
            style={{
              padding: "16px 24px",
              fontSize: 16,
              backgroundColor: nextDisabled
                ? "rgba(26,22,21,0.15)"
                : "var(--neutral-30)",
              color: "#fff",
              borderRadius: 100,
              border: "none",
              cursor: nextDisabled ? "not-allowed" : "pointer",
              opacity: nextDisabled ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <>
                <span
                  className="inline-block rounded-full border-2 border-white border-t-transparent animate-spin"
                  style={{ width: 16, height: 16 }}
                />
                Отправляем...
              </>
            ) : (
              <>
                Найти локации
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={nextDisabled}
            className="w-full flex items-center justify-center gap-2 font-semibold transition-opacity"
            style={{
              padding: "16px 24px",
              fontSize: 16,
              backgroundColor: nextDisabled
                ? "rgba(26,22,21,0.15)"
                : "var(--neutral-30)",
              color: "#fff",
              borderRadius: 100,
              border: "none",
              cursor: nextDisabled ? "not-allowed" : "pointer",
              opacity: nextDisabled ? 0.6 : 1,
            }}
          >
            Далее
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
