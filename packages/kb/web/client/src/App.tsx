import { Replicache, WriteTransaction } from "replicache";
import { z } from "zod";
import { File, fileSchema, Mutation } from "../../../shared/web/schemas";
import { FileMetadata } from "../../../shared/repo";
import { getTimestampWithTimezone } from "./lib/utils";
import { useSubscribe } from "replicache-react";
import { generate } from "@rocicorp/rails";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, Navigate } from "react-router-dom";
import FileListPage from "./pages/FileListPage";
import EditorPage from "./pages/EditorPage";
import FileModal from "./components/FileModal";
import CommandBar from "./components/CommandBar";
import { generateTimestampFilename } from "./utils/filename";

const envSchema = z.object({
  VITE_REPLICACHE_LICENSE_KEY: z.string(),
  VITE_REPLICACHE_PULL_PATH: z.string(),
  VITE_REPLICACHE_PUSH_PATH: z.string(),
  VITE_API_URL: z.string().optional(),
});

const env = envSchema.parse(import.meta.env);
const apiUrl = env.VITE_API_URL ?? window.location.origin;
const pushUrl = new URL(env.VITE_REPLICACHE_PUSH_PATH, apiUrl);
const pullUrl = new URL(env.VITE_REPLICACHE_PULL_PATH, apiUrl);

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
      // Preserve commit information from existing metadata
      updated.metadata = {
        ...metadata,
        // Only preserve these fields if they're not explicitly set in the new metadata
        lastCommitHash: metadata.lastCommitHash ?? existing.metadata.lastCommitHash,
        lastCommitDate: metadata.lastCommitDate ?? existing.metadata.lastCommitDate,
        firstCommitDate: metadata.firstCommitDate ?? existing.metadata.firstCommitDate,
      };
    } else {
      updated.metadata = {
        ...updated.metadata,
        updatedAt: getTimestampWithTimezone(),
      };
    }
    await file.set(tx, updated);
  },
  deleteFile: async (tx, { id }) => {
    await file.delete(tx, id);
  },
} satisfies Mutators;

function App() {
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  const [rep, setRep] = useState<Replicache<typeof mutators> | null>(null);

  useEffect(() => {
    const rep = new Replicache({
      name: "git-knowledge-base-client",
      licenseKey: env.VITE_REPLICACHE_LICENSE_KEY,
      pushURL: pushUrl.toString(),
      pullURL: pullUrl.toString(),
      mutators,
      pullInterval: 10000, // Pull every 10 seconds
    });
    rep.pull().then(() => {
      setRep(rep);
    });
  }, []);

  if (!rep) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }
  return (
    <BrowserRouter>
      <AppRoutes
        rep={rep}
        showNewFileModal={showNewFileModal}
        setShowNewFileModal={setShowNewFileModal}
        isCommandBarOpen={isCommandBarOpen}
        setIsCommandBarOpen={setIsCommandBarOpen}
      />
    </BrowserRouter>
  );
}

function AppRoutes({
  rep,
  showNewFileModal,
  setShowNewFileModal,
  isCommandBarOpen,
  setIsCommandBarOpen,
}: {
  rep: Replicache<typeof mutators>;
  showNewFileModal: boolean;
  setShowNewFileModal: (show: boolean) => void;
  isCommandBarOpen: boolean;
  setIsCommandBarOpen: (open: boolean) => void;
}) {
  const files = useSubscribe(rep, file.list, { default: [] as File[] });
  const navigate = useNavigate();

  // Sort files by createdAt if available, otherwise by firstCommitDate
  const sortedFiles = [...files].sort((a, b) => {
    const aCreatedAt = a.metadata.createdAt ?? a.metadata.firstCommitDate;
    const bCreatedAt = b.metadata.createdAt ?? b.metadata.firstCommitDate;

    if (aCreatedAt && bCreatedAt)
      return new Date(bCreatedAt).getTime() - new Date(aCreatedAt).getTime();
    if (aCreatedAt) return -1;
    if (bCreatedAt) return 1;

    // If neither has date information, sort by ID
    return a.id.localeCompare(b.id);
  });

  const handleCreateFile = async (
    id: string,
    content: string,
    metadata: Partial<FileMetadata> = {}
  ) => {
    await rep.mutate.createFile({
      id,
      content,
      metadata: {
        schemaVersion: 1,
        createdAt: metadata.createdAt || getTimestampWithTimezone(),
        updatedAt: metadata.updatedAt,
      },
    });
    setShowNewFileModal(false);
    navigate(`/edit/${encodeURIComponent(id)}`);
  };

  const handleUpdateFile = async (
    id: string,
    content: string,
    metadata: Partial<FileMetadata> = {}
  ) => {
    // Get the existing file to preserve commit information
    const existingFile = files.find((f) => f.id === id);
    if (!existingFile) {
      console.error(`File not found: ${id}`);
      return;
    }

    // Always include updatedAt when updating a file
    const updatedMetadata = {
      schemaVersion: 1,
      // Preserve commit information
      lastCommitHash: existingFile.metadata.lastCommitHash,
      lastCommitDate: existingFile.metadata.lastCommitDate,
      firstCommitDate: existingFile.metadata.firstCommitDate,
      // Include user-provided metadata
      ...metadata,
      // Always set updatedAt to current time if not explicitly provided
      updatedAt: metadata.updatedAt || getTimestampWithTimezone(),
    };

    await rep.mutate.updateFile({
      id,
      content,
      metadata: updatedMetadata,
    });
  };

  const handleDeleteFile = async (path: string) => {
    await rep.mutate.deleteFile({ id: path });
    navigate("/");
  };

  return (
    <div className="h-screen flex flex-col">
      <Routes>
        <Route
          path="/"
          element={
            <FileListPage
              files={sortedFiles}
              onFileSelect={(file) => navigate(`/edit/${encodeURIComponent(file.id)}`)}
              onNewFile={() => setShowNewFileModal(true)}
              onReset={() => {
                indexedDB.deleteDatabase(rep.idbName);
                window.location.reload();
              }}
            />
          }
        />
        <Route
          path="/edit/:fileId"
          element={
            <EditorRoute
              files={files}
              onSave={handleUpdateFile}
              onDelete={handleDeleteFile}
              onOpenCommandBar={() => setIsCommandBarOpen(true)}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* New File Modal */}
      {showNewFileModal && (
        <FileModal
          onClose={() => setShowNewFileModal(false)}
          onSave={handleCreateFile}
          title="Create New File"
          initialPath={generateTimestampFilename()}
        />
      )}

      {/* Command Bar */}
      <CommandBar
        files={sortedFiles}
        onSelectFile={(file) => {
          navigate(`/edit/${encodeURIComponent(file.id)}`);
          setIsCommandBarOpen(false);
        }}
        onCreateFile={handleCreateFile}
        isOpen={isCommandBarOpen}
        setIsOpen={setIsCommandBarOpen}
      />
    </div>
  );
}

// Editor route component that handles finding the file by ID from the URL
function EditorRoute({
  files,
  onSave,
  onDelete,
  onOpenCommandBar,
}: {
  files: File[];
  onSave: (id: string, content: string, metadata: Partial<FileMetadata>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenCommandBar: () => void;
}) {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const decodedFileId = fileId ? decodeURIComponent(fileId) : "";
  const selectedFile = files.find((f) => f.id === decodedFileId);

  // If file not found, redirect to home
  useEffect(() => {
    if (!selectedFile && files.length > 0) {
      navigate("/");
    }
  }, [selectedFile, files, navigate]);

  if (!selectedFile) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <EditorPage
      fileId={selectedFile.id}
      content={selectedFile.content}
      metadata={selectedFile.metadata}
      onSave={onSave}
      onDelete={onDelete}
      onBack={() => navigate("/")}
      onOpenCommandBar={onOpenCommandBar}
    />
  );
}

export default App;
