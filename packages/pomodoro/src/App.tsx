import { useState } from "react";
import Timer from "./Timer";
import { LoginPage } from "./LoginPage";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [workTime, setWorkTime] = useState(55);
  const [restTime, setRestTime] = useState(5);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("jwt"));

  const handleTimeChange = (newTime: number, isWork: boolean) => {
    if (isWork) {
      setWorkTime(newTime);
    } else {
      setRestTime(newTime);
    }
  };

  const handleLogin = async (password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem("jwt", data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login" };
    }
  };

  const persistTimerData = async (timerData: {
    sessionType: string;
    duration: number;
    completedAt: string;
  }) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/files/pomodoro.jsonl`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: "append",
          content: JSON.stringify(timerData),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist timer data");
      }

      console.log("Timer data persisted successfully");
    } catch (error) {
      console.error("Error persisting timer data:", error);
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
          onTimerComplete={persistTimerData}
        />
        <Timer
          label="Rest"
          initialTime={restTime}
          onTimeChange={(newTime) => handleTimeChange(newTime, false)}
          onTimerComplete={persistTimerData}
        />
      </div>
    </div>
  );
}

export default App;
