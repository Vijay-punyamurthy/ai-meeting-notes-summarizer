import { Routes, Route, Link } from "react-router-dom";
import { MeetingList } from "./pages/MeetingList";
import { NewMeeting } from "./pages/NewMeeting";
import { MeetingDetail } from "./pages/MeetingDetail";

export function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="brand">
          Meeting Notes Summarizer
        </Link>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<MeetingList />} />
          <Route path="/new" element={<NewMeeting />} />
          <Route path="/meetings/:id" element={<MeetingDetail />} />
        </Routes>
      </main>
    </div>
  );
}
