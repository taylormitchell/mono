import React, { useState } from "react";
import { LOG_TYPES, LogType, LogEntry } from "@taylor/common/logs/types";

export function LogsPage({ jwt }: { jwt: string | null }) {
  const [logType, setLogType] = useState<LogType>("custom");
  const [duration, setDuration] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const logEntry: LogEntry = {
      type: logType,
      duration: duration || undefined,
      datetime: new Date().toISOString(),
      message: message || undefined,
    };

    if (!jwt) {
      setError("Not logged in");
      return;
    }

    try {
      const response = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(logEntry),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit log");
      }

      // Clear form after successful submission
      setLogType("custom");
      setDuration("");
      setMessage("");
      alert("Log submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="logs-container">
      <h1>Logs</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="logType">Log Type:</label>
          <select
            id="logType"
            value={logType}
            onChange={(e) => setLogType(e.target.value as LogType)}
          >
            {LOG_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="duration">Duration (optional):</label>
          <input
            id="duration"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 30m, 1h, 45s"
          />
        </div>
        <div>
          <label htmlFor="message">Message (optional):</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter any additional details"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit">Submit Log</button>
      </form>
    </div>
  );
}
