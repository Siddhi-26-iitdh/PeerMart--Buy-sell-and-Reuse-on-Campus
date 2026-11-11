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

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

async function fetchAdminData<T>(
  path: string
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(
      `Admin API request failed: HTTP ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await fetchAdminData<
    PaginatedResponse<AdminUser>
  >("/api/users?page=1&size=100");

  if (data.items.length !== data.total) {
    throw new Error(
      "Admin user list is incomplete; pagination is required."
    );
  }

  return data.items;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const data = await fetchAdminData<
    PaginatedResponse<AdminCategory>
  >("/api/categories?page=1&size=50");

  if (data.items.length !== data.total) {
    throw new Error(
      "Admin category list is incomplete; pagination is required."
    );
  }

  return data.items;
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
  userId: number
): Promise<AdminUserActivity> {
  return fetchAdminData<AdminUserActivity>(
    `/api/admin/users/${userId}/activity`
  );
}

export async function updateAdminUserStatus(
  userId: number,
  accountStatus: "active" | "inactive"
): Promise<AdminUser> {
  const response = await fetch(`/api/users/${userId}/status`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_status: accountStatus }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function updateAdminListingStatus(
  listingId: number,
  status: "available" | "removed"
): Promise<void> {
  const response = await fetch(`/api/admin/listings/${listingId}/status`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || `HTTP ${response.status}`);
  }
}
