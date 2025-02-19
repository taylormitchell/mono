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
import { NodePgDatabase } from "drizzle-orm/node-postgres";

import { z } from "zod";
import { Mutation, mutationSchema, itemSchema, viewSchema } from "../../../shared/types";
import { itemTable, viewTable } from "./db/schema";
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
    await sendPoke();
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

      const patch: PatchOperation[] = [];

      // Get changed items since requested version
      const changedItems = await tr
        .select()
        .from(itemTable)
        .where(gt(itemTable.version, clientVersion));
      for (const item of changedItems) {
        patch.push({
          op: "put",
          key: `item/${item.id}`,
          value: itemSchema.parse({ ...item, children: JSON.parse(item.children) }),
        });
      }

      // Get changed views since requested version
      const changedViews = await tr
        .select()
        .from(viewTable)
        .where(gt(viewTable.version, clientVersion));
      for (const view of changedViews) {
        patch.push({
          op: "put",
          key: `view/${view.id}`,
          value: viewSchema.parse(view),
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

async function makeNameUnique(
  db: NodePgDatabase,
  name: string | null,
  id: string
): Promise<string | null> {
  if (!name) return null;

  let uniqueName = name;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(itemTable)
      .where(eq(itemTable.name, uniqueName))
      .limit(1);

    if (existing.length === 0) break;
    if (existing[0].id === id) break;
    uniqueName = `${name} (${counter})`;
    counter++;
  }

  return uniqueName;
}

async function processMutation(db: NodePgDatabase, clientGroupID: string, mutation: Mutation) {
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

  try {
    switch (mutation.name) {
      case "createItem": {
        const uniqueName = await makeNameUnique(db, mutation.args.name, mutation.args.id);
        await db
          .insert(itemTable)
          .values({
            ...mutation.args,
            children: JSON.stringify(mutation.args.children),
            name: uniqueName,
            version: nextVersion,
          })
          .onConflictDoUpdate({
            target: [itemTable.id],
            set: {
              ...mutation.args,
              children: JSON.stringify(mutation.args.children),
              name: uniqueName,
              version: nextVersion,
            },
          });
        break;
      }
      case "updateItem": {
        const { id, name, children, ...args } = mutation.args;
        const uniqueName = name !== undefined ? await makeNameUnique(db, name, id) : undefined;
        await db
          .update(itemTable)
          .set({
            ...args,
            ...(children && { children: JSON.stringify(children) }),
            name: uniqueName,
            version: nextVersion,
          })
          .where(eq(itemTable.id, id));
        break;
      }
      case "deleteItem": {
        const { id: itemID, deletedAt } = mutation.args;
        await db
          .update(itemTable)
          .set({ deletedAt, version: nextVersion })
          .where(eq(itemTable.id, itemID));
        break;
      }
      case "createView": {
        await db.insert(viewTable).values({
          ...mutation.args,
          version: nextVersion,
        });
        break;
      }
      case "updateView": {
        const { id: viewID, ...args } = mutation.args;
        await db
          .update(viewTable)
          .set({
            ...args,
            version: nextVersion,
          })
          .where(eq(viewTable.id, viewID));
        break;
      }
      case "deleteView": {
        const { id: viewID, deletedAt } = mutation.args;
        await db
          .update(viewTable)
          .set({ deletedAt, version: nextVersion })
          .where(eq(viewTable.id, viewID));
        break;
      }
      default:
        console.log("unknown mutation", mutation);
        mutation satisfies never;
    }
  } catch (e) {
    console.log("Error processing mutation", mutation);
    console.error(e);
  }
  await setLastMutationID(db, clientID, clientGroupID, nextMutationID, nextVersion);
  await setServerVersion(db, nextVersion);
}

async function sendPoke() {
  // Implement your poke mechanism here
  // This could be WebSocket, Server-Sent Events, or polling
}
