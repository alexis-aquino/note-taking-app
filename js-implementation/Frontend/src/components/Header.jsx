import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchIcon } from "../../../../shared-resources/icons";
import SearchModal from "./SearchModal";

export default function Header({ user, categories = [], allTags = [], onSelectNote }) {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const initials = user?.displayName
    ? user.displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      <header style={s.header}>
        <div /> {/* placeholder to keep search centred */}

        {/* Clicking the search bar opens the modal */}
        <div style={s.searchWrap} onClick={() => setIsSearchOpen(true)}>
          <span style={s.searchIcon}><SearchIcon /></span>
          <span style={s.searchPlaceholder}>Search notes, tags, or categories...</span>
        </div>

        <div style={s.right}>
          <div
            style={{ ...s.profile, cursor: "pointer" }}
            onClick={() => navigate("/settings")}
            title="Account Management"
          >
            <div style={s.profileText}>
              <span style={s.profileName}>{user?.displayName || "—"}</span>
              <span style={s.profileRole}>{user?.userEmail || ""}</span>
            </div>
            <div style={s.avatar}>{initials}</div>
          </div>
        </div>
      </header>

      {/* Search modal — rendered outside the header so it can cover the full viewport */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        categories={categories}
        allTags={allTags}
        onSelectNote={onSelectNote}
      />
    </>
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
    borderRadius: "8px", padding: "7px 14px", width: "380px",
    cursor: "pointer"
  },
  searchIcon: { fontSize: "0.85rem", opacity: 0.5 },
  searchPlaceholder: {
    color: "#6b7280", fontSize: "0.88rem", userSelect: "none"
  },
  right: { display: "flex", alignItems: "center", gap: "16px" },
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
};
