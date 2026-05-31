import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useUser } from "../utils/useUser";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { PinIcon, CategoryIcon, PencilIcon, TrashIcon } from "../../../../shared-resources/icons";

const PALETTE = ["#38bdf8", "#fbbf24", "#a78bfa", "#34d399", "#f87171", "#fb923c", "#e879f9", "#4ade80", "#f97316"];

export default function Category() {
  const navigate = useNavigate();
  const user = useUser();
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [catNotes, setCatNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingColor, setEditingColor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { categoryId, categoryName }
  const renameRef = useRef(null);

  useEffect(() => { fetchCategories(); }, []);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/categories");
      setCategories(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/");
      else setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = async (cat) => {
    setSelectedCat(cat);
    setNotesLoading(true);
    try {
      const res = await api.get(`/api/categories/${cat.categoryId}/notes`);
      setCatNotes(res.data);
    } catch {
      setError("Failed to load notes for this category.");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await api.post("/api/categories", { categoryName: name });
      setNewCatName("");
      setShowAddForm(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create category.");
    }
  };

  const handleDeleteCategory = async (e, categoryId) => {
    e.stopPropagation();
    const cat = categories.find(c => c.categoryId === categoryId);
    setDeleteTarget({ categoryId, categoryName: cat?.categoryName || "this category" });
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/categories/${deleteTarget.categoryId}`);
      if (selectedCat?.categoryId === deleteTarget.categoryId) setSelectedCat(null);
      fetchCategories();
    } catch {
      setError("Failed to delete category.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleStartRename = (e, cat) => {
    e.stopPropagation();
    setRenamingId(cat.categoryId);
    setRenameValue(cat.categoryName);
    setEditingColor(cat.categoryColor || null);
  };

  const handleRename = async (categoryId, colorOverride) => {
    const name = renameValue.trim();
    if (!name) { setRenamingId(null); return; }
    const colorToSave = colorOverride !== undefined ? colorOverride : editingColor;
    try {
      await api.put(`/api/categories/${categoryId}`, { categoryName: name, categoryColor: colorToSave });
      setRenamingId(null);
      fetchCategories();
      if (selectedCat?.categoryId === categoryId) {
        setSelectedCat(prev => ({ ...prev, categoryName: name }));
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to rename category.");
      setRenamingId(null);
    }
  };

  const stripHtml = (html) => html?.replace(/<[^>]*>/g, "") || "";

  return (
    <div style={s.page}>
      <Sidebar counts={{}} />
      <div style={s.workspace}>
        <Header user={user} />
        <main style={s.main}>

          {/* Title row */}
          <div style={s.titleRow}>
            {selectedCat ? (
              <button style={s.backBtn} onClick={() => { setSelectedCat(null); setCatNotes([]); }}>‹ Back</button>
            ) : null}
            <h2 style={s.title}>
              <span style={{ display: "inline-flex", transform: "scale(1.5)", transformOrigin: "left center", marginRight: "15px" }}>
                <CategoryIcon />
              </span>
              {selectedCat ? selectedCat.categoryName : "Categories"}
            </h2>
            {!selectedCat && (
              <button style={s.addCatBtn} onClick={() => { setShowAddForm(v => !v); setNewCatName(""); }}>
                New Category
              </button>
            )}
          </div>
          <p style={s.sub}>
            {selectedCat
              ? `${catNotes.length} note${catNotes.length !== 1 ? "s" : ""} in "${selectedCat.categoryName}"`
              : `${categories.length} categor${categories.length !== 1 ? "ies" : "y"}`}
          </p>

          {error && <p style={s.errorMsg}>{error}</p>}

          {/* Add category form */}
          {showAddForm && !selectedCat && (
            <div style={s.addForm}>
              <input
                style={s.addInput}
                placeholder="Category name…"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") setShowAddForm(false); }}
                autoFocus
              />
              <button style={s.addConfirmBtn} onClick={handleAddCategory}>Add</button>
              <button style={s.addCancelBtn} onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          )}

          {/* Category grid */}
          {!selectedCat ? (
            loading ? (
              <p style={s.empty}>Loading…</p>
            ) : categories.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}><CategoryIcon /></div>
                <p style={s.emptyTitle}>No categories yet</p>
                <p style={s.emptySub}>Create a category to organize your notes.</p>
              </div>
            ) : (
              <div style={s.grid}>
                {categories.map((cat, i) => {
                  const color = cat.categoryColor || null;
                  const isRenaming = renamingId === cat.categoryId;
                  return (
                    <div
                      key={cat.categoryId}
                      style={{ ...s.catCard, borderTop: color ? `3px solid ${color}` : "3px solid transparent" }}
                      onClick={() => !isRenaming && handleSelectCategory(cat)}
                    >
                      {/* Color dot + name */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        {color && <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />}
                        {isRenaming ? (
                          <div style={{ flex: 1 }} onClick={e => e.stopPropagation()}>
                            <input
                              ref={renameRef}
                              style={s.renameInput}
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleRename(cat.categoryId);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                            />
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px", alignItems: "center" }}>
                              {/* X = no color */}
                              <div
                                onClick={() => { setEditingColor(null); handleRename(cat.categoryId, null); }}
                                style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#2d3135", border: "2px solid #3e444a", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.7rem", fontWeight: "700" }}
                                title="No color"
                              >✕</div>
                              {PALETTE.map(c => (
                                <div
                                  key={c}
                                  onClick={() => { setEditingColor(c); handleRename(cat.categoryId, c); }}
                                  style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: c, border: editingColor === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", flexShrink: 0 }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <h3 style={s.catName}>{cat.categoryName}</h3>
                        )}
                      </div>

                      <p style={s.catCount}>
                        {cat.noteCount} note{cat.noteCount !== 1 ? "s" : ""}
                      </p>

                      {/* Actions */}
                      <div style={s.catActions}>
                        <button style={s.openBtn} onClick={() => handleSelectCategory(cat)}>
                          Open
                        </button>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            style={s.iconBtn}
                            title="Rename"
                            onClick={(e) => handleStartRename(e, cat)}
                          ><PencilIcon /></button>
                          <button
                            style={{ ...s.iconBtn, color: "#f87171" }}
                            title="Delete"
                            onClick={(e) => handleDeleteCategory(e, cat.categoryId)}
                          ><TrashIcon /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Notes in selected category */
            notesLoading ? (
              <p style={s.empty}>Loading…</p>
            ) : catNotes.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}><CategoryIcon /></div>
                <p style={s.emptyTitle}>No notes in this category</p>
                <p style={s.emptySub}>Assign notes to "{selectedCat.categoryName}" from the editor.</p>
              </div>
            ) : (
              <div style={s.grid}>
                {catNotes.map(note => (
                  <div
                    key={note.noteId}
                    style={s.card}
                    onClick={() => navigate("/Home", { state: { noteId: note.noteId } })}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <h3 style={s.cardTitle}>{note.noteTitle || "Untitled Note"}</h3>
                        {note.isPinned && <span style={{ color: "#38bdf8", fontSize: "0.8rem" }}><PinIcon /></span>}
                      </div>
                      <p style={s.cardPreview}>{stripHtml(note.noteBody)}</p>
                    </div>
                    <div style={s.cardFooter}>
                      <span style={s.cardTime}>
                        {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ""}
                      </span>
                      <span style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "600" }}>
                        Open →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </main>
      </div>

      {/* Delete Category Confirmation Modal */}
      {deleteTarget && (
        <div style={s.overlay} onClick={() => setDeleteTarget(null)}>
          <div style={s.deleteModal} onClick={e => e.stopPropagation()}>
            <div style={s.deleteIconWrap}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 style={s.deleteTitle}>Delete Category</h3>
            <p style={s.deleteMsg}>
              Are you sure you want to delete{" "}
              <strong style={{ color: "#fff" }}>"{deleteTarget.categoryName}"</strong>?
            </p>
            <p style={s.deleteSubMsg}>Notes in this category will not be deleted. This cannot be undone.</p>
            <div style={s.deleteBtns}>
              <button style={s.deleteCancelBtn} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button style={s.deleteConfirmBtn} onClick={confirmDeleteCategory}>Delete Category</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", width: "100vw", backgroundColor: "#131517", fontFamily: "'Inter', sans-serif", overflow: "hidden" },
  workspace: { display: "flex", flexDirection: "column", flex: 1, marginLeft: "250px", height: "100vh" },
  main: { flex: 1, padding: "36px 40px", overflowY: "auto" },
  titleRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" },
  backBtn: { background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: "1.1rem", padding: 0, flexShrink: 0 },
  title: { fontSize: "1.8rem", fontWeight: "700", color: "#fff", margin: 0, flex: 1 },
  addCatBtn: { padding: "8px 16px", backgroundColor: "#38bdf8", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer", flexShrink: 0 },
  sub: { color: "#9ca3af", fontSize: "0.9rem", marginBottom: "24px" },
  errorMsg: { color: "#f87171", marginBottom: "16px", fontSize: "0.88rem" },
  addForm: { display: "flex", gap: "8px", marginBottom: "24px", maxWidth: "480px" },
  addInput: { flex: 1, backgroundColor: "#2d3135", border: "1px solid #3e444a", borderRadius: "8px", padding: "9px 12px", color: "#fff", fontSize: "0.88rem", outline: "none" },
  addConfirmBtn: { padding: "9px 16px", backgroundColor: "#38bdf8", color: "#0f172a", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer" },
  addCancelBtn: { padding: "9px 16px", backgroundColor: "transparent", color: "#9ca3af", border: "1px solid #3e444a", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" },
  empty: { color: "#6b7280", fontSize: "0.9rem", padding: "40px 0" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: "10px" },
  emptyIcon: { fontSize: "3rem", marginBottom: "8px" },
  emptyTitle: { color: "#fff", fontSize: "1.1rem", fontWeight: "600", margin: 0 },
  emptySub: { color: "#6b7280", fontSize: "0.88rem", margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" },
  catCard: { backgroundColor: "#1e2124", borderRadius: "12px", padding: "20px", border: "1px solid #2d3135", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", transition: "border-color 0.15s" },
  catName: { fontSize: "1.05rem", fontWeight: "700", color: "#fff", margin: 0, flex: 1 },
  renameInput: { flex: 1, background: "none", border: "none", borderBottom: "1px solid #38bdf8", outline: "none", color: "#fff", fontSize: "1.05rem", fontWeight: "700", padding: "0 2px" },
  catCount: { color: "#6b7280", fontSize: "0.82rem", margin: "0 0 8px 0" },
  catActions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "10px", borderTop: "1px solid #2d3135" },
  openBtn: { background: "none", border: "none", color: "#ffffff", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", padding: 0 },
  iconBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.9rem", padding: "3px 5px", borderRadius: "4px" },
  card: { backgroundColor: "#1e2124", borderRadius: "12px", padding: "20px", border: "1px solid #2d3135", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "140px", cursor: "pointer" },
  cardTitle: { fontSize: "1rem", fontWeight: "600", color: "#fff", margin: 0 },
  cardPreview: { fontSize: "0.85rem", color: "#9ca3af", lineHeight: "1.5", marginTop: "6px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" },
  cardTime: { color: "#6b7280", fontSize: "0.75rem" },

  // Delete confirmation modal
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  deleteModal: { backgroundColor: "#1e2227", border: "1px solid #3a3f47", borderRadius: "16px", padding: "36px 32px 28px", width: "min(420px, 90vw)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", boxShadow: "0 24px 48px rgba(0,0,0,0.7)" },
  deleteIconWrap: { width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  deleteTitle: { color: "#fff", fontSize: "1.15rem", fontWeight: "700", margin: 0, textAlign: "center" },
  deleteMsg: { color: "#9ca3af", fontSize: "0.9rem", textAlign: "center", lineHeight: "1.6", margin: 0 },
  deleteSubMsg: { color: "#6b7280", fontSize: "0.78rem", textAlign: "center", margin: 0 },
  deleteBtns: { display: "flex", gap: "10px", marginTop: "8px", width: "100%" },
  deleteCancelBtn: { flex: 1, padding: "10px", backgroundColor: "#2d3135", border: "1px solid #3a3f47", borderRadius: "8px", color: "#d1d5db", fontWeight: "600", fontSize: "0.88rem", cursor: "pointer" },
  deleteConfirmBtn: { flex: 1, padding: "10px", backgroundColor: "#dc2626", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "700", fontSize: "0.88rem", cursor: "pointer" },
};
