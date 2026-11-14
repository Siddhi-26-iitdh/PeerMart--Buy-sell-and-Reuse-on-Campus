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

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
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
  return authRequest<AuthUser>("login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  data: RegisterData,
): Promise<AuthUser> {
  return authRequest<AuthUser>("register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCurrentUser(): Promise<AuthUser> {
  return authRequest<AuthUser>("me");
}

export function logout(): Promise<{ message: string }> {
  return authRequest<{ message: string }>("logout", {
    method: "POST",
  });
}

export function updateProfile(data: {
  f_name: string;
  l_name: string;
  phone_no: string;
}): Promise<AuthUser> {
  return authRequest<AuthUser>("me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateAccount(): Promise<{ message: string }> {
  return authRequest<{ message: string }>("me", {
    method: "DELETE",
  });
}
