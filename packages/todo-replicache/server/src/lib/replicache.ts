import {
  getServerVersion,
  getLastMutationID,
  setLastMutationID,
  setServerVersion,
  getDb,
  getLastMutationIDChanges,
} from "./db/helpers";
import { gt } from "drizzle-orm";
import type { Request, Response } from "express";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { z } from "zod";
import { Mutation, mutationSchema, todoSchema } from "../../../shared/types";
import { todoTable } from "./db/schema";
import { PushRequestV1, PatchOperation, PullResponseV1 } from "replicache";

const pushSchema = z.object({
  pushVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

const pullSchema = z.object({
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  // cookie: cookieSchema,
  cookie: z.number().nullable(),
  clientGroupID: z.string(),
});

export async function handlePush(req: Request, res: Response) {
  const push = pushSchema.parse(req.body) satisfies PushRequestV1;
  console.log("Processing push", JSON.stringify(push));

  try {
    const db = await getDb();
    for (const mutation of push.mutations) {
      await db.transaction(async (tr) => {
        return processMutation(tr, push.clientGroupID, mutation);
      });
    }

    res.json({});
    await sendPoke(); // You'll need to implement this based on your needs
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

export async function handlePull(req: Request, res: Response) {
  try {
    console.log("handle pull");
    const pull = pullSchema.parse(req.body);
    console.log(pull);
    const db = await getDb();
    const result = await db.transaction(async (tr) => {
      // Get current version
      const serverVersion = await getServerVersion(tr);
      const clientVersion = pull.cookie ?? -1;

      if (clientVersion > serverVersion) {
        throw new Error(
          `Cookie ${pull.cookie} is from the future - aborting. This can happen in development if the server restarts.`
        );
      }

      const lastMutationIDChanges = await getLastMutationIDChanges(tr, pull.clientGroupID);

      // Get changed domain objects since requested version
      const changedTodos = await tr
        .select()
        .from(todoTable)
        .where(gt(todoTable.version, clientVersion));

      // Build patch operations
      const patch: PatchOperation[] = [];
      for (const todo of changedTodos) {
        patch.push({
          op: "put",
          key: `todo/${todo.id}`,
          value: todoSchema.parse(todo),
        });
      }

      // Build and return response
      return {
        lastMutationIDChanges,
        cookie: serverVersion,
        patch,
      };
    });
    res.json(result satisfies PullResponseV1);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

async function processMutation(db: BunSQLiteDatabase, clientGroupID: string, mutation: Mutation) {
  const { clientID } = mutation;

  const prevVersion = await getServerVersion(db);
  const nextVersion = prevVersion + 1;

  const lastMutationID = await getLastMutationID(db, clientID);
  const nextMutationID = lastMutationID + 1;

  if (mutation.id < nextMutationID) {
    console.log(`Mutation ${mutation.id} already processed - skipping`);
    return;
  }

  if (mutation.id > nextMutationID) {
    throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
  }

  console.log("Processing mutation", mutation.id);

  switch (mutation.name) {
    case "createTodo":
      await db
        .insert(todoTable)
        .values(mutation.args)
        .onConflictDoUpdate({
          target: [todoTable.id],
          set: {
            ...mutation.args,
            version: nextVersion,
          },
        });
      break;
    case "updateTodo":
      await db.update(todoTable).set(mutation.args);
      break;
    default:
      mutation satisfies never;
  }

  await setLastMutationID(db, clientID, clientGroupID, nextMutationID, nextVersion);
  await setServerVersion(db, nextVersion);
}

async function sendPoke() {
  // Implement your poke mechanism here
  // This could be WebSocket, Server-Sent Events, or polling
}
