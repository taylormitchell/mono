import { useRef, useState } from "react";
import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { Plus } from "lucide-react";

export function StandardView() {
  const store = useStore();
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      return (await store.log.getAll(tx)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    { default: [] as Log[] }
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center gap-4">
        <div className="w-4 md:w-0" /> {/* Spacer for mobile menu button */}
        <button onClick={() => store.log.create({ text: "", data: {} })} title="New Item">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--border-color)] scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
        <div ref={itemsContainerRef} className="item-row divide-y divide-[#30363d]">
          {logs.map((log) => (
            <div className="min-h-12 p-2 flex flex-col gap-2" key={log.id}>
              <input
                className="bg-transparent border-none outline-none w-full"
                value={log.text}
                onChange={(e) => store.log.update(log.id, { text: e.target.value })}
              />
              <LogData log={log} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogData({ log }: { log: Log }) {
  const store = useStore();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="text-sm text-gray-400 mt-1">
      {isLoading ? (
        "Loading..."
      ) : log.data && Object.keys(log.data).length > 0 ? (
        <div className="text-sm text-gray-400 mt-1">{JSON.stringify(log.data, null, 2)}</div>
      ) : (
        <button
          className="text-sm px-2 py-1 bg-[#30363d] rounded hover:bg-[#3c444d]"
          onClick={async () => {
            setIsLoading(true);
            try {
              const response = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: log.text }),
              });
              const structuredData = await response.json();
              await store.log.update(log.id, { data: structuredData });
            } catch (error) {
              console.error(error);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          Process with AI
        </button>
      )}
    </div>
  );
}
