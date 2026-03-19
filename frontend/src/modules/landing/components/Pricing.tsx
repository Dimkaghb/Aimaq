"use client";

/* Framer source: nodeId g7Iswtddg (Pricing)
   Container: maxWidth=1072px, gap=56px
   Tabs: width=298px, height=48px, Beige10 bg, radius=100px, padding=4px
   PricingCard Default: rgba(255,255,255,0.7), radius=24px, padding=32px, gap=32px
   PricingCard Highlighted: + border 5px solid Blue30 (rgb(132,185,239))
   Feature list: 24px icon + Body Large text, gap=12px horizontal, gap=16px between rows
   Below cards: LogosTicker repeat */

import Link from "next/link";
import { useState } from "react";
import { LogosTicker } from "./LogosTicker";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ width: 20, height: 20, color: "var(--accent-green)" }}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

type BillingCycle = "annual" | "monthly";

const plans = [
  {
    name: "Dreelio Basic",
    priceAnnual: "Free",
    priceMonthly: "Free",
    description: "For solo use with light needs.",
    features: ["Unlimited projects", "Unlimited clients", "Time tracking", "CRM", "iOS & Android app"],
    cta: "Try Dreelio free",
    ctaHref: "/contact-us",
    highlighted: false,
  },
  {
    name: "Dreelio Premium",
    priceAnnual: "$189/yr",
    priceMonthly: "$19/mo",
    saveBadge: "Save 20%",
    description: "For pro use with light needs.",
    features: ["Everything in Basic", "Invoices & payments", "Expense tracking", "Income tracking", "Scheduling"],
    cta: "Try Dreelio free",
    ctaHref: "/contact-us",
    highlighted: true,
  },
  {
    name: "Dreelio Enterprise",
    priceAnnual: "Flexible",
    priceMonthly: "Flexible",
    description: "For team use with light needs.",
    features: ["Everything in Premium", "Custom data import", "Advanced onboarding", "HubSpot integration", "Timesheets"],
    cta: "Contact sales",
    ctaHref: "/contact-us",
    highlighted: false,
  },
];

function PricingCard({
  plan,
  billing,
}: {
  plan: (typeof plans)[number];
  billing: BillingCycle;
}) {
  const price = billing === "annual" ? plan.priceAnnual : plan.priceMonthly;

  return (
    <div
      className="flex flex-col justify-between"
      style={{
        flex: "1 1 0",
        backgroundColor: "rgba(255, 255, 255, 0.7)",
        borderRadius: 24,
        padding: 32,
        gap: 32,
        ...(plan.highlighted
          ? { border: "5px solid rgb(132, 185, 239)", boxSizing: "border-box" }
          : {}),
      }}
    >
      {/* Top */}
      <div className="flex flex-col" style={{ gap: 24 }}>
        {/* Plan name + save badge */}
        <div className="flex flex-col" style={{ gap: 4 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-medium"
              style={{ fontSize: 16, color: "var(--neutral-30)" }}
            >
              {plan.name}
            </span>
            {plan.saveBadge && (
              <span
                className="font-medium text-[12px] px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "rgb(234, 243, 237)",
                  color: "rgb(14, 161, 88)",
                }}
              >
                {plan.saveBadge}
              </span>
            )}
          </div>
          {/* Price */}
          <span
            className="font-semibold leading-[120%] tracking-[-0.03em]"
            style={{ fontSize: "clamp(28px, 3vw, 40px)", color: "var(--neutral-30)" }}
          >
            {price}
          </span>
        </div>

        {/* Description + features */}
        <div className="flex flex-col" style={{ gap: 20 }}>
          <p style={{ fontSize: 18, color: "var(--neutral-20)", lineHeight: "150%" }}>
            {plan.description}
          </p>
          <div className="flex flex-col" style={{ gap: 16 }}>
            {plan.features.map((f) => (
              <div key={f} className="flex items-center" style={{ gap: 12 }}>
                <CheckIcon />
                <span style={{ fontSize: 18, color: "var(--neutral-20)", lineHeight: "150%" }}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className="w-full flex items-center justify-center font-semibold text-[16px] leading-[1.2] rounded-full transition-opacity duration-150 hover:opacity-85"
        style={{
          padding: "18px 24px",
          backgroundColor: plan.highlighted ? "var(--neutral-30)" : "var(--beige-10)",
          color: plan.highlighted ? "#fff" : "var(--neutral-30)",
        }}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export function Pricing() {
  const [billing, setBilling] = useState<BillingCycle>("annual");

  return (
    <section className="w-full flex flex-col items-center px-6 py-0" id="pricing">
      <div className="flex flex-col w-full" style={{ maxWidth: 1072, gap: 56 }}>
        {/* Header */}
        <div className="flex flex-col items-center gap-5 text-center" style={{ maxWidth: 800, alignSelf: "center" }}>
          <span className="font-semibold tracking-widest uppercase" style={{ fontSize: 15, color: "var(--neutral-10)" }}>
            pricing
          </span>
          <h2 className="font-semibold leading-[120%] tracking-[-0.03em]" style={{ fontSize: "clamp(32px, 4.5vw, 52px)", color: "var(--neutral-30)" }}>
            Simple plans for serious work
          </h2>
        </div>

        {/* Billing toggle — Tabs: Beige10 bg, radius=100px, padding=4px */}
        <div className="flex justify-center">
          <div
            className="flex items-center p-1"
            style={{
              width: 298,
              height: 48,
              backgroundColor: "var(--beige-10)",
              borderRadius: "100px",
              gap: 0,
            }}
          >
            {(["annual", "monthly"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className="flex-1 font-semibold text-[15px] transition-colors duration-200"
                style={{
                  height: 40,
                  borderRadius: "100px",
                  backgroundColor: billing === cycle ? "var(--beige-0)" : "transparent",
                  color: billing === cycle ? "var(--neutral-30)" : "var(--neutral-10)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {cycle === "annual" ? "Annually" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        {/* Cards — stackAlignment="end" (bottom-aligned for highlighted card) */}
        <div className="flex flex-wrap items-end" style={{ gap: 24 }}>
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} billing={billing} />
          ))}
        </div>

        {/* LogosTicker repeat below pricing */}
        <LogosTicker />
      </div>
    </section>
  );
}
