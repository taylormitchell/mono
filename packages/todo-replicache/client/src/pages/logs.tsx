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
                <JsonEditor data={log.data} />
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

function JsonEditor({ data, setData }: { data: object; setData: (data: object) => void }) {
  const [fields, setFields] = useState<{ key: string; value: string }[]>(() =>
    Object.entries(data).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }))
  );

  return (
    <div>
      <form className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={field.key}
              onChange={(e) => {
                const newFields = [...fields];
                newFields[index].key = e.target.value;
                setFields(newFields);
              }}
              className="flex-1 p-2 rounded border border-[#30363d] bg-[var(--bg-secondary)]"
              placeholder="Key"
            />
            <input
              type="text"
              value={field.value}
              onChange={(e) => {
                const newFields = [...fields];
                newFields[index].value = e.target.value;
                setFields(newFields);
              }}
              className="flex-1 p-2 rounded border border-[#30363d] bg-[var(--bg-secondary)]"
              placeholder="Value"
            />
            <button
              type="button"
              onClick={() => {
                setFields(fields.filter((_, i) => i !== index));
              }}
              className="px-2 py-1 text-red-500 hover:bg-red-500/10 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </form>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => {
            setFields([...fields, { key: "", value: "" }]);
          }}
          className="px-2 py-1 text-blue-500 hover:bg-blue-500/10 rounded"
        >
          Add Field
        </button>
        <button
          onClick={() => {
            try {
              const newData = Object.fromEntries(fields.map(({ key, value }) => [key, JSON.parse(value)]));
              // Validate the entire object can be parsed as JSON
              JSON.parse(JSON.stringify(newData));
              setData(newData);
            } catch (e) {
              console.error(e);
            }
          }}
          className="px-2 py-1 text-green-500 hover:bg-green-500/10 rounded"
        >
          Save
        </button>
        <button
          onClick={() => {
            setFields(
              Object.entries(data).map(([key, value]) => ({
                key,
                value: JSON.stringify(value),
              }))
            );
          }}
          className="px-2 py-1 text-gray-500 hover:bg-gray-500/10 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
