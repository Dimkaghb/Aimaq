/* Framer source: nodeId jhh85N0W1 (Hero)
   height=1020px, minHeight=80vh, overflow=clip, padding=160px 0 0 0
   Content maxWidth=1072px, gap=64px | Top maxWidth=792px, gap=40px
   Texts gap=16px | Heading 1 (76px semibold -0.03em) | Body XL (20px regular centered)
   Buttons gap=8px horizontal | Primary + Tertiary variants
   DashboardImage height=700px, maxWidth=1072px, aspectRatio=1.531, radius=20px
   Cloud images from framerusercontent (same used in Banner component) */

import Image from "next/image";
import Link from "next/link";

/* Cloud PNGs from Framer (same assets used in Banner component) */
const CLOUD_LEFT  = "https://framerusercontent.com/images/iR8Ma0AjH7EaIAPThF3xcp9l3bM.png";
const CLOUD_RIGHT = "https://framerusercontent.com/images/qazH0744I2w9AnpfmUJIze7g.png";

export function Hero() {
  return (
    <section
      className="relative w-full overflow-hidden flex flex-col items-center"
      style={{ minHeight: "80vh", paddingTop: 160 }}
    >
      {/* Cloud images — absolute, bleed outside edges */}
      <img
        src={CLOUD_LEFT}
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          top: "18%",
          left: "-8%",
          width: "42%",
          maxWidth: 500,
          zIndex: 0,
          opacity: 0.9,
        }}
      />
      <img
        src={CLOUD_RIGHT}
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{
          top: "14%",
          right: "-8%",
          width: "42%",
          maxWidth: 500,
          zIndex: 0,
          opacity: 0.9,
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center w-full px-6"
        style={{ gap: 64, maxWidth: 1072 + 48 }}
      >
        {/* Top text + buttons — maxWidth=792px */}
        <div
          className="flex flex-col items-center w-full"
          style={{ maxWidth: 792, gap: 40 }}
        >
          {/* Texts — gap=16px */}
          <div className="flex flex-col items-center w-full" style={{ gap: 16 }}>
            {/* Heading 1: 76px semibold -0.03em tracking 120% leading */}
            <h1
              className="w-full text-center font-semibold leading-[120%] tracking-[-0.03em]"
              style={{
                fontSize: "clamp(40px, 6.5vw, 76px)",
                color: "var(--neutral-30)",
              }}
            >
              Run your freelance business like a pro
            </h1>
            {/* Body XL: 20px regular centered 150% leading */}
            <p
              className="text-center leading-[150%]"
              style={{
                fontSize: "clamp(16px, 2vw, 20px)",
                color: "var(--neutral-20)",
                maxWidth: 700,
              }}
            >
              All-in-one platform for managing clients, projects, and payments
              without the chaos. From first contract to final invoice,
              we&apos;ve got your back.
            </p>
          </div>

          {/* Buttons — gap=8px horizontal */}
          <div className="flex items-center flex-wrap justify-center" style={{ gap: 8 }}>
            {/* Primary: Neutral30 bg, white text, radius=100px, padding=18px 24px */}
            <Link
              href="/contact-us"
              className="inline-flex items-center font-semibold text-[16px] leading-[1.2] text-white transition-opacity hover:opacity-85"
              style={{
                padding: "18px 24px",
                borderRadius: "100px",
                backgroundColor: "var(--neutral-30)",
              }}
            >
              Try Dreelio free
            </Link>
            {/* Tertiary: transparent bg, no fill */}
            <Link
              href="/#features"
              className="inline-flex items-center font-semibold text-[16px] leading-[1.2] transition-colors hover:bg-black/5"
              style={{
                padding: "18px 24px",
                borderRadius: "100px",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "var(--neutral-30)",
              }}
            >
              See features
            </Link>
          </div>
        </div>

        {/* Dashboard image — height=700px aspectRatio=1.531 radius=20px */}
        <div
          className="relative w-full overflow-hidden shadow-2xl"
          style={{
            borderRadius: 20,
            aspectRatio: "1.531",
            maxWidth: 1072,
          }}
        >
          <Image
            src="https://framerusercontent.com/images/JeI7uULY0av9DxD7q7NVLTuoNc.png"
            alt="Dreelio dashboard — manage clients, projects and payments"
            fill
            priority
            className="object-cover object-top"
            sizes="(max-width: 768px) 100vw, 1072px"
          />
        </div>
      </div>
    </section>
  );
}
