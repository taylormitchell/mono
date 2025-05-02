import { Replicache } from "replicache";
import type { WriteTransaction } from "replicache";
import type { Task, TaskList } from "../../shared/types";
import type { Mutation } from "../../shared/types";
import { generate } from "@rocicorp/rails";

const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
if (!licenseKey) {
  throw new Error("VITE_REPLICACHE_LICENSE_KEY is not set");
}

const taskMutators = generate<Task>("task");
const listMutators = generate<TaskList>("list");

export const {
  set: setTask,
  update: updateTask,
  delete: deleteTask,
  get: getTask,
  list: listTasks,
} = taskMutators;
export const {
  set: setList,
  update: updateList,
  delete: deleteList,
  get: getList,
  list: listLists,
} = listMutators;

// Define mutator types
type MutationNames = Mutation["name"];
type MutatorFunction<T extends Mutation> = (tx: WriteTransaction, args: T["args"]) => Promise<void>;
export type Mutators = Partial<{
  [K in MutationNames]: MutatorFunction<Extract<Mutation, { name: K }>>;
}>;

export const rep = new Replicache({
  name: "google-tasks",
  pushURL: "http://localhost:3001/push",
  pullURL: "http://localhost:3001/pull",
  pullInterval: 60_000,
  mutators: {
    // Task mutators
    async createTask(tx, task: Task) {
      await setTask(tx, task);
    },
    async updateTask(tx, props: Partial<Task> & { id: string }) {
      await updateTask(tx, props);
    },
    async deleteTask(tx, { id }: { id: string }) {
      await deleteTask(tx, id);
    },

    // TaskList mutators
    async createList(tx, list: TaskList) {
      await setList(tx, list);
    },
    async updateList(tx, props: Partial<TaskList> & { id: string }) {
      await updateList(tx, props);
    },
    async deleteList(tx, { id }: { id: string }) {
      await deleteList(tx, id);
    },
  } satisfies Mutators,
  licenseKey,
});

(window as any).rep = rep;
(window as any).task = taskMutators;
(window as any).list = listMutators;
