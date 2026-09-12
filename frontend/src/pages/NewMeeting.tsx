import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function NewMeeting() {
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !transcript.trim()) {
      setError("Please provide both a title and a transcript.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const meeting = await api.createMeeting(title, transcript);
      await api.summarizeMeeting(meeting.id);
      navigate(`/meetings/${meeting.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>New Meeting</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Engineering Sync"
          />
        </label>

        <label>
          Transcript
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the raw meeting transcript here..."
            rows={14}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Summarizing..." : "Create & Summarize"}
        </button>
      </form>
    </div>
  );
}
