import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { LogosTicker } from "./components/LogosTicker";
import { AboutApp } from "./components/AboutApp";
import { Features } from "./components/Features";
import { Benefits } from "./components/Benefits";
import { Reviews } from "./components/Reviews";
import { Pricing } from "./components/Pricing";
import { Blog } from "./components/Blog";
import { Community } from "./components/Community";
import { CTABanner } from "./components/CTABanner";
import { Footer } from "./components/Footer";

/* Framer Content wrapper: gap=160px between sections, pb=160px
   Page background is a sky gradient applied to <html> in globals.css
   (background-attachment: fixed → each section reveals a slice of the sky)
   All section containers are transparent — they float on the sky gradient */
export function LandingPage() {
  return (
    <main className="relative w-full flex flex-col items-center">
      <Navbar />
      <Hero />

      {/* Content sections — gap 160px, 160px bottom padding */}
      <div
        className="w-full flex flex-col items-center"
        style={{ gap: "160px", paddingBottom: "160px" }}
      >
        <LogosTicker />
        <AboutApp />
        <Features />
        <Benefits />
        <Reviews />
        <Pricing />
        <Blog />
        <Community />
      </div>

      {/* CTA Banner — "Ready to get started" with cloud images */}
      <CTABanner />

      <Footer />
    </main>
  );
}
