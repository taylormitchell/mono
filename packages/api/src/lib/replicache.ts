import { Database } from "sqlite";
import { withTransaction, serverID } from "../db";
import type { Request, Response } from "express";
import { Mutation, pushSchema } from "./types";
import { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export async function handlePush(req: Request, res: Response) {
  const push = pushSchema.parse(req.body);
  console.log("Processing push", JSON.stringify(push));

  try {
    for (const mutation of push.mutations) {
      await withTransaction(async (db) => {
        await processMutation(db, push.clientGroupID, mutation);
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
    const pull = req.body;
    const result = await withTransaction(async (db) => {
      // Get current version
      const { version: currentVersion } = await db.get(
        "SELECT version FROM replicache_server WHERE id = ?",
        serverID
      );

      if (pull.cookie > currentVersion) {
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

  const { version: prevVersion } = await db.get(
    "SELECT version FROM replicache_server WHERE id = ?",
    serverID
  );
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

  switch (mutation.name) {
    case "createTodo":
      await createTodo(db, mutation.args, nextVersion);
      break;
    case "updateTodo":
      await updateTodo(db, mutation.args, nextVersion);
      break;
    default:
      throw new Error(`Unknown mutation: ${mutation.name}`);
  }

  await setLastMutationID(db, clientID, clientGroupID, nextMutationID, nextVersion);
  await db.run("UPDATE replicache_server SET version = ? WHERE id = ?", nextVersion, serverID);
}

async function getLastMutationID(db: Database, clientID: string): Promise<number> {
  const row = await db.get("SELECT last_mutation_id FROM replicache_client WHERE id = ?", clientID);
  return row ? row.last_mutation_id : 0;
}

async function setLastMutationID(
  db: Database,
  clientID: string,
  clientGroupID: string,
  mutationID: number,
  version: number
) {
  const result = await db.run(
    `UPDATE replicache_client 
     SET client_group_id = ?, last_mutation_id = ?, version = ?
     WHERE id = ?`,
    clientGroupID,
    mutationID,
    version,
    clientID
  );

  if (result.changes === 0) {
    await db.run(
      `INSERT INTO replicache_client (id, client_group_id, last_mutation_id, version)
       VALUES (?, ?, ?, ?)`,
      clientID,
      clientGroupID,
      mutationID,
      version
    );
  }
}

async function createTodo(db: Database, todo: any, version: number) {
  await db.run(
    `INSERT INTO todo (id, content, due_date, created_at, updated_at, version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    todo.id,
    todo.content,
    todo.dueDate,
    todo.createdAt,
    todo.updatedAt,
    version
  );
}

async function updateTodo(db: Database, todo: any, version: number) {
  await db.run(
    `UPDATE todo SET content = ?, due_date = ?, updated_at = ?, version = ? WHERE id = ?`,
    todo.content,
    todo.dueDate,
    todo.updatedAt,
    version,
    todo.id
  );
}

async function sendPoke() {
  // Implement your poke mechanism here
  // This could be WebSocket, Server-Sent Events, or polling
}
