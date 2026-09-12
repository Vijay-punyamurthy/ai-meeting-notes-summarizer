import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Meeting } from "../types";

export function MeetingList() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMeetings()
      .then(setMeetings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page">Loading meetings...</p>;
  if (error) return <p className="page error">{error}</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Meetings</h1>
        <Link to="/new" className="button-link">
          + New Meeting
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p>No meetings yet. Create one to get started.</p>
      ) : (
        <table className="meeting-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={`/meetings/${m.id}`}>{m.title}</Link>
                </td>
                <td>
                  <span className={`status-badge status-${m.status}`}>
                    {m.status}
                  </span>
                </td>
                <td>{new Date(m.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
