import localFont from "next/font/local";

// User-supplied trial fonts for the local design preview.
// Replace with licensed webfonts before commercial publication.
export const landingFont = localFont({
  src: [
    { path: "./fonts/Haffer-TRIAL-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Haffer-TRIAL-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Haffer-TRIAL-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-landing-haffer",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
