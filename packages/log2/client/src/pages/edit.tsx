import { useCallback, useState } from "react";
import { JsonEditor } from "../components/JsonEditor";
import { useStore } from "../hooks/store";
import { useNavigate, useParams } from "react-router-dom";
import { useSubscribe } from "replicache-react";
import { logDataSchema } from "../../../shared/types";

export function LogEdit() {
  const id = useParams().id || "";
  const store = useStore();
  const navigate = useNavigate();
  const [editedData, setEditedData] = useState<{ text: string; data: Record<string, unknown>[] | null } | null>(null);
  const [editedText, setEditedText] = useState<string | null>(null);

  const log = useSubscribe(
    store.rep,
    async (tx) => {
      return await store.log.get(id, tx);
    },
    { default: null }
  );

  const handleChange = useCallback((content: string) => {
    try {
      const contentData = logDataSchema.parse(JSON.parse(content));
      setEditedData({ text: content, data: contentData });
    } catch {
      setEditedData({ text: content, data: null });
    }
  }, []);

  if (!log) {
    return <div>Log not found</div>;
  }

  return (
    <div className="fixed inset-0 bg-primary/90 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-base">
        <h2 className="text-lg font-semibold">Edit Log</h2>
        <button onClick={() => navigate("/")} className="p-2 hover-bg rounded">
          Close
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <textarea
          className="w-full h-32 p-3 bg-secondary rounded border border-base resize-none"
          value={editedText || log.text}
          onChange={(e) => setEditedText(e.target.value)}
          placeholder="Enter your log text..."
        />

        {log.data && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Result:</h3>
            <JsonEditor content={JSON.stringify(log.data, null, 2)} onChange={handleChange} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-base">
        <button
          className="w-full py-2 bg-[var(--accent-color)] rounded hover:brightness-110 disabled:opacity-50"
          onClick={() => {
            if (!editedData || editedData.data === null) return;
            store.log.update(id, { text: editedText || log.text, data: editedData.data });
            navigate("/");
          }}
          disabled={!editedData || editedData.data === null}
        >
          Update Log
        </button>
      </div>
    </div>
  );
}
