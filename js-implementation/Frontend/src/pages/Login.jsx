import { useState } from "react"
import { useNavigate } from "react-router-dom"
import notesLogo from "../assets/Notes Logo.svg"
import api from "../utils/api"; // Import the API utility

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", { 
        userEmail: email,
        userPassword: password 
      });

      if (response.data.message) {
        navigate('/Home'); 
      }
    } catch (err) {
      console.error("Login Error:", err.response?.data?.error);
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.mainWrapper}>
      <div style={styles.leftPanel}>
        <h1 style={styles.logo}><img src={notesLogo} style={{ width: '300px' }} alt="NoteApp Logo" /></h1>
        <p style={styles.tagline}>Your thoughts, <br />organized and <br/>accessible <br/>everywhere.</p>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <h2 style={styles.welcomeText}>Welcome Back</h2>
          <p style={styles.subtext}>Please enter your details to sign in.</p>

          {/* Show the error message if it exists */}
          {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}

          <label style={styles.label}>Email Address</label>
          <input 
            style={styles.input} 
            type="email" 
            placeholder="name@example.com" 
            value={email} // BIND STATE
            onChange={(e) => setEmail(e.target.value)} // UPDATE STATE
          />

          <label style={styles.label}>Password</label>
          <input 
            style={styles.input} 
            type="password" 
            placeholder="••••••••" 
            value={password} // BIND STATE
            onChange={(e) => setPassword(e.target.value)} // UPDATE STATE
          />

          <button style={styles.signInButton} onClick={handleLogin} disabled={loading}>
            {loading ? "Signing In..." : "Sign In →"}
          </button>

          <div style={styles.footerText}>
            Don't have an account?{" "}
            <span style={styles.link} onClick={() => navigate('/SignUp')}>
              Create Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainWrapper: {
    display: "flex",
    height: "100vh", // Full screen height
    width: "100vw",
    fontFamily: "Inter, sans-serif"
  },
  leftPanel: {
    flex: 1,
    backgroundColor: "#1e2124", // Dark gray/black from your image
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "80px",
    color: "white",
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#e5e7eb", // Light gray background
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    width: "400px", // Fixed width for the form itself
    textAlign: "left",
  },
  logo: { fontSize: "3rem", marginBottom: "2rem" },
  tagline: { fontSize: "1.5rem", opacity: 0.8,},
  welcomeText: { fontSize: "2rem", color: "#111", marginBottom: "0.5rem" },
  subtext: { color: "#666", marginBottom: "2rem" },
  label: { display: "block", marginBottom: "5px", fontWeight: "bold" },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  signInButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1e2124",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    fontSize: "1rem",
  },
  footerText: {
    marginTop: "20px",
    textAlign: "center", // Or "left" depending on your preference
    color: "#666",
    fontSize: "0.95rem",
  },
  link: {
    color: "#000",        // Black color like in the image
    fontWeight: "bold",   // Bold text
    textDecoration: "underline", 
    cursor: "pointer",    // Makes it feel like a link
    marginLeft: "5px",
  },

};
  