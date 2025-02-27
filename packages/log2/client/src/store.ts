import { z } from "zod";
import { Log, LogData, Mutation, logSchema, promptSchema, Prompt } from "../../shared/types";
import { generate } from "@rocicorp/rails";
import { WriteTransaction, Replicache, ReadTransaction } from "replicache";
import { ulid } from "ulid";
import { getTimestampWithTimezone } from "./lib/utils";

const envSchema = z.object({
  VITE_REPLICACHE_LICENSE_KEY: z.string(),
  VITE_API_URL: z
    .string()
    .regex(/^(https?:\/\/|\/)/)
    .optional(), // starts with http or /
});

const env = envSchema.parse(import.meta.env);
if (env.VITE_API_URL?.startsWith("/")) {
  env.VITE_API_URL = window.location.origin + env.VITE_API_URL;
}

const pullURL = env.VITE_API_URL + "/api/pull";
const pushURL = env.VITE_API_URL + "/api/push";

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
  const log = generate("log", logSchema.parse);
  const prompt = generate("prompt", promptSchema.parse);

  const rep = new Replicache({
    name: "item-user-id",
    licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
    pushURL,
    pullURL,
    pullInterval: 5000,
    mutators: {
      async createLog(tx: WriteTransaction, props) {
        return log.set(tx, props);
      },
      async updateLog(tx: WriteTransaction, props) {
        return log.update(tx, props);
      },
      async deleteLog(tx: WriteTransaction, props) {
        return log.delete(tx, props.id);
      },
      async createPrompt(tx: WriteTransaction, props) {
        return prompt.set(tx, props);
      },
      async updatePrompt(tx: WriteTransaction, props) {
        return prompt.update(tx, props);
      },
      async deletePrompt(tx: WriteTransaction, props) {
        return prompt.delete(tx, props.id);
      },
    } satisfies Mutators,
  });
  const undoManager = createUndoManager();
  return {
    rep,
    undoManager,
    log: {
      create: async ({
        id = ulid(),
        text = "",
        data = [],
        createdAt = getTimestampWithTimezone(),
      }: {
        id?: string;
        text: string;
        data: LogData;
        createdAt?: string;
      }) => {
        const log: Log = {
          id,
          text,
          data,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          version: 0,
        };
        const action: UndoableAction = {
          do: () => rep.mutate.createLog(log),
          undo: () => rep.mutate.updateLog({ id, deletedAt: getTimestampWithTimezone() }),
        };
        await action.do();
        undoManager.add(action);
        return log.id;
      },
      update: async (id: string, props: Partial<Log>) => {
        const item = await rep.query((tx) => log.get(tx, id));
        const prevProps: Partial<Log> = item
          ? Object.entries(props).reduce((acc, [key]) => ({ ...acc, [key]: item[key as keyof Log] }), {})
          : {};
        const action: UndoableAction = {
          do: () => rep.mutate.updateLog({ id, ...props }),
          undo: () => (item ? rep.mutate.updateLog({ id, ...prevProps }) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      delete: async (id: string) => {
        const item = await rep.query((tx) => log.get(tx, id));
        const action: UndoableAction = {
          do: () => rep.mutate.deleteLog({ id, deletedAt: getTimestampWithTimezone() }),
          undo: () => (item ? rep.mutate.createLog(item) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      get: async (id: string, tx?: ReadTransaction) => {
        return tx ? log.get(tx, id) : rep.query((tx) => log.get(tx, id));
      },
      getAll: async (tx?: ReadTransaction) => {
        const res = await (tx ? log.list(tx) : rep.query((tx) => log.list(tx)));
        return res.filter((item) => item.deletedAt === null);
      },
    },
    prompt: {
      create: async ({
        id = ulid(),
        text = "",
        createdAt = getTimestampWithTimezone(),
      }: {
        id?: string;
        text: string;
        createdAt?: string;
      }) => {
        const prompt: Prompt = {
          id,
          text,
          createdAt,
          updatedAt: createdAt,
          deletedAt: null,
          version: 0,
        };
        const action: UndoableAction = {
          do: () => rep.mutate.createPrompt(prompt),
          undo: () => rep.mutate.updatePrompt({ id, deletedAt: getTimestampWithTimezone() }),
        };
        await action.do();
        undoManager.add(action);
        return prompt;
      },
      update: async (id: string, props: Partial<Prompt>) => {
        const item = await rep.query((tx) => prompt.get(tx, id));
        const prevProps: Partial<Prompt> = item
          ? Object.entries(props).reduce((acc, [key]) => ({ ...acc, [key]: item[key as keyof Prompt] }), {})
          : {};
        const action: UndoableAction = {
          do: () => rep.mutate.updatePrompt({ id, ...props }),
          undo: () => (item ? rep.mutate.updatePrompt({ id, ...prevProps }) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      delete: async (id: string) => {
        const item = await rep.query((tx) => prompt.get(tx, id));
        const action: UndoableAction = {
          do: () => rep.mutate.deletePrompt({ id, deletedAt: getTimestampWithTimezone() }),
          undo: () => (item ? rep.mutate.createPrompt(item) : Promise.resolve()),
        };
        await action.do();
        undoManager.add(action);
      },
      has: async (id: string, tx?: ReadTransaction) => {
        return tx ? prompt.has(tx, id) : rep.query((tx) => prompt.has(tx, id));
      },
      get: async (id: string, tx?: ReadTransaction) => {
        return tx ? prompt.get(tx, id) : rep.query((tx) => prompt.get(tx, id));
      },
      getAll: async (tx?: ReadTransaction) => {
        const res = await (tx ? prompt.list(tx) : rep.query((tx) => prompt.list(tx)));
        return res.filter((item) => item.deletedAt === null);
      },
    },
    undo: undoManager.undo,
    redo: undoManager.redo,
    destroy: () => {
      undoManager.destroy();
      rep.close();
    },
    hardReset: () => {
      indexedDB.deleteDatabase(rep.idbName);
      window.location.reload();
    },
  };
}

export type Store = ReturnType<typeof createStore>;
