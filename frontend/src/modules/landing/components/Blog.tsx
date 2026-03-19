/* Framer source: nodeId Lelf_AL_4 (Blog)
   Container: maxWidth=1072px, gap=56px
   BigCard (WideDesktop variant): full-width, height=480px, bg=rgba(255,255,255,0.7), radius=16px, horizontal layout
   Small cards (3): Small variant, stacked, image 266px height, radius=16px
   Badge: colored pill with label (Featured=orange, Tools=blue, Insight=yellow, Management=green) */

import Link from "next/link";

/* Badge pill colors from Framer props */
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Featured: { bg: "rgb(201, 80, 46)", text: "#fff" },
  Tools: { bg: "rgb(21, 108, 194)", text: "#fff" },
  Insight: { bg: "rgb(207, 141, 19)", text: "#fff" },
  Management: { bg: "rgb(14, 161, 88)", text: "#fff" },
};

/* Gradient placeholder images using badge category color */
const BG_GRADIENTS: Record<string, string> = {
  Featured: "linear-gradient(135deg, #f5d0c0 0%, #e8a882 100%)",
  Tools: "linear-gradient(135deg, #c0d8f5 0%, #82aee8 100%)",
  Insight: "linear-gradient(135deg, #f5ecc0 0%, #e8cc82 100%)",
  Management: "linear-gradient(135deg, #c0f5d4 0%, #82e8b0 100%)",
};

function Badge({ label }: { label: string }) {
  const colors = BADGE_COLORS[label] ?? { bg: "var(--beige-10)", text: "var(--neutral-30)" };
  return (
    <span
      className="inline-flex items-center font-semibold text-[12px] leading-[125%] tracking-widest uppercase px-3 py-1 rounded-full"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}

const featuredPost = {
  title: "How to start a 100k creative agency in 2025",
  excerpt: "Learn how to kickstart your journey into agency ownership with our comprehensive guide.",
  author: "Dhyna Phils",
  role: "Head of Marketing",
  badge: "Featured",
  href: "/blog/how-to-start-a-100k-creative-agency",
};

const smallPosts = [
  {
    title: "Top 10 digital agency software",
    author: "Dyna Phils",
    role: "Head of Marketing",
    badge: "Tools",
    href: "/blog/top-10-digital-agency-software",
  },
  {
    title: "A complete guide to project success in 2026",
    author: "Dyna Phils",
    role: "Head of Marketing",
    badge: "Insight",
    href: "/blog/guide-to-project-success-2026",
  },
  {
    title: "What Are Billable Hours",
    author: "Dyna Phils",
    role: "Head of Marketing",
    badge: "Management",
    href: "/blog/what-are-billable-hours",
  },
];

function AuthorRow({ author, role }: { author: string; role: string }) {
  const initials = author.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 flex items-center justify-center rounded-full text-white font-semibold text-[12px]"
        style={{ width: 36, height: 36, backgroundColor: "var(--blue-30)" }}
      >
        {initials}
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-[14px]" style={{ color: "var(--neutral-30)" }}>{author}</span>
        <span className="text-[13px]" style={{ color: "var(--neutral-10)" }}>{role}</span>
      </div>
    </div>
  );
}

export function Blog() {
  return (
    <section className="w-full flex justify-center px-6 py-0">
      <div className="flex flex-col w-full" style={{ maxWidth: 1072, gap: 56 }}>
        {/* Header */}
        <div className="flex flex-col items-center gap-5 text-center" style={{ maxWidth: 800, alignSelf: "center" }}>
          <span className="font-semibold tracking-widest uppercase" style={{ fontSize: 15, color: "var(--neutral-10)" }}>
            blog
          </span>
          <h2 className="font-semibold leading-[120%] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4.5vw, 52px)", color: "var(--neutral-30)" }}>
            Ideas to level-up your freelance game
          </h2>
        </div>

        {/* Cards */}
        <div className="flex flex-col" style={{ gap: 24 }}>
          {/* Featured wide card — WideDesktop variant: height=480px, horizontal, bg rgba(255,255,255,0.7) */}
          <Link
            href={featuredPost.href}
            className="flex flex-col sm:flex-row overflow-hidden transition-opacity hover:opacity-95"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              borderRadius: 16,
              height: "auto",
              minHeight: 320,
            }}
          >
            {/* Image area */}
            <div
              className="shrink-0 sm:w-[45%]"
              style={{
                background: BG_GRADIENTS[featuredPost.badge],
                minHeight: 240,
              }}
            />
            {/* Text */}
            <div className="flex flex-col justify-between p-8" style={{ flex: 1, gap: 24 }}>
              <div className="flex flex-col gap-4">
                <Badge label={featuredPost.badge} />
                <h3
                  className="font-semibold leading-[140%] tracking-[-0.03em]"
                  style={{ fontSize: "clamp(20px, 2.2vw, 32px)", color: "var(--neutral-30)" }}
                >
                  {featuredPost.title}
                </h3>
                <p className="leading-[150%]" style={{ fontSize: 16, color: "var(--neutral-20)" }}>
                  {featuredPost.excerpt}
                </p>
              </div>
              <AuthorRow author={featuredPost.author} role={featuredPost.role} />
            </div>
          </Link>

          {/* 3 small cards row — Small variant: image 266px, radius=16px */}
          <div className="flex flex-wrap" style={{ gap: 24 }}>
            {smallPosts.map((post) => (
              <Link
                key={post.title}
                href={post.href}
                className="flex flex-col overflow-hidden transition-opacity hover:opacity-95"
                style={{ flex: "1 1 280px", borderRadius: 16 }}
              >
                {/* Image placeholder */}
                <div
                  style={{
                    height: 266,
                    borderRadius: 16,
                    background: BG_GRADIENTS[post.badge],
                  }}
                />
                {/* Content */}
                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4
                      className="font-semibold leading-[140%] tracking-[-0.03em]"
                      style={{ fontSize: 20, color: "var(--neutral-30)" }}
                    >
                      {post.title}
                    </h4>
                    <Badge label={post.badge} />
                  </div>
                  <AuthorRow author={post.author} role={post.role} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
