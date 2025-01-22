import {
  withTransaction,
  getServerVersion,
  getLastMutationID,
  setLastMutationID,
  setServerVersion,
  getDb,
} from "./db";
import type { Request, Response } from "express";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { z } from "zod";
import { Mutation, mutationSchema } from "../../../shared/types";
import { todoTable } from "./db/schema";
import { PushRequestV1, PullRequestV1 } from "replicache";

const serverId = 0;

export const pushSchema = z.object({
  pushVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

const cookieSchema = z.union([
  z.null(),
  z.string(),
  z.number(),
  z.object({ order: z.union([z.number(), z.string()]) }),
]);

export const pullSchema = z.object({
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  // cookie: cookieSchema,
  cookie: z.number(),
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
    const pull = pullSchema.parse(req.body) satisfies PullRequestV1;
    const result = await withTransaction(async (db) => {
      // Get current version
      const serverVersion = (await getServerVersion()) ?? -1;

      if (pull.cookie > serverVersion) {
        throw new Error(
          `Cookie ${pull.cookie} is from the future - aborting. This can happen in development if the server restarts.`
        );
      }

      const lastMutationID = await getLastMutationID(db, pull.clientID);

      // Get changed todos since requested version
      const changed = await db.all(
        `SELECT * FROM todo 
         WHERE version > ? `,
        pull.cookie ?? 0
      );

      // Build patch operations
      const patch = changed.map((row) => ({
        op: row.deleted ? "del" : "put",
        key: `todo/${row.id}`,
        value: row.deleted
          ? undefined
          : {
              id: row.id,
              content: row.content,
              due_date: row.due_date,
            },
      }));

      return {
        lastMutationIDChanges: {
          [pull.clientID]: lastMutationID,
        },
        cookie: currentVersion,
        patch,
      };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

async function processMutation(db: BunSQLiteDatabase, clientGroupID: string, mutation: Mutation) {
  const { clientID } = mutation;

  const prevVersion = await getServerVersion(db);
  const nextVersion = (prevVersion ?? 0) + 1;

  const lastMutationID = await getLastMutationID(db, clientID);
  const nextMutationID = lastMutationID + 1;

  if (mutation.id < nextMutationID) {
    console.log(`Mutation ${mutation.id} already processed - skipping`);
    return;
  }

  if (mutation.id > nextMutationID) {
    throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
  }

  switch (mutation.name) {
    case "createTodo":
      await db.insert(todoTable).values(mutation.args);
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
