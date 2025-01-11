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

function checkDescendants(node: Node): Node {
  return {
    ...node,
    isChecked: true,
    children: node.children.map((child) => checkDescendants(child)),
  };
}

export function checkAtIndex(nodes: Node[], index: number[], depth: number = 0): Node[] {
  let found = false;
  const newNodes = nodes.map((node, i) => {
    if (i === index[depth]) {
      if (depth === index.length - 1) {
        found = true;
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
  if (!found) {
    throw new Error("Node not found at index");
  }
  return newNodes;
}

/**
 * @throws If the node is not found at the given index
 */
export function uncheckAncestors(nodes: Node[], index: number[], depth: number = 0): Node[] {
  let found = false;
  const newNodes = nodes.map((node, i) => {
    if (i === index[depth]) {
      if (depth === index.length - 1) {
        found = true;
        return { ...node, isChecked: false };
      } else {
        return {
          ...node,
          isChecked: false,
          children: uncheckAncestors(node.children, index, depth + 1),
        };
      }
    } else {
      return node;
    }
  });
  if (!found) {
    throw new Error("Node not found at index");
  }
  return newNodes;
}
