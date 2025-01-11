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

const updateFileTree = (
  fileTree: Directory,
  path: string[],
  update: <T extends Node>(node: T) => T | null
): Directory => {
  const updateNodeAtPath = <T extends Node>(node: T, remainingPath: string[]): T | null => {
    if (remainingPath.length === 0) {
      console.warn("updateFileTree: remainingPath is empty");
      return node;
    }
    if (remainingPath.length == 1) {
      if (remainingPath[0] !== node.name) {
        console.warn(`No node found at ${remainingPath.join("/")}`);
        return node;
      }
      return update(node);
    }
    const newRemainingPath = remainingPath.slice(1);
    const nextDir = newRemainingPath[0];
    if (node.type !== "directory") {
      throw new Error(`No node found at ${remainingPath.join("/")}`);
    }
    return {
      ...node,
      children: node.children
        .map((child: Node) =>
          child.name === nextDir ? updateNodeAtPath(child, newRemainingPath) : child
        )
        .filter((child) => child !== null),
    };
  };
  const res = updateNodeAtPath(fileTree, path);
  if (res === null) {
    console.warn("Can't delete root directory");
    return fileTree;
  }
  return res;
};

function toggleDirectory(fileTree: Directory, path: string[]): Directory {
  return updateFileTree(fileTree, path, (node) => {
    if (node.type !== "directory") {
      throw new Error(`No node found at ${path.join("/")}`);
    }
    return {
      ...node,
      isOpen: !node.isOpen,
    };
  });
}

function deleteNode(fileTree: Directory, path: string[]): Directory {
  return updateFileTree(fileTree, path, () => {
    return null;
  });
}

function renameNode(fileTree: Directory, path: string[], newName: string): Directory {
  return updateFileTree(fileTree, path, (node) => {
    return {
      ...node,
      name: newName,
    };
  });
}

function addNode(fileTree: Directory, path: string[], newNode: Node): Directory {
  return updateFileTree(fileTree, path, (node) => {
    if (node.type !== "directory") {
      throw new Error(`No node found at ${path.join("/")}`);
    }
    return {
      ...node,
      children: [...node.children, newNode],
    };
  });
}
