"use client";

import type { UserProfile } from "@/types/dashboard";

interface TopBarProps {
  user: UserProfile | undefined;
  isLoading: boolean;
}

export function TopBar({ user, isLoading }: TopBarProps) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-end"
      style={{ height: 56, padding: "0 28px" }}
    >
      {!isLoading && user && (
        <div className="flex items-center" style={{ gap: 10 }}>
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--neutral-20)" }}
          >
            {user.email}
          </span>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="rounded-full"
              style={{ width: 32, height: 32, objectFit: "cover" }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center font-semibold text-[13px] text-white"
              style={{
                width: 32,
                height: 32,
                backgroundColor: "var(--neutral-30)",
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
