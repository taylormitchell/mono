import { useState } from "react";
import "./App.css";
import { Node, mockFileTree, toggleDirectory, deleteNode, renameNode, addNode } from "./file-tree";

//Create Directory and File components.  The directory only renders the children if it's open. It's toggled open on click
function App() {
  const [fileTree, setFileTree] = useState(mockFileTree);

  const FileView = ({ name, path }: { name: string; path: string[] }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        className="flex items-center group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div>📄 {name}</div>
        {isHovered && (
          <div className="ml-2 invisible group-hover:visible">
            <button
              className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded mr-1"
              onClick={() => {
                const newName = prompt("Enter new name:", name);
                if (newName) setFileTree(renameNode(fileTree, path, newName));
              }}
            >
              Rename
            </button>
            <button
              className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
              onClick={() => setFileTree(deleteNode(fileTree, path))}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const DirectoryView = ({
    name,
    isOpen,
    children,
    path,
  }: {
    name: string;
    isOpen: boolean;
    children: Node[];
    path: string[];
  }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div>
        <div
          className="flex items-center group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className="cursor-pointer"
            onClick={() => setFileTree(toggleDirectory(fileTree, path))}
          >
            {isOpen ? "📂" : "📁"} {name}
          </div>
          {isHovered && (
            <div className="ml-2 invisible group-hover:visible">
              <button
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded mr-1"
                onClick={() => {
                  const newName = prompt("Enter new name:", name);
                  if (newName) setFileTree(renameNode(fileTree, path, newName));
                }}
              >
                Rename
              </button>
              <button
                className="px-2 py-1 text-sm bg-green-100 hover:bg-green-200 rounded mr-1"
                onClick={() => {
                  const newName = prompt("Enter new file name:");
                  if (newName)
                    setFileTree(addNode(fileTree, path, { type: "file", name: newName }));
                }}
              >
                Add File
              </button>
              <button
                className="px-2 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded mr-1"
                onClick={() => {
                  const newName = prompt("Enter new directory name:");
                  if (newName)
                    setFileTree(
                      addNode(fileTree, path, {
                        type: "directory",
                        name: newName,
                        isOpen: true,
                        children: [],
                      })
                    );
                }}
              >
                Add Dir
              </button>
              <button
                className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
                onClick={() => setFileTree(deleteNode(fileTree, path))}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {isOpen && children && (
          <div className="pl-4">
            {children.map((item, i) => (
              <FileTreeItem key={i} node={item} path={[...path, item.name]} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const FileTreeItem = ({ node, path }: { node: Node; path: string[] }) => {
    if (node.type === "file") {
      return <FileView name={node.name} path={path} />;
    }
    return (
      <DirectoryView name={node.name} isOpen={node.isOpen} children={node.children} path={path} />
    );
  };

  return (
    <div className="text-left">
      <FileTreeItem node={fileTree} path={[fileTree.name]} />
    </div>
  );
}

export default App;
