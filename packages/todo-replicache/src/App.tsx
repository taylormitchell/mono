import { useEffect, useRef, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useSubscribe } from "replicache-react";
import { nanoid } from "nanoid";
import "./App.css";

// Types for our Todo app
type Todo = {
  content: string;
  status: "active" | "completed";
  dueDate?: string;
  interval?: number;
  order: number;
};

type TodoWithID = Todo & { id: string };

function App() {
  const [rep, setRep] = useState<Replicache<any> | null>(null);

  useEffect(() => {
    const r = new Replicache({
      name: "todo-user-id",
      licenseKey: import.meta.env.VITE_REPLICACHE_LICENSE_KEY,
      pushURL: import.meta.env.VITE_REPLICACHE_PUSH_URL,
      pullURL: import.meta.env.VITE_REPLICACHE_PULL_URL,
      mutators: {
        async createTodo(
          tx: WriteTransaction,
          { id, content, status, dueDate, interval, order }: TodoWithID
        ) {
          await tx.set(`todo/${id}`, {
            content,
            status,
            dueDate,
            interval,
            order,
          });
        },
        async updateTodo(
          tx: WriteTransaction,
          { id, content, status, dueDate, interval, order }: TodoWithID
        ) {
          const todo = await tx.get(`todo/${id}`);
          if (todo) {
            await tx.set(`todo/${id}`, {
              ...todo,
              content,
              status,
              dueDate,
              interval,
              order,
            });
          }
        },
      },
    });
    setRep(r);
    return () => {
      void r.close();
    };
  }, []);

  const todos = useSubscribe(
    rep,
    async (tx) => {
      const list = await tx.scan<Todo>({ prefix: "todo/" }).entries().toArray();
      list.sort(([, { order: a }], [, { order: b }]) => a - b);
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

    let last: Todo | null = null;
    if (todos.length) {
      const lastTodoTuple = todos[todos.length - 1];
      last = lastTodoTuple[1];
    }
    const order = (last?.order ?? 0) + 1;

    await rep.mutate.createTodo({
      id: nanoid(),
      content: contentRef.current.value,
      status: "active",
      dueDate: dueDateRef.current?.value,
      interval: intervalRef.current?.value ? parseInt(intervalRef.current.value) : undefined,
      order,
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

      <form onSubmit={onSubmit} className="todo-form">
        <input ref={contentRef} placeholder="What needs to be done?" required />
        <input ref={dueDateRef} type="date" placeholder="Due date (optional)" />
        <input ref={intervalRef} type="number" placeholder="Interval in days (optional)" />
        <button type="submit">Add Todo</button>
      </form>

      <div className="todo-list">
        {todos.map(([id, todo]) => (
          <div key={id} className={`todo-item ${todo.status}`}>
            <input
              type="checkbox"
              checked={todo.status === "completed"}
              onChange={() => toggleStatus(id.replace("todo/", ""), todo.status)}
            />
            <span className="content">{todo.content}</span>
            {todo.dueDate && <span className="due-date">Due: {todo.dueDate}</span>}
            {todo.interval && <span className="interval">Every {todo.interval} days</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
