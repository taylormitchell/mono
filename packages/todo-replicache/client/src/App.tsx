import { useEffect, useMemo, useState } from "react";
import { useSubscribe } from "replicache-react";
import "./App.css";
import { createStore, genId, Store } from "./store";
import { Todo } from "../../shared/types";

function debounce(fn: (...args: any[]) => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout> = 0;
  const debouncedFn = (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
  debouncedFn.cancel = () => clearTimeout(timeout);
  return debouncedFn;
}

function useDebounce(fn: (...args: any[]) => void, deps: any[], ms: number) {
  const debouncedFn = useMemo(() => debounce(fn, ms), [deps, ms]);
  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);
  return debouncedFn;
}

declare global {
  interface Window {
    store: Store | null;
  }
}

function App() {
  const [{ isLoading, store }, setStore] = useState<
    { isLoading: true; store: null } | { isLoading: false; store: Store }
  >({
    isLoading: true,
    store: null,
  });

  // Add state for editing
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (store && e.key === "n" && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const id = genId();
        await store.todos.create({ id, content: "" });
        setEditingId(id);
      }
      if (store && e.key === "Escape" && editingId) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [store, editingId]);

  const todos = useSubscribe(
    store?.rep,
    async (tx) => {
      const res = await store?.todos.getAll(tx);
      return res ?? [];
    },
    { default: [] as Todo[] }
  );
  console.log(todos);

  if (isLoading) return null;
  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Todo App</h1>
      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              store.rep.pull();
            }}
          >
            Pull
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => {
              indexedDB.deleteDatabase(store.rep.idbName);
              window.location.reload();
            }}
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => {
              store.todos.create({ content: "untitled" });
            }}
          >
            Create
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={() => {
              store.undo();
            }}
          >
            Undo
          </button>
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={() => {
              store.redo();
            }}
          >
            Redo
          </button>
        </div>
        {todos
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // Reverse chronological order
          .map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between p-3 bg-white rounded shadow"
            >
              {editingId === todo.id ? (
                <input
                  type="text"
                  value={todo.content}
                  onChange={(e) => store.todos.update(todo.id, { content: e.target.value })}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingId(null);
                    }
                  }}
                  className="flex-1 px-2 py-1 border rounded"
                  autoFocus
                />
              ) : (
                <span className="text-gray-800 flex-1" onClick={() => setEditingId(todo.id)}>
                  {todo.content}
                </span>
              )}
              <button
                onClick={() => store.todos.delete(todo.id)}
                className="ml-2 px-2 py-1 text-red-500 hover:bg-red-100 rounded"
              >
                x
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  editingId,
  setEditingId,
  store,
}: {
  todo: Todo;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  store: Store;
}) {
  const [content, setContent] = useState(todo.content);

  const debouncedUpdate = useDebounce(
    (id: string, content: string) => {
      store.todos.update(id, { content });
    },
    [store],
    300
  );

  return (
    <div key={todo.id} className="flex items-center justify-between p-3 bg-white rounded shadow">
      {editingId === todo.id ? (
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
          className="flex-1 px-2 py-1 border rounded"
          autoFocus
        />
      ) : (
        <span className="text-gray-800 flex-1" onClick={() => setEditingId(todo.id)}>
          {todo.content}
        </span>
      )}
      <button
        onClick={() => store.todos.delete(todo.id)}
        className="ml-2 px-2 py-1 text-red-500 hover:bg-red-100 rounded"
      >
        x
      </button>
    </div>
  );
}

export default App;
