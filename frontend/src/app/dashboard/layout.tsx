"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthGuard } from "@/lib/supabase/auth-guard";
import { landingFont } from "@/modules/landing/fonts";
import styles from "@/modules/dashboard/dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      })
  );

  return (
    <div className={`${styles.theme} ${landingFont.variable}`} lang="ru">
      <AuthGuard>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthGuard>
    </div>
  );
}
