import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { MeetingDetail as MeetingDetailType, ActionItem } from "../types";

export function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getMeeting(Number(id))
      .then(setMeeting)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleStatus(item: ActionItem) {
    const newStatus = item.status === "open" ? "done" : "open";
    const updated = await api.updateActionItem(item.id, { status: newStatus });
    setMeeting((prev) =>
      prev
        ? {
            ...prev,
            action_items: prev.action_items.map((ai) =>
              ai.id === item.id ? updated : ai
            ),
          }
        : prev
    );
  }

  function exportAsMarkdown() {
    if (!meeting) return;
    const lines = [
      `# ${meeting.title}`,
      "",
      "## Summary",
      meeting.summary || "(no summary)",
      "",
      "## Action Items",
      ...meeting.action_items.map(
        (ai) =>
          `- [${ai.status === "done" ? "x" : " "}] ${ai.task}${
            ai.owner ? ` (Owner: ${ai.owner})` : ""
          }${ai.due_date ? ` (Due: ${ai.due_date})` : ""}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="page">Loading...</p>;
  if (error) return <p className="page error">{error}</p>;
  if (!meeting) return <p className="page">Meeting not found.</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{meeting.title}</h1>
        <button onClick={exportAsMarkdown}>Export as Markdown</button>
      </div>

      <span className={`status-badge status-${meeting.status}`}>
        {meeting.status}
      </span>

      <section>
        <h2>Summary</h2>
        <p>{meeting.summary || "No summary yet."}</p>
      </section>

      <section>
        <h2>Action Items</h2>
        {meeting.action_items.length === 0 ? (
          <p>No action items.</p>
        ) : (
          <ul className="action-items">
            {meeting.action_items.map((item) => (
              <li key={item.id} className={item.status}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.status === "done"}
                    onChange={() => toggleStatus(item)}
                  />
                  <span className="task">{item.task}</span>
                </label>
                <span className="meta">
                  {item.owner && <>Owner: {item.owner} · </>}
                  {item.due_date && <>Due: {item.due_date}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
