import { useEffect, useState } from "react";
import { useSubscribe } from "replicache-react";
import "./App.css";
import { Todo } from "../../shared/types";
import { createStore, Store } from "./store";

// Types for our Todo app

function App() {
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    const s = createStore();
    setStore(s);
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
            store?.createTodo();
          }}
        >
          Create
        </button>
        {todos
          .sort(([, { createdAt: a }], [, { createdAt: b }]) => a.localeCompare(b))
          .map(([id, todo]) => (
            <div key={id} className={`todo-item`}>
              <input
                type="checkbox"
                checked={false}
                // onChange={() => toggleStatus(id.replace("todo/", ""), "active")}
              />
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
