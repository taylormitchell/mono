import { useState, useEffect, useRef } from "react";
import { Command } from "cmdk";
import { File as FileType } from "../../../../shared/web/schemas";
import { Search, FilePlus, FileText } from "lucide-react";

interface CommandBarProps {
  files: FileType[];
  onSelectFile: (file: FileType) => void;
  onCreateFile: (path: string, content: string) => Promise<void>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function CommandBar({
  files,
  onSelectFile,
  onCreateFile,
  isOpen,
  setIsOpen,
}: CommandBarProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the command bar is opened
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard shortcut to open command bar (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }

      // Close on escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  // Handle creating a new file with the current search text
  const handleCreateFile = () => {
    if (!search.trim()) return;

    // If the search doesn't end with .md, add it
    let filename = search.trim();
    if (!filename.includes(".")) {
      filename = `${filename}.md`;
    }

    onCreateFile(filename, "");
    setIsOpen(false);
    setSearch("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <Command className="border-none" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <Command.Input
              ref={inputRef}
              value={search}
              onValueChange={setSearch}
              className="flex-1 h-12 outline-none placeholder:text-gray-400"
              placeholder="Search files or create a new one..."
            />
            {isOpen && (
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">
                <span className="text-xs">esc</span>
              </kbd>
            )}
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {search.trim() && (
              <Command.Group heading="Create">
                <Command.Item
                  onSelect={handleCreateFile}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
                >
                  <FilePlus className="w-4 h-4 text-blue-500" />
                  <span>
                    Create <span className="font-medium">{search.trim()}</span>
                  </span>
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Files">
              {files
                .filter(
                  (file) =>
                    file.id.toLowerCase().includes(search.toLowerCase()) ||
                    file.content.toLowerCase().includes(search.toLowerCase())
                )
                .slice(0, 10)
                .map((file) => (
                  <Command.Item
                    key={file.id}
                    onSelect={() => {
                      onSelectFile(file);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
                  >
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 truncate">{file.id}</span>
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                      {file.content.substring(0, 50)}
                      {file.content.length > 50 ? "..." : ""}
                    </span>
                  </Command.Item>
                ))}

              {files.length === 0 ||
                (files.filter(
                  (file) =>
                    file.id.toLowerCase().includes(search.toLowerCase()) ||
                    file.content.toLowerCase().includes(search.toLowerCase())
                ).length === 0 && (
                  <div className="px-2 py-4 text-center text-gray-500">No files found</div>
                ))}
            </Command.Group>
          </Command.List>

          <div className="border-t px-3 py-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <div>
                <span className="mr-2">↑↓</span> to navigate
              </div>
              <div>
                <span className="mr-2">↵</span> to select
              </div>
              <div>
                <span className="mr-2">esc</span> to close
              </div>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
