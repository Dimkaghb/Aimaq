"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { landingFont } from "./fonts";
import styles from "./landing.module.css";

type IconName = "arrow" | "pin" | "coffee" | "shop" | "office" | "health" | "check" | "menu" | "close" | "layers" | "chart" | "globe";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M4 12h15M13 5l7 7-7 7" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    coffee: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M12 2v3" /></>,
    shop: <><path d="m3 9 2-6h14l2 6M4 12v9h16v-9M9 21v-7h6v7M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0Z" /></>,
    office: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-6h4v6" /></>,
    health: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    layers: <><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" /></>,
    chart: <><path d="M4 4v16h17M8 15v-4m5 4V6m5 9V9" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return <Link href="/" className={styles.brand} aria-label="Aimaq — главная"><span className={styles.brandMark}><Icon name="pin" size={25} /></span><span>aimaq</span></Link>;
}

function Action({ children = "Подобрать локацию", secondary = false }: { children?: React.ReactNode; secondary?: boolean }) {
  return <Link href="/auth" className={`${styles.button} ${secondary ? styles.secondaryButton : styles.primaryButton}`}>{children}<Icon name="arrow" size={18} /></Link>;
}

const businesses: { label: string; icon: IconName; location: string; score: number; factors: number[] }[] = [
  { label: "Кофейня", icon: "coffee", location: "Помещение у пешеходной улицы", score: 92, factors: [94, 82, 96, 88] },
  { label: "Магазин", icon: "shop", location: "Помещение в жилом квартале", score: 88, factors: [90, 78, 92, 86] },
  { label: "Офис", icon: "office", location: "Офис рядом с транспортным узлом", score: 90, factors: [80, 94, 96, 86] },
  { label: "Аптека", icon: "health", location: "Помещение рядом с поликлиникой", score: 91, factors: [92, 90, 89, 93] },
];

function MapPreview({ score }: { score: number }) {
  return <div className={styles.mapPreview}>
    <svg className={styles.mapDrawing} viewBox="0 0 600 430" fill="none" aria-hidden="true">
      <defs><pattern id="aimaq-blocks" width="122" height="106" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><rect width="122" height="106" fill="#f0f1ec" /><rect x="10" y="10" width="94" height="78" rx="5" fill="#e2e5de" /><path d="M25 24h29v22H25zM65 24h25v48H65zM25 56h29v16H25z" fill="#d4d9d0" /><path d="M114 0v106M0 98h122" stroke="#fff" strokeWidth="13" /></pattern></defs>
      <path fill="url(#aimaq-blocks)" d="M0 0h600v430H0z" />
      <path d="M460-20c-80 100 60 150-45 230S360 340 440 460" stroke="#b8dbe2" strokeWidth="37" />
      <path d="m-40 320 690-190M200-40l160 520" stroke="#d6d9d2" strokeWidth="30" />
      <path d="m-40 320 690-190M200-40l160 520" stroke="#fffefa" strokeWidth="24" />
      <path d="m-40 320 690-190M200-40l160 520" stroke="#deded3" strokeWidth="1.5" strokeDasharray="7 7" />
      <path d="m30 30 117-36 30 94-117 36Z" fill="#ccdcca" /><path d="m435 280 100-25 41 107-101 27Z" fill="#ccdcca" />
      <circle cx="298" cy="210" r="87" fill="#a9d6e5" fillOpacity=".32" stroke="#6fa6b7" strokeDasharray="5 5" />
    </svg>
    <span className={styles.mapLabel}>Пример анализа района</span>
    <span className={`${styles.mapPin} ${styles.pinOne}`}>{score}</span>
    <span className={`${styles.mapPin} ${styles.pinTwo}`}>{score - 8}</span>
    <span className={`${styles.mapPin} ${styles.pinThree}`}>{score - 13}</span>
    <span className={styles.mapLegend}><i /> Подходящие локации</span>
  </div>;
}

function LocationDemo() {
  const [selected, setSelected] = useState(0);
  const business = businesses[selected];
  return <div className={styles.locationDemo}>
    <div className={styles.demoTop}><span><span className={styles.smallBrand}>a</span> Обзор локаций</span><span className={styles.demoBadge}>Демо</span></div>
    <div className={styles.demoTabs} role="group" aria-label="Выберите тип бизнеса для примера">{businesses.map((item, i) => <button key={item.label} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} className={selected === i ? styles.activeTab : ""}><Icon name={item.icon} size={15} />{item.label}</button>)}</div>
    <MapPreview score={business.score} />
    <div className={styles.locationResult} aria-live="polite"><div><span className={styles.microLabel}>ЛУЧШЕЕ СОВПАДЕНИЕ</span><h4>{business.location}</h4><p>Под ваш формат: {business.label.toLowerCase()}</p></div><div className={styles.score}>{business.score}<small>из 100</small></div></div>
  </div>;
}

function ScorePreview() {
  return <div className={styles.scorePreview}>
    <div className={styles.scoreHeading}><span className={styles.scoreIcon}><Icon name="chart" size={24} /></span><div><h4>За каждой оценкой — данные</h4><p>Пример разбора локации</p></div></div>
    <div className={styles.bigScore}>92<span>/ 100</span><span className={styles.scoreTag}>Высокий потенциал</span></div>
    <div className={styles.factorList}>{["Пешеходный трафик", "Конкурентное окружение", "Транспортная доступность", "Соответствие бюджету"].map((factor, i) => <div key={factor}><div className={styles.factorLabel}><span>{factor}</span><span>{businesses[0].factors[i]}</span></div><div className={styles.factorTrack}><span style={{ width: `${businesses[0].factors[i]}%` }} /></div></div>)}</div>
    <div className={styles.insight}><Icon name="layers" size={18} /><p>Высокий трафик и близость транспорта делают эту локацию перспективной для кофейни.</p></div>
  </div>;
}

const faqs = [
  ["Как Aimaq подбирает локации?", "Вы указываете формат бизнеса, район, бюджет и площадь. Aimaq сравнивает доступные помещения по трафику, конкуренции, транспорту и вашим параметрам, затем собирает рейтинг с пояснениями."],
  ["В каком городе работает подбор?", "Сейчас подбор доступен в Таразе. Можно искать по всему городу или выбрать район Аулиеата или Жибек жолы. Фильтр района учитывает объявления, в которых район указан источником."],
  ["Для какого бизнеса подходит Aimaq?", "Для кафе, кофеен, фастфуда, магазинов, офисов и аптек. В анкете можно дополнительно описать свой бизнес, чтобы уточнить запрос."],
  ["Что означает оценка локации?", "Это сравнительная оценка соответствия помещения вашему запросу. Она помогает сузить поиск, но не гарантирует доходность. Перед арендой стоит посетить место и проверить условия с арендодателем."],
  ["Можно ли сохранить результаты?", "Да. В аккаунте можно сохранять подборки бизнеса и возвращаться к найденным помещениям, их оценкам и подробной информации."],
];

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [["Возможности", "#features"], ["Как это работает", "#how-it-works"], ["Тарифы", "#pricing"]];

  return <div className={`${styles.landing} ${landingFont.variable}`} lang="ru">
    <a href="#main-content" className={styles.skipLink}>Перейти к содержимому</a>
    <header className={styles.header}>
      <nav className={`${styles.container} ${styles.navigation}`} aria-label="Основная навигация">
        <Brand />
        <div className={styles.desktopLinks}>{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div>
        <div className={styles.navActions}><Link href="/auth" className={styles.login}>Войти</Link><Link href="/auth" className={`${styles.button} ${styles.primaryButton} ${styles.navButton}`}>Начать подбор <Icon name="arrow" size={16} /></Link></div>
        <button type="button" className={styles.menuToggle} onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={mobileOpen} aria-controls="landing-mobile-nav"><Icon name={mobileOpen ? "close" : "menu"} /></button>
      </nav>
      {mobileOpen && <nav id="landing-mobile-nav" className={styles.mobileNav} aria-label="Мобильная навигация" onKeyDown={(event) => { if (event.key === "Escape") setMobileOpen(false); }}>{nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileOpen(false)}>{label}</a>)}<Link href="/auth">Войти в Aimaq <Icon name="arrow" size={16} /></Link></nav>}
    </header>

    <main id="main-content">
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
        <h1 id="hero-title">Хороший бизнес начинается<br className={styles.desktopBreak} /> с правильного места.</h1>
        <p className={styles.heroDescription}>Найдите локацию, где ваш бизнес будет к месту.<br className={styles.desktopBreak} /> Aimaq изучит район, сравнит помещения и объяснит выбор.</p>
        <div className={styles.heroActions}><Action /><a href="#how-it-works" className={styles.textLink}>Как это работает <Icon name="arrow" size={17} /></a></div>
        <div className={styles.heroArt}>
          <Image src="/images/taraz-neighborhood-2k.webp" alt="Рисованный Тараз: жилой квартал, зелёные улицы и прогулочная площадь" fill priority sizes="(max-width: 1320px) 94vw, 1240px" className={styles.heroImage} />
        </div>
      </section>

      <section className={`${styles.container} ${styles.intro}`} aria-labelledby="intro-title">
        <div className={styles.introCopy}><h2 id="intro-title">Вы знаете свой бизнес.<br />Мы поможем узнать район.</h2><div><p>За красивой витриной — целый район. Кто проходит мимо, что открыто по соседству, удобно ли добираться. Aimaq собирает эти детали в понятную картину, чтобы вам было проще выбрать.</p><a href="#features" className={styles.textLink}>Посмотреть возможности <Icon name="arrow" size={18} /></a></div></div>
        <div className={styles.businessTypes}><p>Для большого шага в вашем небольшом бизнесе</p><div>{businesses.map((business) => <span key={business.label}><Icon name={business.icon} size={25} />{business.label}</span>)}</div></div>
      </section>

      <section className={`${styles.container} ${styles.features}`} id="features" aria-labelledby="features-title">
        <div className={styles.sectionHeading}><span className={styles.eyebrow}>Меньше догадок. Больше ясности.</span><h2 id="features-title">Увидеть потенциал.<br />Найти своё место.</h2></div>
        <article className={styles.featurePanel}>
          <div className={styles.featureCopy}><span className={styles.sectionNumber}>01 / ПОДБОР ЛОКАЦИЙ</span><h3>Весь район.<br />В одном окне.</h3><p>Помещения, трафик и конкуренты — на одной карте. Укажите свой формат, бюджет и район. Мы соберём локации, которые подходят именно вам.</p><Action>Найти своё место</Action><span className={styles.featureNote}>Попробуйте переключить формат бизнеса →</span></div>
          <div className={`${styles.featureVisual} ${styles.blueVisual}`}><LocationDemo /></div>
        </article>
        <article className={`${styles.featurePanel} ${styles.reversePanel}`}>
          <div className={`${styles.featureVisual} ${styles.sandVisual}`}><ScorePreview /></div>
          <div className={styles.featureCopy}><span className={styles.sectionNumber}>02 / ПОНЯТНАЯ АНАЛИТИКА</span><h3>Не просто рейтинг.<br />Причины за ним.</h3><p>У каждой локации — своя оценка и понятное объяснение. Сравните поток людей, окружение и стоимость аренды. Принимайте решение с открытыми глазами.</p><Action>Посмотреть подборку</Action></div>
        </article>
      </section>

      <section className={`${styles.container} ${styles.howSection}`} id="how-it-works" aria-labelledby="how-title">
        <div className={styles.splitHeading}><h2 id="how-title">От идеи до адреса.<br />Три простых шага.</h2><p>Расскажите о своём деле.<br />Остальное начнётся с Aimaq.</p></div>
        <div className={styles.steps}>{[
          ["01", "Расскажите о бизнесе", "Кофейня у дома или новый офис? Выберите формат, район, бюджет и нужную площадь."],
          ["02", "Изучите подборку", "Сравните подходящие помещения на карте и узнайте, что стоит за оценкой каждого."],
          ["03", "Сделайте следующий шаг", "Сохраните понравившиеся варианты и подготовьте обращение к арендодателю."],
        ].map(([number, title, description]) => <article key={number}><span>{number}<Icon name="arrow" size={18} /></span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className={styles.pricingSection} id="pricing" aria-labelledby="pricing-title"><div className={styles.container}>
        <div className={styles.splitHeading}><div><span className={styles.eyebrow}>В вашем темпе</span><h2 id="pricing-title">Начните с одного места.<br />Думайте о большем.</h2></div><p>Первый подбор — бесплатно.<br />Больше возможностей, когда они нужны.</p></div>
        <div className={styles.pricingGrid}>
          <article className={styles.priceCard}><span className={styles.planLabel}>Базовый</span><h3>Бесплатно</h3><p>Чтобы найти отправную точку для своего дела.</p><ul>{["До 5 лучших локаций в подборке", "Подбор по району и бюджету", "Оценка трафика, конкурентов и транспорта", "Черновик обращения арендодателю"].map((item) => <li key={item}><Icon name="check" size={17} />{item}</li>)}</ul><Action secondary>Начать бесплатно</Action></article>
          <article className={`${styles.priceCard} ${styles.premiumCard}`}><span className={styles.planLabel}>Премиум <span>Для новых горизонтов</span></span><h3>49 000 ₸<small> / месяц</small></h3><p>Для регулярного поиска и подробного сравнения.</p><ul>{["Всё, что есть в Базовом", "Расширенный рейтинг локаций", "Подробный разбор факторов", "Обновление подбора при смене параметров"].map((item) => <li key={item}><Icon name="check" size={17} />{item}</li>)}</ul><Action>Начать с Aimaq</Action></article>
        </div>
      </div></section>

      <section className={`${styles.container} ${styles.faqSection}`} id="questions" aria-labelledby="faq-title"><div><span className={styles.eyebrow}>Давайте разберёмся</span><h2 id="faq-title">Хорошие вопросы.</h2></div><div className={styles.faqList}>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>

      <section className={styles.closing} aria-labelledby="closing-title"><div className={styles.closingArt} aria-hidden="true" /><div className={styles.closingContent}><span className={styles.eyebrow}>Ваше дело. Ваш район.</span><h2 id="closing-title">Большие планы?<br />Начните с места.</h2><p>Возможно, оно уже ждёт вас за углом.</p><Action>Найти свою локацию</Action></div></section>
    </main>

    <footer className={styles.footer}><div className={styles.container}><div className={styles.footerTop}><div><Brand /><p>Хорошее место для вашего дела.</p></div><div className={styles.footerLinks}><div><span>Продукт</span><a href="#features">Возможности</a><a href="#how-it-works">Как это работает</a><a href="#pricing">Тарифы</a></div><div><span>Начать</span><Link href="/auth">Подобрать локацию</Link><Link href="/auth">Личный кабинет</Link><a href="#questions">Вопросы и ответы</a></div></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} Aimaq</span><span>Создано для бизнеса в Казахстане</span><span><Icon name="globe" size={16} /> Русский</span></div></div></footer>
  </div>;
}
