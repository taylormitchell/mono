import { useEffect, useState, createContext, useContext } from "react";
import { useSubscribe } from "replicache-react";
import { createStore, genId, Store } from "./store";
import { Todo } from "../../shared/types";
import { useDebounce } from "./utils";
import { isHotkey } from "is-hotkey";

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

function TodoApp() {
  const store = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Move keyboard shortcut handler here
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (isHotkey("n", e) && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const id = genId();
        await store.todos.create({ id, content: "" });
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

  const todos = useSubscribe(
    store.rep,
    async (tx) => {
      const res = await store.todos.getAll(tx);
      return res ?? [];
    },
    { default: [] as Todo[] }
  );

  const filteredTodos = todos.filter((todo) =>
    todo.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-[1280px] mx-auto px-4">
        <header className="py-4 flex items-center justify-between border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <svg height="24" viewBox="0 0 16 16" width="24" className="fill-current">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
            <h1 className="text-xl font-semibold">Todos</h1>
            <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-sm ml-2">
              {todos.length}
            </span>
          </div>
          <button
            onClick={() => store.todos.create({ content: "" })}
            className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md text-sm font-semibold"
          >
            New Todo
          </button>
        </header>

        <div className="mt-4 flex gap-4">
          <div className="w-[240px]">
            <nav className="space-y-1">
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#1f6feb] text-white"
              >
                <span>All</span>
                <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-xs">
                  {todos.length}
                </span>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-1 rounded-md text-[#c9d1d9] hover:bg-[#30363d]"
              >
                <span>Active</span>
                <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-xs">
                  {todos.length}
                </span>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-1 rounded-md text-[#c9d1d9] hover:bg-[#30363d]"
              >
                <span>Completed</span>
                <span className="px-2 py-0.5 rounded-full bg-[#30363d] text-xs">0</span>
              </a>
            </nav>
          </div>

          <div className="flex-1">
            <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
              <div className="p-4 border-b border-[#30363d]">
                <input
                  type="text"
                  placeholder="Search todos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-white placeholder-[#6e7681] focus:outline-none focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb]"
                />
              </div>

              <div className="divide-y divide-[#30363d]">
                {filteredTodos
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      editingId={editingId}
                      setEditingId={setEditingId}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  editingId,
  setEditingId,
}: {
  todo: Todo;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
}) {
  const store = useStore();
  const [content, setContent] = useState(todo.content);
  const isEditing = editingId === todo.id;

  const debouncedUpdate = useDebounce(
    (id: string, content: string) => {
      store.todos.update(id, { content });
    },
    [store],
    300
  );

  return (
    <div
      className={cn(
        "flex items-center px-4 py-2 hover:bg-[#1c2128]",
        isEditing ? "bg-[#1c2128]" : ""
      )}
    >
      <div className="mr-3">
        <input type="checkbox" className="rounded-full border-[#30363d]" />
      </div>
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              debouncedUpdate(todo.id, e.target.value);
            }}
            onBlur={() => setEditingId(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingId(null);
              }
            }}
            className="w-full bg-transparent outline-none"
            autoFocus
          />
        ) : (
          <div className="cursor-pointer" onClick={() => setEditingId(todo.id)}>
            {todo.content || <span className="text-[#6e7681]">Untitled</span>}
          </div>
        )}
      </div>
      <button
        onClick={() => store.todos.delete(todo.id)}
        className="ml-2 p-1 text-[#6e7681] hover:text-white rounded"
      >
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
      <TodoApp />
    </StoreProvider>
  );
}

export default App;
