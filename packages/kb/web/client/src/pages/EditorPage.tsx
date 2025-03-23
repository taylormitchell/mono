import { useState, useEffect } from "react";
import { ArrowLeft, Save, Trash2, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { FileMetadata } from "../../../../shared/repo";
import { getTimestampWithTimezone } from "../lib/utils";

interface EditorPageProps {
  fileId: string;
  content: string;
  metadata: any;
  onSave: (id: string, content: string, metadata: Partial<FileMetadata>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
  onOpenCommandBar?: () => void;
}

export default function EditorPage({
  fileId,
  content: initialContent,
  metadata: initialMetadata,
  onSave,
  onDelete,
  onBack,
  onOpenCommandBar,
}: EditorPageProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset content when fileId changes
  useEffect(() => {
    setContent(initialContent);
    setHasUnsavedChanges(false);
  }, [fileId, initialContent]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(content !== initialContent);
  }, [content, initialContent]);

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      await onSave(fileId, content, {
        updatedAt: getTimestampWithTimezone(),
      });
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${fileId}?`)) {
      setIsDeleting(true);
      try {
        await onDelete(fileId);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Add event listener for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }

      // Save on Cmd+Enter or Ctrl+Enter
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }

      // Save on Cmd+S or Ctrl+S
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }

      // Open command bar on Cmd+K or Ctrl+K
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && onOpenCommandBar) {
        e.preventDefault();
        onOpenCommandBar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onBack, handleSave, onOpenCommandBar]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center">
            <h1 className="text-lg font-medium truncate max-w-md">{fileId}</h1>
            {hasUnsavedChanges && (
              <Circle size={8} className="ml-2 fill-orange-500 text-orange-500" />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-4 py-2 rounded-md flex items-center ${
              hasUnsavedChanges ? "btn-primary" : "bg-gray-200 text-gray-500"
            }`}
          >
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save"}
            {hasUnsavedChanges && <span className="ml-1 text-xs opacity-70">(⌘S)</span>}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger px-4 py-2 rounded-md flex items-center"
          >
            <Trash2 size={16} className="mr-2" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full p-4 border border-gray-300 rounded-md font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Start writing..."
        />
      </div>

      <footer className="bg-white border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-2"
        >
          {showMetadata ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="ml-1">Metadata</span>
        </button>

        {showMetadata && (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Created</p>
                <p>
                  {initialMetadata.createdAt
                    ? new Date(initialMetadata.createdAt).toLocaleString()
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Modified</p>
                <p>
                  {initialMetadata.updatedAt
                    ? new Date(initialMetadata.updatedAt).toLocaleString()
                    : "Not set"}
                </p>
              </div>
              {initialMetadata.firstCommitDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">First Commit</p>
                  <p>{new Date(initialMetadata.firstCommitDate).toLocaleString()}</p>
                </div>
              )}
              {initialMetadata.lastCommitDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Commit</p>
                  <p>{new Date(initialMetadata.lastCommitDate).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
