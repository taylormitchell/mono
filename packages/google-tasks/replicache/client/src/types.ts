import type { tasks_v1 } from "googleapis";

export type Task = tasks_v1.Schema$Task & { id: string; listId: string };
export type TaskList = tasks_v1.Schema$TaskList & { id: string };

export type ViewSelection =
  | {
      type: "list";
      id: string;
    }
  | {
      type: "tag";
      id: string;
    }
  | {
      type: "all";
    };
