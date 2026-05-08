import { useState } from "react"
import notesLogo from "../assets/Notes Logo.svg"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError("")

    // basic validation
    if (!email || !password) {
      setError("Please fill in all fields.")
      return
    }

    setLoading(true)
    try {
      // replace with your actual api call
      // const res = await api.post('/auth/login', { email, password })
      // navigate('/home')
      alert("Login successful! (wire up your API here)")
    } catch (err) {
      setError("Invalid email or password.")
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div style={styles.mainWrapper}>
      {/* LEFT SIDE: Dark Branding */}
      <div style={styles.leftPanel}>
        <h1 style={styles.logo}><img src={notesLogo} style={{ width: '300px' }} alt="NoteApp Logo" /></h1>
        <p style={styles.tagline}>
          Your thoughts, <br />organized and <br/>accessible <br/>everywhere.
        </p>
      </div>

      {/* RIGHT SIDE: White Login Form */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <h2 style={styles.welcomeText}>Welcome Back</h2>
          <p style={styles.subtext}>Please enter your details to sign in.</p>

          <label style={styles.label}>Email Address</label>
          <input style={styles.input} type="email" placeholder="name@example.com" />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" placeholder="••••••••" />

          <button style={styles.signInButton}>Sign In →</button>
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
};
  