import { useState, useEffect, useRef, useCallback } from "react";
import api from "../utils/api";
import { SearchIcon } from "../../../../shared-resources/icons";

// ---------------------------------------------------------------------------
// Highlight — wraps matched characters with a styled <mark>
// ---------------------------------------------------------------------------
function Highlight({ text = "", query = "" }) {
  if (!query.trim()) return <span>{text}</span>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={s.highlight}>{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "");
}

function buildSnippet(body = "", query = "", maxLen = 120) {
  const plain = stripHtml(body);
  if (!query.trim()) return plain.slice(0, maxLen) + (plain.length > maxLen ? "…" : "");
  const idx = plain.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return plain.slice(0, maxLen) + (plain.length > maxLen ? "…" : "");
  const start = Math.max(0, idx - 40);
  const end   = Math.min(plain.length, idx + query.length + 80);
  return (start > 0 ? "…" : "") + plain.slice(start, end) + (end < plain.length ? "…" : "");
}

function NoteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SearchModal({ isOpen, onClose, categories = [], allTags = [], onSelectNote }) {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searchError, setSearchError]   = useState("");
  const [selectedCatId, setSelectedCat] = useState("");
  // Multiple tags — array of tag ID strings
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showTagDrop, setShowTagDrop]   = useState(false);
  const [showCatDrop, setShowCatDrop]   = useState(false);
  const [focusedIdx, setFocusedIdx]     = useState(-1);

  const inputRef    = useRef(null);
  const debounceRef = useRef(null);
  const tagDropRef  = useRef(null);
  const catDropRef  = useRef(null);
  const listRef     = useRef(null);

  // Reset & focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery(""); setResults([]); setSearchError("");
      setSelectedCat(""); setSelectedTagIds([]); setFocusedIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Close tag dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (tagDropRef.current && !tagDropRef.current.contains(e.target)) setShowTagDrop(false);
      if (catDropRef.current && !catDropRef.current.contains(e.target)) setShowCatDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIdx < 0 || !listRef.current) return;
    listRef.current.children[focusedIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusedIdx]);

  // ---------------------------------------------------------------------------
  // Core search — called whenever query, category, or tags change
  // ---------------------------------------------------------------------------
  const runSearch = useCallback(async (q, catId, tagIds) => {
    const hasText     = q.trim().length > 0;
    const hasTags     = tagIds.length > 0;
    const hasCategory = !!catId;

    if (!hasText && !hasTags && !hasCategory) {
      setResults([]); setSearchError(""); return;
    }

    setLoading(true);
    setSearchError("");
    try {
      const p = new URLSearchParams();
      if (hasText)     p.set("q", q.trim());
      if (hasCategory) p.set("categoryId", catId);
      // Send all tag IDs as a comma-separated list: tagIds=1,3,7
      if (hasTags)     p.set("tagIds", tagIds.join(","));

      const res = await api.get(`/api/notes/search?${p.toString()}`);
      setResults(res.data);
      setFocusedIdx(-1);
    } catch (err) {
      console.error("[SearchModal] search failed:", err?.response?.data || err.message);
      setSearchError(err?.response?.data?.error || "Search failed — check the console.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced text input
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val, selectedCatId, selectedTagIds), 300);
  };

  // Category filter — fires immediately
  const handleCategoryChange = (catId) => {
    setSelectedCat(catId);
    setShowCatDrop(false);
    runSearch(query, catId, selectedTagIds);
  };

  // Toggle a tag in/out of the selected set
  const handleTagToggle = (tagId) => {
    // Compute next state synchronously, then call runSearch with it directly
    // (avoids stale closure if called inside setState updater)
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(next);
    runSearch(query, selectedCatId, next);
    // Keep dropdown open so user can add more tags
  };

  // Remove a single tag chip
  const handleRemoveTag = (tagId, e) => {
    e.stopPropagation();
    const next = selectedTagIds.filter(id => id !== tagId);
    setSelectedTagIds(next);
    runSearch(query, selectedCatId, next);
  };

  // Clear all tags
  const handleClearTags = (e) => {
    e.stopPropagation();
    setSelectedTagIds([]);
    runSearch(query, selectedCatId, []);
  };

  const handleSelect = (note) => { onSelectNote(note); onClose(); };

  // Keyboard nav
  const handleKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && focusedIdx >= 0) { e.preventDefault(); handleSelect(results[focusedIdx]); }
  };

  if (!isOpen) return null;

  const hasActivity = query.trim() || selectedTagIds.length > 0 || selectedCatId;
  const selectedTagObjects = allTags.filter(t => selectedTagIds.includes(String(t.tagId)));

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>

        {/* ── Search input ── */}
        <div style={s.inputRow}>
          <span style={s.inputIcon}><SearchIcon /></span>
          <input
            ref={inputRef}
            style={s.input}
            placeholder="Search notes, tags, or categories..."
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <span style={s.spinner}>⟳</span>}
          {query && !loading && (
            <button style={s.clearBtn} onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}>✕</button>
          )}
          <kbd style={s.escHint}>esc</kbd>
        </div>

        {/* ── Filter row ── */}
        <div style={s.filterRow}>
          <span style={s.filterLabel}>Filters</span>

          {/* Category custom dropdown — matches tag menu style */}
          <div style={{ position: "relative" }} ref={catDropRef}>
            <button
              style={{ ...s.tagAddBtn, ...(selectedCatId ? s.tagAddBtnActive : {}) }}
              onClick={() => setShowCatDrop(v => !v)}
            >
              {selectedCatId
                ? (categories.find(c => String(c.categoryId) === selectedCatId)?.categoryName || "Category")
                : "All Categories"}
              {selectedCatId && (
                <span
                  style={s.chipX}
                  onClick={(e) => { e.stopPropagation(); handleCategoryChange(""); }}
                >✕</span>
              )}
            </button>

            {showCatDrop && (
              <div style={s.tagMenu}>
                <div style={s.tagMenuHeader}>
                  <span style={s.tagMenuTitle}>Filter by category</span>
                </div>
                <div
                  style={{ ...s.tagMenuItem, ...(selectedCatId === "" ? s.tagMenuItemActive : {}) }}
                  onClick={() => handleCategoryChange("")}
                >
                  <span style={s.tagMenuCheck}>{selectedCatId === "" ? "✓" : " "}</span>
                  All Categories
                </div>
                {categories.map(c => {
                  const isSelected = String(c.categoryId) === selectedCatId;
                  return (
                    <div
                      key={c.categoryId}
                      style={{ ...s.tagMenuItem, ...(isSelected ? s.tagMenuItemActive : {}) }}
                      onClick={() => handleCategoryChange(String(c.categoryId))}
                    >
                      <span style={s.tagMenuCheck}>{isSelected ? "✓" : " "}</span>
                      {c.categoryName}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected tag chips */}
          {selectedTagObjects.map(t => (
            <span key={t.tagId} style={s.activeTagChip}>
              #{t.tagName}
              <span style={s.chipX} onClick={(e) => handleRemoveTag(String(t.tagId), e)}>✕</span>
            </span>
          ))}

          {/* Tag picker button */}
          <div style={{ position: "relative" }} ref={tagDropRef}>
            <button
              style={{ ...s.tagAddBtn, ...(selectedTagIds.length > 0 ? s.tagAddBtnActive : {}) }}
              onClick={() => setShowTagDrop(v => !v)}
            >
              {selectedTagIds.length > 0 ? `+ tag` : "+ tag"}
              {selectedTagIds.length > 0 && (
                <span style={s.tagCountBadge}>{selectedTagIds.length}</span>
              )}
            </button>

            {showTagDrop && (
              <div style={s.tagMenu}>
                <div style={s.tagMenuHeader}>
                  <span style={s.tagMenuTitle}>Filter by tag</span>
                  {selectedTagIds.length > 0 && (
                    <button style={s.tagMenuClearAll} onClick={handleClearTags}>Clear all</button>
                  )}
                </div>
                {allTags.length === 0 ? (
                  <div style={s.tagMenuEmpty}>No tags yet</div>
                ) : (
                  allTags.map(t => {
                    const isSelected = selectedTagIds.includes(String(t.tagId));
                    return (
                      <div
                        key={t.tagId}
                        style={{ ...s.tagMenuItem, ...(isSelected ? s.tagMenuItemActive : {}) }}
                        onClick={() => handleTagToggle(String(t.tagId))}
                      >
                        <span style={s.tagMenuCheck}>{isSelected ? "✓" : " "}</span>
                        #{t.tagName}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={s.divider} />

        {/* ── Results ── */}
        <div style={s.resultsList} ref={listRef}>

          {!hasActivity && (
            <div style={s.hint}>
              <span style={s.hintIcon}>⌕</span>
              Type to search, or pick a category / tag to filter
            </div>
          )}

          {searchError && (
            <div style={{ ...s.hint, color: "#f87171" }}>{searchError}</div>
          )}

          {hasActivity && !loading && !searchError && results.length === 0 && (
            <div style={s.hint}>
              No notes match
              {query && <strong style={{ color: "#e2e8f0", marginLeft: 4 }}>"{query}"</strong>}
              {selectedTagIds.length > 0 && (
                <span style={{ color: "#9ca3af", marginLeft: 4 }}>
                  with {selectedTagIds.length} tag{selectedTagIds.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {results.map((note, idx) => {
            const snippet   = buildSnippet(note.noteBody, query);
            const isFocused = idx === focusedIdx;
            return (
              <div
                key={note.noteId}
                style={{ ...s.row, ...(isFocused ? s.rowFocused : {}) }}
                onClick={() => handleSelect(note)}
                onMouseEnter={() => setFocusedIdx(idx)}
                onMouseLeave={() => setFocusedIdx(-1)}
              >
                <span style={{ ...s.rowIcon, ...(isFocused ? s.rowIconFocused : {}) }}>
                  <NoteIcon />
                </span>
                <div style={s.rowBody}>
                  <span style={s.rowTitle}>
                    <Highlight text={note.noteTitle || "Untitled"} query={query} />
                  </span>
                  {snippet && (
                    <span style={s.rowSnippet}>
                      <Highlight text={snippet} query={query} />
                    </span>
                  )}
                </div>
                <div style={s.rowMeta}>
                  {note.categoryName && <span style={s.catBadge}>{note.categoryName}</span>}
                  {note.updatedAt && (
                    <span style={s.dateBadge}>
                      {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        {results.length > 0 && (
          <div style={s.footerBar}>
            <span style={s.footerHint}><kbd style={s.kbd}>↑↓</kbd> navigate</span>
            <span style={s.footerHint}><kbd style={s.kbd}>↵</kbd> open</span>
            <span style={s.footerHint}><kbd style={s.kbd}>esc</kbd> close</span>
            <span style={{ ...s.footerHint, marginLeft: "auto" }}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = {
  backdrop: {
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    paddingTop: "10px", zIndex: 9999
  },
  panel: {
    width: "100%", maxWidth: "640px",
    backgroundColor: "#1e2227", border: "1px solid #3a3f47",
    borderRadius: "10px",
    boxShadow: "0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
    display: "flex", flexDirection: "column",
    overflow: "hidden", maxHeight: "calc(100vh - 40px)", height: "50vh"
  },
  inputRow: {
    display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px"
  },
  inputIcon: { color: "#6b7280", display: "flex", alignItems: "center", flexShrink: 0 },
  input: {
    flex: 1, background: "none", border: "none", outline: "none",
    color: "#f1f5f9", fontSize: "0.95rem", lineHeight: 1.5, caretColor: "#38bdf8"
  },
  spinner: { color: "#6b7280", fontSize: "1rem", flexShrink: 0 },
  clearBtn: {
    background: "none", border: "none", color: "#6b7280",
    cursor: "pointer", fontSize: "0.8rem", padding: "2px 4px",
    borderRadius: "4px", flexShrink: 0
  },
  escHint: {
    backgroundColor: "#2d3135", color: "#6b7280",
    border: "1px solid #3a3f47", borderRadius: "4px",
    padding: "2px 6px", fontSize: "0.7rem", fontFamily: "inherit", flexShrink: 0
  },
  filterRow: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "0 16px 12px", flexWrap: "wrap"
  },
  filterLabel: {
    color: "#4b5563", fontSize: "0.72rem", fontWeight: "600",
    textTransform: "uppercase", letterSpacing: "0.06em"
  },
  filterSelect: {
    backgroundColor: "#131517", border: "1px solid #2d3135",
    borderRadius: "5px", padding: "3px 10px", fontSize: "0.72rem",
    color: "#9ca3af", outline: "none", cursor: "pointer"
  },
  // Active tag chips shown inline in the filter row
  activeTagChip: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    backgroundColor: "rgba(56,189,248,0.12)", border: "1px solid #38bdf8",
    borderRadius: "5px", padding: "2px 8px", fontSize: "0.72rem", color: "#38bdf8"
  },
  chipX: { fontSize: "0.65rem", color: "#9ca3af", cursor: "pointer", lineHeight: 1 },
  // "+ tag" button
  tagAddBtn: {
    backgroundColor: "#131517", border: "1px solid #2d3135",
    borderRadius: "5px", padding: "3px 10px", fontSize: "0.72rem",
    color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px"
  },
  tagAddBtnActive: { borderColor: "#38bdf8", color: "#38bdf8" },
  tagCountBadge: {
    backgroundColor: "#38bdf8", color: "#0f172a",
    borderRadius: "10px", padding: "0 5px", fontSize: "0.65rem", fontWeight: "700"
  },
  // Tag dropdown menu — also used for category dropdown
  tagMenu: {
    position: "absolute", top: "calc(100% + 4px)", left: 0,
    backgroundColor: "#1e2227", border: "1px solid #3a3f47",
    borderRadius: "8px", minWidth: "180px", zIndex: 200,
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    maxHeight: "220px", overflowY: "auto",
    display: "flex", flexDirection: "column"
  },
  tagMenuHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 14px 6px", borderBottom: "1px solid #2d3135",
    position: "sticky", top: 0, backgroundColor: "#1e2227", zIndex: 1, flexShrink: 0
  },
  tagMenuTitle: { fontSize: "0.7rem", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" },
  tagMenuClearAll: {
    background: "none", border: "none", color: "#f87171",
    fontSize: "0.7rem", cursor: "pointer", padding: 0
  },
  tagMenuItem: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "7px 14px", fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer"
  },
  tagMenuItemActive: { backgroundColor: "rgba(56,189,248,0.1)", color: "#38bdf8" },
  tagMenuCheck: { fontSize: "0.75rem", width: "12px", color: "#38bdf8", flexShrink: 0 },
  tagMenuEmpty: { padding: "10px 14px", fontSize: "0.82rem", color: "#6b7280" },
  divider: { height: "1px", backgroundColor: "#2d3135", flexShrink: 0 },
  resultsList: { overflowY: "auto", flex: 1, padding: "4px 0" },
  hint: {
    display: "flex", alignItems: "center", gap: "8px",
    color: "#4b5563", fontSize: "0.85rem", padding: "24px 20px", justifyContent: "center"
  },
  hintIcon: { fontSize: "1.2rem", color: "#374151" },
  row: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "9px 16px", cursor: "pointer",
    transition: "background 0.08s", borderLeft: "2px solid transparent"
  },
  rowFocused: { backgroundColor: "rgba(56,189,248,0.07)", borderLeftColor: "#38bdf8" },
  rowIcon: { color: "#4b5563", flexShrink: 0, display: "flex", alignItems: "center" },
  rowIconFocused: { color: "#38bdf8" },
  rowBody: { flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
  rowTitle: {
    fontSize: "0.88rem", fontWeight: "600", color: "#e2e8f0",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  },
  rowSnippet: {
    fontSize: "0.75rem", color: "#6b7280",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
  },
  rowMeta: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 },
  catBadge: {
    fontSize: "0.65rem", color: "#38bdf8",
    backgroundColor: "rgba(56,189,248,0.08)",
    padding: "1px 6px", borderRadius: "3px", whiteSpace: "nowrap"
  },
  dateBadge: { fontSize: "0.65rem", color: "#4b5563" },
  footerBar: {
    display: "flex", alignItems: "center", gap: "16px",
    padding: "8px 16px", borderTop: "1px solid #2d3135",
    backgroundColor: "#191c20", flexShrink: 0
  },
  footerHint: { display: "flex", alignItems: "center", gap: "5px", fontSize: "0.7rem", color: "#4b5563" },
  kbd: {
    backgroundColor: "#2d3135", color: "#9ca3af",
    border: "1px solid #3a3f47", borderRadius: "3px",
    padding: "1px 5px", fontSize: "0.65rem", fontFamily: "inherit"
  },
  highlight: {
    backgroundColor: "rgba(250,204,21,0.25)", color: "#fde68a",
    borderRadius: "2px", padding: "0 1px"
  }
};
