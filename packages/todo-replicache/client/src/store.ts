import { z } from "zod";
import { MutationSchema, todoSchema } from "./models";
import { generate } from "@rocicorp/rails";
import { WriteTransaction, Replicache } from "replicache";

const envSchema = z.object({
  VITE_REPLICACHE_LICENSE_KEY: z.string(),
  VITE_REPLICACHE_PUSH_URL: z.string(),
  VITE_REPLICACHE_PULL_URL: z.string(),
});

const env = envSchema.parse(import.meta.env);

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
    licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
    pushURL: env.VITE_REPLICACHE_PUSH_URL,
    pullURL: env.VITE_REPLICACHE_PULL_URL,
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
    createTodo: async ({
      id = crypto.randomUUID(),
      content = "",
    }: {
      id?: string;
      content: string;
      dueDate?: string;
    }) => {
      const action = {
        do: () => rep.mutate.createTodo({ id, content, dueDate }),
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
