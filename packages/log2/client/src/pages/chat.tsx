import { useEffect, useRef, useState } from "react";
import { useSubscribe } from "replicache-react";
import { Log } from "../../../shared/types";
import { useStore } from "../hooks/store";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const draftContentAtom = atomWithStorage<string>("draftContent", "");

export function ChatPage() {
  const store = useStore();
  const [draftContent, setDraftContent] = useAtom(draftContentAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [clearedAt, setClearedAt] = useState<string>(new Date().toISOString());

  const items = useSubscribe(
    store.rep,
    async (tx) => {
      const allLogs = await store.log.getAll(tx);
      if (!allLogs) return [];
      // Only show items created after the last clear
      return allLogs.filter((log) => log.createdAt > clearedAt);
    },
    { default: [] as Log[], dependencies: [clearedAt] }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [items]);

  const filteredLogs = items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = draftContent.trim();
    if (!trimmedContent) return;

    if (trimmedContent === "/clear") {
      setClearedAt(new Date().toISOString());
    } else {
      await store.log.create({ text: trimmedContent, data: {} });
    }
    setDraftContent("");
  };

  return (
    <div className="flex h-full w-full pt-12">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div key={log.id} className="group flex items-start gap-2">
              <span className="text-[var(--accent-color)]">$</span>
              <div className="flex-1">
                <input type="text" value={log.text} onChange={(e) => store.log.update(log.id, { text: e.target.value })} />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="text-[var(--accent-color)]">$</span>
            <input
              type="text"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-transparent border-none outline-none placeholder-[var(--text-secondary)]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
