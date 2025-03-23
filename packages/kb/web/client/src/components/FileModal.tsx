import { useState, useEffect } from "react";
import { FileMetadata } from "../../../../shared/repo";
import { toTimestampWithTimezone } from "../lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FileModalProps {
  onClose: () => void;
  onSave: (path: string, content: string, metadata: Partial<FileMetadata>) => void;
  title: string;
  initialPath?: string;
  initialContent?: string;
  initialMetadata?: Partial<FileMetadata>;
  disablePath?: boolean;
}

export default function FileModal({
  onClose,
  onSave,
  title,
  initialPath = "",
  initialContent = "",
  initialMetadata = { schemaVersion: 1 },
  disablePath = false,
}: FileModalProps) {
  const [path, setPath] = useState(initialPath);
  const [content, setContent] = useState(initialContent);
  const [createdAt, setCreatedAt] = useState(initialMetadata.createdAt || "");
  const [updatedAt, setUpdatedAt] = useState(initialMetadata.updatedAt || "");
  const [showMetadata, setShowMetadata] = useState(false);

  // Handle form submission
  const handleSubmit = () => {
    if (path.trim() && content.trim()) {
      onSave(path, content, {
        createdAt: createdAt ? toTimestampWithTimezone(new Date(createdAt)) : undefined,
        updatedAt: updatedAt ? toTimestampWithTimezone(new Date(updatedAt)) : undefined,
      });
    }
  };

  // Add event listener for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        onClose();
      }

      // Save on Cmd+Enter or Ctrl+Enter
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleSubmit]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            {showMetadata ? (
              <ChevronUp size={16} className="mr-1" />
            ) : (
              <ChevronDown size={16} className="mr-1" />
            )}
            {showMetadata ? "Hide Metadata" : "Show Metadata"}
          </button>

          {showMetadata && (
            <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-gray-50 rounded-md">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Created At</label>
                <input
                  type="datetime-local"
                  value={createdAt ? createdAt.substring(0, 16) : ""}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Updated At</label>
                <input
                  type="datetime-local"
                  value={updatedAt ? updatedAt.substring(0, 16) : ""}
                  onChange={(e) => setUpdatedAt(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!path.trim() || !content.trim()}
            className="btn-primary px-4 py-2 rounded disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
