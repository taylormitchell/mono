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
import { logSchema, mutationSchema, promptSchema } from "../../../shared/types";
import type { Mutation, ServerMutation } from "../../../shared/types";
import type { PushRequestV1, PatchOperation, PullResponseV1 } from "replicache";
import { logTable, promptTable } from "./db/schema";
import { dataifyLog } from "./ai";
import { sendToClient } from "./server-side-events";
import type { Log } from "../../../shared/types";

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
        return processClientMutation(tr, push.clientGroupID, mutation);
      });
      if (mutation.name === "createLog") {
        setTimeout(() => addDataToLog(db, mutation.args.id), 0);
      }
    }
    res.json({});
    sendToClient({ type: "poke" });
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

      // Get changed prompts since requested version
      const changedPrompts = await tr
        .select()
        .from(promptTable)
        .where(gt(promptTable.version, clientVersion));
      for (const prompt of changedPrompts) {
        patch.push({
          op: "put",
          key: `prompt/${prompt.id}`,
          value: promptSchema.parse(prompt),
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

async function processClientMutation(
  db: NodePgDatabase,
  clientGroupID: string,
  mutation: Mutation
) {
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
    await applyMutation(db, mutation, nextVersion);
  } catch (e) {
    console.error(`Error processing mutation ${mutation.id}`, e);
  }

  await setLastMutationID(db, clientID, clientGroupID, nextMutationID, nextVersion);
  await setServerVersion(db, nextVersion);
}

export async function processServerMutation(db: NodePgDatabase, mutation: ServerMutation) {
  const prevVersion = await getServerVersion(db);
  const nextVersion = prevVersion + 1;
  await applyMutation(db, mutation, nextVersion);
  await setServerVersion(db, nextVersion);
}

async function applyMutation(
  db: NodePgDatabase,
  mutation: Mutation | ServerMutation,
  nextVersion: number
) {
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
    case "createPrompt": {
      await db.insert(promptTable).values({
        ...mutation.args,
        version: nextVersion,
      });
      break;
    }
    case "updatePrompt": {
      const { id, ...args } = mutation.args;
      await db
        .update(promptTable)
        .set({
          ...args,
          version: nextVersion,
        })
        .where(eq(promptTable.id, id));
      break;
    }
    case "deletePrompt": {
      const { id: promptID, deletedAt } = mutation.args;
      await db
        .update(promptTable)
        .set({ deletedAt, version: nextVersion })
        .where(eq(promptTable.id, promptID));
      break;
    }
    default:
      console.log("unknown mutation", mutation);
      mutation satisfies never;
  }
}

async function addDataToLog(db: NodePgDatabase, logId: string) {
  const logRecord = (await db.select().from(logTable).where(eq(logTable.id, logId)).limit(1))[0];
  if (!logRecord) {
    console.error(`Log ${logId} not found`);
    return;
  }
  if (logRecord.data.length > 0) {
    console.log(`Log ${logId} already has data - skipping`);
    return;
  }

  try {
    sendToClient({ type: "startProcessingLog", args: { id: logId } });
    const result = await dataifyLog(db, logRecord);
    if (!result.success) {
      throw result.error;
    }
    if (result.data.length === 0) {
      throw "No log data found";
    }
    await db.transaction((tr) =>
      processServerMutation(tr, {
        name: "updateLog",
        args: { id: logId, data: result.data },
      })
    );
    sendToClient({
      type: "finishedProcessingLog",
      args: { id: logId, success: true },
    });
    sendToClient({ type: "poke" });
  } catch (e) {
    console.error("Error adding data to log:", e);
    sendToClient({
      type: "finishedProcessingLog",
      args: {
        id: logId,
        success: false,
        message: e instanceof Error ? e.message : String(e),
      },
    });
  }
}
