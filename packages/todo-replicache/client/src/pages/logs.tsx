import { useState } from "react";
import { ulid } from "ulid";

type Log = {
  id: string;
  data: {
    content: string;
  };
};

export function LogsPage() {
  const [newLogData, setNewLogData] = useState("");

  const [logs, setLogs] = useState<Log[]>([]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Logs</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const response = await fetch("http://localhost:3078/api/ai", {
            method: "POST",
            body: JSON.stringify({
              type: "create-log",
              prompt: newLogData,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });
          const data = await response.json();
          console.log(data);
          setLogs([...logs, { id: ulid(), data }]);
        }}
        className="mb-8"
      >
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
              <button
                onClick={() => {
                  setLogs(logs.filter((l) => l.id !== log.id));
                }}
                className="px-2 py-1 text-red-500 hover:bg-red-500/10 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
