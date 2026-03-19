"use client";

interface HeroScreenProps {
  onStart: () => void;
}

const STATS = [
  {
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="13" y2="15" />
      </svg>
    ),
    label: "500+ объявлений",
  },
  {
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    ),
    label: "8 районов Алматы",
  },
  {
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    label: "~30 секунд",
  },
];

export function HeroScreen({ onStart }: HeroScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      {/* Badge */}
      <span
        className="flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.1em] mb-8"
        style={{
          fontSize: 11,
          padding: "6px 14px",
          backgroundColor: "var(--blue-10)",
          color: "var(--accent-blue)",
          border: "1px solid var(--blue-20)",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--accent-blue)">
          <circle cx="5" cy="5" r="4" />
        </svg>
        ИИ-поиск недвижимости
      </span>

      {/* Heading */}
      <h1
        className="text-center font-semibold leading-[115%] tracking-[-0.03em] mb-5"
        style={{
          fontSize: "clamp(36px, 5.5vw, 68px)",
          color: "var(--neutral-30)",
          maxWidth: 760,
        }}
      >
        Найдите идеальное место
        <br />
        <span style={{ color: "var(--accent-blue)" }}>для вашего бизнеса</span>
        {" "}в Алматы
      </h1>

      {/* Subtitle */}
      <p
        className="text-center leading-relaxed mb-10"
        style={{
          fontSize: "clamp(16px, 1.8vw, 20px)",
          color: "var(--neutral-10)",
          maxWidth: 540,
        }}
      >
        ИИ анализирует сотни объявлений с Krisha.kz и OLX.kz,
        оценивает трафик, конкурентов и транспорт — и выдаёт
        топ-5 локаций под ваш запрос.
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={onStart}
        className="flex items-center gap-3 font-semibold transition-opacity hover:opacity-85"
        style={{
          padding: "18px 32px",
          fontSize: 18,
          backgroundColor: "var(--neutral-30)",
          color: "#fff",
          borderRadius: 100,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(26,22,21,0.18)",
          marginBottom: 14,
        }}
      >
        Расскажите о своём бизнесе
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <p
        style={{ fontSize: 13, color: "var(--neutral-10)", marginBottom: 48 }}
      >
        Занимает меньше минуты
      </p>

      {/* Stats */}
      <div className="flex flex-wrap items-center justify-center" style={{ gap: 10 }}>
        {STATS.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-2 rounded-full"
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--neutral-20)",
              backgroundColor: "rgba(255,255,255,0.72)",
              border: "1px solid var(--stroke)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span style={{ color: "var(--neutral-10)" }}>{s.icon}</span>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
