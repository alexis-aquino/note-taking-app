import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import notesLogo from "../assets/Notes Logo.svg";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setError("");
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      alert("Account created successfully!");
      navigate("/"); 
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.mainWrapper}>
      <div style={styles.leftPanel}>
        <h1 style={styles.logo}><img src={notesLogo} style={{ width: '300px' }} alt="NoteApp Logo" /></h1>
        <p style={styles.tagline}>Join us today <br />to keep your ideas <br />safe and <br />syncing.</p>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <h2 style={styles.welcomeText}>Create Account</h2>
          <p style={styles.subtext}>Join thousands of organized thinkers.</p>

          {error && <p style={styles.errorText}>{error}</p>}

          <label style={styles.label}>User name</label>
          <input style={styles.input} type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />

          <label style={styles.label}>Email Address</label>
          <input style={styles.input} type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />

          <label style={styles.label}>Confirm Password</label>
          <input style={styles.input} type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

          <button style={styles.signInButton} onClick={handleSignUp} disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up →"}
          </button>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
            Already have an account? <Link to="/" style={styles.linkText}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainWrapper: { display: "flex", height: "100vh", width: "100vw", fontFamily: "Inter, sans-serif" },
  leftPanel: { flex: 1, backgroundColor: "#1e2124", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "80px", color: "white" },
  rightPanel: { flex: 1, backgroundColor: "#e5e7eb", display: "flex", justifyContent: "center", alignItems: "center", overflowY: "auto" },
  formContainer: { width: "400px", textAlign: "left", padding: "40px 0" },
  logo: { fontSize: "3rem", marginBottom: "2rem" },
  tagline: { fontSize: "1.5rem", opacity: 0.8 },
  welcomeText: { fontSize: "2rem", color: "#111", marginBottom: "0.5rem" },
  subtext: { color: "#666", marginBottom: "2rem" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold" },
  input: { width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ccc", boxSizing: "border-box" },
  signInButton: { width: "100%", padding: "12px", backgroundColor: "#1e2124", color: "white", borderRadius: "8px", cursor: "pointer", border: "none", fontSize: "1rem" },
  linkText: { color: '#1e2124', fontWeight: 'bold', textDecoration: 'none', marginLeft: '5px' },
  errorText: { color: "#dc2626", marginBottom: "15px", fontSize: "0.9rem", fontWeight: "500" }
};