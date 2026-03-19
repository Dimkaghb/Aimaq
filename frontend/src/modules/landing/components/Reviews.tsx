"use client";

/* Framer source: nodeId fxPhAsuNv (Reviews)
   Container: maxWidth=1072px, gap=56px
   BigReview: maxWidth=900px — Testimonials style (64px medium centered), name + role
   DesktopTicker: height=288px, speed=40 → 40s CSS, direction=left, gap=24px, hoverFactor=0.5
   ReviewsCard: width=395px, bg=rgba(255,255,255,0.7), borderRadius=24px, padding=32px, gap=32px */

import { FadeUp, FadeIn } from "./motion";

const reviews = [
  {
    quote:
      "Как быстро движущейся дизайн-команде нам нужен был инструмент, который держит темп. От онбординга клиентов до оплаты — всё работает «из коробки»: чисто, быстро и очень качественно.",
    name: "Leah Daniel",
    role: "Лид по операционному дизайну (Design Ops), Teamwork",
    initials: "LD",
    color: "#9DC8DE",
  },
  {
    quote:
      "Aimaq заменил для меня четыре разных инструмента. Теперь я веду предложения, договоры, счета и учет времени в одном месте. Это изменило то, как я управляю своей студией.",
    name: "Marcus Obi",
    role: "Основатель, Obi Creative Studio",
    initials: "MO",
    color: "#F4B8A0",
  },
  {
    quote:
      "Поток «счет → оплата» работает невероятно гладко. Клиентам нравится фирменный опыт, а мне — своевременная оплата. Наконец-то инструмент для настоящих фрилансеров.",
    name: "Sophie Tremblay",
    role: "Бренд-дизайнер, фриланс",
    initials: "ST",
    color: "#B5D4A0",
  },
  {
    quote:
      "Я перепробовал все агентские инструменты на рынке. Aimaq — первый, который реально ощущается как продукт, созданный для креативщиков. Интерфейс потрясающий.",
    name: "Raj Mehta",
    role: "Креативный директор, Pixels & Co.",
    initials: "RM",
    color: "#C4AADC",
  },
  {
    quote:
      "Клиентский портал — настоящий прорыв. Мои клиенты видят прогресс проекта, подтверждают материалы и оплачивают счета в одном месте. Всё выглядит максимально профессионально.",
    name: "Ana Leal",
    role: "UX-консультант, фриланс",
    initials: "AL",
    color: "#F4D4A0",
  },
  {
    quote:
      "Учет времени раньше был тем, что я больше всего ненавидел во фрилансе. Aimaq делает это невероятно легко: работает в фоне, а отчеты получаются красивыми.",
    name: "Tom Weiss",
    role: "Моушн-дизайнер, Studio Nine",
    initials: "TW",
    color: "#A0C4DC",
  },
  {
    quote:
      "Перешел с трёх отдельных инструментов и сэкономил $120 в месяц. Всё отлично интегрируется, а команда поддержки действительно отвечает. Очень рекомендую.",
    name: "Nia Okafor",
    role: "Веб-разработчик, фриланс",
    initials: "NO",
    color: "#D4C4A0",
  },
  {
    quote:
      "Функция «предложения» помогла мне закрыть больше сделок уже в первый месяц, чем любая другая платформа. Клиенты видят профессиональный фирменный документ — и доверие растёт сразу.",
    name: "James Park",
    role: "Стратегический консультант",
    initials: "JP",
    color: "#F0B4B4",
  },
];

function ReviewCard({
  quote,
  name,
  role,
  initials,
  color,
}: {
  quote: string;
  name: string;
  role: string;
  initials: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-col justify-between shrink-0"
      style={{
        width: 395,
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        borderRadius: 24,
        padding: 32,
        gap: 32,
      }}
    >
      {/* Stars */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} viewBox="0 0 16 16" className="w-4 h-4" fill="#1a1615">
            <path d="M8 1l1.85 3.74L14 5.5l-3 2.92.71 4.12L8 10.4l-3.71 2.14.71-4.12L2 5.5l4.15-.76L8 1z" />
          </svg>
        ))}
      </div>
      {/* Quote */}
      <p
        className="leading-[150%] flex-1"
        style={{ fontSize: 18, color: "var(--neutral-20)" }}
      >
        {quote}
      </p>
      {/* User info */}
      <div className="flex items-center gap-4">
        <div
          className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold text-[14px]"
          style={{ width: 56, height: 56, backgroundColor: color }}
        >
          {initials}
        </div>
        <div className="flex flex-col">
          <span
            className="font-medium leading-[150%]"
            style={{ fontSize: 16, color: "var(--neutral-30)" }}
          >
            {name}
          </span>
          <span
            className="leading-[150%]"
            style={{ fontSize: 14, color: "var(--neutral-10)" }}
          >
            {role}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Reviews() {
  const doubled = [...reviews, ...reviews];

  return (
    <section className="w-full flex flex-col items-center px-6 py-0">
      {/* Inner container — maxWidth 1072px */}
      <div
        className="flex flex-col items-center w-full"
        style={{ maxWidth: 1072, gap: 56 }}
      >
        {/* BigReview — fades up */}
        <FadeUp
          className="flex flex-col items-center gap-8 text-center w-full"
          style={{ maxWidth: 900 }}
        >
          {/* Stars */}
          <div className="flex gap-1 justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} viewBox="0 0 20 20" className="w-6 h-6" fill="var(--neutral-30)">
                <path d="M10 1.5l2.3 4.65 5.13.75-3.72 3.62.88 5.12L10 13.27l-4.59 2.37.88-5.12L2.57 6.9l5.13-.75L10 1.5z" />
              </svg>
            ))}
          </div>
          {/* Quote — Testimonials style: 64px, Medium */}
          <blockquote
            className="font-medium leading-[145%] tracking-[-0.03em]"
            style={{
              fontSize: "clamp(28px, 5vw, 64px)",
              color: "var(--neutral-30)",
            }}
          >
            "Aimaq — лучший инструмент для агентств из всех, что я использовал"
          </blockquote>
          {/* Author */}
          <div className="flex items-center gap-4">
            <div
              className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold text-[14px]"
              style={{
                width: 64,
                height: 64,
                backgroundColor: "var(--blue-30)",
              }}
            >
              MP
            </div>
            <div className="flex flex-col text-left">
              <span
                className="font-medium leading-[150%]"
                style={{ fontSize: 16, color: "var(--neutral-30)" }}
              >
                Martha Punla
              </span>
              <span
                className="leading-[150%]"
                style={{ fontSize: 14, color: "var(--neutral-10)" }}
              >
                Директор по маркетингу (VP Marketing), Meta
              </span>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* Full-width reviews ticker — height 288px, bleeds outside container */}
      <FadeIn delay={0.2} className="ticker-mask w-full overflow-hidden mt-14" style={{ height: 288 }}>
        <div
          className="flex items-center h-full reviews-ticker-track"
          style={{ gap: 24, paddingLeft: 24 }}
        >
          {doubled.map((review, i) => (
            <ReviewCard key={i} {...review} />
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
