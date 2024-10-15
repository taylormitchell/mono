import React, { useState, useEffect } from "react";

interface TimerProps {
  label: string;
  initialTime: number;
  onTimeChange: (newTime: number) => void;
}

function Timer({ label, initialTime, onTimeChange }: TimerProps) {
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
