import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход и регистрация — Aimaq",
  description: "Войдите в Aimaq или создайте аккаунт, чтобы сохранять сценарии подбора локаций.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
