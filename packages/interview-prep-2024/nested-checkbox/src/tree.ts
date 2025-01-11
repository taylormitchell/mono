export type Node = {
  label: string;
  isChecked: boolean;
  parent: Node | null;
  children: Node[];
};

// Helper type to create a tree from a nested object
type NodeWithoutParent = { label: string; isChecked: boolean; children: NodeWithoutParent[] };
export function createTree(node: NodeWithoutParent, parent: Node | null = null): Node {
  const newNode: Node = { ...node, parent, children: [] };
  newNode.children = node.children.map((child) => createTree(child, newNode));
  return newNode;
}

function getNode(node: Node[], index: number[], depth: number = 0): Node | null {
  // Get current index for this depth level
  const currentIndex = index[depth];
  const child = node[currentIndex];

  // If no child exists at this index, return null
  if (!child) return null;

  // If we've reached the target depth, return the child
  if (depth === index.length - 1) {
    return child;
  }

  // Otherwise, continue searching deeper
  return getNode(child.children, index, depth + 1);
}

export function toggle(root: Node, index: number[]): Node {
  const node = getNode([root], index);
  if (!node) return root;

  if (node.isChecked) {
    function uncheckAncestors(node: Node): Node {
      if (node.parent) {
        return {
          ...uncheckAncestors(node.parent),
          children: node.parent.children.map((c) => (c === node ? { ...c, isChecked: false } : c)),
        };
      } else {
        return { ...node, isChecked: false };
      }
    }
    return uncheckAncestors(node);
  } else {
    function checkDescendants(node: Node): Node {
      return {
        ...node,
        isChecked: true,
        children: node.children.map((child) => checkDescendants(child)),
      };
    }
    return checkDescendants(node);
  }
}

function updateAtIndex(
  nodes: Node[],
  index: number[],
  update: (node: Node) => Node,
  depth: number = 0
): Node[] {
  return nodes.map((node, i) => {
    if (i === index[depth]) {
      if (depth === index.length - 1) {
        return update(node);
      } else {
        return {
          ...node,
          children: updateAtIndex(node.children, index, update, depth + 1),
        };
      }
    } else {
      return node;
    }
  });
}

function checkDescendants(node: Node): Node {
  return {
    ...node,
    isChecked: true,
    children: node.children.map((child) => checkDescendants(child)),
  };
}

function checkAtIndex(nodes: Node[], index: number[], depth: number = 0): Node[] {
  return nodes.map((node, i) => {
    if (i === index[depth]) {
      if (depth === index.length - 1) {
        return checkDescendants(node);
      } else {
        return {
          ...node,
          children: checkAtIndex(node.children, index, depth + 1),
        };
      }
    } else {
      return node;
    }
  });
}

function toggle2(root: Node, index: number[]): Node {
  const node = getNode([root], index);
  if (!node) return root;
  function checkDescendants(node: Node): Node {
    return {
      ...node,
      isChecked: true,
      children: node.children.map((child) => checkDescendants(child)),
    };
  }
  const [newRoot] = updateAtIndex([root], index, checkDescendants);
  return newRoot;
}
