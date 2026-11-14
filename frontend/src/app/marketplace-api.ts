export interface OfferDetail {
  offer_id: number;
  listing_id: number;
  buyer_id: number;
  offered_price: string | number;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "paid" | string;
  created_at: string;
  listing_title: string;
  listing_price: string | number;
  listing_status: string;
  listing_image: string | null;
  listing_category: string;
  listing_condition: string;
  seller_id: number;
  seller_name: string;
  seller_email: string;
  buyer_name: string;
  buyer_email: string;
  sale_id: number | null;
  receipt_number: string | null;
  receipt_url: string | null;
}

export interface SaleDetail {
  sale_id: number;
  offer_id: number;
  final_price: string | number;
  sold_at: string;
  listing_id: number;
  title: string;
  category: string;
  item_condition: string;
  image: string | null;
  listed_price: string | number;
  offered_price: string | number;
  seller_id: number;
  seller_name: string;
  seller_email: string;
  buyer_id: number;
  buyer_name: string;
  buyer_email: string;
  receipt_number: string;
  payment_reference: string;
  payment_method: string;
  payment_status: string;
  receipt_url: string;
}

export interface MockPaymentResult {
  payment_id: number;
  offer_id: number;
  sale_id: number | null;
  listing_id: number;
  listing_title: string;
  listed_price: string | number;
  amount: string | number;
  payment_status: "success" | "failed" | "cancelled" | string;
  payment_method: string;
  payment_reference: string;
  receipt_number: string | null;
  receipt_url: string | null;
  seller_name: string;
  seller_email: string;
  buyer_name: string;
  buyer_email: string;
  created_at: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ??
      data?.detail?.message ??
      (typeof data?.detail === "string" ? data.detail : null) ??
      `Request failed (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

// Cart APIs
export async function getCartListingIds(): Promise<number[]> {
  const data = await apiFetch<
    Paginated<{ cart_item_id: number; user_id: number; listing_id: number }>
  >("/api/cart-items?page=1&size=100");
  return data.items.map((item) => item.listing_id);
}

export async function addCartItemApi(listingId: number): Promise<void> {
  await apiFetch("/api/cart-items", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId }),
  });
}

export async function removeCartItemApi(listingId: number): Promise<void> {
  await apiFetch(`/api/cart-items/${listingId}`, {
    method: "DELETE",
  });
}

// Favourites APIs
export async function getFavouriteListingIds(): Promise<number[]> {
  const data = await apiFetch<
    Paginated<{ favourite_id: number; user_id: number; listing_id: number }>
  >("/api/favourites?page=1&size=100");
  return data.items.map((item) => item.listing_id);
}

export async function addFavouriteApi(listingId: number): Promise<void> {
  await apiFetch("/api/favourites", {
    method: "POST",
    body: JSON.stringify({ listing_id: listingId }),
  });
}

export async function removeFavouriteApi(listingId: number): Promise<void> {
  await apiFetch(`/api/favourites/${listingId}`, {
    method: "DELETE",
  });
}

// Listings CRUD & Image Upload APIs
export async function createListingApi(payload: {
  category_id: number;
  title: string;
  description: string;
  price: number;
  item_condition: "new" | "used";
  brand?: string | null;
  color?: string | null;
}): Promise<{ listing_id: number }> {
  return apiFetch<{ listing_id: number }>("/api/listings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateListingApi(
  listingId: number,
  payload: {
    category_id?: number;
    title?: string;
    description?: string;
    price?: number;
    item_condition?: "new" | "used";
    brand?: string | null;
    color?: string | null;
    status?: "available" | "reserved" | "sold" | "removed";
  },
): Promise<{ listing_id: number }> {
  return apiFetch<{ listing_id: number }>(`/api/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteListingApi(listingId: number): Promise<void> {
  await apiFetch(`/api/listings/${listingId}`, {
    method: "DELETE",
  });
}

export async function uploadListingImageFile(
  listingId: number,
  file: File,
  displayOrder?: number,
): Promise<{ image_id: number; listing_id: number; image_path: string; display_order: number }> {
  const form = new FormData();
  form.append("listing_id", String(listingId));
  if (displayOrder !== undefined) {
    form.append("display_order", String(displayOrder));
  }
  form.append("file", file);
  return apiFetch("/api/listing-images", {
    method: "POST",
    body: form,
  });
}

export async function updateListingImageOrderApi(
  imageId: number,
  displayOrder: number,
): Promise<void> {
  await apiFetch(`/api/listing-images/${imageId}`, {
    method: "PATCH",
    body: JSON.stringify({ display_order: displayOrder }),
  });
}

export async function deleteListingImageApi(imageId: number): Promise<void> {
  await apiFetch(`/api/listing-images/${imageId}`, {
    method: "DELETE",
  });
}

// Offers & Negotiation APIs
export async function createOfferApi(
  listingId: number,
  offeredPrice: number,
): Promise<OfferDetail> {
  return apiFetch<OfferDetail>("/api/offers", {
    method: "POST",
    body: JSON.stringify({
      listing_id: listingId,
      offered_price: offeredPrice,
    }),
  });
}

export async function getSentOffersApi(): Promise<OfferDetail[]> {
  const data = await apiFetch<Paginated<OfferDetail>>(
    "/api/offers/sent?page=1&size=100",
  );
  return data.items;
}

export async function getReceivedOffersApi(): Promise<OfferDetail[]> {
  const data = await apiFetch<Paginated<OfferDetail>>(
    "/api/offers/received?page=1&size=100",
  );
  return data.items;
}

export async function updateOfferStatusApi(
  offerId: number,
  status: "accepted" | "rejected" | "cancelled",
): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/offers/${offerId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Sales, Mock Payment & Receipt APIs
export async function getMyPurchasesApi(): Promise<SaleDetail[]> {
  const data = await apiFetch<Paginated<SaleDetail>>(
    "/api/sales/purchases?page=1&size=100",
  );
  return data.items;
}

export async function getMySoldItemsApi(): Promise<SaleDetail[]> {
  const data = await apiFetch<Paginated<SaleDetail>>(
    "/api/sales/sold?page=1&size=100",
  );
  return data.items;
}

export async function processMockPaymentApi(
  offerId: number,
  outcome: "success" | "failed" | "cancelled" = "success",
): Promise<MockPaymentResult> {
  return apiFetch<MockPaymentResult>("/api/payments/mock", {
    method: "POST",
    body: JSON.stringify({ offer_id: offerId, outcome }),
  });
}

export async function downloadSaleReceiptPdf(
  saleId: number,
  receiptNumber?: string | null,
): Promise<void> {
  const response = await fetch(`/api/sales/${saleId}/receipt`, {
    method: "GET",
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error?.message ??
        errData?.detail ??
        `Could not download receipt (HTTP ${response.status})`,
    );
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${receiptNumber || `PM-RCPT-${String(saleId).padStart(5, "0")}`}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
