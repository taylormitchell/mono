export type File = {
  type: "file";
  name: string;
};

export type Directory = {
  type: "directory";
  name: string;
  isOpen: boolean;
  children: (File | Directory)[];
};

export type Node = File | Directory;

// assume file paths are unique
export const mockFileTree: Directory = {
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
  update: <T extends Node>(node: T, parent: Node | null) => T | null
): Directory => {
  const updateNodeAtPath = <T extends Node>(
    node: T,
    remainingPath: string[],
    parent: Node | null
  ): T | null => {
    if (remainingPath.length === 0) {
      console.warn("updateFileTree: remainingPath is empty");
      return node;
    }
    if (remainingPath.length == 1) {
      if (remainingPath[0] !== node.name) {
        console.warn(`No node found at ${path.join("/")}`);
        return node;
      }
      return update(node, parent);
    }
    const newRemainingPath = remainingPath.slice(1);
    const nextDir = newRemainingPath[0];
    if (node.type !== "directory") {
      throw new Error(`No node found at ${path.join("/")}`);
    }
    return {
      ...node,
      children: node.children
        .map((child: Node) =>
          child.name === nextDir ? updateNodeAtPath(child, newRemainingPath, node) : child
        )
        .filter((child) => child !== null),
    };
  };
  const res = updateNodeAtPath(fileTree, path, null);
  if (res === null) {
    console.warn("Can't delete root directory");
    return fileTree;
  }
  return res;
};

export function toggleDirectory(fileTree: Directory, path: string[]): Directory {
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

export function deleteNode(fileTree: Directory, path: string[]): Directory {
  return updateFileTree(fileTree, path, () => {
    return null;
  });
}

export function renameNode(fileTree: Directory, path: string[], newName: string): Directory {
  return updateFileTree(fileTree, path, (node, parent) => {
    if (parent && parent.type === "directory") {
      for (const child of parent.children) {
        if (child.name === newName) {
          throw new Error(`Node with name ${newName} already exists`);
        }
      }
    }
    return {
      ...node,
      name: newName,
    };
  });
}

export function addNode(fileTree: Directory, path: string[], newNode: Node): Directory {
  return updateFileTree(fileTree, path, (node) => {
    if (node.type !== "directory") {
      throw new Error(`No node found at ${path.join("/")}`);
    }
    for (const child of node.children) {
      if (child.name === newNode.name) {
        throw new Error(`Node with name ${newNode.name} already exists`);
      }
    }
    return {
      ...node,
      children: [...node.children, newNode],
    };
  });
}

// write some tests

function test() {
  // Test toggleDirectory
  {
    const testFiles: Directory = {
      type: "directory",
      name: "root",
      isOpen: true,
      children: [
        {
          type: "directory",
          name: "dir1",
          isOpen: false,
          children: [],
        },
      ],
    };

    const result = toggleDirectory(testFiles, ["root", "dir1"]);
    console.assert(result.children[0].isOpen === true, "toggleDirectory should toggle isOpen");
  }

  // Test deleteNode
  {
    const testFiles: Directory = {
      type: "directory",
      name: "root",
      isOpen: true,
      children: [
        {
          type: "file",
          name: "file1",
        },
      ],
    };

    const result = deleteNode(testFiles, ["root", "file1"]);
    console.assert(result.children.length === 0, "deleteNode should remove the node");
  }

  // Test renameNode
  {
    const testFiles: Directory = {
      type: "directory",
      name: "root",
      isOpen: true,
      children: [
        {
          type: "file",
          name: "oldName",
        },
      ],
    };

    const result = renameNode(testFiles, ["root", "oldName"], "newName");
    console.assert(result.children[0].name === "newName", "renameNode should update the name");
  }

  // Test addNode
  {
    const testFiles: Directory = {
      type: "directory",
      name: "root",
      isOpen: true,
      children: [],
    };

    const newFile: File = {
      type: "file",
      name: "newFile",
    };

    const result = addNode(testFiles, ["root"], newFile);
    console.assert(result.children.length === 1, "addNode should add the new node");
    console.assert(result.children[0].name === "newFile", "addNode should add the correct node");
  }

  // Test error cases
  {
    const testFiles: Directory = {
      type: "directory",
      name: "root",
      isOpen: true,
      children: [
        {
          type: "file",
          name: "file1",
        },
      ],
    };

    // Try to add to a file instead of directory
    try {
      addNode(testFiles, ["root", "file1"], { type: "file", name: "newFile" });
      console.assert(false, "addNode should throw when adding to a file");
    } catch (e) {
      console.assert(true, "addNode correctly threw error");
    }

    // Try to toggle a file
    try {
      toggleDirectory(testFiles, ["root", "file1"]);
      console.assert(false, "toggleDirectory should throw when toggling a file");
    } catch (e) {
      console.assert(true, "toggleDirectory correctly threw error");
    }
  }
}

test();
