import { useState } from "react";
import { useSubscribe } from "replicache-react";
import { ulid } from "ulid";
import { useStore } from "../hooks/store";

export function LogsPage() {
  const store = useStore();
  const [newLogData, setNewLogData] = useState("");

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      return store.logs.getAll(tx);
    },
    { default: [] }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogData.trim()) return;

    await store.logs.create({
      id: ulid(),
      data: { content: newLogData },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    setNewLogData("");
  };

  const handleDelete = async (id: string) => {
    await store.logs.delete(id);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Logs</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={newLogData}
            onChange={(e) => setNewLogData(e.target.value)}
            placeholder="Enter log content..."
            className="flex-1 p-2 rounded border border-[#30363d] bg-[var(--bg-secondary)]"
          />
          <button type="submit" className="px-4 py-2 bg-[var(--accent-color)] rounded hover:opacity-90">
            Add Log
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="p-4 rounded border border-[#30363d] bg-[var(--bg-secondary)]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-[var(--text-secondary)] mb-2">{new Date(log.createdAt).toLocaleString()}</div>
                <div>{JSON.stringify(log.data)}</div>
              </div>
              <button onClick={() => handleDelete(log.id)} className="px-2 py-1 text-red-500 hover:bg-red-500/10 rounded">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
