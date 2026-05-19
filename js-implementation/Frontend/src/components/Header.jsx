import { useNavigate } from "react-router-dom";

export default function Header({ searchQuery = "", setSearchQuery, user }) {
  const navigate = useNavigate();
  const initials = user?.displayName
    ? user.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header style={s.header}>
      <div style={s.searchWrap}>
        <span style={s.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search notes, tags, or categories..."
          style={s.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
        />
      </div>

      <div style={s.right}>
        <div style={{ ...s.profile, cursor: "pointer" }} onClick={() => navigate("/settings")} title="Account Management">
          <div style={s.profileText}>
            <span style={s.profileName}>{user?.displayName || "—"}</span>
            <span style={s.profileRole}>{user?.userEmail || ""}</span>
          </div>
          <div style={s.avatar}>{initials}</div>
          <div style={s.onlineDot} />
        </div>
      </div>
    </header>
  );
}

const s = {
  header: {
    height: "62px", borderBottom: "1px solid #2d3135",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 28px", backgroundColor: "#1a1d20", flexShrink: 0
  },
  searchWrap: {
    display: "flex", alignItems: "center", gap: "8px",
    backgroundColor: "#131517", border: "1px solid #2d3135",
    borderRadius: "8px", padding: "7px 14px", width: "380px"
  },
  searchIcon: { fontSize: "0.85rem", opacity: 0.5 },
  searchInput: {
    background: "none", border: "none", outline: "none",
    color: "#fff", fontSize: "0.88rem", width: "100%"
  },
  right: { display: "flex", alignItems: "center", gap: "16px" },
  notifBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1.1rem", color: "#9ca3af", padding: "4px"
  },
  profile: { display: "flex", alignItems: "center", gap: "10px", position: "relative" },
  profileText: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  profileName: { color: "#fff", fontSize: "0.88rem", fontWeight: "600" },
  profileRole: { color: "#38bdf8", fontSize: "0.72rem", fontWeight: "500" },
  avatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    backgroundColor: "#3a4a5a", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "700", fontSize: "0.8rem", border: "2px solid #2d3135"
  },
  onlineDot: {
    position: "absolute", bottom: "0", right: "0",
    width: "10px", height: "10px", borderRadius: "50%",
    backgroundColor: "#22c55e", border: "2px solid #1a1d20"
  }
};
