import fs from "fs/promises";
import path from "path";
import { env } from "./env";
import { File } from "../../shared/web/schemas";
import { getFileMetadata, setMetadata } from "../../shared/files";

// Create a file
export async function createFile(filePath: string, data: File) {
  try {
    const fullPath = path.join(env.GIT_REPO_PATH, filePath);

    // Create file
    if (await fs.exists(fullPath)) {
      throw new Error(`File ${filePath} already exists`);
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data.content);

    // Create metadata
    await setMetadata({ repoDir: env.GIT_REPO_PATH, filePath, metadata: data.metadata });

    return true;
  } catch (error) {
    console.error(`Error creating file ${filePath}:`, error);
    return false;
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
      const metadata = getFileMetadata({ repoDir, filePath });
      setMetadata({ repoDir, filePath, metadata: {
        ...metadata,
        ...data.metadata,
        custom: { ...metadata?.custom, ...data.metadata?.custom },
      });
    }
    return true;
  } catch (error) {
    console.error(`Error updating file ${filePath}:`, error);
    return false;
  }
}

// Delete a file
export async function deleteFile(filePath: string) {
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
