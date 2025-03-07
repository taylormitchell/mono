import { MutatorDefs, Replicache, WriteTransaction } from "replicache";
import { z } from "zod";
import { File, fileSchema, Mutation } from "../../shared/web/schemas";
import { getTimestampWithTimezone } from "./lib/utils";
import { useSubscribe } from "replicache-react";
import { generate } from "@rocicorp/rails";
import { useState } from "react";

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
type MutationNames = Mutation["name"];
type MutatorFunction<T extends Mutation> = (tx: WriteTransaction, args: T["args"]) => Promise<void>;
export type Mutators = Partial<{
  [K in MutationNames]: MutatorFunction<Extract<Mutation, { name: K }>>;
}>;

const file = generate("file", fileSchema.parse);

const mutators = {
  createFile: async (tx, { id, content, metadata }) => {
    await file.set(tx, { id, content, metadata });
  },
  updateFile: async (tx, { id, content, metadata }) => {
    const existing = (await file.get(tx, id)) as File | null;
    if (!existing) {
      throw new Error(`File not found: ${id}`);
    }
    const updated = { ...existing };
    if (content !== undefined) {
      updated.content = content;
    }
    if (metadata !== undefined) {
      updated.metadata = metadata;
    }
    updated.metadata.updatedAt = getTimestampWithTimezone();
    await file.set(tx, updated);
  },
  deleteFile: async (tx, { id }) => {
    await file.delete(tx, id);
  },
} satisfies Mutators;

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
  const files = useSubscribe(rep, file.list, { default: [] as File[] });
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreateFile = async (id: string, content: string) => {
    await rep.mutate.createFile({
      id,
      content,
      metadata: { schemaVersion: 1, createdAt: getTimestampWithTimezone() },
    });
    setShowNewFileModal(false);
  };

  const handleUpdateFile = async (id: string, content: string) => {
    await rep.mutate.updateFile({ id, content });
    setEditingFile(null);
  };

  const handleDeleteFile = async (path: string) => {
    await rep.mutate.deleteFile({ id: path });
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Files</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewFileModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
            >
              New File
            </button>
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
        </div>
        <div className="grid grid-cols-1 gap-4">
          {files.map((file) => (
            <div key={file.id} className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{file.id}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingFile(file)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded shadow text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(file.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
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

      {/* New File Modal */}
      {showNewFileModal && (
        <FileModal
          onClose={() => setShowNewFileModal(false)}
          onSave={handleCreateFile}
          title="Create New File"
        />
      )}

      {/* Edit File Modal */}
      {editingFile && (
        <FileModal
          onClose={() => setEditingFile(null)}
          onSave={(path, content) => handleUpdateFile(path, content)}
          title="Edit File"
          initialPath={editingFile.id}
          initialContent={editingFile.content}
          disablePath={true}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <DeleteConfirmationModal
          filePath={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDeleteFile(confirmDelete)}
        />
      )}
    </div>
  );
}

// File Modal Component for Create/Edit
function FileModal({
  onClose,
  onSave,
  title,
  initialPath = "",
  initialContent = "",
  disablePath = false,
}: {
  onClose: () => void;
  onSave: (path: string, content: string) => void;
  title: string;
  initialPath?: string;
  initialContent?: string;
  disablePath?: boolean;
}) {
  const [path, setPath] = useState(initialPath);
  const [content, setContent] = useState(initialContent);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">File Path</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            disabled={disablePath}
            className={`w-full p-2 border rounded ${disablePath ? "bg-gray-100" : ""}`}
            placeholder="path/to/file.md"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2 border rounded h-64 font-mono"
            placeholder="File content..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={() => onSave(path, content)}
            disabled={!path.trim() || !content.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmationModal({
  filePath,
  onCancel,
  onConfirm,
}: {
  filePath: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
        <p className="mb-4">
          Are you sure you want to delete <strong>{filePath}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
