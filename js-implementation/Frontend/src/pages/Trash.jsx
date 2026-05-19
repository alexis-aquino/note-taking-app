import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useUser } from "../utils/useUser";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Trash() {
  const navigate = useNavigate();
  const user = useUser();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchTrash(); }, []);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/notes/trash");
      setNotes(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/");
      else setError("Failed to load trash.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (noteId) => {
    try {
      await api.put(`/api/notes/${noteId}`, { isTrash: false });
      setNotes(prev => prev.filter(n => n.noteId !== noteId));
    } catch {
      setError("Failed to restore note.");
    }
  };

  const handleDeleteForever = async (noteId) => {
    if (!window.confirm("Permanently delete this note? This cannot be undone.")) return;
    try {
      await api.delete(`/api/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.noteId !== noteId));
    } catch {
      setError("Failed to delete note.");
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Permanently delete all notes in trash? This cannot be undone.")) return;
    try {
      await api.delete("/api/notes/trash/empty");
      setNotes([]);
    } catch {
      setError("Failed to empty trash.");
    }
  };

  return (
    <div style={s.page}>
      <Sidebar counts={{}} />
      <div style={s.workspace}>
        <Header user={user} />
        <main style={s.main}>
          <div style={s.titleRow}>
            <h2 style={s.title}>🗑️ Trash</h2>
            {notes.length > 0 && (
              <button style={s.emptyBtn} onClick={handleEmptyTrash}>Empty Trash</button>
            )}
          </div>
          <p style={s.sub}>Notes here will be permanently deleted after 30 days.</p>

          {error && <p style={s.errorMsg}>{error}</p>}

          {loading ? (
            <p style={s.empty}>Loading…</p>
          ) : notes.length === 0 ? (
            <div style={s.empty}>Trash is empty.</div>
          ) : (
            <div style={s.grid}>
              {notes.map(note => (
                <div key={note.noteId} style={s.card}>
                  <div>
                    <h3 style={s.cardTitle}>{note.noteTitle || "Untitled Note"}</h3>
                    <p style={s.cardPreview}>{note.noteBody}</p>
                  </div>
                  <div style={s.cardFooter}>
                    <button style={s.restoreBtn} onClick={() => handleRestore(note.noteId)}>
                      ↩ Restore
                    </button>
                    <button style={s.deleteBtn} onClick={() => handleDeleteForever(note.noteId)}>
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", width: "100vw", backgroundColor: "#131517", fontFamily: "'Inter', sans-serif", overflow: "hidden" },
  workspace: { display: "flex", flexDirection: "column", flex: 1, marginLeft: "250px", height: "100vh" },
  main: { flex: 1, padding: "36px 40px", overflowY: "auto" },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" },
  title: { fontSize: "1.8rem", fontWeight: "700", color: "#fff", margin: 0 },
  emptyBtn: { padding: "8px 18px", backgroundColor: "transparent", border: "1px solid #f87171", color: "#f87171", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" },
  sub: { color: "#9ca3af", fontSize: "0.9rem", marginBottom: "28px" },
  empty: { color: "#6b7280", textAlign: "center", padding: "60px 0", fontSize: "0.9rem" },
  errorMsg: { color: "#f87171", marginBottom: "16px", fontSize: "0.88rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "18px" },
  card: {
    backgroundColor: "#1e2124", borderRadius: "12px", padding: "20px",
    border: "1px solid #2d3135", display: "flex", flexDirection: "column",
    justifyContent: "space-between", minHeight: "160px", opacity: 0.85
  },
  cardTitle: { fontSize: "1.05rem", fontWeight: "600", color: "#d1d5db", marginBottom: "8px" },
  cardPreview: {
    fontSize: "0.88rem", color: "#6b7280", lineHeight: "1.5",
    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden"
  },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" },
  restoreBtn: { background: "none", border: "none", color: "#38bdf8", fontWeight: "600", cursor: "pointer", fontSize: "0.82rem" },
  deleteBtn: { background: "none", border: "none", color: "#f87171", fontWeight: "600", cursor: "pointer", fontSize: "0.82rem" }
};
