import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { File, mutationSchema } from "../../shared/web/schemas";
import { createFile, updateFile, deleteFile } from "./mutations";
import { PullResponseV1, PatchOperation } from "replicache";
import {
  getChangedFilesSince,
  getCurrentCommit,
  commitAll,
  getCommitOrder,
  getCountBetweenCommits,
} from "../../shared/git";
import { getFileMetadata, METADATA_DIR } from "../../shared/repo";
import { metadataPathToContentPath } from "../../shared/repo";
import { updateRepo } from "../../shared/repo";
import { env } from "./env";

type ClientState = {
  clientID: string;
  clientGroupID: string;
  lastMutationID: number;
  version: { hash: string; order: number } | null;
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

export const cookieSchema = z
  .object({
    hash: z.string(),
    order: z.number(),
  })
  .nullable();

type Cookie = z.infer<typeof cookieSchema>;

export const pullSchema = z.object({
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
  profileID: z.string(),
  cookie: cookieSchema,
  clientGroupID: z.string(),
});

type Pull = z.infer<typeof pullSchema>;

let cachedVersion: { hash: string; order: number } | null = null;

async function getCurrentVersion(): Promise<{ hash: string; order: number } | null> {
  const commit = await getCurrentCommit({ cwd: env.GIT_REPO_PATH });
  if (!commit) {
    console.error("Failed to get current commit");
    return null;
  }
  if (cachedVersion) {
    // Compute the order using an offset from the cached version
    const diff = await getCountBetweenCommits(cachedVersion.hash, commit, {
      cwd: env.GIT_REPO_PATH,
    });
    if (diff === null) {
      console.error("Failed to get count between commits");
      return null;
    }
    return { hash: commit, order: cachedVersion.order + diff };
  } else {
    // Compute the order from the beginning
    const order = await getCommitOrder(commit, { cwd: env.GIT_REPO_PATH });
    if (!order) {
      console.error("Failed to get commit order");
      return null;
    }
    return { hash: commit, order };
  }
}

export async function processPush(pushData: Push): Promise<void> {
  const { mutations, clientGroupID } = pushData;

  // Process mutations in order
  const clientIDs = new Set<string>();
  for (const mutation of mutations) {
    const { clientID } = mutation;
    const client: ClientState =
      clientID in clients
        ? clients[clientID]
        : { clientID, clientGroupID, lastMutationID: 0, version: null };

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
  await commitAll({ cwd: env.GIT_REPO_PATH, message: "File updates from web client" });

  // Update metadata and commit
  await updateRepo({ repoDir: env.GIT_REPO_PATH, message: "Update metadata" });

  // Get the latest version
  const latestVersion = await getCurrentVersion();
  if (!latestVersion) {
    // TODO: Should we updated anyways? even if it's null?
    console.error("Failed to get current version");
    return;
  }

  // Update our version caches
  cachedVersion = latestVersion;
  for (const clientID of clientIDs) {
    const client: ClientState =
      clientID in clients
        ? clients[clientID]
        : { clientID, clientGroupID, lastMutationID: 0, version: null };
    clients[clientID] = { ...client, version: { ...latestVersion } };
  }
}

export async function processPull(pullData: Pull): Promise<PullResponseV1> {
  const { cookie, clientGroupID } = pullData;

  // Update our version cache
  const latestVersion = await getCurrentVersion();
  if (!latestVersion) {
    throw new Error("Failed to get current version");
  }
  cachedVersion = latestVersion;

  // Build patches for changed files
  const patch: Array<PatchOperation> = [];
  const files = await getChangedFilesSince(cookie?.hash ?? null, {
    cwd: env.GIT_REPO_PATH,
  });
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

  const lastMutationIDChanges: Record<string, number> = {};
  for (const [clientID, client] of Object.entries(clients)) {
    if (
      client.clientGroupID === clientGroupID &&
      client.version &&
      cachedVersion &&
      client.version.order > (cookie?.order ?? 0)
    ) {
      lastMutationIDChanges[clientID] = client.lastMutationID;
    }
  }

  const newCookie: Cookie = latestVersion ? { ...latestVersion } : null;
  return {
    cookie: newCookie,
    lastMutationIDChanges: lastMutationIDChanges,
    patch,
  };
}
