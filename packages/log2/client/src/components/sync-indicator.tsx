import { useState, useEffect } from "react";
import { useStore } from "../hooks/store";

export function SyncIndicator() {
  const store = useStore();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [countPendingMutations, setCountPendingMutations] = useState(0);

  useEffect(() => {
    setOnline(store.rep.online);
    store.rep.onOnlineChange = setOnline;
    store.rep.onSync = async (syncing) => {
      setSyncing(syncing);
      const pending = await store.rep.experimentalPendingMutations();
      setCountPendingMutations(pending.length);
    };
  }, [store.rep]);

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-secondary">
        {online ? (syncing ? "Syncing..." : "Online") : "Offline"}
        {countPendingMutations > 0 && ` (${countPendingMutations})`}
      </div>
      <div className="relative flex items-center">
        <div className={`w-2.5 h-2.5 rounded-full ${online ? "bg-green-800" : "bg-red-500"}`} />
        {syncing && (
          <div className="absolute inset-0 animate-ping">
            <div className={`w-2.5 h-2.5 rounded-full ${online ? "bg-green-500/40" : "bg-red-500/40"}`} />
          </div>
        )}
      </div>
    </div>
  );
}
