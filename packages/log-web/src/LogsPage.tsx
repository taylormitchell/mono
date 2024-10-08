import { useState, useRef } from "react";
import {
  LOG_TYPES,
  LogType,
  LogEntry,
  validateDatetime,
  validateDuration,
} from "@taylor/common/logs/types";

const apiUrl = import.meta.env.VITE_API_URL;

export function LogsPage({ jwt }: { jwt: string | null }) {
  const [error, setError] = useState("");
  const longPressTimeoutRef = useRef<number | null>(null);
  // Add state for modal visibility and selected log type
  const [showModal, setShowModal] = useState(false);
  const [selectedLogType, setSelectedLogType] = useState<LogType | null>(null);

  const handleSubmit = async (logEntry: LogEntry) => {
    setError("");

    if (!jwt) {
      setError("Not logged in");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ ...logEntry, datetime: logEntry.datetime.toISOString() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit log");
      }

      alert("Log submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleButtonPress = (logType: LogType) => {
    longPressTimeoutRef.current = window.setTimeout(() => {
      // Open modal for workout form on long press
      if (logType === "workout") {
        setSelectedLogType(logType);
        setShowModal(true);
      } else if (logType === "poop") {
        setSelectedLogType(logType);
        setShowModal(true);
      }
      longPressTimeoutRef.current = null;
    }, 500); // 500ms for long press
  };

  const handleButtonRelease = (logType: LogType) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
      handleSubmit({
        type: logType,
        datetime: new Date(),
      });
    }
  };

  return (
    <div className="logs-page">
      <h1>Logs</h1>
      <div className="log-type-grid">
        {Array.from(LOG_TYPES).map((type) => (
          <button
            key={type}
            onTouchStart={() => handleButtonPress(type)}
            onTouchEnd={() => handleButtonRelease(type)}
            onMouseDown={() => handleButtonPress(type)}
            onMouseUp={() => handleButtonRelease(type)}
            className="log-type-button"
          >
            {type}
          </button>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      {showModal && selectedLogType === "workout" ? (
        <Modal close={() => setShowModal(false)}>
          <WorkoutForm
            handleSubmit={(entry) => {
              handleSubmit(entry);
              setShowModal(false);
            }}
          />
        </Modal>
      ) : showModal && selectedLogType === "poop" ? (
        <Modal close={() => setShowModal(false)}>
          <PoopForm
            handleSubmit={(entry) => {
              handleSubmit(entry);
              setShowModal(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ children, close }: { children: React.ReactNode; close: () => void }) {
  return (
    <div className="modal">
      <div className="modal-content">
        <button className="modal-close" onClick={close}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

function PoopForm({ handleSubmit }: { handleSubmit: (poop: LogEntry) => void }) {
  const [duration, setDuration] = useState("");
  const [datetime, setDatetime] = useState(new Date().toISOString());
  const [effort, setEffort] = useState(3);
  const [emptiness, setEmptiness] = useState(3);
  const [burning, setBurning] = useState(false);
  const [poopType, setPoopType] = useState(4);
  const [message, setMessage] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDuration(duration) || !validateDatetime(datetime)) {
      return;
    }
    const poop: LogEntry = {
      type: "poop",
      duration,
      datetime: new Date(datetime),
      effort,
      emptiness,
      burning,
      poopType,
      message,
    };
    handleSubmit(poop);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>Log Poop</h2>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="effort">Effort (1-5):</label>
        <input
          type="number"
          id="effort"
          min="1"
          max="5"
          value={effort}
          onChange={(e) => setEffort(parseInt(e.target.value))}
          required
        />
      </div>
      <div>
        <label htmlFor="emptiness">Emptiness (1-5):</label>
        <input
          type="number"
          id="emptiness"
          min="1"
          max="5"
          value={emptiness}
          onChange={(e) => setEmptiness(parseInt(e.target.value))}
          required
        />
      </div>
      <div>
        <label htmlFor="burning">Burning:</label>
        <input
          type="checkbox"
          id="burning"
          checked={burning}
          onChange={(e) => setBurning(e.target.checked)}
        />
      </div>
      <div>
        <label htmlFor="poopType">Poop Type (1-7):</label>
        <input
          type="number"
          id="poopType"
          min="1"
          max="7"
          value={poopType}
          onChange={(e) => setPoopType(parseInt(e.target.value))}
          required
        />
      </div>
      <div>
        <label htmlFor="duration">Duration (e.g., 5m, 30s):</label>
        <input
          type="text"
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="message">Additional Notes:</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

function WorkoutForm({ handleSubmit }: { handleSubmit: (workout: LogEntry) => void }) {
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [datetime, setDatetime] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // if (!validateDuration(duration) || !validateDatetime(datetime)) {
    //   return;
    // }
    const workout: LogEntry = {
      type: "workout",
      duration,
      datetime: new Date(datetime),
      message: description,
    };
    handleSubmit(workout);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>Log Workout</h2>
      <div>
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="duration">Duration (e.g., 30m, 1h, 45s):</label>
        <input
          type="text"
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>
      <button type="submit">Submit Workout</button>
    </form>
  );
}
