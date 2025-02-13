import { useState } from "react";
import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { Plus } from "lucide-react";
import { JsonEditor } from "../components/JsonEditor";

export function Home() {
  const store = useStore();
  const [showEditor, setShowEditor] = useState(false);

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      return (await store.log.getAll(tx)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    { default: [] as Log[] }
  );

  return (
    <>
      <div className="flex flex-col h-full w-full gap-4 p-4">
        <div className="flex items-center gap-4">
          <div className="w-4 md:w-0" />
          <button onClick={() => setShowEditor(true)} className="p-2 hover:bg-[#30363d] rounded-full" title="New Item">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-[var(--border-color)] scrollbar-hide hover:scrollbar-default">
          <div className="divide-y divide-[#30363d]">
            {logs.map((log) => (
              <div className="p-4 flex flex-col gap-2" key={log.id}>
                <div className="text-sm">{log.text}</div>
                {log.data && Object.keys(log.data).length > 0 && (
                  <pre className="text-xs text-gray-400 bg-[#1c2128] p-2 rounded">{JSON.stringify(log.data, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEditor && <LogEditor onClose={() => setShowEditor(false)} />}
    </>
  );
}

function LogEditor({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [editedData, setEditedData] = useState<string | null>(null);

  const processWithAI = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const result = await response.json();
      if (result.success) {
        if (Array.isArray(result.data)) {
          setData(result.data);
        } else {
          throw new Error("Unexpected type of result.data");
        }
      } else {
        console.error(result.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    await store.log.create({ text, data: data || {} });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
        <h2 className="text-lg font-semibold">New Log</h2>
        <button onClick={onClose} className="p-2 hover:bg-[#30363d] rounded">
          Close
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <textarea
          className="w-full h-32 p-3 bg-[#1c2128] rounded border border-[#30363d] resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your log text..."
        />

        <button
          className="mt-4 px-4 py-2 bg-[#30363d] rounded hover:bg-[#3c444d] disabled:opacity-50"
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

      <div className="p-4 border-t border-[#30363d]">
        <button
          className="w-full py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!text}
        >
          Save Log
        </button>
      </div>
    </div>
  );
}
