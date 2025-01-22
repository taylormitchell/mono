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
  } satisfies Actions;
  return {
    rep,
    actions,
    undo: undoManager.undo,
    redo: undoManager.redo,
  };
}
