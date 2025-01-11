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
          children: [],
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
      const updateDirectory = (node: Node, remainingPath: string[]): Node => {
        if (node.type === "file") {
          return node;
        }

        if (remainingPath.length === 0) {
          return {
            ...node,
            isOpen: !node.isOpen,
          };
        }

        const [currentDir, ...rest] = remainingPath;

        const targetChild = node.children.find((item: Node) => item.name === currentDir);

        if (!targetChild) return node;

        return {
          ...node,
          children: node.children.map((child: Node) =>
            child.name === currentDir ? updateDirectory(child, rest) : child
          ),
        };
      };

      return updateDirectory(prevFiles, path.slice(1)) as Directory;
    });
  };

  const File = ({ name }: { name: string }) => {
    return <div className="pl-4">{name}</div>;
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
    return (
      <div>
        <div className="cursor-pointer" onClick={() => toggleDirectory(path)}>
          {isOpen ? "📂" : "📁"} {name}
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
      return <File name={node.name} />;
    }
    return (
      <Directory
        name={node.name}
        isOpen={node.isOpen}
        children={node.children}
        path={[...path, node.name]}
      />
    );
  };

  return (
    <div className="text-left">
      <FileTreeItem node={fileTree} path={[fileTree.name]} />
    </div>
  );
}

export default App;
