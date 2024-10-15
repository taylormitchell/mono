import React, { useState, useEffect } from "react";

interface TimerProps {
  label: string;
  initialTime: number;
  onTimeChange: (newTime: number) => void;
  onTimerComplete: (timerData: {
    sessionType: string;
    duration: number;
    completedAt: string;
  }) => void;
}

function Timer({ label, initialTime, onTimeChange, onTimerComplete }: TimerProps) {
  const [time, setTime] = useState(initialTime * 60);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

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
      completeTimer(initialTime * 60);
    }

    return () => clearInterval(interval);
  }, [isActive, time]);

  const toggleTimer = () => {
    if (!isActive) {
      setStartTime(Date.now());
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTime(initialTime * 60);
    setStartTime(null);
  };

  const finishTimer = () => {
    if (startTime) {
      const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      completeTimer(elapsedTime);
    }
    resetTimer();
  };

  const completeTimer = (duration: number) => {
    onTimerComplete({
      sessionType: label.toLowerCase(),
      duration: Math.floor(duration / 60), // Convert seconds to minutes
      completedAt: new Date().toISOString(),
    });
  };

  const playSound = () => {
    const audio = new Audio(window.location.origin + "/gong.mp3");
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
        <button onClick={finishTimer} disabled={!isActive && !startTime}>
          Finish
        </button>
      </div>
    </div>
  );
}

export default Timer;
