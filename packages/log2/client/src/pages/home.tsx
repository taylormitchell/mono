import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { RefreshCcw, Trash2, Loader, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getTimestampWithTimezone } from "../lib/utils";
import { SyncIndicator } from "../components/sync-indicator";

let apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl.startsWith("http")) {
  apiUrl = window.location.origin + apiUrl;
}

export function Home() {
  const store = useStore();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [processingLogs, setProcessingLogs] = useState<Set<string>>(new Set());

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      return (await store.log.getAll(tx)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    { default: [] as Log[] }
  );

  const processWithAI = async (logId: string, text: string, timestamp: string) => {
    setProcessingLogs((prev) => new Set(prev).add(logId));
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, timestamp }),
      });
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        await store.log.update(logId, { data: result.data });
        shouldScrollRef.current = true;
      } else {
        throw new Error(result.error || "Unexpected response format");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingLogs((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  };

  // Create a new log
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputText.trim()) {
      const log = await store.log.create({ text: inputText.trim(), data: [] });
      setInputText("");
      if (log) {
        shouldScrollRef.current = true;
        processWithAI(log.id, log.text, getTimestampWithTimezone());
      }
    }
  };

  // Scroll to the bottom of the list when the logs change (including initial load)
  // and whenever we just kicked off a new AI processing task
  const shouldScrollRef = useRef(true);
  useEffect(() => {
    if (logs.length > 0 && scrollContainerRef.current && shouldScrollRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      shouldScrollRef.current = false;
    }
  }, [logs, processingLogs]);

  return (
    <div className="flex flex-col h-full w-full gap-4 p-4">
      <div className="flex items-center gap-4">
        <button onClick={() => store.hardReset()} className="hover-bg rounded-full">
          <RefreshCcw size={14} />
        </button>
        <div className="ml-auto">
          <SyncIndicator />
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-base scrollbar-hide hover:scrollbar-default"
      >
        <div className="divide-y divide-[var(--border-color)]">
          {logs.map((log) => (
            <div className="p-4 flex flex-col gap-2" key={log.id}>
              <div className="flex justify-between items-start">
                <div className="text-sm">{log.text}</div>
                <button
                  onClick={() => store.log.delete(log.id)}
                  className="p-1 hover-bg rounded-full text-secondary hover:text-error"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {processingLogs.has(log.id) && (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Loader className="animate-spin" size={12} />
                  Processing with AI...
                </div>
              )}
              {log.data && Object.keys(log.data).length > 0 && (
                <pre
                  onClick={() => navigate(`/edit/${log.id}`)}
                  className="text-xs text-secondary bg-secondary p-2 rounded cursor-pointer"
                >
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 flex gap-2 bg-secondary rounded-md p-2">
          <input
            type="text"
            name="text"
            value={inputText}
            className="flex-1 outline-none"
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit" className="px-3 py-2 rounded bg-secondary hover-bg">
            <ArrowUp size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
