type Node = {
  label: string;
  isChecked: boolean;
  children: Node[];
};

export function toggle(node: Node, index: number[], depth: number = 0): Node {
  if (depth === index.length - 1) {
    return { ...node, isChecked: !node.isChecked };
  }
  return {
    ...node,
    children: node.children.map((child) => toggle(child, index, depth + 1)),
  };
}
