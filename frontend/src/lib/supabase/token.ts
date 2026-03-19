import { createClient } from "./client";

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
