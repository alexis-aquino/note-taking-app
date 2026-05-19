export const sharedStyles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#1e2124",
    color: "#e5e7eb",
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden"
  },
  workspaceArea: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    marginLeft: "250px", // Accommodates fixed sidebar
    height: "100vh",
    backgroundColor: "#1e2124"
  },
  header: {
    height: "65px",
    borderBottom: "1px solid #2d3135",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    backgroundColor: "#181a1d"
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#1e2124",
    border: "1px solid #2d3135",
    borderRadius: "8px",
    padding: "6px 12px",
    width: "380px"
  },
  searchBar: {
    background: "none",
    border: "none",
    color: "#ffffff",
    outline: "none",
    marginLeft: "8px",
    width: "100%",
    fontSize: "0.9rem"
  },
  mainContentArea: {
    flex: 1,
    padding: "40px",
    overflowY: "auto"
  },
  pageTitle: {
    fontSize: "1.8rem",
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  subheading: {
    color: "#9ca3af",
    fontSize: "0.95rem",
    marginBottom: "30px"
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px"
  },
  noteCard: {
    backgroundColor: "#181a1d",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #2d3135",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "170px",
    transition: "transform 0.15s ease, border-color 0.15s ease",
    cursor: "pointer",
    position: "relative"
  },
  cardTitle: {
    fontSize: "1.15rem",
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: "8px"
  },
  cardPreview: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    lineHeight: "1.5",
    marginBottom: "15px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical"
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.8rem",
    color: "#6b7280",
    marginTop: "auto"
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#7dd3fc",
    fontWeight: "600",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  primaryBtn: {
    backgroundColor: "#7dd3fc",
    color: "#000000",
    border: "none",
    borderRadius: "8px",
    padding: "8px 16px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem"
  },
  dangerBtn: {
    backgroundColor: "transparent",
    color: "#ff4d4d",
    border: "1px solid #ff4d4d",
    borderRadius: "8px",
    padding: "8px 16px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "0.9rem"
  }
};