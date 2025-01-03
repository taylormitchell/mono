import { useEffect, useRef, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { nanoid } from "nanoid";
import "./App.css";

// Types for our Todo app
type Todo = {
  content: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

type TodoWithID = Todo & { id: string };

const mutators = {
  async createTodo(tx: WriteTransaction, { id, content, dueDate }: TodoWithID) {
    await tx.set(`todo/${id}`, {
      id,
      content,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
  async updateTodo(tx: WriteTransaction, { id, content, dueDate }: TodoWithID) {
    const todo = await tx.get(`todo/${id}`);
    if (todo) {
      await tx.set(`todo/${id}`, {
        ...todo,
        content,
        dueDate,
        updatedAt: new Date().toISOString(),
      });
    }
  },
};

function createReplicache() {
  return new Replicache({
    name: "todo-user-id",
    licenseKey: import.meta.env.VITE_REPLICACHE_LICENSE_KEY,
    pushURL: import.meta.env.VITE_REPLICACHE_PUSH_URL,
    pullURL: import.meta.env.VITE_REPLICACHE_PULL_URL,
    mutators,
  });
}

function App() {
  const [rep, setRep] = useState<Replicache<typeof mutators> | null>(null);

  useEffect(() => {
    const r = createReplicache();
    setRep(r);
    return () => {
      void r.close();
    };
  }, []);

  const todos = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx.scan<Todo>({ prefix: "todo/" }).entries().toArray();
      console.log(list);
      return list;
    },
    { default: [] }
  );

  const contentRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rep || !contentRef.current?.value) return;

    await rep.mutate.createTodo({
      id: nanoid(),
      content: contentRef.current.value,
      dueDate: dueDateRef.current?.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    contentRef.current.value = "";
    if (dueDateRef.current) dueDateRef.current.value = "";
    if (intervalRef.current) intervalRef.current.value = "";
  };

  const toggleStatus = async (id: string, currentStatus: "active" | "completed") => {
    if (!rep) return;
    await rep.mutate.updateTodoStatus({
      id,
      status: currentStatus === "active" ? "completed" : "active",
    });
  };

  return (
    <div className="container">
      <h1>Todo App</h1>
      <div>
        <button
          onClick={async () => {
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            }
            window.location.reload();
          }}
        >
          Reset
        </button>
      </div>

      <form onSubmit={onSubmit} className="todo-form">
        <input ref={contentRef} placeholder="What needs to be done?" required />
        <input ref={dueDateRef} type="date" placeholder="Due date (optional)" />
        <input ref={intervalRef} type="number" placeholder="Interval in days (optional)" />
        <button type="submit">Add Todo</button>
      </form>

      <div className="todo-list">
        {todos
          .sort(([, { createdAt: a }], [, { createdAt: b }]) => a.localeCompare(b))
          .map(([id, todo]) => (
            <div key={id} className={`todo-item`}>
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleStatus(id.replace("todo/", ""), "active")}
              />
              <span className="content">{todo.content}</span>
              {todo.dueDate && <span className="due-date">Due: {todo.dueDate}</span>}
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
