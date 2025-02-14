import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Home() {
  const store = useStore();
  const navigate = useNavigate();

  const logs = useSubscribe(
    store.rep,
    async (tx) => {
      return (await store.log.getAll(tx)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    { default: [] as Log[] }
  );

  return (
    <div className="flex flex-col h-full w-full gap-4 p-4">
      <div className="flex items-center gap-4">
        <button onClick={() => store.hardReset()} className="p-2 hover-bg rounded-full">
          <RefreshCcw size={20} />
        </button>
        <button onClick={() => navigate("/entry")} className="p-2 ml-auto hover-bg rounded-full" title="New Item">
          <Plus size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-base scrollbar-hide hover:scrollbar-default">
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
              {log.data && Object.keys(log.data).length > 0 && (
                <pre onClick={() => navigate(`/edit/${log.id}`)} className="text-xs text-secondary bg-secondary p-2 rounded">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
