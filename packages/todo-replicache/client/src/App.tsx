import { useEffect, useState } from "react";
import { useSubscribe } from "replicache-react";
import { createStore, genId, Store } from "./store";
import { Todo } from "../../shared/types";
import { useDebounce } from "./utils";
import { isHotkey } from "is-hotkey";
import "./App.css";

declare global {
  interface Window {
    store: Store | null;
  }
}

function cn(...args: (string | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
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
      if (store && isHotkey("n", e) && !editingId && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        e.stopPropagation();
        const id = genId();
        await store.todos.create({ id, content: "" });
        setEditingId(id);
      }
      if (store && isHotkey("escape", e) && editingId) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
      }
      if (store && isHotkey("cmd+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        store.undo();
      }
      if (store && isHotkey("cmd+shift+z", e)) {
        e.preventDefault();
        e.stopPropagation();
        store.redo();
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
              store.todos.create({ content: "" });
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
        <div>
          {todos
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // Reverse chronological order
            .map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                editingId={editingId}
                setEditingId={setEditingId}
                store={store}
              />
            ))}
        </div>
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
      key={todo.id}
      className={cn("flex items-center p-3 text-left", isEditing ? "bg-highlight" : "")}
    >
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
          className="flex-1 outline-none"
          autoFocus
        />
      ) : (
        <span className="flex-1 h-full" onClick={() => setEditingId(todo.id)}>
          {todo.content ? (
            <span>{todo.content}</span>
          ) : (
            <span className="text-gray-400">Untitled</span>
          )}
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
