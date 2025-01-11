import { useState } from "react";
import "./App.css";

/**
 * How's the data stored?
 * do I have it in one big nested tree?
 * is it in a flat data structure?
 *
 * Let's say I've got it in a big object
 *
 *
 */

type File = {
  type: "file";
  name: string;
};

type Directory = {
  type: "directory";
  name: string;
  isOpen: boolean;
  children: (File | Directory)[];
};

type Node = File | Directory;

// assume file paths are unique
const files: Directory = {
  type: "directory",
  name: "root",
  isOpen: true,
  children: [
    {
      type: "directory",
      name: "public",
      isOpen: true,
      children: [
        {
          type: "directory",
          name: "images",
          isOpen: true,
          children: [
            {
              type: "file",
              name: "image1.png",
            },
          ],
        },
        {
          type: "file",
          name: "public_nested_file",
        },
      ],
    },
    {
      type: "directory",
      name: "src",
      isOpen: true,
      children: [
        {
          type: "directory",
          name: "components",
          isOpen: true,
          children: [],
        },
        {
          type: "file",
          name: "main.jsx",
        },
        {
          type: "file",
          name: "App.jsx",
        },
        {
          type: "file",
          name: "app.module.css",
        },
      ],
    },
    {
      type: "directory",
      name: "dist",
      isOpen: true,
      children: [
        {
          type: "file",
          name: "index.js",
        },
        {
          type: "file",
          name: "index.html",
        },
        {
          type: "file",
          name: "index.css",
        },
      ],
    },
    {
      type: "file",
      name: "package.json",
    },
    {
      type: "file",
      name: "package-lock.json",
    },
  ],
};

//Create Directory and File components.  The directory only renders the children if it's open. It's toggled open on click
function App() {
  const [fileTree, setFileTree] = useState(files);

  const toggleDirectory = (path: string[]) => {
    setFileTree((prevFiles) => {
      const updateDirectory = (node: Directory, remainingPath: string[]): Node => {
        if (remainingPath.length <= 1) {
          if (remainingPath[0] === node.name) {
            return {
              ...node,
              isOpen: !node.isOpen,
            };
          } else {
            console.warn(`${remainingPath[0]} not found in ${node.name}`);
            return node;
          }
        }

        const newRemainingPath = remainingPath.slice(1);
        const nextDir = newRemainingPath[0];

        const targetChild = node.children.find((item: Node) => item.name === nextDir);

        if (!targetChild || targetChild.type !== "directory") {
          console.warn(`${nextDir} is not a directory`);
          return node;
        }

        return {
          ...node,
          children: node.children.map((child: Node) =>
            child === targetChild ? updateDirectory(child, newRemainingPath) : child
          ),
        };
      };

      return updateDirectory(prevFiles, path) as Directory;
    });
  };

  const deleteNode = (path: string[]) => {
    setFileTree((prevFiles) => {
      const findAndDeleteNode = (node: Directory, remainingPath: string[]): Directory => {
        const newRemainingPath = remainingPath.slice(1);
        const nextNode = newRemainingPath[0];

        // Remove the node at the end of the path
        if (remainingPath.length <= 1) {
          return {
            ...node,
            children: node.children.filter((child: Node) => child.name !== nextDir),
          };
        }

        return {
          ...node,
          children: node.children.map((child: Node) => {
            if (child.name === nextNode) {
              if (child.type === "directory") {
                return findAndDeleteNode(child as Directory, newRemainingPath);
              } else {
                console.warn(`${nextNode} is not a directory`);
                return child;
              }
            } else {
              return child;
            }
          }),
        };
      };
      return findAndDeleteNode(prevFiles, path) as Directory;
    });
  };

  const renameNode = (path: string[], newName: string) => {
    setFileTree((prevFiles) => {
      const findAndRenameNode = (node: Directory, remainingPath: string[]): Directory => {
        const newRemainingPath = remainingPath.slice(1);
        const nextNode = newRemainingPath[0];

        if (remainingPath.length <= 1) {
          if (node.name === nextNode) {
            return {
              ...node,
              name: newName,
            };
          } else {
            console.warn(`${nextNode} not found in ${node.name}`);
            return node;
          }
        }

        return {
          ...node,
          children: node.children.map((child: Node) => {
            if (child.name == nextNode && child.type === "directory") {
              return findAndRenameNode(child as Directory, newRemainingPath);
            } else {
              console.warn(`${nextNode} is not a directory`);
              return child;
            }
          }),
        };
      };
      return findAndRenameNode(prevFiles, path) as Directory;
    });
  };

  const addNode = (path: string[], newNode: Node) => {
    setFileTree((prevFiles) => {
      const findAndAddNode = (node: Directory, remainingPath: string[]): Directory => {
        const newRemainingPath = remainingPath.slice(1);
        const nextNode = newRemainingPath[0];

        if (remainingPath.length <= 1) {
          return {
            ...node,
            children: [...node.children, newNode],
          };
        }

        return {
          ...node,
          children: node.children.map((child: Node) =>
            child.name === nextNode ? findAndAddNode(child as Directory, newRemainingPath) : child
          ),
        };
      };
      return findAndAddNode(prevFiles, path) as Directory;
    });
  };

  const File = ({ name, path }: { name: string; path: string[] }) => {
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
                if (newName) renameNode(path, newName);
              }}
            >
              Rename
            </button>
            <button
              className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
              onClick={() => deleteNode(path)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  const Directory = ({
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
          <div className="cursor-pointer" onClick={() => toggleDirectory(path)}>
            {isOpen ? "📂" : "📁"} {name}
          </div>
          {isHovered && (
            <div className="ml-2 invisible group-hover:visible">
              <button
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded mr-1"
                onClick={() => {
                  const newName = prompt("Enter new name:", name);
                  if (newName) renameNode(path, newName);
                }}
              >
                Rename
              </button>
              <button
                className="px-2 py-1 text-sm bg-green-100 hover:bg-green-200 rounded mr-1"
                onClick={() => {
                  const newName = prompt("Enter new file name:");
                  if (newName) addNode(path, { type: "file", name: newName });
                }}
              >
                Add File
              </button>
              <button
                className="px-2 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded mr-1"
                onClick={() => {
                  const newName = prompt("Enter new directory name:");
                  if (newName)
                    addNode(path, {
                      type: "directory",
                      name: newName,
                      isOpen: true,
                      children: [],
                    });
                }}
              >
                Add Dir
              </button>
              <button
                className="px-2 py-1 text-sm bg-red-100 hover:bg-red-200 rounded"
                onClick={() => deleteNode(path)}
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
      return <File name={node.name} path={path} />;
    }
    return <Directory name={node.name} isOpen={node.isOpen} children={node.children} path={path} />;
  };

  return (
    <div className="text-left">
      <FileTreeItem node={fileTree} path={[fileTree.name]} />
    </div>
  );
}

export default App;
