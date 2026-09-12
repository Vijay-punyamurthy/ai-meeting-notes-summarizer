export interface Meeting {
  id: number;
  title: string;
  summary: string | null;
  transcript_ref: string | null;
  agent_run_ref: string | null;
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
  created_at: string;
}

// Shape we force the LLM to return. Anything that doesn't match this
// after parsing is treated as a failed run, not silently accepted.
export interface AgentSummaryOutput {
  summary: string;
  action_items: Array<{
    task: string;
    owner: string | null;
    due_date: string | null; // ISO date (YYYY-MM-DD) or null
  }>;
}
