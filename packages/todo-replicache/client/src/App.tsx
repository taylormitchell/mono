import { useEffect, useState, useRef } from "react";
import { useSubscribe } from "replicache-react";
import { createStore, Store } from "./store";
import { Item, View } from "../../shared/types";
import { isHotkey } from "is-hotkey";
import { useDebounce } from "./utils";
import { ulid } from "ulid";
import { MarkdownEditor } from "./components/MarkdownEditor";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { StoreContext, useStore } from "./hooks/store";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ItemPage } from "./pages/ItemPage";
import { useNavigate } from "react-router-dom";
import { StandardView } from "./pages/StandardView";
import { ChatView } from "./pages/ChatView";

declare global {
  interface Window {
    store: Store | null;
  }
}

function useAllView() {
  const store = useStore();
  const allView: View | null = useSubscribe(
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

  return allView;
}

function StoreProvider({ children }: { children: React.ReactNode }) {
  const [{ isLoading, store }, setStore] = useState<
    { isLoading: true; store: null } | { isLoading: false; store: Store }
  >({
    isLoading: true,
    store: null,
  });

  useEffect(() => {
    const s = createStore();
    s.rep.pull();
    window.store = s;
    setStore({ isLoading: false, store: s });
    return () => {
      // s.destroy();
      window.store = null;
    };
  }, []);

  if (isLoading) return null;
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function cn(...args: (string | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}

type ViewMode = "standard" | "chat";
const viewModeAtom = atomWithStorage<ViewMode>("viewMode", "standard");

// Add this near the top of the file with other atoms
const draftContentAtom = atomWithStorage<string>("draftContent", "");

function ItemApp() {
  const store = useStore();
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Move keyboard shortcut handler here
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("n", e) && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const id = ulid();
        await store.items.create({ id, content: "" });
        setEditingId(id);
      }
      if (isHotkey("escape", e) && editingId) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
      }
      if (isHotkey("cmd+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        store.undo();
      }
      if (isHotkey("cmd+shift+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        store.redo();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [store, editingId]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex">
      {/* Sidebar */}
      <div className="w-48 border-r border-[#30363d] p-4">
        <div className="space-y-1">
          <button
            onClick={() => setViewMode("standard")}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              viewMode === "standard" ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#21262d]"
            )}
          >
            Standard View
          </button>
          <button
            onClick={() => setViewMode("chat")}
            className={cn(
              "w-full px-3 py-2 text-left rounded-md",
              viewMode === "chat" ? "bg-[#1f6feb] text-white" : "text-[#c9d1d9] hover:bg-[#21262d]"
            )}
          >
            Chat View
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen">
        <header className="py-4 flex items-center justify-between border-b border-[#30363d] px-4">
          <button
            onClick={() => store.items.create({ content: "" })}
            className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-semibold"
          >
            New Item
          </button>
          <button
            onClick={() => {
              indexedDB.deleteDatabase(store.rep.idbName);
              window.location.reload();
            }}
            className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-semibold"
          >
            Reset
          </button>
        </header>

        <div className="flex-1 overflow-hidden p-4">{viewMode === "standard" ? <StandardView /> : <ChatView />}</div>
      </div>
    </div>
  );
}

function comparePositions(
  a: { id: string; createdAt: string },
  b: { id: string; createdAt: string },
  partialPositions: Record<string, number>
) {
  const aPos = partialPositions[a.id] ?? null;
  const bPos = partialPositions[b.id] ?? null;
  if (aPos === null && bPos === null) {
    if (b.createdAt === a.createdAt) {
      return b.id.localeCompare(a.id);
    } else {
      return b.createdAt.localeCompare(a.createdAt);
    }
  }
  if (aPos === null) return 1;
  if (bPos === null) return -1;
  return aPos < bPos ? -1 : 1;
}

/**
 * Given a set of items and some positions for them, sort the items
 * by position/createdAt, then return a new positions object with the
 * all the items reordered with the item at `from` moved to the position `to`
 */
function moveTo(
  items: { id: string; createdAt: string }[],
  from: number,
  to: number,
  partialPositions: Record<string, number>
) {
  const sortedItems = [...items].sort((a, b) => comparePositions(a, b, partialPositions));
  const toClamped = Math.max(0, Math.min(to, sortedItems.length - 1));
  if (from !== toClamped) {
    const item = sortedItems[from];
    sortedItems.splice(from, 1);
    sortedItems.splice(toClamped, 0, item);
  }
  return sortedItems.reduce((acc, item, i) => {
    acc[item.id] = i;
    return acc;
  }, {} as Record<string, number>);
}

function ItemView({
  editingId,
  setEditingId,
}: {
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const store = useStore();
  const view = useAllView();
  const [searchQuery, setSearchQuery] = useState("");

  const items = useSubscribe(
    store.rep,
    async (tx) => {
      if (!view) return [];
      const allItems = await store.items.getAll(tx);
      if (!allItems) return [];
      if (!view.filter?.status) return allItems;
      return allItems.filter((item) => item.status === view.filter.status);
    },
    { default: [] as Item[], dependencies: [view] }
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isHotkey("up", e) && !isHotkey("down", e)) return;
      const itemEl = document.activeElement?.closest(".item");
      if (!itemEl) return;
      e.preventDefault();
      e.stopPropagation();

      if (isHotkey("up", e)) {
        const prevId = itemEl.previousElementSibling?.id;
        if (!prevId) return;
        setEditingId(prevId);
      } else {
        const nextId = itemEl.nextElementSibling?.id;
        if (!nextId) return;
        setEditingId(nextId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!view) return null;

  const filteredItems = items
    .filter((item) => item.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (view.sort.field === "position") {
        return comparePositions(a, b, view.positions);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-white placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
        />
      </div>

      <div className="flex-1 overflow-y-auto rounded-md border border-[#30363d] bg-[#161b22] scrollbar-hide hover:scrollbar-default [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#30363d] [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="divide-y divide-[#30363d]">
          {filteredItems.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              editingId={editingId}
              setEditingId={setEditingId}
              move={
                view.sort.field === "position"
                  ? {
                      up: () => {
                        const newPositions = moveTo(filteredItems, i, i - 1, view.positions);
                        store.views.update(view.id, { ...view, positions: newPositions });
                      },
                      down: () => {
                        const newPositions = moveTo(filteredItems, i, i + 1, view.positions);
                        store.views.update(view.id, { ...view, positions: newPositions });
                      },
                    }
                  : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  editingId,
  setEditingId,
  move,
}: {
  item: Item;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  move: null | { up: () => void; down: () => void };
}) {
  const store = useStore();
  const [content, setContent] = useState(item.content);
  const isEditing = editingId === item.id;
  const navigate = useNavigate();

  const debouncedUpdate = useDebounce(
    (id: string, content: string) => {
      store.items.update(id, { content });
    },
    [store],
    300
  );

  const handleDelete = () => {
    const prevElement = document.getElementById(item.id)?.previousElementSibling;
    store.items.delete(item.id);
    if (prevElement) {
      const editor = prevElement.querySelector(".ProseMirror");
      if (editor) {
        (editor as HTMLElement).focus();
      }
    }
  };

  return (
    <div
      id={item.id}
      className={cn("item flex flex-grow items-center px-4 py-2 hover:bg-[#1c2128]", isEditing ? "bg-[#1c2128]" : "")}
    >
      {item.status !== null && (
        <div className="mr-3">
          <input
            type="checkbox"
            checked={item.status === "completed"}
            onChange={(e) => {
              store.items.update(item.id, {
                status: e.target.checked ? "completed" : "active",
              });
            }}
            className="rounded-full border-[#30363d]"
          />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-4">
          <MarkdownEditor
            item={item}
            content={content}
            onChange={(newContent) => {
              setContent(newContent);
              debouncedUpdate(item.id, newContent);
            }}
            isEditing={isEditing}
            setEditingId={setEditingId}
            placeholder="Untitled"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/items/${item.id}`)} className="p-1.5 text-[#6e7681] hover:text-white rounded">
          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
        {move && (
          <div className="flex items-center gap-1">
            <button onClick={move.up} className="p-1.5 text-[#6e7681] hover:text-white rounded" aria-label="Move up">
              <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                <path d="M3.47 7.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018L9 4.81v7.44a.75.75 0 0 1-1.5 0V4.81L4.53 7.78a.75.75 0 0 1-1.06 0Z" />
              </svg>
            </button>
            <button
              onClick={move.down}
              className="p-1.5 text-[#6e7681] hover:text-white rounded"
              aria-label="Move down"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
                <path d="M13.03 8.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.47 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 11.19V3.75a.75.75 0 0 1 1.5 0v7.44l2.97-2.97a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </button>
          </div>
        )}
        <button onClick={handleDelete} className="ml-2 p-1 text-[#6e7681] hover:text-white rounded">
          <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

function ChatlikeItemView() {
  const store = useStore();
  const view = useAllView();
  const [draftContent, setDraftContent] = useAtom(draftContentAtom);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clearedAt, setClearedAt] = useState<string>(new Date().toISOString());

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
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-[#6e7681]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

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
    [store],
    300
  );

  return (
    <div className="group flex items-start gap-2">
      <span className="text-[#238636]">$</span>
      <div className="flex-1">
        <MarkdownEditor
          item={item}
          content={content}
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

function App() {
  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ItemApp />} />
          <Route path="/items/:id" element={<ItemPage />} />
        </Routes>
      </Router>
    </StoreProvider>
  );
}

export default App;
