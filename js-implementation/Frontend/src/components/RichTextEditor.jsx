import { useRef, useEffect, useCallback, useState } from "react";
import { TagIcon, CategoryIcon, PinIcon } from "../../../../shared-resources/icons";

const FONTS = ["Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS", "Times New Roman"];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minHeight = "200px",
}) {
  const editorRef  = useRef(null);
  const savedRange = useRef(null);
  const skipSync   = useRef(false);

  const [font, setFont]     = useState("Arial");
  const [fontSize, setFontSize] = useState(11);
  const [fmt, setFmt]       = useState({});

  // ── Sync value → DOM (skip while the user is typing) ──────────────────
  useEffect(() => {
    const el = editorRef.current;
    if (!el || skipSync.current) { skipSync.current = false; return; }
    if (el.innerHTML !== (value || "")) el.innerHTML = value || "";
  }, [value]);

  // ── Persist selection on blur / mouseup ───────────────────────────────
  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // ── Restore persisted selection ────────────────────────────────────────
  const restoreRange = useCallback(() => {
    if (!savedRange.current) return false;
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      try {
        sel.addRange(savedRange.current);
      } catch {
        // Range is detached (DOM was restructured by list/indent command)
        savedRange.current = null;
        return false;
      }
    }
    return true;
  }, []);

  // ── Refresh toolbar active-state indicators ────────────────────────────
  const refreshFmt = useCallback(() => {
    const inList =
      document.queryCommandState("insertUnorderedList") ||
      document.queryCommandState("insertOrderedList");

    setFmt({
      bold:                document.queryCommandState("bold"),
      italic:              document.queryCommandState("italic"),
      underline:           document.queryCommandState("underline"),
      // Browsers report justifyLeft=true inside list items even with no
      // explicit alignment — suppress it so the button isn't stuck active.
      justifyLeft:         document.queryCommandState("justifyLeft"),
      justifyCenter:       document.queryCommandState("justifyCenter"),
      justifyRight:        document.queryCommandState("justifyRight"),
      justifyFull:         document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList:   document.queryCommandState("insertOrderedList"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshFmt);
    return () => document.removeEventListener("selectionchange", refreshFmt);
  }, [refreshFmt]);

  // ── Core command runner ────────────────────────────────────────────────
  const run = useCallback((cmd, arg = null) => {
    if (!restoreRange()) editorRef.current?.focus();
    document.execCommand(cmd, false, arg);

    // Re-save the post-command selection so the next toolbar click works.
    // outdent/indent restructure the DOM (unwrap/wrap blockquotes), so the
    // browser selection doesn't settle synchronously — defer one frame to
    // avoid capturing a detached range that breaks the following command.
    const resave = () => {
      const sel = window.getSelection();
      if (sel?.rangeCount > 0) {
        try { savedRange.current = sel.getRangeAt(0).cloneRange(); }
        catch { savedRange.current = null; }
      }
    };

    if (cmd === "outdent" || cmd === "indent") {
      requestAnimationFrame(resave);
    } else {
      resave();
    }

    skipSync.current = true;
    onChange(editorRef.current?.innerHTML || "");
    refreshFmt();
  }, [restoreRange, onChange, refreshFmt]);

  // ── Font family ────────────────────────────────────────────────────────
  const applyFont = (e) => {
    setFont(e.target.value);
    run("fontName", e.target.value);
  };

  // ── Font size ──────────────────────────────────────────────────────────
  const applySize = (newSize) => {
    const s = Math.max(8, Math.min(72, newSize));
    setFontSize(s);
    if (!restoreRange()) editorRef.current?.focus();
    // execCommand only supports sizes 1-7; use "7" then override with CSS
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
      el.removeAttribute("size");
      el.style.fontSize = `${s}pt`;
    });
    skipSync.current = true;
    onChange(editorRef.current?.innerHTML || "");
  };

  // ── Text / highlight color ─────────────────────────────────────────────
  const applyColor     = (e) => run("foreColor", e.target.value);
  const applyHighlight = (e) => run("backColor", e.target.value);

  const clearFormat = () => {
    if (!restoreRange()) editorRef.current?.focus();
    // Remove list if inside one
    if (document.queryCommandState("insertUnorderedList")) {
      document.execCommand("insertUnorderedList", false, null);
    }
    if (document.queryCommandState("insertOrderedList")) {
      document.execCommand("insertOrderedList", false, null);
    }
    document.execCommand("removeFormat", false, null);
    document.execCommand("justifyLeft", false, null);
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) {
      try { savedRange.current = sel.getRangeAt(0).cloneRange(); } catch { /* ignore */ }
    }
    skipSync.current = true;
    onChange(editorRef.current?.innerHTML || "");
    refreshFmt();
  };




  // ── Link & image ───────────────────────────────────────────────────────
  const insertLink = () => {
    saveRange();
    const url = window.prompt("Enter URL:", "https://");
    if (url && url !== "https://") run("createLink", url);
  };

  const insertImage = () => {
    saveRange();
    const url = window.prompt("Enter image URL:", "https://");
    if (url && url !== "https://") run("insertImage", url);
  };

  // ── Toolbar button style helper ────────────────────────────────────────
  const btn = (active) => ({
    background:     active ? "#38bdf8" : "none",
    border:         "none",
    color:          active ? "#0f172a" : "#d1d5db",
    cursor:         "pointer",
    padding:        "4px 8px",
    borderRadius:   "5px",
    fontSize:       "0.85rem",
    fontWeight:     active ? "700" : "400",
    lineHeight:     1,
    minWidth:       "28px",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  });

  const sep = (
    <div style={{ width: "1px", height: "20px", backgroundColor: "#3e444a", margin: "0 4px", flexShrink: 0 }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

      {/* ── Toolbar ── */}
      <div style={tb.bar}>

        {/* Font family */}
        <select style={tb.select} value={font} onMouseDown={saveRange} onChange={applyFont}>
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        {sep}

        {/* Font size */}
        <button style={btn(false)} title="Decrease size"
          onMouseDown={(e) => { e.preventDefault(); saveRange(); applySize(fontSize - 1); }}>
          −
        </button>
        <select
          style={{ ...tb.select, width: "52px", textAlign: "center" }}
          value={fontSize}
          onMouseDown={saveRange}
          onChange={(e) => applySize(Number(e.target.value))}
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button style={btn(false)} title="Increase size"
          onMouseDown={(e) => { e.preventDefault(); saveRange(); applySize(fontSize + 1); }}>
          +
        </button>

        {sep}

        {/* Bold / Italic / Underline */}
        <button style={btn(fmt.bold)} title="Bold"
          onMouseDown={(e) => { e.preventDefault(); run("bold"); }}>
          <b>B</b>
        </button>
        <button style={{ ...btn(fmt.italic), fontStyle: "italic" }} title="Italic"
          onMouseDown={(e) => { e.preventDefault(); run("italic"); }}>
          <i>I</i>
        </button>
        <button style={{ ...btn(fmt.underline), textDecoration: "underline" }} title="Underline"
          onMouseDown={(e) => { e.preventDefault(); run("underline"); }}>
          <u>U</u>
        </button>

        {sep}

        {/* Text color */}
        <label style={tb.colorLabel} title="Text color">
          <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#d1d5db" }}>A</span>
          <input type="color" defaultValue="#ffffff" style={tb.colorInput}
            onMouseDown={(e) => { e.preventDefault(); saveRange(); }}
            onChange={applyColor} />
        </label>

        {/* Highlight */}
        <label style={tb.colorLabel} title="Highlight">
          <span style={{ fontSize: "0.85rem" }}>🖊</span>
          <input type="color" defaultValue="#fbbf24" style={tb.colorInput}
            onMouseDown={(e) => { e.preventDefault(); saveRange(); }}
            onChange={applyHighlight} />
        </label>

        {sep}

        {/* Alignment */}
        <button style={btn(fmt.justifyLeft)} title="Align left"
          onMouseDown={(e) => { e.preventDefault(); run("justifyLeft"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <rect x="0" y="0" width="14" height="2"/>
            <rect x="0" y="5" width="10" height="2"/>
            <rect x="0" y="10" width="12" height="2"/>
          </svg>
        </button>
        <button style={btn(fmt.justifyCenter)} title="Align center"
          onMouseDown={(e) => { e.preventDefault(); run("justifyCenter"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <rect x="0" y="0" width="14" height="2"/>
            <rect x="2" y="5" width="10" height="2"/>
            <rect x="1" y="10" width="12" height="2"/>
          </svg>
        </button>
        <button style={btn(fmt.justifyRight)} title="Align right"
          onMouseDown={(e) => { e.preventDefault(); run("justifyRight"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <rect x="0" y="0" width="14" height="2"/>
            <rect x="4" y="5" width="10" height="2"/>
            <rect x="2" y="10" width="12" height="2"/>
          </svg>
        </button>
        <button style={btn(fmt.justifyFull)} title="Justify"
          onMouseDown={(e) => { e.preventDefault(); run("justifyFull"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <rect x="0" y="0" width="14" height="2"/>
            <rect x="0" y="5" width="14" height="2"/>
            <rect x="0" y="10" width="14" height="2"/>
          </svg>
        </button>

        {sep}

        {/* Lists */}
        <button style={btn(fmt.insertUnorderedList)} title="Bullet list"
          onMouseDown={(e) => { e.preventDefault(); run("insertUnorderedList"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <circle cx="1.5" cy="1.5" r="1.5"/>
            <rect x="4" y="0" width="10" height="2"/>
            <circle cx="1.5" cy="6" r="1.5"/>
            <rect x="4" y="5" width="10" height="2"/>
            <circle cx="1.5" cy="10.5" r="1.5"/>
            <rect x="4" y="10" width="10" height="2"/>
          </svg>
        </button>
        <button style={btn(fmt.insertOrderedList)} title="Numbered list"
          onMouseDown={(e) => { e.preventDefault(); run("insertOrderedList"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <text x="0" y="3" fontSize="4" fontFamily="Arial">1.</text>
            <rect x="5" y="0" width="9" height="2"/>
            <text x="0" y="8" fontSize="4" fontFamily="Arial">2.</text>
            <rect x="5" y="5" width="9" height="2"/>
            <text x="0" y="13" fontSize="4" fontFamily="Arial">3.</text>
            <rect x="5" y="10" width="9" height="2"/>
          </svg>
        </button>

        {sep}

        {/* Indent / Outdent */}
        <button style={btn(false)} title="Outdent"
          onMouseDown={(e) => { e.preventDefault(); run("outdent"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <polygon points="0,6 4,2 4,10"/>
            <rect x="5" y="0" width="9" height="2"/>
            <rect x="5" y="5" width="9" height="2"/>
            <rect x="5" y="10" width="9" height="2"/>
          </svg>
        </button>
        <button style={btn(false)} title="Indent"
          onMouseDown={(e) => { e.preventDefault(); run("indent"); }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor">
            <polygon points="0,2 4,6 0,10"/>
            <rect x="5" y="0" width="9" height="2"/>
            <rect x="5" y="5" width="9" height="2"/>
            <rect x="5" y="10" width="9" height="2"/>
          </svg>
        </button>

        {sep}

        {/* Image & Link */}
        <button style={btn(false)} title="Insert image"
          onMouseDown={(e) => { e.preventDefault(); insertImage(); }}>
          🖼
        </button>
        <button style={btn(false)} title="Insert link"
          onMouseDown={(e) => { e.preventDefault(); insertLink(); }}>
          🔗
        </button>

        {sep}

        {/* Clear formatting */}
        <button style={{ ...btn(false), color: "#f87171" }} title="Clear formatting"
          onMouseDown={(e) => { e.preventDefault(); clearFormat(); }}>
          Tx
        </button>

      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          skipSync.current = true;
          onChange(editorRef.current?.innerHTML || "");
        }}
        onBlur={saveRange}
        onKeyUp={refreshFmt}
        onMouseUp={() => { saveRange(); refreshFmt(); }}
        data-placeholder={placeholder}
        style={{
          flex:            1,
          minHeight,
          padding:         "16px 20px",
          color:           "#d1d5db",
          fontSize:        "1rem",
          lineHeight:      "1.7",
          outline:         "none",
          overflowY:       "auto",
          wordBreak:       "break-word",
          backgroundColor: "transparent",
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #4b5563;
          pointer-events: none;
        }
        [contenteditable] img { max-width: 100%; border-radius: 6px; margin: 4px 0; }
        [contenteditable] a { color: #38bdf8; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 24px; }
        [contenteditable] li { list-style-position: inside; }
        [contenteditable] li[style*="text-align: center"] { text-align: center; }
        [contenteditable] li[style*="text-align: right"]  { text-align: right; }
        [contenteditable] li[style*="text-align: left"]   { text-align: left; }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const tb = {
  bar: {
    display:         "flex",
    alignItems:      "center",
    gap:             "2px",
    padding:         "6px 12px",
    backgroundColor: "#1e2124",
    borderBottom:    "1px solid #2d3135",
    flexWrap:        "wrap",
    flexShrink:      0,
  },
  select: {
    backgroundColor: "#2d3135",
    color:           "#d1d5db",
    border:          "1px solid #3e444a",
    borderRadius:    "5px",
    padding:         "3px 6px",
    fontSize:        "0.82rem",
    outline:         "none",
    cursor:          "pointer",
  },
  colorLabel: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    cursor:         "pointer",
    padding:        "2px 5px",
    borderRadius:   "5px",
    gap:            "1px",
  },
  colorInput: {
    width:        "20px",
    height:       "6px",
    border:       "none",
    padding:      0,
    cursor:       "pointer",
    borderRadius: "2px",
  },
};