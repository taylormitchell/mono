import { Routes, Route } from "react-router-dom";
import { Replicache } from "replicache";
import { z } from "zod";

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
const mutators = {
  createFile: async (tx: any, { path, content }: { path: string; content: string }) => {
    await tx.put(`file/${path}`, {
      content,
      isDirectory: false,
      metadata: {
        schemaVersion: 1,
        path,
        firstCommitDate: new Date().toISOString(),
        lastCommitDate: new Date().toISOString(),
        lastCommitHash: "",
        custom: {
          createdAt: new Date().toISOString(),
        },
      },
    });
  },
  updateFile: async (tx: any, { path, content }: { path: string; content: string }) => {
    const existing = (await tx.get(`file/${path}`)) as FileData | null;
    if (!existing) {
      throw new Error(`File not found: ${path}`);
    }
    await tx.put(`file/${path}`, {
      ...existing,
      content,
      metadata: {
        ...existing.metadata,
        lastCommitDate: new Date().toISOString(),
      },
    });
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
