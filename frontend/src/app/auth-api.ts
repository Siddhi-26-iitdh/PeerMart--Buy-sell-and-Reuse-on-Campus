export type AuthUser = {
  user_id: number;
  f_name: string;
  l_name: string;
  email: string;
  gender: string | null;
  phone_no: string | null;
  role: string;
  account_status: string;
  created_at: string;
  terms_accepted_at: string | null;
};

export type RegisterData = {
  f_name: string;
  l_name: string;
  email: string;
  password: string;
  gender?: string | null;
  phone_no?: string | null;
  terms_accepted: boolean;
};

export type AccountRequestItem = {
  request_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_status: string;
  request_type: "registration" | "deactivation" | string;
  status: "pending" | "approved" | "rejected" | string;
  reason: string | null;
  admin_comment: string | null;
  reviewed_by: number | null;
  created_at: string;
  reviewed_at: string | null;
  blocking_reasons: string[];
};

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
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
        data?.detail ??
        "Authentication request failed",
    );
  }

  return data as T;
}

export function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  return authRequest<AuthUser>("auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  data: RegisterData,
): Promise<AuthUser> {
  return authRequest<AuthUser>("auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser(): Promise<AuthUser> {
  return authRequest<AuthUser>("auth/me");
}

export function logout(): Promise<{ message: string }> {
  return authRequest<{ message: string }>("auth/logout", {
    method: "POST",
  });
}

export function updateProfile(data: {
  f_name: string;
  l_name: string;
  phone_no: string;
}): Promise<AuthUser> {
  return authRequest<AuthUser>("auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function submitDeactivationRequest(
  reason?: string | null,
): Promise<AccountRequestItem> {
  return authRequest<AccountRequestItem>("account/deactivation-request", {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
  });
}

export async function getMyDeactivationRequests(): Promise<AccountRequestItem[]> {
  const data = await authRequest<{ items: AccountRequestItem[]; total: number }>(
    "account/deactivation-request/me",
  );
  return data.items;
}
