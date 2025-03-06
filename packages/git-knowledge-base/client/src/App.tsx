import { Routes, Route } from "react-router-dom";
import { MutatorDefs, Replicache } from "replicache";
import { z } from "zod";
import { File } from "../../shared/web/schemas";
import { getTimestampWithTimezone } from "./lib/utils";

const envSchema = z.object({
  VITE_REPLICACHE_LICENSE_KEY: z.string(),
  VITE_REPLICACHE_PULL_PATH: z.string(),
  VITE_REPLICACHE_PUSH_PATH: z.string(),
  VITE_API_URL: z.string(),
});

const env = envSchema.parse(import.meta.env);
const pushUrl = new URL(env.VITE_REPLICACHE_PUSH_PATH, env.VITE_API_URL);
const pullUrl = new URL(env.VITE_REPLICACHE_PULL_PATH, env.VITE_API_URL);

// Define mutations
const mutators: MutatorDefs = {
  createFile: async (tx, { path, content }: { path: string; content: string }) => {
    await tx.set(`file/${path}`, {
      path,
      content,
      metadata: {
        schemaVersion: 1,
        custom: {
          createdAt: new Date().toISOString(),
        },
      },
    } satisfies File);
  },
  updateFile: async (tx, { path, content }: { path: string; content: string }) => {
    const existing = (await tx.get(`file/${path}`)) as File | null;
    if (!existing) {
      throw new Error(`File not found: ${path}`);
    }
    await tx.set(`file/${path}`, {
      ...existing,
      path,
      content,
      metadata: {
        ...existing.metadata,
        custom: {
          ...existing.metadata.custom,
          updatedAt: getTimestampWithTimezone(),
        },
      },
    } satisfies File);
  },
  deleteFile: async (tx: any, { path }: { path: string }) => {
    await tx.del(`file/${path}`);
  },
};

// Create a singleton instance of Replicache
export const rep = new Replicache({
  name: "git-knowledge-base-client",
  licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
  pushURL: pushUrl.toString(),
  pullURL: pullUrl.toString(),
  mutators,
  pullInterval: 10000, // Pull every 10 seconds
});

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* <Route path="/" element={<HomePage />} /> */}
        <Route path="/" element={<TestPage />} />
      </Routes>
    </div>
  );
}

const TestPage = () => {
  return <div>Test</div>;
};

export default App;
