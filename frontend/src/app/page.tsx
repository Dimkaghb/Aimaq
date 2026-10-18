import type { Metadata } from "next";
import { LandingPage } from "@/modules/landing/LandingPage";

export const metadata: Metadata = {
  title: "Aimaq — хорошее место для вашего бизнеса",
  description:
    "Найдите подходящую локацию для бизнеса в Таразе. Aimaq сравнит помещения, трафик, конкурентов и транспорт и объяснит выбор.",
};

export default function Home() {
  return <LandingPage />;
}
