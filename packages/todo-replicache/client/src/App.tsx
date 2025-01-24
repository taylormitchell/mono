import { useEffect, useState } from "react";
import { useSubscribe } from "replicache-react";
import "./App.css";
import { createStore, Store } from "./store";
import { Todo } from "../../shared/types";

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
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between p-3 bg-white rounded shadow"
            >
              <span className="text-gray-800">{todo.content}</span>
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

export default App;
