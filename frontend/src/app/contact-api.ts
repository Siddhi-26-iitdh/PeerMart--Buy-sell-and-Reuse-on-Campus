export interface ContactMessage {
  message_id: number;
  user_id: number;
  sender_name: string;
  sender_email: string;
  listing_id: number | null;
  listing_title: string | null;
  subject: string;
  message: string;
  status: "open" | "reviewed" | "resolved" | string;
  created_at: string;
}

export interface ContactMessageListResponse {
  items: ContactMessage[];
  total: number;
  page: number;
  size: number;
}

async function contactRequest<T>(
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
    const msg =
      data?.error?.message ??
      data?.detail?.message ??
      data?.detail ??
      `Request failed (HTTP ${response.status})`;
    throw new Error(String(msg));
  }

  return data as T;
}

export function submitContactMessage(payload: {
  subject: string;
  message: string;
  listing_id?: number | null;
}): Promise<ContactMessage> {
  return contactRequest<ContactMessage>("/api/contact-messages", {
    method: "POST",
    body: JSON.stringify({
      subject: payload.subject,
      message: payload.message,
      listing_id: payload.listing_id ?? null,
    }),
  });
}

export function getMyContactMessages(): Promise<ContactMessageListResponse> {
  return contactRequest<ContactMessageListResponse>("/api/contact-messages/me");
}

export function getAdminContactMessages(): Promise<ContactMessageListResponse> {
  return contactRequest<ContactMessageListResponse>(
    "/api/admin/contact-messages?page=1&size=100",
  );
}

export function updateContactMessageStatus(
  messageId: number,
  status: "open" | "reviewed" | "resolved",
): Promise<ContactMessage> {
  return contactRequest<ContactMessage>(
    `/api/admin/contact-messages/${messageId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}
