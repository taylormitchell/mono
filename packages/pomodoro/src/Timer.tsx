import React, { useState, useEffect } from "react";

interface TimerProps {
  label: string;
  initialTime: number;
  onTimeChange: (newTime: number) => void;
  token: string;
}

function Timer({ label, initialTime, onTimeChange, token }: TimerProps) {
  const [time, setTime] = useState(initialTime * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isActive && time === 0) {
      clearInterval(interval);
      playSound();
      setIsActive(false);
      persistTimerData();
    }

    return () => clearInterval(interval);
  }, [isActive, time]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTime(initialTime * 60);
  };

  const playSound = () => {
    const audio = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3"
    );
    audio.play();
  };

  const persistTimerData = async () => {
    const timerData = {
      sessionType: label.toLowerCase(),
      duration: initialTime,
      completedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/files/pomodoro.jsonl", {
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(event.target.value, 10);
    onTimeChange(newTime);
    setTime(newTime * 60);
  };

  return (
    <div className="timer">
      <h2>{label} Timer</h2>
      <div className="timer-input">
        <label>{label} Time (minutes): </label>
        <input type="number" value={initialTime} onChange={handleTimeChange} disabled={isActive} />
      </div>
      <div className="time-left">{formatTime(time)}</div>
      <div className="controls">
        <button onClick={toggleTimer}>{isActive ? "Pause" : "Start"}</button>
        <button onClick={resetTimer}>Reset</button>
      </div>
    </div>
  );
}

export default Timer;
