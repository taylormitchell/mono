import fs from "fs";
import chalk from "chalk";
import { glob } from "glob";
import { join, dirname, normalize, resolve } from "path";
import { z } from "zod";
import { executeGit, getFirstCommitDate, getLastCommit, getPreviousPath } from "./git";
import { isGitRepository, getLatestCommitHash, getChangedFilesSince } from "./git";

export const METADATA_DIR = ".metadata/";
export const CONFIG_PATH = join(METADATA_DIR, ".meta-config.json");

export const configSchema = z.object({
  schemaVersion: z.number().int().positive(),
  lastCommitHash: z.string().nullable(),
  ignore: z.array(z.string()),
});

export const fileMetadataSchema = z.object({
  schemaVersion: z.number(),
  firstCommitDate: z.string().optional(),
  lastCommitDate: z.string().optional(),
  lastCommitHash: z.string().optional(),
  custom: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
});

export type FileMetadata = z.infer<typeof fileMetadataSchema>;

export const defaultConfig = {
  schemaVersion: 1,
  lastCommitHash: null,
  ignore: ["node_modules/**", ".git/**", `${METADATA_DIR}**`],
};

export type Config = z.infer<typeof configSchema>;

// Config

function assertRepo(repoDir: string) {
  if (!fs.existsSync(join(repoDir, METADATA_DIR))) {
    throw new Error(`Not a knowledge base repo: ${repoDir}`);
  }
  if (!isGitRepository({ cwd: repoDir })) {
    throw new Error(`Not a git repo: ${repoDir}`);
  }
}

export function readConfig({ repoDir }: { repoDir: string }): Config | null {
  assertRepo(repoDir);
  try {
    const configPath = join(repoDir, CONFIG_PATH);
    if (!fs.existsSync(configPath)) return null;
    return configSchema.parse(JSON.parse(fs.readFileSync(configPath, "utf-8")));
  } catch (error) {
    console.error(`Failed to read config: ${error}`);
    return null;
  }
}

export function writeConfig({ repoDir, config }: { repoDir: string; config: Config }) {
  assertRepo(repoDir);
  const configPath = join(repoDir, CONFIG_PATH);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  return config;
}

export function getFileMetadata({
  repoDir,
  filePath,
}: {
  repoDir: string;
  filePath: string;
}): FileMetadata | null {
  assertRepo(repoDir);
  const absPath = join(repoDir, filePath);
  try {
    if (!fs.existsSync(absPath)) return null;
    return fileMetadataSchema.parse(JSON.parse(fs.readFileSync(absPath, "utf-8")));
  } catch (error) {
    console.error(`Failed to get metadata for ${absPath}: ${error}`);
    return null;
  }
}

export async function setMetadata({
  repoDir,
  filePath,
  metadata,
}: {
  repoDir: string;
  filePath: string;
  metadata: FileMetadata | null;
}) {
  assertRepo(repoDir);
  const absPath = join(repoDir, filePath);
  if (metadata) {
    if (!fs.existsSync(dirname(absPath))) {
      fs.mkdirSync(dirname(absPath), { recursive: true });
    }
    fs.writeFileSync(absPath, JSON.stringify(metadata, null, 2), "utf-8");
  } else {
    fs.unlinkSync(absPath);
  }
}

export async function getAllMetadataFilePaths({ repoDir }: { repoDir: string }): Promise<string[]> {
  assertRepo(repoDir);
  const metadataDir = join(repoDir, METADATA_DIR);
  const configPath = join(repoDir, CONFIG_PATH);
  return await glob(`${metadataDir}/**/*.json`, { ignore: [configPath] });
}

export function contentPathToMetadataPath(filePath: string): string {
  const normalizedPath = normalize(filePath);
  return join(METADATA_DIR, `${normalizedPath}.json`);
}

export function metadataPathToContentPath(metadataPath: string): string {
  const normalizedPath = normalize(metadataPath);
  if (!normalizedPath.startsWith(METADATA_DIR)) {
    throw new Error(`Invalid metadata path: ${metadataPath}`);
  }
  return normalizedPath.slice(METADATA_DIR.length).replace(/\.json$/, "");
}

export async function initRepo({ repoDir }: { repoDir: string }) {
  if (!fs.existsSync(join(repoDir, METADATA_DIR))) {
    fs.mkdirSync(join(repoDir, METADATA_DIR), { recursive: true });
  }
  if (!isGitRepository({ cwd: repoDir })) {
    await executeGit(["init"], { cwd: repoDir });
  }
  writeConfig({ repoDir, config: defaultConfig });
}

export async function updateRepo({ repoDir }: { repoDir: string }): Promise<boolean> {
  assertRepo(repoDir);
  try {
    const config = readConfig({ repoDir }) ?? writeConfig({ repoDir, config: defaultConfig });

    // Get files that have changed since the last commit included in the metadata
    const latestCommitHash = await getLatestCommitHash({ cwd: repoDir });
    if (!latestCommitHash) throw new Error("Failed to get latest commit hash.");
    const changedFiles = new Set(
      await getChangedFilesSince(config.lastCommitHash, { cwd: repoDir })
    );
    const notIgnoredFiles = await glob("**/*", {
      ignore: [...config.ignore, `${METADATA_DIR}/**`],
      nodir: true,
      cwd: repoDir,
    });
    const filesToUpdate = notIgnoredFiles.filter((file) => changedFiles.has(file));
    if (filesToUpdate.length === 0) {
      console.log(chalk.green("No files to update."));
      return true;
    } else {
      console.log(chalk.green(`Found ${filesToUpdate.length} files to update.`));
    }

    // Process each file
    let successCount = 0;
    let errorCount = 0;
    let renamedCount = 0;

    for (let i = 0; i < filesToUpdate.length; i++) {
      const filePath = filesToUpdate[i];
      const metadataPath = contentPathToMetadataPath(filePath);

      try {
        // Move metadata if the file has been renamed
        const previousPath = await getPreviousPath(filePath, config.lastCommitHash, {
          cwd: repoDir,
        });
        if (previousPath) {
          renamedCount++;
          const previousMetadataPath = contentPathToMetadataPath(previousPath);
          if (fs.existsSync(previousMetadataPath)) {
            if (!fs.existsSync(metadataPath)) {
              fs.renameSync(previousMetadataPath, metadataPath);
              console.log(chalk.blue(`Moved metadata for ${filePath} to ${metadataPath}`));
            } else {
              fs.unlinkSync(previousMetadataPath);
              console.log(chalk.blue(`Removed metadata for ${previousPath}`));
            }
          }
        }

        // Update the last commit hash and date
        const lastCommit = await getLastCommit(filePath, { cwd: repoDir });
        if (lastCommit) {
          const metadata = getFileMetadata({ repoDir, filePath }) || { schemaVersion: 1 };
          setMetadata({
            repoDir,
            filePath,
            metadata: {
              ...metadata,
              lastCommitHash: lastCommit?.hash,
              lastCommitDate: lastCommit?.date,
            },
          });
          console.log(chalk.blue(`Updated metadata for ${filePath}`));
        }

        successCount++;
      } catch (error) {
        errorCount++;
        console.log(chalk.red(`Error processing ${filePath}: ${error}`));
      }
    }

    // Handle deleted files
    const metadataPaths = await getAllMetadataFilePaths({ repoDir });
    let deletedCount = 0;
    for (const metadataPath of metadataPaths) {
      try {
        const filePath = metadataPathToContentPath(metadataPath);
        if (fs.existsSync(filePath)) {
          continue;
        }
        // The file was deleted, remove the metadata
        if (fs.existsSync(metadataPath)) {
          fs.unlinkSync(metadataPath);
          deletedCount++;
          console.log(chalk.blue(`Removed metadata for ${filePath}`));
        }
      } catch (error) {
        console.log(chalk.red(`Error handling deleted file ${metadataPath}: ${error}`));
      }
    }

    // Update the configuration with the latest commit hash
    config.lastCommitHash = latestCommitHash;
    writeConfig({ repoDir, config });

    console.log(chalk.green(`Update complete.`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Update failed: ${error}`));
    return false;
  }
}
