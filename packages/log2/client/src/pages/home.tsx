import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { RefreshCcw, Trash2, Loader, ArrowUp, Expand } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { SyncIndicator } from "../components/sync-indicator";
import { toast } from "../components/toast";
import { extractDataFromLog } from "../lib/utils";

export function Home() {
  const store = useStore();
  const navigate = useNavigate();
  const [inputText, setInputText] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [processingLogs, setProcessingLogs] = useState<Record<string, boolean>>({});

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      const logs = await store.log.getAll(tx);
      return logs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    { default: [] as Log[] }
  );

  const extractData = async (logId: string) => {
    setProcessingLogs((prev) => ({ ...prev, [logId]: true }));
    const timeoutId = setTimeout(() => {
      setProcessingLogs((prev) => {
        const next = { ...prev };
        delete next[logId];
        return next;
      });
      toast.error("Timeout while processing log");
    }, 5000);
    await store.rep.push();
    const result = await extractDataFromLog(logId);
    if (result.success) {
      await store.rep.pull();
    } else {
      toast.error(`Error processing log: ${result.error}`);
    }
    clearTimeout(timeoutId);
    setProcessingLogs((prev) => {
      const next = { ...prev };
      delete next[logId];
      return next;
    });
  };

  // Create a log and flag it as processing
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputText.trim()) {
      const logId = await store.log.create({ text: inputText.trim(), data: [] });
      setInputText("");
      shouldScrollRef.current = true;
      await extractData(logId);
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
            <div className="p-4 flex flex-col gap-2" key={log.id}>
              <div className="flex justify-between items-start">
                <div className="text-sm">{log.text}</div>
                <div className="flex items-center gap-1 ml-auto">
                  {!processingLogs[log.id] && (!log.data || Object.keys(log.data).length === 0) && (
                    <button
                      className="p-1 hover-bg rounded-full text-secondary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        extractData(log.id);
                      }}
                    >
                      <RefreshCcw size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/edit/${log.id}`);
                    }}
                    className="p-1 hover-bg rounded-full text-secondary hover:text-primary"
                    title="Open"
                  >
                    <Expand size={16} />
                  </button>
                </div>
              </div>
              {processingLogs[log.id] ? (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Loader className="animate-spin" size={12} />
                  Processing with AI...
                </div>
              ) : log.data && Object.keys(log.data).length > 0 ? (
                <pre className="text-xs text-secondary bg-secondary p-2 rounded">{JSON.stringify(log.data, null, 2)}</pre>
              ) : null}
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
