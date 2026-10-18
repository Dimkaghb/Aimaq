import Link from "next/link";
import { AuthForm } from "./components/AuthForm";

const CLOUD_LEFT =
  "https://framerusercontent.com/images/iR8Ma0AjH7EaIAPThF3xcp9l3bM.png";
const CLOUD_RIGHT =
  "https://framerusercontent.com/images/qazH0744I2w9AnpfmUJIze7g.png";

export function AuthPage() {
  return (
    <main className="relative w-full min-h-screen flex flex-col items-center overflow-hidden">
      <img
        src={CLOUD_LEFT}
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{ top: "8%", left: "-10%", width: "44%", maxWidth: 480, zIndex: 0, opacity: 0.85 }}
      />
      <img
        src={CLOUD_RIGHT}
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none"
        style={{ top: "22%", right: "-12%", width: "44%", maxWidth: 480, zIndex: 0, opacity: 0.85 }}
      />

      <div className="relative z-10 w-full max-w-[1072px] mx-auto flex flex-col px-6 pt-6 pb-16">
        <Link
          href="/"
          className="self-start inline-flex items-center gap-2 text-[15px] font-medium transition-opacity hover:opacity-80 -ml-1 px-1 py-1 rounded-lg hover:bg-black/5"
          style={{ color: "var(--neutral-20)" }}
        >
          <BackArrowIcon className="shrink-0" aria-hidden />
          На главную
        </Link>

        <div
          className="w-full flex flex-col items-center justify-center flex-1"
          style={{ minHeight: "min(72vh, 640px)", marginTop: 8 }}
        >
          <AuthForm />
        </div>
      </div>
    </main>
  );
}

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
