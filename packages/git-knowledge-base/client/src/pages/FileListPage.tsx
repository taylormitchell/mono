import { useState, useEffect } from "react";
import { File as FileType } from "../../../shared/web/schemas";
import { FileMetadata } from "../../../shared/repo";
import { FilePlus, RefreshCw, Search } from "lucide-react";

interface FileListPageProps {
  files: FileType[];
  onFileSelect: (file: FileType) => void;
  onNewFile: () => void;
  onReset: () => void;
}

export default function FileListPage({
  files,
  onFileSelect,
  onNewFile,
  onReset,
}: FileListPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputFocused, setSearchInputFocused] = useState(false);

  // Add event listener for 'c' key to open create-file modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if 'c' is pressed and no input element is focused
      if (
        e.key === "c" &&
        !searchInputFocused &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        onNewFile();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onNewFile, searchInputFocused]);

  const filteredFiles = searchQuery
    ? files.filter(
        (file) =>
          file.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  // Function to get a snippet of the content
  const getContentSnippet = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  // Function to format the date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Function to get the most relevant date (created or updated)
  const getRelevantDate = (metadata: FileMetadata) => {
    return metadata.updatedAt || metadata.createdAt || metadata.lastCommitDate || "";
  };

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Files</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={onNewFile}
            className="btn-primary px-4 py-2 rounded-md flex items-center"
          >
            <FilePlus size={16} className="mr-2" />
            New File
          </button>
          <button
            onClick={onReset}
            className="btn-secondary px-4 py-2 rounded-md flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Reset
          </button>
        </div>
      </header>

      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchInputFocused(true)}
            onBlur={() => setSearchInputFocused(false)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="mb-2">No files found</p>
            <button
              onClick={onNewFile}
              className="text-blue-500 hover:text-blue-600 flex items-center"
            >
              <FilePlus size={16} className="mr-1" />
              Create a new file
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredFiles.map((file) => (
              <li
                key={file.id}
                onClick={() => onFileSelect(file)}
                className="file-list-item px-4 py-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex justify-between items-center mb-1">
                  <h2 className="font-medium text-gray-900 truncate">{file.id}</h2>
                  <span className="text-sm text-gray-500">
                    {formatDate(getRelevantDate(file.metadata))}
                  </span>
                </div>
                <p className="file-snippet text-gray-600">{getContentSnippet(file.content)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
