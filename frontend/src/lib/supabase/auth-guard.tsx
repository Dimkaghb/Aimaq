"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "100dvh" }}
      >
        <div
          className="rounded-full border-2 border-t-transparent animate-spin"
          style={{
            width: 32,
            height: 32,
            borderColor: "var(--neutral-10)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
