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

function getNode(root: Node, index: number[], depth: number = 0): Node | null {
  // Handle root node case
  if (depth === 0) {
    return index[0] === 0 ? root : null;
  }

  // Get current index for this depth level
  const currentIndex = index[depth];
  const child = root.children[currentIndex];

  // If no child exists at this index, return null
  if (!child) return null;

  // If we've reached the target depth, return the child
  if (depth === index.length - 1) {
    return child;
  }

  // Otherwise, continue searching deeper
  return getNode(child, index, depth + 1);
}

export function toggle(root: Node, index: number[]): Node {
  const node = getNode(root, index);
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
