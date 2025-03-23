import fs from "fs/promises";
import path from "path";
import { env } from "./env";
import { File } from "../../shared/web/schemas";
import { getFileMetadata, setMetadata } from "../../shared/repo";

// Create a file
export async function createFile({
  repoDir,
  filePath,
  data,
}: {
  repoDir: string;
  filePath: string;
  data: File;
}) {
  try {
    const fullPath = path.join(repoDir, filePath);
    if (await fs.exists(fullPath)) throw new Error(`File ${filePath} already exists`);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data.content);
    await setMetadata({ repoDir: env.GIT_REPO_PATH, filePath, metadata: data.metadata });
  } catch (error) {
    console.error(`Error creating file ${filePath}:`, error);
  }
}

export async function updateFile({
  repoDir,
  filePath,
  data,
}: {
  repoDir: string;
  filePath: string;
  data: Partial<File>;
}) {
  try {
    // Write file content
    const fullPath = path.join(repoDir, filePath);
    if (!(await fs.exists(fullPath))) {
      throw new Error(`File ${filePath} does not exist`);
    }
    if (data.content) {
      await fs.writeFile(fullPath, data.content);
    }

    // Update metadata
    if (data.metadata) {
      const existingMetadata = getFileMetadata({ repoDir, filePath }) || { schemaVersion: 1 };
      setMetadata({ repoDir, filePath, metadata: { ...existingMetadata, ...data.metadata } });
    }
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error);
  }
}

// Delete a file
export async function deleteFile({ repoDir, filePath }: { repoDir: string; filePath: string }) {
  try {
    const fullPath = path.join(env.GIT_REPO_PATH, filePath);

    // Check if file exists
    if (!(await fs.exists(fullPath))) {
      throw new Error(`File ${filePath} does not exist`);
    }

    // Delete file
    await fs.unlink(fullPath);

    // Delete metadata
    await setMetadata({ repoDir: env.GIT_REPO_PATH, filePath, metadata: null });

    return true;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}
