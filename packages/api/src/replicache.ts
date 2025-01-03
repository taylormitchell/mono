import { Database } from "sqlite";
import { withTransaction, serverID } from "./db";
import type { Request, Response } from "express";

export async function handlePush(req: Request, res: Response) {
  const push = req.body;
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
      const { version } = await db.get(
        "SELECT version FROM replicache_server WHERE id = ?",
        serverID
      );

      const lastMutationID = await getLastMutationID(db, pull.clientID);

      // Get all messages changed since the client's last pull
      const changed = await db.all(
        "SELECT * FROM message WHERE version > ? AND deleted = 0",
        pull.cookie ?? 0
      );

      return {
        lastMutationID,
        cookie: version,
        patch: changed.map((row) => ({
          op: "put",
          key: `message/${row.id}`,
          value: {
            id: row.id,
            sender: row.sender,
            content: row.content,
            order: row.ord,
          },
        })),
      };
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

async function processMutation(db: Database, clientGroupID: string, mutation: any) {
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
    case "createMessage":
      await createMessage(db, mutation.args, nextVersion);
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

async function createMessage(db: Database, message: any, version: number) {
  await db.run(
    `INSERT INTO message (id, sender, content, ord, deleted, version)
     VALUES (?, ?, ?, ?, 0, ?)`,
    message.id,
    message.from,
    message.content,
    message.order,
    version
  );
}

async function sendPoke() {
  // Implement your poke mechanism here
  // This could be WebSocket, Server-Sent Events, or polling
}
