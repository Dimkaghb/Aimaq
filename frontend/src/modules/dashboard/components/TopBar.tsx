"use client";

import type { UserProfile } from "@/types/dashboard";

interface TopBarProps {
  user: UserProfile | undefined;
  isLoading: boolean;
}

export function TopBar({ user, isLoading }: TopBarProps) {
  return (
    <div
      className="flex-shrink-0"
      style={{ height: 48 }}
    />
  );
}
