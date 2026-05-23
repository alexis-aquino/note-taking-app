import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useUser } from "../utils/useUser";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Tags() {
  const navigate = useNavigate();
  const user = useUser();
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagNotes, setTagNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);

  useEffect(() => {
    fetchTags();
    fetchAllNotes();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/tags");
      setTags(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/");
      else setError("Failed to load tags.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllNotes = async () => {
    try {
      const res = await api.get("/api/notes/");
      setAllNotes(res.data);
    } catch {
      // non-critical
    }
  };

  const handleSelectTag = async (tag) => {
    setSelectedTag(tag);
    setNotesLoading(true);
    try {
      const res = await api.get(`/api/tags/${tag.tagId}/notes`);
      setTagNotes(res.data);
    } catch {
      setError("Failed to load notes for this tag.");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      await api.post("/api/tags", { tagName: name });
      setNewTagName("");
      setShowAddTag(false);
      fetchTags();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create tag.");
    }
  };

  const handleDeleteTag = async (e, tagId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this tag? It will be removed from all notes.")) return;
    try {
      await api.delete(`/api/tags/${tagId}`);
      if (selectedTag?.tagId === tagId) { setSelectedTag(null); setTagNotes([]); }
      fetchTags();
    } catch {
      setError("Failed to delete tag.");
    }
  };

  const displayedNotes = selectedTag ? tagNotes : allNotes;

  return (
    <div style={s.page}>
      <Sidebar counts={{}} />
      <div style={s.workspace}>
        <Header user={user} />
        <div style={s.body}>

          {/* Left: Tags panel */}
          <section style={s.tagsPanel}>
            <div style={s.panelHeader}>
              <h2 style={s.panelTitle}>Manage Tags</h2>
              <button style={s.addBtn} onClick={() => setShowAddTag(!showAddTag)} title="Add tag">＋</button>
            </div>

            {showAddTag && (
              <div style={s.addTagRow}>
                <input
                  style={s.addTagInput}
                  placeholder="Tag name…"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  autoFocus
                />
                <button style={s.addTagConfirm} onClick={handleAddTag}>Add</button>
              </div>
            )}

            {error && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: "8px 0" }}>{error}</p>}

            <div style={s.tagList}>
              <div
                style={selectedTag === null ? s.tagRowActive : s.tagRow}
                onClick={() => { setSelectedTag(null); setTagNotes([]); }}
              >
                <div style={s.tagInfo}>
                  <span style={s.hash}>#</span>
                  <span style={s.tagName}>All Notes</span>
                </div>
                <span style={s.tagBadge}>{allNotes.length}</span>
              </div>

              {loading ? (
                <p style={{ color: "#6b7280", fontSize: "0.85rem", padding: "10px 0" }}>Loading…</p>
              ) : (
                tags.map(tag => (
                  <div
                    key={tag.tagId}
                    style={selectedTag?.tagId === tag.tagId ? s.tagRowActive : s.tagRow}
                    onClick={() => handleSelectTag(tag)}
                  >
                    <div style={s.tagInfo}>
                      <span style={s.hash}>#</span>
                      <span style={s.tagName}>{tag.tagName}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={s.tagBadge}>{tag.noteCount}</span>
                      <button
                        style={s.deleteTagBtn}
                        onClick={(e) => handleDeleteTag(e, tag.tagId)}
                        title="Delete tag"
                      >×</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Right: Notes grid */}
          <main style={s.grid}>
            {notesLoading ? (
              <p style={s.empty}>Loading…</p>
            ) : displayedNotes.length === 0 ? (
              <p style={s.empty}>{selectedTag ? "No notes with this tag." : "No notes yet."}</p>
            ) : (
              <div style={s.cardGrid}>
                {displayedNotes.map(note => (
                  <div key={note.noteId} style={s.card} onClick={() => navigate("/Home", { state: { noteId: note.noteId } })}>
                    <h3 style={s.cardTitle}>{note.noteTitle || "Untitled Note"}</h3>
                    <p style={s.cardPreview}>{note.noteBody?.replace(/<[^>]*>/g, "") || ""}</p>
                    <div style={s.cardFooter}>
                      <span>{note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ""}</span>
                      <span style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "600" }}>Open →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", width: "100vw", backgroundColor: "#131517", fontFamily: "'Inter', sans-serif", overflow: "hidden" },
  workspace: { display: "flex", flexDirection: "column", flex: 1, marginLeft: "250px", height: "100vh" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  tagsPanel: { width: "280px", backgroundColor: "#1a1d20", borderRight: "1px solid #2d3135", padding: "28px 18px", display: "flex", flexDirection: "column", overflowY: "auto" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  panelTitle: { fontSize: "1.3rem", fontWeight: "700", color: "#fff", margin: 0 },
  addBtn: { backgroundColor: "#38bdf8", border: "none", borderRadius: "50%", width: "28px", height: "28px", color: "#131517", fontSize: "1.1rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  addTagRow: { display: "flex", gap: "8px", marginBottom: "14px" },
  addTagInput: { flex: 1, backgroundColor: "#2d3135", border: "1px solid #3e444a", borderRadius: "6px", padding: "7px 10px", color: "#fff", fontSize: "0.85rem", outline: "none" },
  addTagConfirm: { backgroundColor: "#38bdf8", border: "none", borderRadius: "6px", padding: "7px 12px", color: "#131517", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer" },
  tagList: { display: "flex", flexDirection: "column", gap: "8px" },
  tagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", backgroundColor: "#1e2124", borderRadius: "10px", cursor: "pointer", border: "1px solid #2d3135" },
  tagRowActive: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", backgroundColor: "#2d3135", borderRadius: "10px", cursor: "pointer", border: "1px solid #38bdf8" },
  tagInfo: { display: "flex", alignItems: "center", gap: "10px" },
  hash: { color: "#cdcdcd", fontWeight: "700" },
  tagName: { color: "#e2e8f0", fontWeight: "500", fontSize: "0.9rem" },
  tagBadge: { backgroundColor: "#2d3135", padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem", color: "#9ca3af", fontWeight: "600" },
  deleteTagBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem", padding: "0 2px", lineHeight: 1 },
  grid: { flex: 1, padding: "36px", overflowY: "auto", backgroundColor: "#131517" },
  empty: { color: "#6b7280", fontSize: "0.9rem" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "18px" },
  card: { backgroundColor: "#1e2124", padding: "20px", borderRadius: "12px", border: "1px solid #2d3135", display: "flex", flexDirection: "column", gap: "10px", minHeight: "150px", justifyContent: "space-between", cursor: "pointer" },
  cardTitle: { fontSize: "1rem", fontWeight: "600", color: "#fff", margin: 0 },
  cardPreview: { fontSize: "0.85rem", color: "#9ca3af", margin: 0, lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "#6b7280" }
};
