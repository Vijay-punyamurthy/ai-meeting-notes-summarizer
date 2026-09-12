export interface Meeting {
  id: number;
  title: string;
  summary: string | null;
  status: "pending" | "summarized" | "failed";
  created_at: string;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  task: string;
  owner: string | null;
  due_date: string | null;
  status: "open" | "done";
}

export interface MeetingDetail extends Meeting {
  action_items: ActionItem[];
}
