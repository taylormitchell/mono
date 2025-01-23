import { useEffect, useState } from "react";
import { useSubscribe } from "replicache-react";
import "./App.css";
import { Todo } from "../../shared/types";
import { createStore, Store } from "./store";

// Types for our Todo app

function App() {
  const [{ isLoading, store }, setStore] = useState<
    { isLoading: true; store: null } | { isLoading: false; store: Store }
  >({
    isLoading: true,
    store: null,
  });

  useEffect(() => {
    const s = createStore();
    setStore({ isLoading: false, store: s });
    return () => {
      s.destroy();
    };
  }, []);

  const todos = useSubscribe(
    store?.rep,
    async (tx) => {
      const list = await tx.scan<Todo>({ prefix: "todo/" }).entries().toArray();
      return list.filter(([_, todo]) => todo.deletedAt === null);
    },
    { default: [] }
  );

  if (isLoading) return null;
  return (
    <div className="container">
      <h1>Todo App</h1>
      <div className="todo-list">
        <button
          onClick={() => {
            indexedDB.deleteDatabase(store.rep.idbName);
            window.location.reload();
          }}
        >
          Reset
        </button>
        <button
          onClick={() => {
            store.todos.create({ content: "untitled" });
          }}
        >
          Create
        </button>
        <button
          onClick={() => {
            store.undo();
          }}
        >
          Undo
        </button>
        <button
          onClick={() => {
            store.redo();
          }}
        >
          Redo
        </button>
        {todos
          .sort(([, { createdAt: a }], [, { createdAt: b }]) => a.localeCompare(b))
          .map(([id, todo]) => (
            <div key={id} className={`todo-item`}>
              <span className="content">{todo.content}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
