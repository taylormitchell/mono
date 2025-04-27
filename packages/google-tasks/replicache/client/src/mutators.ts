import { generate } from "@rocicorp/rails";
import type { Task, TaskList } from "./types";

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
