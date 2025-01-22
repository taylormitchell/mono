import { useEffect, useRef, useState } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { generate } from "@rocicorp/rails";
import { useSubscribe } from "replicache-react";
import { nanoid } from "nanoid";
import "./App.css";
import { FrontendMutators, MutationSchema, Todo, todoSchema } from "./models";
import { z } from "zod";

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error("VITE_API_URL is not set");
}
const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
if (!licenseKey) {
  throw new Error("VITE_REPLICACHE_LICENSE_KEY is not set");
}

const pushUrl = `${apiUrl}/api/db/push`;
const pullUrl = `${apiUrl}/api/db/pull`;
const resetUrl = `${apiUrl}/api/db/reset`;

// Types for our Todo app

const mutators = {
  async createTodo(tx: WriteTransaction, { id, content, dueDate }) {
    return todos.set(tx, {
      id,
      content,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      status: "active",
      parentIds: [],
    });
  },
  async updateTodo(tx: WriteTransaction, { id, content = "", dueDate }) {
    const todo = await todos.get(tx, id);
    if (todo) {
      await todos.set(tx, {
        ...todo,
        content,
        dueDate,
        updatedAt: new Date().toISOString(),
      });
    }
  },
} satisfies FrontendMutators;

type Mutation = z.infer<typeof MutationSchema>;

type MutationNames = Mutation["name"];

type MutatorFunction<T extends Mutation> = (tx: WriteTransaction, args: T["args"]) => Promise<void>;

type Action<T extends Mutation> = (args: T["args"]) => Promise<void>;

/**
 * Used to define the mutators for the frontend.
 *
 * @example
 * const mutators: FrontendMutators = {
 *   createTodo: async (tx: WriteTransaction, { id, content }) => {
 *     await tx.set(`todo/${id}`, { id, content });
 *   },
 * };
 */
export type Actions = Partial<{
  [K in MutationNames]: Action<Extract<Mutation, { name: K }>>;
}>;

export type FrontendMutators = Partial<{
  [K in MutationNames]: MutatorFunction<Extract<Mutation, { name: K }>>;
}>;

function createStore() {
  const undoManager = new UndoManager();
  const todos = generate("todo", todoSchema.parse);
  const rep = new Replicache({
    name: "todo-user-id",
    licenseKey,
    pushURL: pushUrl,
    pullURL: pullUrl,
    mutators: {
      async createTodo(tx: WriteTransaction, { id, content, dueDate }) {
        return todos.set(tx, {
          id,
          content,
          dueDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          status: "active",
          parentIds: [],
        });
      },
      async updateTodo(tx: WriteTransaction, { id, content = "", dueDate }) {
        const todo = await todos.get(tx, id);
        if (todo) {
          await todos.set(tx, {
            ...todo,
            content,
            dueDate,
            updatedAt: new Date().toISOString(),
          });
        }
      },
    } satisfies FrontendMutators,
  });
  const actions = {
    createTodo: async (props) => {
      const action = {
        do: () => rep.mutate.createTodo(props),
        undo: () => rep.mutate.deleteTodo(props.id),
      };
      await action.do();
      undoManager.add(action);
    },
    deleteTodo: async (props) => {
      const action = {
        do: () => rep.mutate.deleteTodo(props.id),
        undo: () => rep.mutate.createTodo(props),
      };
      await action.do();
      undoManager.add(action);
    },
    someOtherAction: async (props) => {
      const action = {
        do: () => rep.mutate.someOtherAction(props),
        undo: () => rep.mutate.someOtherAction(props),
      };
      await action.do();
      undoManager.add(action);
    },
  } satisfies Actions;
  return {
    rep,
    actions,
    undo: undoManager.undo,
    redo: undoManager.redo,
  };
}

function App() {
  const [rep, setRep] = useState<Replicache<typeof mutators> | null>(null);

  useEffect(() => {
    const r = createReplicache();
    setRep(r);
    return () => {
      r.close();
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
    });

    contentRef.current.value = "";
    if (dueDateRef.current) dueDateRef.current.value = "";
    if (intervalRef.current) intervalRef.current.value = "";
  };

  const toggleStatus = async (id: string, currentStatus: "active" | "completed") => {
    if (!rep) return;
    await rep.mutate.updateTodo({
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
            // Reset the database
            const res = await fetch(resetUrl);
            const data = await res.json();
            console.log(data);
            // Delete all indexedDB databases
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
              if (db.name) {
                window.indexedDB.deleteDatabase(db.name);
              }
            }
            // Reload the page
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
