import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import notesLogo from "../assets/Notes Logo.svg";
import api from "../utils/api";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Password validation rules
  const rules = {
    length: form.password.length >= 8,
    number: /\d/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password),
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/api/auth/register", {
        userName: form.username,
        userEmail: form.email,
        userPassword: form.password
      });
      if (response.data.message) {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      {/* Back link inside left panel */}
      <div style={s.left}>
        <Link to="/" style={s.backLink}>‹ Back to Login</Link>
        <p style={s.welcomeTo}>Welcome to</p>
        <img src={notesLogo} alt="Notes Logo" style={s.logo} />
        <p style={s.tagline}>
          Your thoughts,<br />organized and<br />accessible<br />everywhere.
        </p>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <form style={s.form} onSubmit={handleSignUp}>
          <h2 style={s.title}>Create your account</h2>
          <p style={s.sub}>Please enter your details.</p>

          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} type="text" placeholder="mynotes123" value={form.username} onChange={set("username")} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <input style={s.input} type="email" placeholder="name@example.com" value={form.email} onChange={set("email")} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={s.passwordWrap}>
              <input
                style={{ ...s.input, paddingRight: "44px" }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={set("password")}
              />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {/* Password rules */}
            {form.password.length > 0 && (
              <div style={s.rulesGrid}>
                <span style={rules.length ? s.ruleOk : s.ruleFail}>✓ 8+ characters</span>
                <span style={rules.special ? s.ruleOk : s.ruleFail}>✓ Has special character</span>
                <span style={rules.number ? s.ruleOk : s.ruleFail}>✓ Contains a number</span>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Confirm Password</label>
            <div style={s.passwordWrap}>
              <input
                style={{ ...s.input, paddingRight: "44px" }}
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
              />
              <button type="button" style={s.eyeBtn} onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle confirm password">
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Creating account…" : "Sign Up →"}
          </button>

          {error && <p style={s.error}>{error}</p>}

          <p style={s.footer}>
            Already have an account?{" "}
            <Link to="/" style={s.link}>Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrapper: { display: "flex", height: "100vh", width: "100vw", fontFamily: "'Inter', sans-serif", overflow: "hidden" },
  left: {
    flex: 1,
    background: "linear-gradient(160deg, #1a1d20 0%, #2a2f34 100%)",
    display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "80px", color: "white", position: "relative"
  },
  backLink: {
    position: "absolute", top: "30px", left: "30px",
    color: "rgba(255,255,255,0.65)", textDecoration: "none",
    fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "4px"
  },
  welcomeTo: { fontSize: "1rem", opacity: 0.75, marginBottom: "10px" },
  logo: { width: "190px", marginBottom: "40px" },
  tagline: { fontSize: "2rem", fontWeight: "700", lineHeight: "1.3", opacity: 0.9 },
  right: {
    flex: 1, backgroundColor: "#dde1e5",
    display: "flex", justifyContent: "center", alignItems: "center", overflowY: "auto"
  },
  form: { width: "400px", padding: "20px 0" },
  title: { fontSize: "2rem", fontWeight: "700", color: "#111", margin: "0 0 6px 0" },
  sub: { color: "#666", fontSize: "0.9rem", marginBottom: "24px" },
  field: { marginBottom: "16px" },
  label: { display: "block", marginBottom: "7px", fontWeight: "600", fontSize: "0.85rem", color: "#333" },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #c5c9ce", boxSizing: "border-box",
    fontSize: "0.95rem", backgroundColor: "#fff", outline: "none", color: "#111"
  },
  passwordWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", fontSize: "1rem", padding: 0
  },
  rulesGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px",
    marginTop: "8px"
  },
  ruleOk: { fontSize: "0.78rem", color: "#22c55e" },
  ruleFail: { fontSize: "0.78rem", color: "#9ca3af" },
  btn: {
    width: "100%", padding: "13px", backgroundColor: "#111", color: "#fff",
    borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: "700", fontSize: "0.95rem", marginTop: "6px"
  },
  footer: { marginTop: "16px", textAlign: "center", color: "#666", fontSize: "0.88rem" },
  link: { color: "#111", fontWeight: "700", textDecoration: "none" },
  error: { marginTop: "12px", color: "#ef4444", fontSize: "0.85rem", textAlign: "center" }
};
