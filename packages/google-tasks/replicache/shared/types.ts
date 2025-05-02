import type { tasks_v1 } from "googleapis";

export type Task = tasks_v1.Schema$Task & { id: string; listId?: string };
export type TaskList = tasks_v1.Schema$TaskList & { id: string };

type createTaskMutation = {
  id: number;
  clientID: string;
  timestamp: number;
  name: "createTask";
  args: Task;
};

type updateTaskMutation = {
  id: number;
  clientID: string;
  timestamp: number;
  name: "updateTask";
  args: Task;
};

type deleteTaskMutation = {
  id: number;
  clientID: string;
  timestamp: number;
  name: "deleteTask";
  args: {
    id: string;
    listId: string;
  };
};

type createListMutation = {
  id: number;
  clientID: string;
  timestamp: number;
  name: "createList";
  args: TaskList;
};

type updateListMutation = {
  id: number;
  clientID: string;
  timestamp: number;
  name: "updateList";
  args: TaskList;
};

type deleteListMutation = {
  id: number;
  clientID: string;
  timestamp: number;
  name: "deleteList";
  args: {
    id: string;
  };
};

export type Mutation =
  | createTaskMutation
  | updateTaskMutation
  | deleteTaskMutation
  | createListMutation
  | updateListMutation
  | deleteListMutation;
