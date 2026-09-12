import { Meeting, MeetingDetail, ActionItem } from "./types";

const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listMeetings: () => request<Meeting[]>("/meetings"),

  getMeeting: (id: number) => request<MeetingDetail>(`/meetings/${id}`),

  createMeeting: (title: string, transcript: string) =>
    request<Meeting>("/meetings", {
      method: "POST",
      body: JSON.stringify({ title, transcript }),
    }),

  summarizeMeeting: (id: number) =>
    request<{ summary: string; action_items: ActionItem[] }>(
      `/meetings/${id}/summarize`,
      { method: "POST" }
    ),

  updateActionItem: (id: number, patch: Partial<ActionItem>) =>
    request<ActionItem>(`/action-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteMeeting: (id: number) =>
    request<void>(`/meetings/${id}`, { method: "DELETE" }),
};
