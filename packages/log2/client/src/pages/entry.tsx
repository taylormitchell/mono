import { useState } from "react";
import { JsonEditor } from "../components/JsonEditor";
import { useStore } from "../hooks/store";
import { useNavigate } from "react-router-dom";
import { LogData } from "../../../shared/types";

let apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl.startsWith("http")) {
  apiUrl = window.location.origin + apiUrl;
}

const getTimestampWithTimezone = (): string => {
  const now = new Date();
  const timezoneOffset = -now.getTimezoneOffset();
  const sign = timezoneOffset >= 0 ? "+" : "-";
  const pad = (num: number) => String(Math.floor(Math.abs(num))).padStart(2, "0");
  const hours = pad(timezoneOffset / 60);
  const minutes = pad(timezoneOffset % 60);
  return `${now.toISOString().split(".")[0]}${sign}${hours}:${minutes}`;
};

export function LogEntry() {
  const store = useStore();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LogData | null>(null);
  const [editedData, setEditedData] = useState<string | null>(null);

  const processWithAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, timestamp: getTimestampWithTimezone() }),
      });
      const result = await response.json();
      if (result.success) {
        if (Array.isArray(result.data)) {
          setData(result.data);
        } else {
          throw new Error("Unexpected type of result.data");
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    await store.log.create({ text, data: data || [] });
    navigate("/");
  };

  return (
    <div className="fixed inset-0 bg-primary/90 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-base">
        <h2 className="text-lg font-semibold">New Log</h2>
        <button onClick={() => navigate("/")} className="p-2 hover-bg rounded">
          Close
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <textarea
          className="w-full h-32 p-3 bg-secondary rounded border border-base resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your log text..."
        />

        <button
          className="mt-4 px-4 py-2 bg-tertiary rounded hover-bg disabled:opacity-50"
          onClick={processWithAI}
          disabled={!text || isLoading}
        >
          {isLoading ? "Processing..." : "Process with AI"}
        </button>

        {data && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Result:</h3>
            <JsonEditor content={editedData || JSON.stringify(data, null, 2)} onChange={(content) => setEditedData(content)} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-base">
        <button
          className="w-full py-2 bg-[var(--accent-color)] rounded hover:brightness-110 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!text}
        >
          Save Log
        </button>
      </div>
    </div>
  );
}
