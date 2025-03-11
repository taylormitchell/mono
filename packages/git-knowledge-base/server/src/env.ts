import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  REPLICACHE_PULL_PATH: z.string(),
  REPLICACHE_PUSH_PATH: z.string(),
  GIT_REPO_PATH: z.string(),
});

export const env = envSchema.parse(process.env);
