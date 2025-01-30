import { useEffect, useState, createContext, useContext } from "react";
import { useSubscribe } from "replicache-react";
import { createStore, genId, Store } from "./store";
import { Item, itemStatusList, View } from "../../shared/types";
import { isHotkey } from "is-hotkey";
import { useDebounce } from "./utils";

declare global {
  interface Window {
    store: Store | null;
  }
}

const StoreContext = createContext<Store | null>(null);

function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
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

function ItemApp() {
  const store = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Move keyboard shortcut handler here
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("n", e) && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const id = genId();
        await store.items.create({ id, content: "" });
        setEditingId(id);
      }
      if (isHotkey("escape", e) && editingId) {
        console.log("escape");
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

  // Get or create all view
  const allView: View | null = useSubscribe(
    store.rep,
    async (tx) => {
      const allView = await store.views.get(tx, "all");
      return allView ?? null;
    },
    { default: null }
  );
  useEffect(() => {
    if (allView === null) {
      store.views.create({
        id: "all",
        name: "All",
      });
    }
  }, [allView, store]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-[800px] mx-auto px-4">
        <header className="py-4 flex items-center justify-between border-b border-[#30363d]">
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

        <div className="mt-4 flex gap-4">
          <div className="flex-1">
            {allView ? <ItemView view={allView} editingId={editingId} setEditingId={setEditingId} /> : null}
          </div>
        </div>
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
  view,
  editingId,
  setEditingId,
}: {
  view: View;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const store = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const items = useSubscribe(
    store.rep,
    async (tx) => {
      const allItems = await store.items.getAll(tx);
      if (!allItems) return [];
      if (!view.filter?.status) return allItems;
      return allItems.filter((item) => item.status === view.filter.status);
    },
    { default: [] as Item[] }
  );

  const filteredItems = items
    .filter((item) => item.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (view.sort.field === "position") {
        return comparePositions(a, b, view.positions);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  console.log({ filteredItems, view });

  return (
    <div className="flex-1">
      <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="p-4 border-b border-[#30363d]">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-white placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
          />
        </div>

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

  const debouncedUpdate = useDebounce(
    (id: string, content: string) => {
      store.items.update(id, { content });
    },
    [store],
    300
  );

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
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              debouncedUpdate(item.id, e.target.value);
            }}
            placeholder="Untitled"
            onBlur={() => setEditingId(null)}
            onKeyDown={(e) => {
              if (isHotkey("escape", e)) {
                document.getElementById(item.id)?.querySelector("input")?.blur();
              }
              if (isHotkey("backspace", e) && item.content === "") {
                e.preventDefault();
                document.getElementById(item.id)?.previousElementSibling?.querySelector("input")?.focus();
                store.items.delete(item.id);
              }
              if (isHotkey("cmd+enter", e)) {
                const i = itemStatusList.indexOf(item.status);
                const newStatus = itemStatusList[i + 1] ?? itemStatusList[0];
                store.items.update(item.id, { status: newStatus });
              }
              if (isHotkey("cmd+arrowup", e) && move?.up) {
                e.preventDefault();
                e.stopPropagation();
                move.up();
              }
              if (isHotkey("cmd+arrowdown", e) && move?.down) {
                e.preventDefault();
                e.stopPropagation();
                move.down();
              }
              if (isHotkey("arrowup", e)) {
                e.preventDefault();
                e.stopPropagation();
                const el = document.getElementById(item.id)?.previousElementSibling?.querySelector("input");
                if (el) {
                  el.focus();
                }
              }
              if (isHotkey("arrowdown", e)) {
                e.preventDefault();
                e.stopPropagation();
                const el = document.getElementById(item.id)?.nextElementSibling?.querySelector("input");
                if (el) {
                  el.focus();
                }
              }
            }}
            className="flex-1 bg-transparent outline-none"
            autoFocus
          />
          {/* <input
            type="date"
            value={item.dueDate || ""}
            onChange={(e) => {
              store.items.update(item.id, { dueDate: e.target.value || null });
            }}
            onFocus={(e) => e.target.showPicker()}
            onClick={(e) => e.currentTarget.showPicker()}
            className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm"
          /> */}
        </div>
      </div>
      {move && (
        <div className="flex items-center gap-1 mr-2">
          <button onClick={move.up} className="p-1.5 text-[#6e7681] hover:text-white rounded" aria-label="Move up">
            <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
              <path d="M3.47 7.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018L9 4.81v7.44a.75.75 0 0 1-1.5 0V4.81L4.53 7.78a.75.75 0 0 1-1.06 0Z" />
            </svg>
          </button>
          <button onClick={move.down} className="p-1.5 text-[#6e7681] hover:text-white rounded" aria-label="Move down">
            <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
              <path d="M13.03 8.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.47 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 11.19V3.75a.75.75 0 0 1 1.5 0v7.44l2.97-2.97a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </button>
        </div>
      )}
      <button onClick={() => store.items.delete(item.id)} className="ml-2 p-1 text-[#6e7681] hover:text-white rounded">
        <svg width="16" height="16" viewBox="0 0 16 16" className="fill-current">
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
        </svg>
      </button>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <ItemApp />
    </StoreProvider>
  );
}

export default App;
