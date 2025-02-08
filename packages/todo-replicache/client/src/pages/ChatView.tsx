import { useEffect, useRef, useState } from "react";
import { useSubscribe } from "replicache-react";
import { Item } from "../../../shared/types";
import { useDebounce } from "../hooks/use-debounce";
import { useStore } from "../hooks/store";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const draftContentAtom = atomWithStorage<string>("draftContent", "");

function ChatItemRow({
  item,
  isEditing,
  setEditingId,
}: {
  item: Item;
  isEditing: boolean;
  setEditingId: (id: string | null) => void;
}) {
  const store = useStore();
  const [content, setContent] = useState(item.content);

  const debouncedUpdate = useDebounce(
    (id: string, content: string) => {
      store.items.update(id, { content });
    },
    300,
    [store]
  );

  return (
    <div className="group flex items-start gap-2">
      <span className="text-[#238636]">$</span>
      <div className="flex-1">
        <MarkdownEditor
          item={item}
          initialContent={content}
          onChange={(newContent) => {
            setContent(newContent);
            debouncedUpdate(item.id, newContent);
          }}
          isEditing={isEditing}
          setEditingId={setEditingId}
          placeholder="Type a message..."
        />
      </div>
    </div>
  );
}

export function ChatView() {
  const store = useStore();
  const [draftContent, setDraftContent] = useAtom(draftContentAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clearedAt, setClearedAt] = useState<string>(new Date().toISOString());

  const view = useSubscribe(
    store.rep,
    async (tx) => {
      const allView = await store.views.get(tx, "all");
      return allView ?? null;
    },
    { default: null }
  );

  // After pull, create the all view if it doesn't exist
  useEffect(() => {
    (async () => {
      await store.rep.pull();
      const view = await store.rep.query((tx) => store.views.get(tx, "all"));
      if (view) return;
      await store.views.create({ id: "all", name: "All" });
    })();
  }, [store.rep, store.views]);

  const items = useSubscribe(
    store.rep,
    async (tx) => {
      if (!view) return [];
      const allItems = await store.items.getAll(tx);
      if (!allItems) return [];
      // Only show items created after the last clear
      return allItems.filter((item) => item.createdAt > clearedAt);
    },
    { default: [] as Item[], dependencies: [view, clearedAt] }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [items]);

  if (!view) return null;

  const filteredItems = items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = draftContent.trim();
    if (!trimmedContent) return;

    if (trimmedContent === "/clear") {
      setClearedAt(new Date().toISOString());
    } else {
      await store.items.create({ content: trimmedContent });
    }
    setDraftContent("");
  };

  return (
    <div className="flex flex-col h-full rounded-md border border-[#30363d] bg-[#0d1117] overflow-hidden font-mono">
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <ChatItemRow key={item.id} item={item} isEditing={editingId === item.id} setEditingId={setEditingId} />
          ))}
          <div ref={messagesEndRef} />
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="text-[#238636]">$</span>
            <input
              type="text"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-transparent border-none outline-none placeholder-[#6e7681]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
