import { z } from "zod";
import { Mutation, Todo, todoSchema } from "../../shared/types";
import { generate } from "@rocicorp/rails";
import { WriteTransaction, Replicache, ReadTransaction } from "replicache";

export function genId() {
  return crypto.randomUUID();
}

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
  let lastTask = Promise.resolve();

  return {
    add: (action: UndoableAction) => {
      undoStack.push(action);
      redoStack.length = 0;
    },
    undo: () => {
      const action = undoStack.pop();
      if (action) {
        lastTask = lastTask.then(async () => {
          await action.undo();
          redoStack.push(action);
        });
        return lastTask;
      }
    },
    redo: async () => {
      const action = redoStack.pop();
      if (action) {
        lastTask = lastTask.then(async () => {
          await action.do();
          undoStack.push(action);
        });
        return lastTask;
      }
    },
    destroy: () => {
      undoStack.length = 0;
      redoStack.length = 0;
      lastTask = Promise.resolve();
    },
  };
}

export function createStore() {
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
        return todos.delete(tx, props.id);
      },
    } satisfies Mutators,
  });
  const undoManager = createUndoManager();
  return {
    rep,
    undoManager,
    todos: {
      create: async ({
        id = genId(),
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
      update: async (id: string, props: Partial<Todo>) => {
        const todo = await rep.query((tx) => todos.get(tx, id));
        const action: UndoableAction = {
          do: () => rep.mutate.updateTodo({ id, ...props }),
          undo: () => (todo ? rep.mutate.updateTodo(todo) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      delete: async (id: string) => {
        const todo = await rep.query((tx) => todos.get(tx, id));
        const action: UndoableAction = {
          do: () => rep.mutate.deleteTodo({ id, deletedAt: new Date().toISOString() }),
          undo: () => (todo ? rep.mutate.createTodo(todo) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      getAll: async (tx: ReadTransaction) => {
        const res = await todos.list(tx);
        return res.filter((todo) => todo.deletedAt === null);
      },
    },
    undo: undoManager.undo,
    redo: undoManager.redo,
    destroy: () => {
      undoManager.destroy();
      rep.close();
    },
  };
}

export type Store = ReturnType<typeof createStore>;
