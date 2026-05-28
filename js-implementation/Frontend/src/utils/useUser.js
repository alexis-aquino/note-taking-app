import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

export function useUser() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get("/api/auth/me")
      .then(res => setUser(res.data))
      .catch(err => {
        if (err.response?.status === 401) navigate("/");
      });
  }, []);

  return user;
}
