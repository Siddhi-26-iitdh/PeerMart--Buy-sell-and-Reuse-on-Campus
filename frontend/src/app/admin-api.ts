import type { AccountRequestItem } from "./auth-api";

export interface AdminUser {
  user_id: number;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  account_status: string;
  created_at: string;
}

export interface AdminCategory {
  category_id: number;
  category_name: string;
}

export interface AdminOverview {
  total_users: number;
  active_users: number;
  pending_registrations: number;
  pending_deactivations: number;
  total_listings: number;
  available_listings: number;
  reserved_listings: number;
  sold_listings: number;
  total_offers: number;
  total_sales: number;
  open_contact_messages: number;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

async function fetchAdminData<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.error?.message ??
        data?.detail?.message ??
        (typeof data?.detail === "string" ? data.detail : null) ??
        `Admin API request failed: HTTP ${response.status}`,
    );
  }

  return data as T;
}

export function getAdminOverview(): Promise<AdminOverview> {
  return fetchAdminData<AdminOverview>("/api/admin/overview");
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await fetchAdminData<PaginatedResponse<AdminUser>>(
    "/api/users?page=1&size=100",
  );
  return data.items;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const data = await fetchAdminData<PaginatedResponse<AdminCategory>>(
    "/api/categories?page=1&size=50",
  );
  return data.items;
}

export function createAdminCategory(categoryName: string): Promise<AdminCategory> {
  return fetchAdminData<AdminCategory>("/api/categories", {
    method: "POST",
    body: JSON.stringify({ category_name: categoryName }),
  });
}

export function updateAdminCategory(
  categoryId: number,
  categoryName: string,
): Promise<AdminCategory> {
  return fetchAdminData<AdminCategory>(`/api/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify({ category_name: categoryName }),
  });
}

export async function deleteAdminCategory(categoryId: number): Promise<void> {
  await fetchAdminData(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export interface AdminActivityItem {
  listing_id: number;
  title: string;
  price: number;
  status: string;
}

export interface AdminActivityOffer {
  offer_id: number;
  listing_id: number;
  title: string;
  offered_price: number;
  status: string;
}

export interface AdminActivitySale {
  sale_id: number;
  listing_id: number;
  title: string;
  final_price: number;
  sold_at: string;
}

export interface AdminUserActivity {
  user: {
    user_id: number;
    name: string;
    email: string;
    phone_no: string | null;
    role: string;
    account_status: string;
  };
  listings: AdminActivityItem[];
  seller_negotiations: AdminActivityOffer[];
  buyer_negotiations: AdminActivityOffer[];
  completed_purchases: AdminActivitySale[];
  sold_items: AdminActivitySale[];
}

export async function getAdminUserActivity(
  userId: number,
): Promise<AdminUserActivity> {
  return fetchAdminData<AdminUserActivity>(
    `/api/admin/users/${userId}/activity`,
  );
}

export async function updateAdminUserStatus(
  userId: number,
  accountStatus: "active" | "inactive",
): Promise<AdminUser> {
  return fetchAdminData<AdminUser>(`/api/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ account_status: accountStatus }),
  });
}

export async function updateAdminListingStatus(
  listingId: number,
  status: "available" | "archived" | "removed",
): Promise<void> {
  await fetchAdminData(`/api/admin/listings/${listingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getAdminRegistrations(): Promise<AccountRequestItem[]> {
  const res = await fetchAdminData<{ items: AccountRequestItem[]; total: number }>(
    "/api/admin/registrations",
  );
  return res.items;
}

export function decideAdminRegistration(
  userId: number,
  action: "approve" | "reject",
  adminComment?: string,
): Promise<AccountRequestItem> {
  return fetchAdminData<AccountRequestItem>(`/api/admin/registrations/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ action, admin_comment: adminComment || null }),
  });
}

export async function getAdminDeactivationRequests(): Promise<AccountRequestItem[]> {
  const res = await fetchAdminData<{ items: AccountRequestItem[]; total: number }>(
    "/api/admin/deactivation-requests",
  );
  return res.items;
}

export function decideAdminDeactivationRequest(
  requestId: number,
  action: "approve" | "reject",
  adminComment?: string,
): Promise<AccountRequestItem> {
  return fetchAdminData<AccountRequestItem>(
    `/api/admin/deactivation-requests/${requestId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action, admin_comment: adminComment || null }),
    },
  );
}
