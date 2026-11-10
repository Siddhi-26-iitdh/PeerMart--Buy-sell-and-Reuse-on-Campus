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
