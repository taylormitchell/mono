import { z } from "zod";
import { MutationSchema, todoSchema } from "./models";
import { generate } from "@rocicorp/rails";
import { WriteTransaction, Replicache } from "replicache";

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

type UndoableAction = {
  do: () => Promise<void>;
  undo: () => Promise<void>;
};

export function createUndoManager() {
  const undoStack: UndoableAction[] = [];
  const redoStack: UndoableAction[] = [];

  return {
    add: (action: UndoableAction) => {
      undoStack.push(action);
      redoStack.length = 0;
    },
    undo: async () => {
      const action = undoStack.pop();
      if (action) {
        await action.undo();
        redoStack.push(action);
      }
    },
    redo: async () => {
      const action = redoStack.pop();
      if (action) {
        await action.do();
        undoStack.push(action);
      }
    },
  };
}

export function createStore() {
  const undoManager = createUndoManager();

  const todos = generate("todo", todoSchema.parse);
  const rep = new Replicache({
    name: "todo-user-id",
    licenseKey,
    pushURL: pushUrl,
    pullURL: pullUrl,
    mutators: {
      async createTodo(tx: WriteTransaction, props) {
        return todos.set(tx, props);
      },
      async updateTodo(tx: WriteTransaction, props) {
        return todos.update(tx, props);
      },
      async deleteTodo(tx: WriteTransaction, props) {
        return todos.update(tx, props);
      },
    } satisfies FrontendMutators,
  });
  return {
    subscribe: rep.subscribe.bind(rep),
    createTodo: async (props: Parameters<typeof rep.mutate.createTodo>[0]) => {
      const action = {
        do: () => rep.mutate.createTodo(props),
        undo: () => rep.mutate.updateTodo({ id: props.id, deletedAt: new Date().toISOString() }),
      };
      await action.do();
      undoManager.add(action);
    },
    deleteTodo: async (id: string) => {
      const action = {
        do: () => rep.mutate.updateTodo({ id, deletedAt: new Date().toISOString() }),
        undo: () => rep.mutate.updateTodo({ id, deletedAt: null }),
      };
      await action.do();
      undoManager.add(action);
    },
    undo: undoManager.undo,
    redo: undoManager.redo,
  };
}

const store = createStore();

store.createTodo({ id: "1", content: "test", dueDate: "2025-01-01" });

export default store;
