import { useEffect, useState } from "react";
import { useSubscribe } from "replicache-react";
import "./App.css";
import { Todo } from "../../shared/types";
import { createStore, Store } from "./store";

// Types for our Todo app

function App() {
  const [{ isLoading, store }, setStore] = useState<
    { isLoading: true; store: null } | { isLoading: false; store: Store }
  >({ isLoading: true, store: null });

  useEffect(() => {
    const s = createStore();
    setStore({ isLoading: false, store: s });
    return () => {
      s.close();
    };
  }, []);

  const todos = useSubscribe(
    store?._rep,
    async (tx) => {
      const list = await tx.scan<Todo>({ prefix: "todo/" }).entries().toArray();
      console.log(list);
      return list;
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
            store.createTodo({ content: "untitled" });
          }}
        >
          Create
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
