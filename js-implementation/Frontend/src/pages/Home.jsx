import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [activeNote, setActiveNote] = useState({
    title: "Project Ideas",
    content: "I've been thinking about possible features for our next app...",
  });

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div style={styles.container}>
      {/* 1. SIDEBAR (Left) */}
      <aside style={styles.sidebar}>
        <button style={styles.newNoteBtn}>New Note +</button>
        
        <nav style={styles.navGroup}>
          <div style={styles.navItemActive}>All Notes <span style={styles.badge}>12</span></div>
          <div style={styles.navItem}>☆ Favorites</div>
          <div style={styles.navItem}>📁 Category</div>
          <div style={styles.navItem}>🏷️ Tags</div>
          <div style={styles.navItem}>📥 Archive</div>
          <div style={styles.navItem}>🗑️ Trash</div>
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.navItem}>⚙️ Settings</div>
          <div style={styles.navItem} onClick={handleLogout}>Logout</div>
        </div>
      </aside>

      {/* 2. NOTE LIST (Middle) */}
      <section style={styles.noteList}>
        <div style={styles.listHeader}>
          <input type="text" placeholder="Search notes..." style={styles.searchBar} />
        </div>
        <div style={styles.notePreviewActive}>
          <h4 style={{ margin: "0 0 5px 0" }}>Project Ideas</h4>
          <p style={styles.previewText}>I've been thinking about possible features...</p>
          <span style={styles.dateText}>April 9</span>
        </div>
      </section>

      {/* 3. EDITOR (Right) */}
      <main style={styles.editorContainer}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarLeft}>
            <select style={styles.toolSelect}><option>Arial</option></select>
            <span style={styles.toolIcon}>B</span>
            <span style={styles.toolIcon}>I</span>
            <span style={styles.toolIcon}>U</span>
          </div>
          <div style={styles.toolbarRight}>
            <span>☆ Favorite</span>
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.editorArea}>
          <input 
            style={styles.titleInput} 
            value={activeNote.title} 
            onChange={(e) => setActiveNote({...activeNote, title: e.target.value})}
          />
          <textarea 
            style={styles.contentInput} 
            value={activeNote.content}
            onChange={(e) => setActiveNote({...activeNote, content: e.target.value})}
          />
        </div>

        {/* Floating Delete Button */}
        <button style={styles.deleteFab}>🗑️</button>
        
        <footer style={styles.footer}>
          <span>Word count: 842</span>
          <span>LAST EDITED 5 MINUTES AGO</span>
        </footer>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#1e2124",
    color: "#fff",
    fontFamily: "Inter, sans-serif",
  },
  sidebar: {
    width: "240px",
    backgroundColor: "#181a1d",
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    borderRight: "1px solid #2d2f34",
  },
  newNoteBtn: {
    backgroundColor: "#4bb3fd",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "30px",
  },
  navGroup: { flex: 1 },
  navItem: {
    padding: "10px",
    cursor: "pointer",
    color: "#9ca3af",
    fontSize: "0.9rem",
    borderRadius: "6px",
  },
  navItemActive: {
    padding: "10px",
    backgroundColor: "#fff",
    color: "#000",
    borderRadius: "6px",
    display: "flex",
    justifyContent: "space-between",
    fontWeight: "bold",
    marginBottom: "5px",
  },
  badge: { backgroundColor: "#e5e7eb", padding: "2px 6px", borderRadius: "10px", fontSize: "0.7rem" },
  sidebarBottom: { borderTop: "1px solid #2d2f34", paddingTop: "10px" },
  
  noteList: {
    width: "300px",
    backgroundColor: "#1e2124",
    borderRight: "1px solid #2d2f34",
    display: "flex",
    flexDirection: "column",
  },
  listHeader: { padding: "20px" },
  searchBar: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2d2f34",
    color: "white",
  },
  notePreviewActive: {
    padding: "20px",
    backgroundColor: "#2d2f34",
    margin: "0 10px",
    borderRadius: "8px",
    borderLeft: "4px solid #4bb3fd",
  },
  previewText: { fontSize: "0.8rem", color: "#9ca3af", margin: "5px 0" },
  dateText: { fontSize: "0.7rem", color: "#6b7280" },

  editorContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  toolbar: {
    height: "50px",
    borderBottom: "1px solid #2d2f34",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    justifyContent: "space-between",
  },
  toolIcon: { margin: "0 10px", color: "#9ca3af", cursor: "pointer" },
  editorArea: { flex: 1, padding: "40px", display: "flex", flexDirection: "column" },
  titleInput: {
    fontSize: "2rem",
    fontWeight: "bold",
    backgroundColor: "transparent",
    border: "none",
    color: "white",
    outline: "none",
    marginBottom: "20px",
  },
  contentInput: {
    flex: 1,
    backgroundColor: "transparent",
    border: "none",
    color: "#d1d5db",
    outline: "none",
    fontSize: "1.1rem",
    lineHeight: "1.6",
    resize: "none",
  },
  deleteFab: {
    position: "absolute",
    bottom: "60px",
    right: "30px",
    width: "50px",
    height: "50px",
    borderRadius: "25px",
    backgroundColor: "#ef4444",
    border: "none",
    color: "white",
    fontSize: "1.2rem",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  footer: {
    height: "40px",
    borderTop: "1px solid #2d2f34",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px",
    fontSize: "0.7rem",
    color: "#4b5563",
  }
};