import { z } from "zod";

const processEnv = z
  .object({
    VITE_REPLICACHE_LICENSE_KEY: z.string(),
    VITE_API_URL: z.string().optional(),
    VITE_WS_URL: z.string().optional(),
  })
  .parse(import.meta.env);

export const env: {
  replicacheLicenseKey: string;
  replicachePullURL?: string;
  replicachePushURL?: string;
  replicachePokeURL?: string;
} = Object.freeze({
  replicacheLicenseKey: processEnv.VITE_REPLICACHE_LICENSE_KEY,
  replicachePullURL: processEnv.VITE_API_URL ? processEnv.VITE_API_URL + "pull" : undefined,
  replicachePushURL: processEnv.VITE_API_URL ? processEnv.VITE_API_URL + "push" : undefined,
  replicachePokeURL: processEnv.VITE_WS_URL,
});

console.debug("env", env);
