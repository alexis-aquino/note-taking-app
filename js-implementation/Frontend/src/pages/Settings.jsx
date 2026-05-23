import { useState, useEffect } from "react";
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
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    try {
      await api.delete("/api/auth/account");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete account.");
    }
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
          <h2 style={s.pageTitle}>Account Management</h2>
          <p style={s.pageSub}>Manage your account preferences and application environment.</p>

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

          {/* Security section */}
          <div style={s.securityCard}>
            <div style={s.securityLeft}>
              <span style={s.securityIcon}>⚠️</span>
              <div>
                <div style={s.securityTitle}>Account Security</div>
                <div style={s.securitySub}>Manage active sessions and your account's permanent status.</div>
              </div>
            </div>
          </div>


          <button style={s.deleteBtn} onClick={handleDeleteAccount}>
            <TrashIcon /> Delete Account
          </button>
        </main>
      </div>
    </div>
  );
}

const s = {
  page: { display: "flex", height: "100vh", width: "100vw", backgroundColor: "#131517", fontFamily: "'Inter', sans-serif", overflow: "hidden" },
  workspace: { display: "flex", flexDirection: "column", flex: 1, marginLeft: "250px", height: "100vh" },
  main: { flex: 1, padding: "36px 40px", overflowY: "auto", color: "#fff" },
  pageTitle: { fontSize: "1.8rem", fontWeight: "700", margin: "0 0 6px 0" },
  pageSub: { color: "#9ca3af", fontSize: "0.9rem", marginBottom: "28px" },
  profileCard: { backgroundColor: "#1e2124", borderRadius: "12px", padding: "24px 28px", border: "1px solid #2d3135", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  profileLeft: { display: "flex", alignItems: "center", gap: "20px" },
  avatarWrap: { position: "relative" },
  avatar: { width: "72px", height: "72px", borderRadius: "50%", backgroundColor: "#3a4a5a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: "700", color: "#fff", border: "3px solid #2d3135" },
  onlineDot: { position: "absolute", bottom: "4px", right: "4px", width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#22c55e", border: "2px solid #1e2124" },
  profileName: { fontSize: "1.2rem", fontWeight: "700", marginBottom: "4px" },
  profileRole: { color: "#9ca3af", fontSize: "0.88rem", marginBottom: "8px" },
  profileStats: { display: "flex", gap: "8px", fontSize: "0.82rem", color: "#6b7280" },
  statDivider: { color: "#3e444a" },
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
  securityCard: { flex: 1, backgroundColor: "#2a1a1a", border: "1px solid #5a2a2a", borderRadius: "10px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  securityLeft: { display: "flex", gap: "12px", alignItems: "flex-start" },
  securityIcon: { fontSize: "1.1rem", marginTop: "2px" },
  securityTitle: { color: "#fca5a5", fontWeight: "600", fontSize: "0.9rem", marginBottom: "4px" },
  securitySub: { color: "#9ca3af", fontSize: "0.82rem" },
  deleteBtn: { width: "100%", padding: "13px", backgroundColor: "transparent", color: "#f87171", border: "1px solid #3a2020", borderRadius: "8px", fontWeight: "600", fontSize: "0.9rem", cursor: "pointer", textAlign: "left" }
};
