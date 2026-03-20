import type {
  SearchRequest,
  SearchResponse,
  PollResponse,
  ContactResponse,
  SaveBusinessResponse,
  SavedBusinessesResponse,
  SavedBusinessDetailResponse,
} from "@/types";
import { getAccessToken } from "@/lib/supabase/token";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function postSearch(body: SearchRequest): Promise<SearchResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<SearchResponse>;
}

export async function pollSearch(sessionId: string): Promise<PollResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/search/${sessionId}`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<PollResponse>;
}

export async function postContact(
  sessionId: string,
  listingId: string
): Promise<ContactResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/api/v1/search/${sessionId}/contact`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ listing_id: listingId }),
    }
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<ContactResponse>;
}

export async function saveBusiness(
  sessionId: string,
  businessName?: string
): Promise<SaveBusinessResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/businesses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ session_id: sessionId, business_name: businessName }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<SaveBusinessResponse>;
}

export async function fetchSavedBusinesses(): Promise<SavedBusinessesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/businesses`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SavedBusinessesResponse>;
}

export async function fetchSavedBusiness(businessId: string): Promise<SavedBusinessDetailResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/businesses/${businessId}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<SavedBusinessDetailResponse>;
}

export async function deleteSavedBusiness(businessId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/v1/businesses/${businessId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export type HeatmapLayer = "transit" | "footfall" | "competitors";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface HeatmapResponse {
  layer: string;
  count: number;
  points: HeatmapPoint[];
}

export async function fetchHeatmap(
  layer: HeatmapLayer,
  businessType?: string,
): Promise<HeatmapResponse> {
  const params = new URLSearchParams({ layer });
  if (businessType) params.set("business_type", businessType);
  const res = await fetch(`${BASE_URL}/api/v1/heatmap?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<HeatmapResponse>;
}
