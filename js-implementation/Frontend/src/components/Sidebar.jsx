import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import notesLogo from "../../../../shared-resources/Notes Logo.svg";
import api from "../utils/api";
import { TagIcon, LockIcon, TrashIcon, CategoryIcon, UserIcon, LogoutIcon, NotesIcon } from "../../../../shared-resources/icons";

export default function Sidebar({ onNewNote, counts = {} }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      navigate("/");
    }
  };

  const navItems = [
    { label: "All Notes", path: "/Home", icon: <NotesIcon />, badge: counts.notes ?? null },
    { label: "Category", path: "/category", icon: <CategoryIcon />},
    { label: "Tags", path: "/tags", icon: <TagIcon /> },
  ];

  const isActive = (path) => location.pathname.toLowerCase() === path.toLowerCase();

  return (
    <aside style={s.sidebar}>
      <div style={s.logoWrap} onClick={() => navigate("/Home")}>
        <img src={notesLogo} alt="Notes" style={s.logo} />
      </div>

      <button
        style={s.newNoteBtn}
        onClick={() => {
          if (location.pathname.toLowerCase() === "/home") {
            if (onNewNote) onNewNote();
          } else {
            navigate("/Home", { state: { openNewNote: true } });
          }
        }}
      >
        New Note +
      </button>

      <nav style={s.nav}>
        {navItems.map(item => (
          <div
            key={item.path}
            style={isActive(item.path) ? s.itemActive : s.item}
            onClick={() => navigate(item.path)}
          >
            <span style={s.itemLeft}>
              <span style={s.itemIcon}>{item.icon}</span>
              {item.label}
            </span>
            {item.badge != null && item.badge > 0 && (
              <span style={isActive(item.path) ? s.badgeActive : s.badge}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </nav>

      <div style={s.bottom}>
        <div
          style={isActive("/settings") ? s.itemActive : s.item}
          onClick={() => navigate("/settings")}
        >
          <span style={s.itemLeft}>
            <span style={s.itemIcon}><UserIcon /></span> Account Management
          </span>
        </div>
        <div
          style={{ ...s.item, color: "#f87171", marginTop: "4px" }}
          onClick={handleLogout}
        >
          <span style={s.itemLeft}>
            <span style={s.itemIcon}><LogoutIcon /></span> Log Out
          </span>
        </div>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: "250px", backgroundColor: "#1a1d20",
    borderRight: "1px solid #2d3135",
    display: "flex", flexDirection: "column",
    padding: "22px 14px", height: "100vh",
    position: "fixed", top: 0, left: 0,
    boxSizing: "border-box", zIndex: 100,
    fontFamily: "'Inter', sans-serif"
  },
  logoWrap: { marginBottom: "22px", cursor: "pointer" },
  logo: { height: "24px" },
  newNoteBtn: {
    width: "100%", padding: "11px", backgroundColor: "#38bdf8",
    border: "none", borderRadius: "8px", color: "#ffffff",
    fontWeight: "700", cursor: "pointer", marginBottom: "22px",
    fontSize: "0.9rem"
  },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: "2px"},
  item: {
    padding: "9px 12px", borderRadius: "8px", cursor: "pointer",
    color: "#9ca3af", display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: "0.9rem"
  },
  itemActive: {
    padding: "9px 12px", borderRadius: "8px", cursor: "pointer",
    color: "#1a1d20", backgroundColor: "#ffffff",
    display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: "0.9rem", fontWeight: "600"
  },
  itemLeft: { display: "flex", alignItems: "center", gap: "10px" },
  itemIcon: { fontSize: "0.95rem" },
  badge: {
    backgroundColor: "#2d3135", color: "#9ca3af",
    padding: "1px 7px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: "600"
  },
  badgeActive: {
    backgroundColor: "#bebfc1", color: "#0f172a",
    padding: "1px 7px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: "700"
  },
  bottom: { borderTop: "1px solid #2d3135", paddingTop: "12px" }
};
