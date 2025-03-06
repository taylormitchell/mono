import React, { useState, useEffect } from "react";
import { rep } from "../App";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

// Define file type
interface FileData {
  content: string;
  isDirectory: boolean;
  metadata: {
    schemaVersion: number;
    path: string;
    firstCommitDate?: string;
    lastCommitDate?: string;
    lastCommitHash?: string;
    custom?: {
      createdAt?: string;
    };
  };
}

// Define file with path type for our UI
interface FileWithPath extends FileData {
  path: string;
}

const HomePage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [files, setFiles] = useState<FileWithPath[]>([]);

  // Subscribe to files using useEffect
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        // @ts-ignore - Ignoring type issues with Replicache subscription
        unsubscribe = rep.subscribe((tx: any) => {
          tx.scan({ prefix: "file/" })
            .entries()
            .toArray()
            .then((list: any) => {
              const filesList = list.map(([key, value]: [string, any]) => ({
                path: key.substring(5), // Remove 'file/' prefix
                ...(value as unknown as FileData),
              }));
              setFiles(filesList);
            });
        });
      } catch (error) {
        console.error("Error setting up subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sort files by creation date (newest first)
  const sortedFiles = [...files].sort((a, b) => {
    const aDate = a.metadata?.custom?.createdAt || a.metadata?.firstCommitDate || "";
    const bDate = b.metadata?.custom?.createdAt || b.metadata?.firstCommitDate || "";
    return bDate.localeCompare(aDate);
  });

  // Get selected file data
  const selectedFileData = selectedFile ? files.find((file) => file.path === selectedFile) : null;

  // Handle file creation
  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      alert("Please enter a file name");
      return;
    }

    try {
      await rep.mutate.createFile({
        path: newFileName.endsWith(".md") ? newFileName : `${newFileName}.md`,
        content: newFileContent,
      });
      setNewFileName("");
      setNewFileContent("");
      setIsCreatingFile(false);
    } catch (error) {
      console.error("Error creating file:", error);
      alert(`Failed to create file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle file update
  const handleUpdateFile = async () => {
    if (!selectedFile) return;

    try {
      await rep.mutate.updateFile({
        path: selectedFile,
        content: editContent,
      });
      setIsEditingFile(false);
    } catch (error) {
      console.error("Error updating file:", error);
      alert(`Failed to update file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (path: string) => {
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;

    try {
      await rep.mutate.deleteFile({ path });
      if (selectedFile === path) {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Git Knowledge Base</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* File List */}
        <div className="w-full md:w-1/3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Files</h2>
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              onClick={() => setIsCreatingFile(true)}
            >
              New File
            </button>
          </div>

          {isCreatingFile && (
            <div className="bg-white p-4 rounded shadow-md mb-4">
              <h3 className="text-lg font-semibold mb-2">Create New File</h3>
              <input
                type="text"
                placeholder="File name (e.g., notes.md)"
                className="w-full p-2 border rounded mb-2"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
              <textarea
                placeholder="File content"
                className="w-full p-2 border rounded mb-2 h-32"
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
                  onClick={() => setIsCreatingFile(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  onClick={handleCreateFile}
                >
                  Create
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded shadow-md">
            {sortedFiles.length === 0 ? (
              <p className="p-4 text-gray-500">No files yet. Create your first file!</p>
            ) : (
              <ul className="divide-y">
                {sortedFiles.map((file) => (
                  <li key={file.path} className="p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <button
                        className={`text-left flex-grow ${
                          selectedFile === file.path ? "font-semibold" : ""
                        }`}
                        onClick={() => {
                          setSelectedFile(file.path);
                          setIsEditingFile(false);
                        }}
                      >
                        {file.path}
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700 ml-2"
                        onClick={() => handleDeleteFile(file.path)}
                      >
                        Delete
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created:{" "}
                      {formatDate(
                        file.metadata?.custom?.createdAt || file.metadata?.firstCommitDate
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* File Viewer/Editor */}
        <div className="w-full md:w-2/3">
          {selectedFile && selectedFileData ? (
            <div className="bg-white rounded shadow-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{selectedFile}</h2>
                {!isEditingFile ? (
                  <button
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    onClick={() => {
                      setEditContent(selectedFileData.content);
                      setIsEditingFile(true);
                    }}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
                      onClick={() => setIsEditingFile(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      onClick={handleUpdateFile}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-4 text-sm text-gray-600">
                <div>
                  Created:{" "}
                  {formatDate(
                    selectedFileData.metadata?.custom?.createdAt ||
                      selectedFileData.metadata?.firstCommitDate
                  )}
                </div>
                <div>Last Updated: {formatDate(selectedFileData.metadata?.lastCommitDate)}</div>
              </div>

              {isEditingFile ? (
                <CodeMirror
                  value={editContent}
                  height="500px"
                  // @ts-ignore - Ignoring type issues with CodeMirror extensions
                  extensions={[markdown({ base: markdown(), codeLanguages: languages })]}
                  onChange={(value) => setEditContent(value)}
                  className="border rounded"
                />
              ) : (
                <div className="prose max-w-none">
                  <CodeMirror
                    value={selectedFileData.content}
                    height="500px"
                    // @ts-ignore - Ignoring type issues with CodeMirror extensions
                    extensions={[markdown({ base: markdown(), codeLanguages: languages })]}
                    readOnly={true}
                    className="border rounded"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded shadow-md p-4 text-center text-gray-500">
              Select a file to view or create a new file
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
