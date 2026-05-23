import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../utils/api";
import { useUser } from "../utils/useUser";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import RichTextEditor from "../components/RichTextEditor";
import { TrashIcon, PinIcon, SaveIcon, NotesIcon} from "../../../../shared-resources/icons";



export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);           // all user tags
  const [activeNote, setActiveNote] = useState(null);
  const [activeNoteTags, setActiveNoteTags] = useState([]); // tags on the open note
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [draft, setDraft] = useState({ noteTitle: "", noteBody: "", categoryId: "", isPinned: false, tags: [] });
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [draftTagInput, setDraftTagInput] = useState("");
  const [counts, setCounts] = useState({ notes: 0 });
  const [tagMatchedIds, setTagMatchedIds] = useState(new Set());

  useEffect(() => {
    fetchNotes();
    fetchCategories();
    fetchAllTags();
    fetchCounts();
    if (location.state?.openNewNote) {
    setShowNewNoteModal(true);
    window.history.replaceState({}, "");
  }
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(false);
      const res = await api.get("/api/notes/");
      setNotes(res.data);
      // Keep active note in sync with fresh data; select first if none active
      setActiveNote(prev => {
        if (!prev) return res.data[0] ?? null;
        const refreshed = res.data.find(n => n.noteId === prev.noteId);
        return refreshed ?? res.data[0] ?? null;
      });
      setError("");
    } catch (err) {
      if (err.response?.status === 401) navigate("/");
      else setError("Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/api/categories");
      setCategories(res.data);
    } catch {
      // non-critical
    }
  };

  const fetchAllTags = async () => {
    try {
      const res = await api.get("/api/tags");
      setAllTags(res.data);
    } catch {
      // non-critical
    }
  };

  // When searchQuery changes, also query the backend for notes matching by tag/category name
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Reset to full notes list when search is cleared
      setTagMatchedIds(new Set());
      fetchNotes();
      return;
    }
    const q = searchQuery.toLowerCase();

    // Check if query matches any known tag name
    const matchedTag = allTags.find(t => t.tagName.toLowerCase().includes(q));

    if (!matchedTag) {
      setTagMatchedIds(new Set());
      return;
    }

    api.get(`/api/notes/search?tagId=${matchedTag.tagId}`)
      .then(res => {
        setTagMatchedIds(new Set(res.data.map(n => n.noteId)));
      })
      .catch(() => setTagMatchedIds(new Set()));
  }, [searchQuery, allTags]);

  // Load tags for the active note whenever it changes
  useEffect(() => {
    if (!activeNote?.noteId) { setActiveNoteTags([]); return; }
    api.get(`/api/tags/note/${activeNote.noteId}`)
      .then(res => setActiveNoteTags(res.data))
      .catch(() => setActiveNoteTags([]));
  }, [activeNote?.noteId]);

  const fetchCounts = async () => {
  };

  // Update counts.notes whenever notes changes
  useEffect(() => {
    setCounts(prev => ({ ...prev, notes: notes.length }));
  }, [notes]);


  const handleSaveNote = async () => {
    if (!activeNote) return;
    try {
      if (activeNote.noteId) {
        await api.put(`/api/notes/${activeNote.noteId}`, {
          noteTitle: activeNote.noteTitle,
          noteBody: activeNote.noteBody,
          categoryId: activeNote.categoryId || null,
          isPinned: activeNote.isPinned
        });
      } else {
        const res = await api.post("/api/notes/", {
          noteTitle: activeNote.noteTitle || "Untitled",
          noteBody: activeNote.noteBody || "",
          categoryId: activeNote.categoryId || null,
          isPinned: activeNote.isPinned || false
        });
        setActiveNote(prev => ({ ...prev, noteId: res.data.noteId }));
      }
      fetchNotes();
    } catch {
      setError("Failed to save note.");
    }
  };

  const handleDelete = async () => {
  if (!activeNote?.noteId) return;
  if (!window.confirm("Permanently delete this note? This cannot be undone.")) return;
  try {
    await api.delete(`/api/notes/${activeNote.noteId}`);
    setNotes(prev => prev.filter(n => n.noteId !== activeNote.noteId));
    setActiveNote(null);
  } catch {
    setError("Failed to delete note.");
  }
  };

  const handleTogglePinned = async () => {
    if (!activeNote?.noteId) return;
    const newVal = !activeNote.isPinned;
    try {
      await api.put(`/api/notes/${activeNote.noteId}`, { isPinned: newVal });
      setActiveNote(prev => ({ ...prev, isPinned: newVal }));
      setNotes(prev => {
      const updated = prev.map(n => n.noteId === activeNote.noteId ? { ...n, isPinned: newVal } : n);
      return [...updated].sort((a, b) => b.isPinned - a.isPinned);
    });
    } catch {
      setError("Failed to update note.");
    }
  };

  // --- Tag helpers for the editor metabar ---
  const handleAddTagToNote = async (tagId) => {
    if (!activeNote?.noteId) return;
    if (activeNoteTags.find(t => t.tagId === tagId)) return; // already assigned
    try {
      await api.post("/api/tags/assign", { tagId, noteId: activeNote.noteId });
      const tag = allTags.find(t => t.tagId === tagId);
      if (tag) setActiveNoteTags(prev => [...prev, tag]);
    } catch { /* ignore */ }
  };

  const handleRemoveTagFromNote = async (tagId) => {
    if (!activeNote?.noteId) return;
    try {
      await api.delete("/api/tags/assign", { data: { tagId, noteId: activeNote.noteId } });
      setActiveNoteTags(prev => prev.filter(t => t.tagId !== tagId));
    } catch { /* ignore */ }
  };

  const handleCreateAndAddTag = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      // Create or find existing tag
      let tagId;
      const existing = allTags.find(t => t.tagName.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        tagId = existing.tagId;
      } else {
        const res = await api.post("/api/tags", { tagName: trimmed });
        tagId = res.data.tagId;
        await fetchAllTags();
      }
      if (activeNote?.noteId) {
        await api.post("/api/tags/assign", { tagId, noteId: activeNote.noteId });
        setActiveNoteTags(prev => prev.find(t => t.tagId === tagId) ? prev : [...prev, { tagId, tagName: trimmed }]);
      }
    } catch { /* ignore */ }
  };

  // --- Tag helpers for the new-note draft ---
  const handleDraftAddTag = async () => {
    const name = draftTagInput.trim();
    if (!name || draft.tags.find(t => t.tagName.toLowerCase() === name.toLowerCase())) {
      setDraftTagInput("");
      return;
    }
    // Find or create tag in DB so we have a real tagId ready for after save
    try {
      let tagId;
      const existing = allTags.find(t => t.tagName.toLowerCase() === name.toLowerCase());
      if (existing) {
        tagId = existing.tagId;
      } else {
        const res = await api.post("/api/tags", { tagName: name });
        tagId = res.data.tagId;
        await fetchAllTags();
      }
      setDraft(prev => ({ ...prev, tags: [...prev.tags, { tagId, tagName: name }] }));
    } catch { /* ignore */ }
    setDraftTagInput("");
  };

  const handleDraftRemoveTag = (tagId) => {
    setDraft(prev => ({ ...prev, tags: prev.tags.filter(t => t.tagId !== tagId) }));
  };

  const handleNewNote = () => {
    setDraft({ noteTitle: "", noteBody: "", categoryId: "", isPinned: false, tags: [] });
    setShowCreateCat(false);
    setNewCatName("");
    setDraftTagInput("");
    setShowNewNoteModal(true);
  };

  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      const res = await api.post("/api/categories", { categoryName: name });
      await fetchCategories();
      setDraft(prev => ({ ...prev, categoryId: String(res.data.categoryId) }));
      setNewCatName("");
      setShowCreateCat(false);
    } catch (err) {
      // category might already exist — just refresh and close
      await fetchCategories();
      setNewCatName("");
      setShowCreateCat(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draft.noteTitle && !draft.noteBody) {
      setShowNewNoteModal(false);
      return;
    }
    try {
      const res = await api.post("/api/notes/", {
        noteTitle: draft.noteTitle || "Untitled",
        noteBody: draft.noteBody || "",
        categoryId: draft.categoryId || null,
        isPinned: draft.isPinned || false
      });
      const newNoteId = res.data.noteId;
      // Assign any draft tags to the new note
      await Promise.all(
        draft.tags.map(t => api.post("/api/tags/assign", { tagId: t.tagId, noteId: newNoteId }).catch(() => {}))
      );
      setShowNewNoteModal(false);
      const listRes = await api.get("/api/notes/");
      setNotes(listRes.data);
      const created = listRes.data.find(n => n.noteId === newNoteId);
      if (created) setActiveNote(created);
      fetchCounts();
    } catch {
      setError("Failed to create note.");
    }
  };

  // Client-side filter: match title, body, category name, or any assigned tag name
  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (note.noteTitle?.toLowerCase().includes(q)) return true;
    if (note.noteBody?.toLowerCase().includes(q)) return true;
    // Match category name (including "Uncategorized")
    if (note.categoryName?.toLowerCase().includes(q)) return true;
    // Match by tag (resolved via backend)
    if (tagMatchedIds.has(note.noteId)) return true;
    return false;
  });

  if (loading) {
    return (
      <div style={s.page}>
        <Sidebar onNewNote={handleNewNote} counts={counts} />
        <div style={{ ...s.workspace, justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "#00348dff" }}>Loading notes…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <Sidebar onNewNote={handleNewNote} counts={counts} />
      <div style={s.workspace}>
        <Header
          user={user}
          categories={categories}
          allTags={allTags}
          onSelectNote={(note) => {
            // Find the full note from local state (has all fields); fall back to the
            // search result object if it's not in the list yet (edge case).
            const full = notes.find(n => n.noteId === note.noteId) ?? note;
            setActiveNote(full);
          }}
        />

        {error && <div style={s.errorBanner}>{error}</div>}

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Notes list pane */}
          <section style={s.listPane}>
            <div style={s.paneHeader}>
              <span style={s.paneTitle}>All Notes</span>
              <span style={s.countBadge}>{filteredNotes.length}</span>
            </div>
            <div style={s.listScroll}>
              {filteredNotes.length === 0 ? (
                <p style={s.empty}>No notes found.</p>
              ) : (
                filteredNotes.map(note => (
                  <div
                    key={note.noteId}
                    style={activeNote?.noteId === note.noteId ? s.cardActive : s.card}
                    onClick={() => setActiveNote(note)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <h4 style={s.cardTitle}>{note.noteTitle || "Untitled Note"}</h4>
                      {note.isPinned && <span style={{ color: "#d43434", fontSize: "0.85rem", transform: "rotate(45deg)"}}><PinIcon /></span>}
                    </div>
                    <p style={s.cardSnippet}>{note.noteBody ? note.noteBody.replace(/<[^>]*>/g, "").substring(0, 65) + "…" : "Empty note…"}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={s.cardTime}>
                        {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ""}
                      </span>
                      <span style={{ ...s.cardTime, color: note.categoryName === "Uncategorized" ? "#4b5563" : "#38bdf8", fontSize: "0.72rem" }}>
                        {note.categoryName || "Uncategorized"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Editor pane */}
          {activeNote ? (
            <main style={s.editor}>
              <div style={s.toolbar}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    style={{ ...s.toolBtn, 
                      color: activeNote.isPinned ? "#d43434" : "#9ca3af", 
                      transform: activeNote.isPinned ? "rotate(45deg)" : "rotate(0deg)", 
                      transition: "transform 0.2s ease, color 0.2s",}}
                    onClick={handleTogglePinned}
                  >
                    {activeNote.isPinned ? <PinIcon /> : <PinIcon />}
                  </button>
                  <button style={s.toolBtn} onClick={handleSaveNote}><SaveIcon /></button>
                </div>
                <button style={{ ...s.toolBtn, color: "#f87171" }} onClick={handleDelete}>
                  <TrashIcon />
                </button>
              </div>

              <div style={s.metaBar}>
                <div style={s.metaItem}>
                  <span style={s.metaLabel}>Category:</span>
                  <select
                    value={activeNote.categoryId || ""}
                    onChange={(e) => setActiveNote({ ...activeNote, categoryId: e.target.value || null })}
                    style={s.metaSelect}
                  >
                    <option value="">None</option>
                    {categories.map(c => (
                      <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                    ))}
                  </select>
                </div>
                <div style={s.metaItem}>
                  <span style={s.metaLabel}>Tags:</span>
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
                    {activeNoteTags.map(t => (
                      <span key={t.tagId} style={s.tagChip}>
                        #{t.tagName}
                        <button
                          style={s.tagChipRemove}
                          onClick={() => handleRemoveTagFromNote(t.tagId)}
                          title="Remove tag"
                        >×</button>
                      </span>
                    ))}
                    <MetaTagInput
                      allTags={allTags}
                      activeTags={activeNoteTags}
                      onAdd={handleAddTagToNote}
                      onCreateAndAdd={handleCreateAndAddTag}
                    />
                  </div>
                </div>
              </div>

              <div style={s.editorBody}>
                <input
                  type="text"
                  value={activeNote.noteTitle || ""}
                  onChange={(e) => setActiveNote({ ...activeNote, noteTitle: e.target.value })}
                  style={s.titleInput}
                  placeholder="Give your note a title…"
                />
                <RichTextEditor
                  value={activeNote.noteBody || ""}
                  onChange={(html) => setActiveNote(prev => ({ ...prev, noteBody: html }))}
                  placeholder="Start writing your thoughts here…"
                  minHeight="100%"
                />
              </div>
            </main>
          ) : (
            <div style={s.emptyEditor}>
              <p style={{ color: "#6b7280" }}>Select a note or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            {/* Header */}
            <div style={s.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span><NotesIcon /></span>
                <span style={s.modalLabel}>NEW NOTE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem",
                    color: draft.isPinned ? "#38bdf8" : "#9ca3af",
                    transform: draft.isPinned ? "rotate(-45deg)" : "none",
                    transition: "color 0.15s, transform 0.15s"
                  }}
                  onClick={() => setDraft({ ...draft, isPinned: !draft.isPinned })}
                  title={draft.isPinned ? "Unpin note" : "Pin note"}
                ><PinIcon /></button>
                <span style={{ color: draft.isPinned ? "#38bdf8" : "#9ca3af", fontSize: "0.82rem", fontWeight: draft.isPinned ? "600" : "400" }}>
                  {draft.isPinned ? "Pinned" : "Pin Note"}
                </span>
                <button style={s.modalCloseBtn} onClick={() => setShowNewNoteModal(false)}>✕</button>
              </div>
            </div>

            {/* Title */}
            <input
              style={s.modalTitle}
              type="text"
              placeholder="Enter a descriptive title…"
              value={draft.noteTitle}
              onChange={(e) => setDraft({ ...draft, noteTitle: e.target.value })}
            />

            {/* Rich text editor */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <RichTextEditor
                value={draft.noteBody}
                onChange={(html) => setDraft(prev => ({ ...prev, noteBody: html }))}
                placeholder="Start writing your thoughts here…"
                minHeight="260px"
              />
            </div>

            {/* Category + Tags row */}
            <div style={s.categoryRow}>
              {/* Category */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={s.categoryLabel}>Category:</span>
                <select
                  style={s.categorySelect}
                  value={draft.categoryId || ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setShowCreateCat(true);
                    } else {
                      setDraft({ ...draft, categoryId: e.target.value || null });
                      setShowCreateCat(false);
                    }
                  }}
                >
                  <option value="">None</option>
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
                  ))}
                  <option value="__new__">＋ Create new category…</option>
                </select>
                {showCreateCat && (
                  <div style={s.inlineCatForm}>
                    <input
                      style={s.inlineCatInput}
                      placeholder="Category name…"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                      autoFocus
                    />
                    <button style={s.inlineCatConfirm} onClick={handleCreateCategory}>Add</button>
                    <button style={s.inlineCatCancel} onClick={() => { setShowCreateCat(false); setNewCatName(""); }}>✕</button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ width: "1px", height: "22px", backgroundColor: "#3e444a", flexShrink: 0 }} />

              {/* Tags */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, flexWrap: "wrap" }}>
                <span style={s.categoryLabel}>Tags:</span>
                {draft.tags.map(t => (
                  <span key={t.tagId} style={s.tagChip}>
                    #{t.tagName}
                    <button style={s.tagChipRemove} onClick={() => handleDraftRemoveTag(t.tagId)}>×</button>
                  </span>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    style={s.tagTextInput}
                    placeholder="Add tag…"
                    value={draftTagInput}
                    onChange={(e) => setDraftTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleDraftAddTag(); } }}
                  />
                  {draftTagInput.trim() && (
                    <button style={s.inlineCatConfirm} onClick={handleDraftAddTag}>+</button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={s.modalFooter}>
              <span style={s.draftStatus}>
                {draft.noteBody.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length} words
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button style={s.discardBtn} onClick={() => setShowNewNoteModal(false)}>Discard</button>
                <button style={s.saveNoteBtn} onClick={handleSaveDraft}>Save Note</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100%", width: "100%", backgroundColor: "#131517", overflow: "hidden", fontFamily: "'Inter', sans-serif" },
  workspace: { display: "flex", flexDirection: "column", flex: 1, marginLeft: "250px", height:"100vh", maxHeight: "100vh", overflow: "hidden" },
  errorBanner: { backgroundColor: "#7f1d1d", color: "#fca5a5", padding: "8px 20px", fontSize: "0.85rem" },
  listPane: { width: "300px", borderRight: "1px solid #2d3135", backgroundColor: "#1a1d20", display: "flex", flexDirection: "column" },
  paneHeader: { padding: "18px 20px", borderBottom: "1px solid #2d3135", display: "flex", justifyContent: "space-between", alignItems: "center" },
  paneTitle: { fontWeight: "700", color: "#fff", fontSize: "0.95rem" },
  countBadge: { backgroundColor: "#2d3135", color: "#ffffff", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "700" },
  listScroll: { flex: 1, overflowY: "auto", padding: "10px" },
  empty: { color: "#6b7280", textAlign: "center", padding: "30px", fontSize: "0.88rem" },
  card: { padding: "14px", borderRadius: "8px", cursor: "pointer", marginBottom: "6px" },
  cardActive: { padding: "14px", borderRadius: "8px", backgroundColor: "#2d3135", cursor: "pointer", marginBottom: "6px", borderLeft: "3px solid #38bdf8" },
  cardTitle: { color: "#fff", fontSize: "0.9rem", fontWeight: "600", margin: "0 0 5px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" },
  cardSnippet: { color: "#9ca3af", fontSize: "0.82rem", margin: "0 0 6px 0", lineHeight: "1.4" },
  cardTime: { color: "#6b7280", fontSize: "0.75rem" },
  editor: { flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#131517" },
  toolbar: { padding: "10px 28px", borderBottom: "1px solid #2d3135", display: "flex", justifyContent: "space-between", backgroundColor: "#1a1d20" },
  toolBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "0.82rem", fontWeight: "500", padding: "5px 8px", borderRadius: "6px" },
  metaBar: { padding: "10px 28px", borderBottom: "1px solid #2d3135", display: "flex", gap: "24px", backgroundColor: "#1a1d20" },
  metaItem: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" },
  metaLabel: { color: "#6b7280" },
  metaSelect: { backgroundColor: "#2d3135", color: "#fff", border: "1px solid #3e444a", borderRadius: "6px", padding: "3px 8px", outline: "none", fontSize: "0.82rem" },
  editorBody: { flex: 1, padding: "0", display: "flex", flexDirection: "column", overflow: "hidden" },
  titleInput: { background: "none", border: "none", borderBottom: "1px solid #2d3135", color: "#fff", fontSize: "1.7rem", fontWeight: "700", outline: "none", width: "100%", padding: "24px 36px 16px", boxSizing: "border-box", flexShrink: 0 },
  emptyEditor: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { backgroundColor: "#1e2124", borderRadius: "14px", width: "min(900px, 92vw)", height: "min(680px, 90vh)", border: "1px solid #2d3135", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #2d3135" },
  modalLabel: { color: "#9ca3af", fontSize: "0.78rem", fontWeight: "700", letterSpacing: "0.08em" },
  modalCloseBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1rem", padding: "2px 6px" },
  modalTitle: { background: "none", border: "none", outline: "none", color: "#6b7280", fontSize: "1.6rem", fontWeight: "600", padding: "20px 20px 8px", width: "100%", boxSizing: "border-box" },
  categoryRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderTop: "1px solid #2d3135", borderBottom: "1px solid #2d3135", flexWrap: "wrap" },
  categoryLabel: { color: "#9ca3af", fontSize: "0.85rem", fontWeight: "500" },
  categorySelect: { backgroundColor: "#2d3135", color: "#fff", border: "1px solid #3e444a", borderRadius: "6px", padding: "5px 10px", outline: "none", fontSize: "0.85rem" },
  inlineCatForm: { display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px" },
  inlineCatInput: { backgroundColor: "#131517", border: "1px solid #3e444a", borderRadius: "6px", padding: "5px 10px", color: "#fff", fontSize: "0.85rem", outline: "none", width: "160px" },
  inlineCatConfirm: { padding: "5px 12px", backgroundColor: "#38bdf8", color: "#0f172a", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer" },
  inlineCatCancel: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem", padding: "2px 4px" },
  tagChip: { display: "inline-flex", alignItems: "center", gap: "4px", backgroundColor: "#2d3135", color: "#38bdf8", padding: "2px 8px", borderRadius: "6px", fontSize: "0.78rem" },
  tagChipRemove: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.85rem", padding: "0 1px", lineHeight: 1 },
  tagTextInput: { background: "none", border: "1px solid #3e444a", borderRadius: "6px", outline: "none", color: "#fff", fontSize: "0.82rem", padding: "3px 8px", width: "90px" },
  modalFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" },
  draftStatus: { color: "#6b7280", fontSize: "0.8rem" },
  discardBtn: { padding: "8px 18px", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontWeight: "600", fontSize: "0.88rem" },
  saveNoteBtn: { padding: "8px 20px", backgroundColor: "#38bdf8", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.88rem", cursor: "pointer" }
};

// Small inline tag-picker used in the editor metabar
function MetaTagInput({ allTags, activeTags, onAdd, onCreateAndAdd }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = allTags.filter(t =>
    t.tagName.toLowerCase().includes(input.toLowerCase()) &&
    !activeTags.find(a => a.tagId === t.tagId)
  );

  const commit = () => {
    const trimmed = input.trim();
    if (!trimmed) { setOpen(false); return; }
    const match = allTags.find(t => t.tagName.toLowerCase() === trimmed.toLowerCase());
    if (match) onAdd(match.tagId);
    else onCreateAndAdd(trimmed);
    setInput("");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        style={{
          background: "none", border: "1px solid #3e444a", borderRadius: "6px",
          outline: "none", color: "#fff", fontSize: "0.78rem",
          padding: "2px 8px", width: "80px"
        }}
        placeholder="+ tag"
        value={input}
        onChange={(e) => { setInput(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
      />
      {open && (filtered.length > 0 || input.trim()) && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 200,
          backgroundColor: "#1e2124", border: "1px solid #3e444a",
          borderRadius: "8px", minWidth: "140px", marginTop: "4px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden"
        }}>
          {filtered.map(t => (
            <div
              key={t.tagId}
              style={{ padding: "7px 12px", color: "#d1d5db", fontSize: "0.82rem", cursor: "pointer" }}
              onMouseDown={() => { onAdd(t.tagId); setInput(""); setOpen(false); }}
            >
              #{t.tagName}
            </div>
          ))}
          {input.trim() && !allTags.find(t => t.tagName.toLowerCase() === input.trim().toLowerCase()) && (
            <div
              style={{ padding: "7px 12px", color: "#38bdf8", fontSize: "0.82rem", cursor: "pointer", borderTop: filtered.length ? "1px solid #2d3135" : "none" }}
              onMouseDown={() => { onCreateAndAdd(input.trim()); setInput(""); setOpen(false); }}
            >
              ＋ Create "{input.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
