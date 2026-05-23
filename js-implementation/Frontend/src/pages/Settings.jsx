import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { UserIcon, TrashIcon, LockIcon, EmailIcon } from "../../../../shared-resources/icons";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [noteCount, setNoteCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    api.get("/api/auth/me")
      .then(res => {
        setUser(res.data);
        setDisplayName(res.data.displayName || "");
      })
      .catch(err => {
        if (err.response?.status === 401) navigate("/");
      });

    api.get("/api/notes/")
      .then(res => setNoteCount(res.data.length))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaveError("");
    try {
      await api.put("/api/auth/me", { displayName });
      setUser(prev => ({ ...prev, displayName }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.error || "Failed to save changes.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete("/api/auth/account");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete account.");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/api/notes/");
      const notes = res.data;
      const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "notes-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export notes.");
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const notes = JSON.parse(text);
      if (!Array.isArray(notes)) {
        alert("Invalid JSON format. Expected an array of notes.");
        return;
      }
      let imported = 0;
      for (const note of notes) {
        try {
          await api.post("/api/notes/", {
            noteTitle: note.noteTitle || note.title || "Untitled",
            noteBody: note.noteBody || note.content || "",
            isPinned: note.isPinned || 0,
          });
          imported++;
        } catch {
          // skip notes that fail
        }
      }
      const res = await api.get("/api/notes/");
      setNoteCount(res.data.length);
      alert(`Successfully imported ${imported} note(s).`);
    } catch {
      alert("Failed to read or parse the JSON file.");
    }
    // reset so same file can be re-imported if needed
    e.target.value = "";
  };

  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div style={s.page}>
      <Sidebar counts={{}} />
      <div style={s.workspace}>
        <Header user={user} />
        <main style={s.main}>

          {/* Page title row with action buttons */}
          <div style={s.titleRow}>
            <div>
              <h2 style={s.pageTitle}>Account Management</h2>
              <p style={s.pageSub}>Manage your account preferences and application environment.</p>
            </div>
            <div style={s.actionBtnGroup}>
              {/* Hidden file input for import */}
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
              <button style={s.importBtn} onClick={handleImportClick}>
                ⬆ Import
              </button>
              <button style={s.exportBtn} onClick={handleExport}>
                ⬇ Export
              </button>
              <button style={s.deleteTopBtn} onClick={() => setShowDeleteConfirm(true)}>
                <TrashIcon /> Delete Account
              </button>
            </div>
          </div>

          {/* Profile card */}
          <div style={s.profileCard}>
            <div style={s.profileLeft}>
              <div style={s.avatarWrap}>
                <div style={s.avatar}>{initials}</div>
                <div style={s.onlineDot} />
              </div>
              <div>
                <div style={s.profileName}>
                  {displayName || "—"}
                </div>
                <div style={s.profileRole}>{user?.userEmail || "—"}</div>
                <div style={s.profileStats}>
                  <span>{noteCount} Notes</span>
                  <span style={s.statDivider}>|</span>
                  <span>Joined {joinedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account info section */}
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Account Information</h3>
            <p style={s.sectionSub}>Update your personal identity and contact details.</p>

            <div style={s.fieldsRow}>
              <div style={s.fieldGroup}>
                <label style={s.label}>Display Name</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}><UserIcon /></span>
                  <input
                    style={s.input}
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Email Address</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}><EmailIcon /></span>
                  <input style={{ ...s.input, color: "#9ca3af" }} type="email" value={user?.userEmail || ""} disabled />
                </div>
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>Password</label>
                <div style={s.inputWrap}>
                  <span style={s.inputIcon}><LockIcon /></span>
                  <input style={s.input} type="password" value="••••••••••••" disabled />
                </div>
              </div>
            </div>

            <div style={s.actionButtons}>
              <button style={s.changePasswordBtn} onClick={() => navigate("/forgot-password")}>
                Change Password
              </button>
            </div>

            <div style={s.saveRow}>
              {saveError && <span style={s.saveError}>{saveError}</span>}
              {!saveError && <span style={s.lastUpdated}> </span>}
              <button style={s.saveBtn} onClick={handleSave}>
                {saved ? "✓ Saved!" : "Save Changes"}
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={s.modalOverlay}>
          <div style={s.modalBox}>
            <div style={s.modalIcon}>⚠️</div>
            <h3 style={s.modalTitle}>Delete Account</h3>
            <p style={s.modalText}>
              Are you sure you want to permanently delete your account? This action
              <strong style={{ color: "#f87171" }}> cannot be undone</strong> and all your notes will be lost.
            </p>
            <div style={s.modalBtns}>
              <button style={s.modalCancelBtn} onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button style={s.modalDeleteBtn} onClick={handleDeleteAccount}>
                Yes, Delete My Account
              </button>
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
  main: { flex: 1, padding: "36px 40px", overflowY: "auto", color: "#fff" },

  // Title row with buttons
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" },
  pageTitle: { fontSize: "1.8rem", fontWeight: "700", margin: "0 0 6px 0" },
  pageSub: { color: "#9ca3af", fontSize: "0.9rem", margin: 0 },
  actionBtnGroup: { display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" },
  importBtn: { padding: "9px 18px", backgroundColor: "#1e2124", color: "#38bdf8", border: "1px solid #38bdf8", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", minWidth: "140px", textAlign: "center" },
  exportBtn: { padding: "9px 18px", backgroundColor: "#1e2124", color: "#9ca3af", border: "1px solid #2d3135", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", minWidth: "140px", textAlign: "center" },
  deleteTopBtn: { display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", padding: "9px 18px", backgroundColor: "transparent", color: "#f87171", border: "1px solid #3a2020", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", minWidth: "140px" },

  // Profile card
  profileCard: { backgroundColor: "#1e2124", borderRadius: "12px", padding: "24px 28px", border: "1px solid #2d3135", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  profileLeft: { display: "flex", alignItems: "center", gap: "20px" },
  avatarWrap: { position: "relative" },
  avatar: { width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#3a4a5a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: "700", color: "#fff", border: "3px solid #2d3135" },
  onlineDot: { position: "absolute", bottom: "4px", right: "4px", width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#22c55e", border: "2px solid #1e2124" },
  profileName: { fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px" },
  profileRole: { color: "#9ca3af", fontSize: "0.88rem", marginBottom: "8px" },
  profileStats: { display: "flex", gap: "8px", fontSize: "0.82rem", color: "#6b7280" },
  statDivider: { color: "#3e444a" },

  // Account info section
  section: { backgroundColor: "#1e2124", borderRadius: "12px", padding: "24px 28px", border: "1px solid #2d3135", marginBottom: "20px" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: "700", margin: "0 0 4px 0" },
  sectionSub: { color: "#9ca3af", fontSize: "0.85rem", marginBottom: "20px" },
  fieldsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" },
  fieldGroup: {},
  label: { display: "block", marginBottom: "7px", fontSize: "0.82rem", color: "#9ca3af", fontWeight: "500" },
  inputWrap: { display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#131517", borderRadius: "8px", padding: "9px 12px", border: "1px solid #2d3135" },
  inputIcon: { fontSize: "0.85rem", flexShrink: 0 },
  input: { flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "0.88rem" },
  actionButtons: { marginBottom: "16px" },
  changePasswordBtn: { padding: "10px 18px", backgroundColor: "#38bdf8", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" },
  saveRow: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #2d3135", paddingTop: "16px" },
  lastUpdated: { color: "#6b7280", fontSize: "0.82rem" },
  saveError: { color: "#f87171", fontSize: "0.82rem" },
  saveBtn: { padding: "9px 20px", backgroundColor: "#38bdf8", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" },

  // Delete confirmation modal
  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox: { backgroundColor: "#1e2124", border: "1px solid #3a2020", borderRadius: "14px", padding: "36px 32px", maxWidth: "420px", width: "90%", textAlign: "center" },
  modalIcon: { fontSize: "2.5rem", marginBottom: "12px" },
  modalTitle: { fontSize: "1.3rem", fontWeight: "700", color: "#f87171", margin: "0 0 12px 0" },
  modalText: { color: "#9ca3af", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "28px" },
  modalBtns: { display: "flex", gap: "12px", justifyContent: "center" },
  modalCancelBtn: { flex: 1, padding: "11px", backgroundColor: "#2d3135", color: "#fff", border: "1px solid #3e444a", borderRadius: "8px", fontWeight: "600", fontSize: "0.88rem", cursor: "pointer" },
  modalDeleteBtn: { flex: 1, padding: "11px", backgroundColor: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", borderRadius: "8px", fontWeight: "600", fontSize: "0.88rem", cursor: "pointer" },
};
