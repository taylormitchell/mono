import {
  getServerVersion,
  getLastMutationID,
  setLastMutationID,
  setServerVersion,
  getDb,
  getLastMutationIDChanges,
} from "./db/helpers";
import { gt, eq } from "drizzle-orm";
import type { Request, Response } from "express";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import { z } from "zod";
import { Mutation, mutationSchema, itemSchema } from "../../../shared/types";
import { itemTable } from "./db/schema";
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
    console.log("request body", pull);
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

      const lastMutationIDChanges = await getLastMutationIDChanges(
        tr,
        pull.clientGroupID,
        clientVersion
      );

      // Get changed domain objects since requested version
      const changedItems = await tr
        .select()
        .from(itemTable)
        .where(gt(itemTable.version, clientVersion));

      // Build patch operations
      const patch: PatchOperation[] = [];
      for (const item of changedItems) {
        patch.push({
          op: "put",
          key: `item/${item.id}`,
          value: itemSchema.parse(item),
        });
      }

      // Build and return response
      const body = {
        lastMutationIDChanges,
        cookie: serverVersion,
        patch,
      };
      console.log("response body", body);
      return body;
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

  console.log(`Mutation ${mutation.id} is new - processing`);

  switch (mutation.name) {
    case "createItem":
      await db
        .insert(itemTable)
        .values({
          ...mutation.args,
          version: nextVersion,
        })
        .onConflictDoUpdate({
          target: [itemTable.id],
          set: {
            ...mutation.args,
            version: nextVersion,
          },
        });
      break;
    case "updateItem":
      const { id, ...args } = mutation.args;
      await db
        .update(itemTable)
        .set({
          ...args,
          version: nextVersion,
        })
        .where(eq(itemTable.id, id));
      break;
    case "deleteItem":
      const { id: itemID, deletedAt } = mutation.args;
      await db
        .update(itemTable)
        .set({ deletedAt, version: nextVersion })
        .where(eq(itemTable.id, itemID));
      break;
    default:
      console.log("unknown mutation", mutation);
      mutation satisfies never;
  }

  await setLastMutationID(db, clientID, clientGroupID, nextMutationID, nextVersion);
  await setServerVersion(db, nextVersion);
}

async function sendPoke() {
  // Implement your poke mechanism here
  // This could be WebSocket, Server-Sent Events, or polling
}
