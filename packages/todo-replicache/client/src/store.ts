import { z } from "zod";
import { Mutation, Item, itemSchema, View, viewSchema } from "../../shared/types";
import { generate } from "@rocicorp/rails";
import { WriteTransaction, Replicache, ReadTransaction } from "replicache";
import { ulid } from "ulid";

const envSchema = z.object({
  VITE_REPLICACHE_LICENSE_KEY: z.string(),
  VITE_REPLICACHE_PUSH_URL: z
    .string()
    .regex(/^(https?:\/\/|\/)/)
    .optional(), // starts with http or /
  VITE_REPLICACHE_PULL_URL: z
    .string()
    .regex(/^(https?:\/\/|\/)/)
    .optional(), // starts with http or /
});

const env = envSchema.parse(import.meta.env);
if (env.VITE_REPLICACHE_PUSH_URL?.startsWith("/")) {
  env.VITE_REPLICACHE_PUSH_URL = window.location.origin + env.VITE_REPLICACHE_PUSH_URL;
}
if (env.VITE_REPLICACHE_PULL_URL?.startsWith("/")) {
  env.VITE_REPLICACHE_PULL_URL = window.location.origin + env.VITE_REPLICACHE_PULL_URL;
}

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
  const items = generate("item", itemSchema.parse);
  const views = generate("view", viewSchema.parse);
  const rep = new Replicache({
    name: "item-user-id",
    licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
    pushURL: env.VITE_REPLICACHE_PUSH_URL,
    pullURL: env.VITE_REPLICACHE_PULL_URL,
    mutators: {
      async createItem(tx: WriteTransaction, props) {
        return items.set(tx, props);
      },
      async updateItem(tx: WriteTransaction, props) {
        return items.update(tx, props);
      },
      async deleteItem(tx: WriteTransaction, props) {
        return items.delete(tx, props.id);
      },
      async createView(tx: WriteTransaction, props) {
        return views.set(tx, props);
      },
      async updateView(tx: WriteTransaction, props) {
        console.log("update view", props);
        return views.update(tx, props);
      },
      async deleteView(tx: WriteTransaction, props) {
        return views.delete(tx, props.id);
      },
    } satisfies Mutators,
  });
  const undoManager = createUndoManager();
  return {
    rep,
    undoManager,
    items: {
      create: async ({
        id = ulid(),
        content = "",
        contentType = "markdown",
      }: {
        id?: string;
        content?: string;
        contentType?: "markdown" | "json";
        dueDate?: string;
      }) => {
        const action: UndoableAction = {
          do: () =>
            rep.mutate.createItem({
              id,
              content,
              contentType,
              status: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
              dueDate: null,
              name: null,
              version: 0,
              children: [],
            }),
          undo: () => rep.mutate.updateItem({ id, deletedAt: new Date().toISOString() }),
        };
        await action.do();
        undoManager.add(action);
      },
      update: async (id: string, props: Partial<Item>) => {
        const item = await rep.query((tx) => items.get(tx, id));
        const prevProps: Partial<Item> = item
          ? Object.entries(props).reduce((acc, [key]) => ({ ...acc, [key]: item[key as keyof Item] }), {})
          : {};
        const action: UndoableAction = {
          do: () => rep.mutate.updateItem({ id, ...props }),
          undo: () => (item ? rep.mutate.updateItem({ id, ...prevProps }) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      delete: async (id: string) => {
        const item = await rep.query((tx) => items.get(tx, id));
        const action: UndoableAction = {
          do: () => rep.mutate.deleteItem({ id, deletedAt: new Date().toISOString() }),
          undo: () => (item ? rep.mutate.createItem(item) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      get: async (id: string, tx?: ReadTransaction) => {
        return tx ? items.get(tx, id) : rep.query((tx) => items.get(tx, id));
      },
      getByName: async (name: string, tx?: ReadTransaction) => {
        const res = await (tx ? items.list(tx) : rep.query((tx) => items.list(tx)));
        return res.find((item) => item.name === name);
      },
      getAll: async (tx?: ReadTransaction) => {
        const res = await (tx ? items.list(tx) : rep.query((tx) => items.list(tx)));
        return res.filter((item) => item.deletedAt === null);
      },
    },
    views: {
      create: async ({ id = ulid(), name }: { id: string; name: string }) => {
        const action: UndoableAction = {
          do: () =>
            rep.mutate.createView({
              id,
              name,
              filter: {},
              sort: {
                field: "position",
                direction: "desc",
              },
              positions: {},
            }),
          undo: () => rep.mutate.deleteView({ id, deletedAt: new Date().toISOString() }),
        };
        await action.do();
        undoManager.add(action);
      },
      update: async (id: string, props: Partial<View>) => {
        console.log("update view", id, props);
        const view = await rep.query((tx) => views.get(tx, id));
        const prevProps: Partial<View> = view
          ? Object.entries(props).reduce((acc, [key]) => ({ ...acc, [key]: view[key as keyof View] }), {})
          : {};
        const action: UndoableAction = {
          do: () => rep.mutate.updateView({ id, ...props }),
          undo: () => (view ? rep.mutate.updateView({ id, ...prevProps }) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      get: async (tx: ReadTransaction, id: string) => {
        return views.get(tx, id);
      },
      delete: async (id: string) => {
        const view = await rep.query((tx) => views.get(tx, id));
        const action: UndoableAction = {
          do: () => rep.mutate.deleteView({ id, deletedAt: new Date().toISOString() }),
          undo: () => (view ? rep.mutate.createView(view) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
    },
    undo: undoManager.undo,
    redo: undoManager.redo,
    destroy: () => {
      undoManager.destroy();
      rep.close();
    },
  } as const;
}

export type Store = ReturnType<typeof createStore>;
