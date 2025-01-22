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
    store?.rep,
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

      {/* <form onSubmit={onSubmit} className="todo-form">
        <input ref={contentRef} placeholder="What needs to be done?" required />
        <input ref={dueDateRef} type="date" placeholder="Due date (optional)" />
        <input ref={intervalRef} type="number" placeholder="Interval in days (optional)" />
        <button type="submit">Add Todo</button>
      </form> */}

      <div className="todo-list">
        <button
          onClick={() => {
            console.log(store.rep.idbName);
          }}
        >
          Clear
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
              {/* {todo.dueDate && <span className="due-date">Due: {todo.dueDate}</span>} */}
              {/* {todo.dueDate && <span className="due-date">Due: {todo.dueDate}</span>} */}
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
