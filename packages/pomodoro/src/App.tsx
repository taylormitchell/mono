import { useState } from "react";
import Timer from "./Timer";
import { LoginPage } from "./LoginPage";
import "./App.css";

function App() {
  const [workTime, setWorkTime] = useState(55);
  const [restTime, setRestTime] = useState(5);
  const [token, setToken] = useState<string | null>(null);

  const handleTimeChange = (newTime: number, isWork: boolean) => {
    if (isWork) {
      setWorkTime(newTime);
    } else {
      setRestTime(newTime);
    }
  };

  const handleLogin = async (password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login" };
    }
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <h1>Pomodoro Timer</h1>
      <div className="timers">
        <Timer
          label="Work"
          initialTime={workTime}
          onTimeChange={(newTime) => handleTimeChange(newTime, true)}
          token={token}
        />
        <Timer
          label="Rest"
          initialTime={restTime}
          onTimeChange={(newTime) => handleTimeChange(newTime, false)}
          token={token}
        />
      </div>
    </div>
  );
}

export default App;
