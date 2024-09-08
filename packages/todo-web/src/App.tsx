import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { TodosPage } from "./TodosPage";
import { LogsPage } from "./LogsPage";
import { LoginPage } from "./LoginPage";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error("VITE_API_URL is not set");
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);

  useEffect(() => {
    const storedJwt = localStorage.getItem("jwt");
    if (storedJwt) {
      setJwt(storedJwt);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (
    password: string
  ): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();

      if (response.ok) {
        const { token } = result;
        localStorage.setItem("jwt", token);
        setJwt(token);
        setIsLoggedIn(true);
        return { success: true };
      } else {
        const { error } = result;
        console.error("Login error:", error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error during login:", errorMessage);
      return { success: false, error: `Error during login: ${errorMessage}` };
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/todos" element={<TodosPage jwt={jwt} />} />
        <Route path="/logs" element={<LogsPage jwt={jwt} />} />
      </Routes>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="home-container">
      <h1>My App</h1>
      <nav>
        <Link to="/todos" className="nav-button">
          Todos
        </Link>
        <Link to="/logs" className="nav-button">
          Logs
        </Link>
      </nav>
    </div>
  );
}

export default App;
