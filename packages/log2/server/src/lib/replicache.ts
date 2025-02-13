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
import { logSchema, Mutation, mutationSchema } from "../../../shared/types";
import { PushRequestV1, PatchOperation, PullResponseV1 } from "replicache";
import { logTable } from "./db/schema";

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
      const changedLogs = await tr
        .select()
        .from(logTable)
        .where(gt(logTable.version, clientVersion));
      for (const log of changedLogs) {
        patch.push({
          op: "put",
          key: `log/${log.id}`,
          value: logSchema.parse(log),
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

  switch (mutation.name) {
    case "createLog": {
      await db
        .insert(logTable)
        .values({
          ...mutation.args,
          version: nextVersion,
        })
        .onConflictDoUpdate({
          target: [logTable.id],
          set: {
            ...mutation.args,
            version: nextVersion,
          },
        });
      break;
    }
    case "updateLog": {
      const { id, ...args } = mutation.args;
      await db
        .update(logTable)
        .set({
          ...args,
          version: nextVersion,
        })
        .where(eq(logTable.id, id));
      break;
    }
    case "deleteLog": {
      const { id: logID, deletedAt } = mutation.args;
      await db
        .update(logTable)
        .set({ deletedAt, version: nextVersion })
        .where(eq(logTable.id, logID));
      break;
    }
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
