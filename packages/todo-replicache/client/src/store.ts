import { z } from "zod";
import { Mutation, todoSchema } from "../../shared/types";
import { generate } from "@rocicorp/rails";
import { WriteTransaction, Replicache } from "replicache";

const envSchema = z.object({
  VITE_REPLICACHE_LICENSE_KEY: z.string(),
  VITE_REPLICACHE_PUSH_URL: z.string(),
  VITE_REPLICACHE_PULL_URL: z.string(),
});

const env = envSchema.parse(import.meta.env);

// Define mutator types
type MutationNames = Mutation["name"];
type MutatorFunction<T extends Mutation> = (tx: WriteTransaction, args: T["args"]) => Promise<void>;
export type Mutators = Partial<{
  [K in MutationNames]: MutatorFunction<Extract<Mutation, { name: K }>>;
}>;

type UndoableAction = {
  do: (rep: MyReplicache) => Promise<void>;
  undo: (rep: MyReplicache) => Promise<void>;
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

export function createReplicache() {
  const todos = generate("todo", todoSchema.parse);
  return new Replicache({
    name: "todo-user-id",
    licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
    // pushURL: env.VITE_REPLICACHE_PUSH_URL,
    // pullURL: env.VITE_REPLICACHE_PULL_URL,
    mutators: {
      async createTodo(tx: WriteTransaction, props) {
        return todos.set(tx, props);
      },
      async updateTodo(tx: WriteTransaction, props) {
        return todos.update(tx, props);
      },
    } satisfies Mutators,
  });
}

type MyReplicache = ReturnType<typeof createReplicache>;

export function createStore() {
  const undoManager = createUndoManager();

  const todos = generate("todo", todoSchema.parse);
  const rep = new Replicache({
    name: "todo-user-id",
    licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
    // pushURL: env.VITE_REPLICACHE_PUSH_URL,
    // pullURL: env.VITE_REPLICACHE_PULL_URL,
    mutators: {
      async createTodo(tx: WriteTransaction, props) {
        return todos.set(tx, props);
      },
      async updateTodo(tx: WriteTransaction, props) {
        return todos.update(tx, props);
      },
    } satisfies Mutators,
  });
  return {
    rep,
    createTodo: async ({
      id = crypto.randomUUID(),
      content = "",
    }: {
      id?: string;
      content: string;
      dueDate?: string;
    }) => {
      const action = {
        do: () =>
          rep.mutate.createTodo({
            id,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            version: 0,
          }),
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

export type Store = ReturnType<typeof createStore>;
