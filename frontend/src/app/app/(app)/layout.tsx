"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { landingFont } from "@/modules/landing/fonts";
import styles from "@/modules/search/search.module.css";
import { AuthGuard } from "@/lib/supabase/auth-guard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: 2,
          },
        },
      })
  );

  return (
    <AuthGuard>
      <QueryClientProvider client={queryClient}><div className={`${landingFont.variable} ${styles.theme}`}>{children}</div></QueryClientProvider>
    </AuthGuard>
  );
}
