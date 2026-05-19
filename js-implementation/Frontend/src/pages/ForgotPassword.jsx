import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import notesLogo from "../assets/Notes Logo.svg";
import api from "../utils/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.put("/api/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password changed successfully!");
      setTimeout(() => navigate("/settings"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <header style={s.topBar}>
        <img src={notesLogo} alt="Notes Logo" style={s.navLogo} />
      </header>

      <div style={s.center}>
        <div style={s.card}>
          <div style={s.iconWrap}>
            <span style={s.lockIcon}>🔒</span>
          </div>
          <h2 style={s.title}>Change Password</h2>

          <div style={s.infoBanner}>
            <span style={s.infoIcon}>ℹ️</span>
            <p style={s.infoText}>
              Your password must be at least 6 characters and should include a combination of numbers, letters and special characters (!$@%).
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Current Password</label>
              <div style={s.inputWrap}>
                <span style={s.fieldIcon}>🔒</span>
                <input
                  style={s.input}
                  type={showCurrent ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button type="button" style={s.eyeBtn} onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>New Password</label>
              <div style={s.inputWrap}>
                <span style={s.fieldIcon}>🔒</span>
                <input
                  style={s.input}
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button type="button" style={s.eyeBtn} onClick={() => setShowNew(!showNew)}>
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Confirm New Password</label>
              <div style={s.inputWrap}>
                <span style={s.fieldIcon}>🔒</span>
                <input
                  style={s.input}
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && <p style={s.errorMsg}>{error}</p>}
            {success && <p style={s.successMsg}>{success}</p>}

            <button type="submit" style={{ ...s.enterBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
              {loading ? "Saving…" : "Change Password →"}
            </button>
          </form>

          <div style={s.divider} />
          <Link to="/settings" style={s.backLink}>‹ Back to Settings</Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", backgroundColor: "#131517", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" },
  topBar: { height: "56px", backgroundColor: "#1a1d20", borderBottom: "1px solid #26292b", display: "flex", alignItems: "center", padding: "0 28px" },
  navLogo: { height: "22px" },
  center: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px" },
  card: { backgroundColor: "#1e2124", borderRadius: "14px", padding: "40px", width: "100%", maxWidth: "480px", border: "1px solid #2d3135" },
  iconWrap: { textAlign: "center", marginBottom: "10px" },
  lockIcon: { fontSize: "2rem" },
  title: { textAlign: "center", color: "#fff", fontSize: "1.6rem", fontWeight: "700", margin: "0 0 24px 0" },
  infoBanner: { backgroundColor: "#1a2a3a", border: "1px solid #2a4a6a", borderRadius: "8px", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "24px" },
  infoIcon: { fontSize: "1rem", flexShrink: 0, marginTop: "1px" },
  infoText: { color: "#7dd3fc", fontSize: "0.85rem", margin: 0, lineHeight: "1.5" },
  field: { marginBottom: "16px" },
  label: { display: "block", marginBottom: "7px", color: "#d1d5db", fontSize: "0.85rem", fontWeight: "500" },
  inputWrap: { display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#2d3135", borderRadius: "8px", padding: "11px 14px", border: "1px solid #3e444a" },
  fieldIcon: { fontSize: "0.9rem", opacity: 0.6, flexShrink: 0 },
  input: { flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: "0.95rem" },
  eyeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: 0, color: "#9ca3af" },
  errorMsg: { color: "#f87171", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" },
  successMsg: { color: "#34d399", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" },
  enterBtn: { width: "100%", padding: "13px", backgroundColor: "#38bdf8", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", marginTop: "8px" },
  divider: { borderTop: "1px solid #2d3135", margin: "24px 0" },
  backLink: { display: "block", textAlign: "center", color: "#9ca3af", textDecoration: "none", fontSize: "0.88rem" }
};
