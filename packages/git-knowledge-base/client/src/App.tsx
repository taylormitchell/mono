import { MutatorDefs, Replicache } from "replicache";
import { z } from "zod";
import { File, fileSchema } from "../../shared/web/schemas";
import { getTimestampWithTimezone } from "./lib/utils";
import { useSubscribe } from "replicache-react";
import { generate } from "@rocicorp/rails";

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

const file = generate("file", fileSchema.parse);

function App() {
  const files = useSubscribe(rep, file.list, { default: [] as File[] });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Files</h1>
          <button
            onClick={() => rep.pull()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
          >
            Sync Data
          </button>
          <button
            onClick={() => {
              indexedDB.deleteDatabase(rep.idbName);
              window.location.reload();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {files.map((file) => (
            <div key={file.id} className="bg-white p-4 rounded shadow">
              <h2 className="text-lg font-semibold">{file.id}</h2>
              <pre className="mt-2 whitespace-pre-wrap">{file.content}</pre>
              <div className="mt-2 text-sm text-gray-500">
                <div>Schema Version: {file.metadata.schemaVersion}</div>
                {file.metadata.lastCommitHash && (
                  <div>Last Commit: {file.metadata.lastCommitHash}</div>
                )}
                {file.metadata.lastCommitDate && (
                  <div>Last Updated: {file.metadata.lastCommitDate}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TestPage = () => {
  return <div>Test</div>;
};

export default App;
