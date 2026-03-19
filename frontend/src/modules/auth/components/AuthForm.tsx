"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type Mode = "login" | "signup";

const EASE = [0.22, 1, 0.36, 1] as const;

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div
      className="relative z-10 w-full flex flex-col"
      style={{ maxWidth: 440, gap: 24 }}
    >
      <div
        className="flex flex-col w-full shadow-xl"
        style={{
          backgroundColor: "rgba(255,255,255,0.72)",
          borderRadius: 24,
          padding: 32,
          gap: 28,
        }}
      >
        <div className="flex flex-col text-center" style={{ gap: 8 }}>
          <span
            className="text-[13px] font-semibold tracking-[0.12em] uppercase"
            style={{ color: "var(--neutral-10)" }}
          >
            Aimaq
          </span>
          <h1
            className="font-semibold leading-[125%] tracking-[-0.02em]"
            style={{ fontSize: "clamp(20px, 2.4vw, 28px)", color: "var(--neutral-30)" }}
          >
            {mode === "login" ? "С возвращением" : "Создайте аккаунт"}
          </h1>
          <p className="leading-[150%]" style={{ fontSize: 15, color: "var(--neutral-20)" }}>
            {mode === "login"
              ? "Войдите, чтобы продолжить подбор локаций."
              : "Зарегистрируйтесь и сохраняйте сценарии подбора."}
          </p>
        </div>

        <div
          className="flex p-1 rounded-full w-full"
          style={{ backgroundColor: "rgba(26,22,21,0.07)" }}
          role="tablist"
          aria-label="Режим"
        >
          <TogglePill active={mode === "login"} onClick={() => setMode("login")}>
            Вход
          </TogglePill>
          <TogglePill active={mode === "signup"} onClick={() => setMode("signup")}>
            Регистрация
          </TogglePill>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
          >
            {mode === "login" ? <LoginFields /> : <SignupFields />}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center leading-[150%]" style={{ fontSize: 14, color: "var(--neutral-10)" }}>
        Продолжая, вы соглашаетесь с условиями сервиса и политикой конфиденциальности.
      </p>
    </div>
  );
}

function TogglePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 py-2.5 rounded-full text-[15px] font-semibold transition-colors duration-200"
      style={{
        backgroundColor: active ? "var(--neutral-30)" : "transparent",
        color: active ? "#fff" : "var(--neutral-20)",
      }}
    >
      {children}
    </button>
  );
}

function inputClassName() {
  return "w-full px-4 py-3.5 rounded-2xl text-[16px] leading-[150%] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--blue-30)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
}

function LoginFields() {
  return (
    <form
      className="flex flex-col"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Field label="Email" htmlFor="auth-email-login">
        <input
          id="auth-email-login"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClassName()}
          style={{
            color: "var(--neutral-30)",
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--stroke)",
            boxShadow: "0 0 0 0 transparent",
          }}
          placeholder="you@company.com"
        />
      </Field>
      <Field label="Пароль" htmlFor="auth-password-login">
        <input
          id="auth-password-login"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className={inputClassName()}
          style={{
            color: "var(--neutral-30)",
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--stroke)",
          }}
          placeholder="••••••••"
        />
      </Field>
      <button
        type="submit"
        className="w-full font-semibold text-[16px] text-white transition-opacity hover:opacity-85 mt-1"
        style={{ backgroundColor: "var(--neutral-30)", borderRadius: 100, padding: "18px 24px" }}
      >
        Войти
      </button>
    </form>
  );
}

function SignupFields() {
  return (
    <form
      className="flex flex-col"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <Field label="Имя" htmlFor="auth-name">
        <input
          id="auth-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className={inputClassName()}
          style={{
            color: "var(--neutral-30)",
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--stroke)",
          }}
          placeholder="Как к вам обращаться"
        />
      </Field>
      <Field label="Email" htmlFor="auth-email-signup">
        <input
          id="auth-email-signup"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClassName()}
          style={{
            color: "var(--neutral-30)",
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--stroke)",
          }}
          placeholder="you@company.com"
        />
      </Field>
      <Field label="Пароль" htmlFor="auth-password-signup">
        <input
          id="auth-password-signup"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName()}
          style={{
            color: "var(--neutral-30)",
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--stroke)",
          }}
          placeholder="Не менее 8 символов"
        />
      </Field>
      <Field label="Повторите пароль" htmlFor="auth-password-confirm">
        <input
          id="auth-password-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName()}
          style={{
            color: "var(--neutral-30)",
            backgroundColor: "rgba(255,255,255,0.85)",
            border: "1px solid var(--stroke)",
          }}
          placeholder="••••••••"
        />
      </Field>
      <button
        type="submit"
        className="w-full font-semibold text-[16px] text-white transition-opacity hover:opacity-85 mt-1"
        style={{ backgroundColor: "var(--neutral-30)", borderRadius: 100, padding: "18px 24px" }}
      >
        Зарегистрироваться
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full" style={{ gap: 8 }}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-semibold leading-[140%]"
        style={{ color: "var(--neutral-30)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
