import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { RefreshCcw, Trash2, Loader, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { SyncIndicator } from "../components/sync-indicator";
import { useSseEvents } from "../hooks/use-sse-events";
import { toast } from "../components/toast";

export function Home() {
  const store = useStore();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [processingLogs, setProcessingLogs] = useState<Record<string, boolean>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      return (await store.log.getAll(tx)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    { default: [] as Log[] }
  );

  // Create a log and flag it as processing
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputText.trim()) {
      const log = await store.log.create({ text: inputText.trim(), data: [] });
      setInputText("");
      if (log) {
        shouldScrollRef.current = true;
        setProcessingLogs((prev) => ({ ...prev, [log.id]: true }));
        timeoutsRef.current[log.id] = setTimeout(() => {
          setProcessingLogs((prev) => {
            const next = { ...prev };
            delete next[log.id];
            return next;
          });
          toast.error("Timeout while processing log");
        }, 5000);
      }
    }
  };

  // Subscribe to log processing events from server
  useSseEvents(
    (message) => {
      if (message.type === "finishedProcessingLog") {
        if (!message.args.success) {
          toast.error(`Error processing log: ${message.args.message}`);
        }

        if (timeoutsRef.current[message.args.id]) {
          clearTimeout(timeoutsRef.current[message.args.id]);
          delete timeoutsRef.current[message.args.id];
        }

        setProcessingLogs((prev) => {
          const next = { ...prev };
          delete next[message.args.id];
          return next;
        });
      }
    },
    [store]
  );

  // Scroll to the bottom of the list when the logs change (including initial load)
  // and whenever we just kicked off a new AI processing task
  const shouldScrollRef = useRef(true);
  useEffect(() => {
    if (logs.length > 0 && scrollContainerRef.current && shouldScrollRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      shouldScrollRef.current = false;
    }
  }, [logs, processingLogs]);

  console.log("render", processingLogs);
  return (
    <div className="flex flex-col h-full w-full gap-4 p-4">
      <div className="flex items-center gap-4">
        <button onClick={() => store.hardReset()} className="hover-bg rounded-full">
          <RefreshCcw size={14} />
        </button>
        <button onClick={() => navigate("/prompt")} className="hover-bg rounded-full p-1" title="Edit Global Prompt">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
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
            <div className="p-4 flex flex-col gap-2" key={log.id} onClick={() => navigate(`/edit/${log.id}`)}>
              <div className="flex justify-between items-start">
                <div className="text-sm">{log.text}</div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    store.log.delete(log.id);
                  }}
                  className="p-1 hover-bg rounded-full text-secondary hover:text-error"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {processingLogs[log.id] ? (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Loader className="animate-spin" size={12} />
                  Processing with AI...
                </div>
              ) : log.data && Object.keys(log.data).length > 0 ? (
                <pre className="text-xs text-secondary bg-secondary p-2 rounded">{JSON.stringify(log.data, null, 2)}</pre>
              ) : (
                <button className="text-xs text-secondary bg-secondary p-2 rounded">Retry</button>
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
