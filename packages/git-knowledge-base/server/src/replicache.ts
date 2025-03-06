import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { File, mutationSchema } from "../../shared/web/schemas";
import { createFile, updateFile, deleteFile } from "./mutations";
import { PullResponseV1, PatchOperation } from "replicache";
import {
  getChangedFilesSince,
  getCurrentCommit,
  executeGit,
  commitIsLater,
} from "../../shared/git";
import { getFileMetadata, METADATA_DIR } from "../../shared/repo";
import { metadataPathToContentPath } from "../../shared/repo";
import { updateRepo } from "../../shared/repo";
import { env } from "./env";

type ClientState = {
  clientID: string;
  clientGroupID: string;
  lastMutationID: number;
  lastCommit: string | null;
};
const clients: Record<string, ClientState> = {};

export const pushSchema = z.object({
  pushVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

type Push = z.infer<typeof pushSchema>;

export const pullSchema = z.object({
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  cookie: z.string().nullable(),
  clientGroupID: z.string(),
});

type Pull = z.infer<typeof pullSchema>;

export async function processPush(pushData: Push): Promise<void> {
  const { mutations, clientGroupID } = pushData;

  // Process mutations in order
  const clientIDs = new Set<string>();
  for (const mutation of mutations) {
    const { clientID } = mutation;
    const client: ClientState = clientID
      ? clients[clientID]
      : { clientID, clientGroupID, lastMutationID: 0, lastCommit: null };

    // Skip if already processed
    if (mutation.id <= client.lastMutationID) {
      continue;
    }

    // Skip if mutation is from the future
    if (mutation.id > client.lastMutationID + 1) {
      console.error(
        `Mutation ${mutation.id} is from the future - expected ${client.lastMutationID + 1}`
      );
      continue;
    }

    // Process the mutation
    switch (mutation.name) {
      case "createFile":
        await createFile({
          repoDir: env.GIT_REPO_PATH,
          filePath: mutation.args.id,
          data: mutation.args,
        });
        break;
      case "updateFile":
        await updateFile({
          repoDir: env.GIT_REPO_PATH,
          filePath: mutation.args.id,
          data: mutation.args,
        });
        break;
      case "deleteFile":
        await deleteFile({
          repoDir: env.GIT_REPO_PATH,
          filePath: mutation.args.id,
        });
        break;
      default:
        mutation satisfies never;
    }

    // Update client's last mutation ID
    clientIDs.add(clientID);
    clients[clientID] = {
      ...client,
      lastMutationID: mutation.id,
    };
  }

  // Commit mutation changes
  await executeGit(["add", "."]);
  await executeGit(["commit", "-m", "File updates from web client"]);

  // Update metadata and commit
  await updateRepo({ repoDir: env.GIT_REPO_PATH, message: "Update metadata" });

  const commit = await getCurrentCommit();
  if (commit) {
    for (const clientID of clientIDs) {
      const client: ClientState =
        clientID in clients
          ? clients[clientID]
          : { clientID, clientGroupID, lastMutationID: 0, lastCommit: null };
      clients[clientID] = {
        ...client,
        lastCommit: commit,
      };
    }
  }
}

export async function processPull(pullData: Pull): Promise<PullResponseV1> {
  const { cookie, clientGroupID } = pullData;
  console.log("Processing pull with cookie:", cookie);
  const files = await getChangedFilesSince(cookie, { cwd: env.GIT_REPO_PATH });
  console.log("Files:", files);

  // Build patch
  const patch: Array<PatchOperation> = [];

  for (const changedFilePath of files) {
    const filePath = changedFilePath.startsWith(METADATA_DIR)
      ? metadataPathToContentPath(changedFilePath)
      : changedFilePath;

    try {
      const absoluteFilePath = path.join(env.GIT_REPO_PATH, filePath);
      if (await fs.exists(absoluteFilePath)) {
        // File exists, add it to patch
        const content = await fs.readFile(absoluteFilePath, "utf-8");
        const metadata = getFileMetadata({ repoDir: env.GIT_REPO_PATH, filePath }) ?? {
          schemaVersion: 1,
        };
        patch.push({
          op: "put" as const,
          key: `file/${filePath}`,
          value: { id: filePath, content, metadata } satisfies File,
        });
      } else {
        // If file doesn't exist, it was deleted
        patch.push({ op: "del" as const, key: `file/${filePath}` });
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  const currentCommit = await getCurrentCommit({ cwd: env.GIT_REPO_PATH });
  console.log("Current commit:", currentCommit);

  const lastMutationIDChanges: Record<string, number> = {};
  for (const [clientID, client] of Object.entries(clients)) {
    if (
      client.clientGroupID === clientGroupID &&
      client.lastCommit &&
      cookie &&
      (await commitIsLater(client.lastCommit, cookie, { cwd: env.GIT_REPO_PATH }))
    ) {
      lastMutationIDChanges[clientID] = client.lastMutationID;
    }
  }

  console.log("Last mutation ID changes:", lastMutationIDChanges);
  return {
    cookie: currentCommit,
    lastMutationIDChanges: lastMutationIDChanges,
    patch,
  };
}
