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
    undo: async (rep: MyReplicache) => {
      const action = undoStack.pop();
      if (action) {
        await action.undo(rep);
        redoStack.push(action);
      }
    },
    redo: async (rep: MyReplicache) => {
      const action = redoStack.pop();
      if (action) {
        await action.do(rep);
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

export function createStore() {
  const rep = createReplicache();
  const undoManager = createUndoManager();
  return {
    rep,
    undoManager,
    todos: {
      create: async ({
        id = crypto.randomUUID(),
        content = "",
      }: {
        id?: string;
        content: string;
        dueDate?: string;
      }) => {
        const action: UndoableAction = {
          do: () =>
            rep.mutate.createTodo({
              id,
              content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              version: 0,
            }),
          undo: () => rep.mutate.updateTodo({ id, deletedAt: new Date().toISOString() }),
        };
        await action.do();
        undoManager.add(action);
      },
      delete: async (id: string) => {
        const action: UndoableAction = {
          do: () => rep.mutate.updateTodo({ id, deletedAt: new Date().toISOString() }),
          undo: () => rep.mutate.updateTodo({ id, deletedAt: null }),
        };
        await action.do();
        undoManager.add(action);
      },
    },
    undo: undoManager.undo,
    redo: undoManager.redo,
  };
}

type MyReplicache = ReturnType<typeof createReplicache>;

export type Store = ReturnType<typeof createStore>;
