import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import notesLogo from "../../../../shared-resources/Notes Logo.svg";
import api from "../utils/api";
import { ShowPass, HidePass } from "../../../../shared-resources/icons";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", { userEmail: email, userPassword: password });
      if (response.data.message) {
        navigate("/Home");
      }
    } catch (err) {
      console.error("Login Error:", err.response?.data?.error);
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrapper}>
      {/* Left brand panel */}
      <div style={s.left}>
        <img src={notesLogo} alt="Notes Logo" style={s.logo} />
        <p style={s.tagline}>
          Your thoughts,<br />organized and<br />accessible<br />everywhere.
        </p>
      </div>

      {/* Right form panel */}
      <div style={s.right}>
        <form style={s.form} onSubmit={handleLogin}>
          <h2 style={s.title}>Welcome Back</h2>
          <p style={s.sub}>Please enter your details to sign in to your account.</p>

          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <input
              style={s.input}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={s.passwordWrap}>
              <input
                style={{ ...s.input, paddingRight: "44px" }}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                style={s.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <HidePass /> : <ShowPass />}
              </button>
            </div>
          </div>

          <div style={s.row}>
            <label style={s.checkLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ marginRight: "8px", cursor: "pointer" }}
              />
              Remember for me
            </label>
            <Link to="/forgot-password" style={s.forgotLink}>Forgot password?</Link>
          </div>

          <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {error && <p style={s.error}>{error}</p>}

          <p style={s.footer}>
            Don't have an account?{" "}
            <Link to="/signup" style={s.link}>Create an account</Link>
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
    padding: "80px", color: "white"
  },
  logo: { width: "190px", marginBottom: "50px" },
  tagline: { fontSize: "2rem", fontWeight: "700", lineHeight: "1.3", opacity: 0.9 },
  right: {
    flex: 1, backgroundColor: "#dde1e5",
    display: "flex", justifyContent: "center", alignItems: "center"
  },
  form: { width: "400px" },
  title: { fontSize: "2rem", fontWeight: "700", color: "#111", margin: "0 0 6px 0" },
  sub: { color: "#666", fontSize: "0.9rem", marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid #c5c9ce" },
  field: { marginBottom: "18px" },
  label: { display: "block", marginBottom: "7px", fontWeight: "600", fontSize: "0.85rem", color: "#333" },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: "8px",
    border: "1px solid #c5c9ce", boxSizing: "border-box",
    fontSize: "0.95rem", backgroundColor: "#fff", outline: "none",
    color: "#111"
  },
  passwordWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", fontSize: "1rem", padding: 0
  },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" },
  checkLabel: { fontSize: "0.85rem", color: "#555", display: "flex", alignItems: "center", cursor: "pointer" },
  forgotLink: { fontSize: "0.85rem", color: "#111", fontWeight: "600", textDecoration: "none" },
  btn: {
    width: "100%", padding: "13px", backgroundColor: "#111", color: "#fff",
    borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: "700", fontSize: "0.95rem"
  },
  footer: { marginTop: "18px", textAlign: "center", color: "#666", fontSize: "0.88rem" },
  link: { color: "#111", fontWeight: "700", textDecoration: "none" },
  error: { marginTop: "12px", color: "#ef4444", fontSize: "0.85rem", textAlign: "center" }
};
