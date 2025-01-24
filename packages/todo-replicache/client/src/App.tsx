import { useEffect, useState } from "react";
import { useSubscribe } from "replicache-react";
import "./App.css";
import { createStore, Store } from "./store";
import { Todo } from "../../shared/types";

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
    // return () => {
    //   s.destroy();
    // };
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
    <div className="container">
      <h1>Todo App</h1>
      <div className="todo-list">
        <button
          onClick={() => {
            store.rep.pull();
          }}
        >
          Pull
        </button>
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
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .map((todo) => (
            <div key={todo.id} className={`todo-item`}>
              <span className="content">{todo.content}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
