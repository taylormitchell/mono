import { getTasksClient } from "./google";
import type { tasks_v1 } from "googleapis";
import { loadState, saveState } from "./state";
import type { Mutation } from "../shared/types";

export type MutationResult =
  | {
      success: true;
      lastMutationID: number;
    }
  | {
      success: false;
      error: string;
    };

export async function processMutations(mutations: Mutation[]): Promise<MutationResult> {
  const tasksClient = await getTasksClient();
  const state = await loadState();

  try {
    for (const mutation of mutations) {
      const { name, args, clientID } = mutation;
      const lastMutationID = state.lastMutationIDByClient[clientID] ?? 0;
      if (mutation.id <= lastMutationID) {
        console.log("Skipping mutation", mutation.id, lastMutationID);
        continue;
      }

      try {
        switch (name) {
          case "createTask":
            await tasksClient.tasks.insert({
              tasklist: args.listId ?? "@default",
              requestBody: sanitizeTask(args),
            });
            break;

          case "updateTask":
            await tasksClient.tasks.patch({
              tasklist: args.listId,
              task: args.id,
              requestBody: sanitizeTask(args),
            });
            break;

          case "deleteTask":
            await tasksClient.tasks.delete({
              tasklist: args.listId,
              task: args.id,
            });
            break;

          case "createList":
            if (args.id) {
              // Update existing list
              await tasksClient.tasklists.update({
                tasklist: args.id,
                requestBody: sanitizeTaskList(args),
              });
            } else {
              // Create new list
              await tasksClient.tasklists.insert({
                requestBody: sanitizeTaskList(args),
              });
            }
            break;

          case "updateList":
            await tasksClient.tasklists.patch({
              tasklist: args.id,
              requestBody: sanitizeTaskList(args),
            });
            break;

          case "deleteList":
            await tasksClient.tasklists.delete({
              tasklist: args.id,
            });
            break;

          default:
            name satisfies never;
            throw new Error(`Unknown mutation: ${name}`);
        }
      } catch (error) {
        console.error("Error processing mutation:", mutation);
        console.error(error);
      }
      // TODO: Probably want to handle this better
      state.lastMutationIDByClient[clientID] = mutation.id;
    }

    await saveState(state);

    return { success: true };
  } catch (error) {
    console.error("Error processing mutation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper functions to prepare data for the Google Tasks API
function sanitizeTask(task: any): tasks_v1.Schema$Task {
  // Remove fields that the API doesn't accept or should be handled differently
  const { id, listId, ...rest } = task;
  return rest;
}

function sanitizeTaskList(list: any): tasks_v1.Schema$TaskList {
  // Remove fields that the API doesn't accept or should be handled differently
  const { id, ...rest } = list;
  return rest;
}
