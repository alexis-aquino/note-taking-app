import { useRef, useEffect, useCallback, useState } from "react";
import { TagIcon, CategoryIcon, PinIcon } from "../../../../shared-resources/icons";

const FONTS = ["Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS", "Times New Roman"];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

export default function RichTextEditor({ value, onChange, placeholder = "Start writing…", minHeight = "200px" }) {
  const editorRef = useRef(null);
  const isInternalChange = useRef(false);
  const [font, setFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(11);
  const [activeFormats, setActiveFormats] = useState({});
  const savedRange = useRef(null);

  // Sync external value → editor (only when not typing inside)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  // Track active formats on selection change
  const updateActiveFormats = useCallback(() => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const exec = (command, value = null) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    notifyChange();
    updateActiveFormats();
  };

  const notifyChange = () => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML || "");
  };

  const handleInput = () => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML || "");
  };

  const handleFontChange = (e) => {
    const f = e.target.value;
    setFont(f);
    exec("fontName", f);
  };

  const handleFontSizeChange = (val) => {
    const newSize = Math.max(8, Math.min(72, val));
    setFontSize(newSize);
    // execCommand fontSize only accepts 1-7; use a workaround with inline style
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand("fontSize", false, "7");
    // Replace the font size 7 spans with actual px size
    const spans = editorRef.current?.querySelectorAll('font[size="7"]');
    spans?.forEach(span => {
      span.removeAttribute("size");
      span.style.fontSize = `${newSize}pt`;
    });
    notifyChange();
  };

  const handleTextColor = (e) => exec("foreColor", e.target.value);
  const handleHighlight = (e) => exec("hiliteColor", e.target.value);

  const handleLink = () => {
    saveSelection();
    const url = window.prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  };

  const handleImage = () => {
    saveSelection();
    const url = window.prompt("Enter image URL:", "https://");
    if (url) exec("insertImage", url);
  };

  const btnStyle = (active) => ({
    background: active ? "#38bdf8" : "none",
    border: "none",
    color: active ? "#0f172a" : "#d1d5db",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "5px",
    fontSize: "0.85rem",
    fontWeight: active ? "700" : "400",
    lineHeight: 1,
    minWidth: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const divider = <div style={{ width: "1px", height: "20px", backgroundColor: "#3e444a", margin: "0 4px", flexShrink: 0 }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* Formatting toolbar */}
      <div style={tb.bar}>
        {/* Font family */}
        <select
          style={tb.select}
          value={font}
          onChange={handleFontChange}
          onMouseDown={saveSelection}
        >
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {divider}

        {/* Font size */}
        <button style={btnStyle(false)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); handleFontSizeChange(fontSize - 1); }} title="Decrease size">−</button>
        <select
          style={{ ...tb.select, width: "52px", textAlign: "center" }}
          value={fontSize}
          onChange={(e) => { saveSelection(); handleFontSizeChange(Number(e.target.value)); }}
          onMouseDown={saveSelection}
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button style={btnStyle(false)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); handleFontSizeChange(fontSize + 1); }} title="Increase size">+</button>

        {divider}

        {/* Bold / Italic / Underline */}
        <button style={btnStyle(activeFormats.bold)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("bold"); }} title="Bold"><b>B</b></button>
        <button style={{ ...btnStyle(activeFormats.italic), fontStyle: "italic" }} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("italic"); }} title="Italic"><i>I</i></button>
        <button style={{ ...btnStyle(activeFormats.underline), textDecoration: "underline" }} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("underline"); }} title="Underline"><u>U</u></button>

        {divider}

        {/* Text color */}
        <label style={tb.colorLabel} title="Text color">
          <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#d1d5db" }}>A</span>
          <input type="color" defaultValue="#ffffff" style={tb.colorInput} onInput={handleTextColor} onMouseDown={saveSelection} />
        </label>

        {/* Highlight */}
        <label style={tb.colorLabel} title="Highlight">
          <span style={{ fontSize: "0.85rem" }}>🖊</span>
          <input type="color" defaultValue="#fbbf24" style={tb.colorInput} onInput={handleHighlight} onMouseDown={saveSelection} />
        </label>

        {divider}

        {/* Alignment */}
        <button style={btnStyle(activeFormats.justifyLeft)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("justifyLeft"); }} title="Align left">≡</button>
        <button style={btnStyle(activeFormats.justifyCenter)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("justifyCenter"); }} title="Align center">≡</button>
        <button style={btnStyle(activeFormats.justifyRight)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("justifyRight"); }} title="Align right">≡</button>
        <button style={btnStyle(activeFormats.justifyFull)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("justifyFull"); }} title="Justify">≡</button>

        {divider}

        {/* Lists */}
        <button style={btnStyle(activeFormats.insertUnorderedList)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("insertUnorderedList"); }} title="Bullet list">≔</button>
        <button style={btnStyle(activeFormats.insertOrderedList)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("insertOrderedList"); }} title="Numbered list">≔</button>

        {divider}

        {/* Indent / Outdent */}
        <button style={btnStyle(false)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("outdent"); }} title="Outdent">⇤</button>
        <button style={btnStyle(false)} onMouseDown={(e) => { e.preventDefault(); saveSelection(); exec("indent"); }} title="Indent">⇥</button>

        {divider}

        {/* Image & Link */}
        <button style={btnStyle(false)} onMouseDown={(e) => { e.preventDefault(); handleImage(); }} title="Insert image">🖼</button>
        <button style={btnStyle(false)} onMouseDown={(e) => { e.preventDefault(); handleLink(); }} title="Insert link">🔗</button>
      </div>

      {/* Editable content area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        data-placeholder={placeholder}
        style={{
          flex: 1,
          minHeight,
          padding: "16px 20px",
          color: "#d1d5db",
          fontSize: "1rem",
          lineHeight: "1.7",
          outline: "none",
          overflowY: "auto",
          wordBreak: "break-word",
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
      `}</style>
    </div>
  );
}

const tb = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    padding: "6px 12px",
    backgroundColor: "#1e2124",
    borderBottom: "1px solid #2d3135",
    flexWrap: "wrap",
    flexShrink: 0,
  },
  select: {
    backgroundColor: "#2d3135",
    color: "#d1d5db",
    border: "1px solid #3e444a",
    borderRadius: "5px",
    padding: "3px 6px",
    fontSize: "0.82rem",
    outline: "none",
    cursor: "pointer",
  },
  colorLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    padding: "2px 5px",
    borderRadius: "5px",
    gap: "1px",
    position: "relative",
  },
  colorInput: {
    width: "18px",
    height: "6px",
    border: "none",
    padding: 0,
    cursor: "pointer",
    borderRadius: "2px",
    opacity: 0.9,
  },
};
