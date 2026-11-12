export interface AISearchFilters {
  category: string | null;
  keywords: string[];
  min_price: string | number | null;
  max_price: string | number | null;
  condition: "new" | "used" | null;
}

export interface AISearchListingItem {
  listing_id: number;
  seller_id: number;
  category_id: number;
  title: string;
  description: string;
  price: string;
  item_condition: string;
  brand: string | null;
  color: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AISearchResponse {
  query: string;
  interpreted_filters: AISearchFilters;
  fallback_used: boolean;
  fallback_reason: string | null;
  total: number;
  items: AISearchListingItem[];
}

export async function runAiSearch(query: string): Promise<AISearchResponse> {
  const response = await fetch("/api/ai-search", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detailMessage =
      data?.error?.message ??
      data?.detail?.message ??
      data?.detail ??
      `AI search failed (HTTP ${response.status})`;
    throw new Error(String(detailMessage));
  }

  return data as AISearchResponse;
}
