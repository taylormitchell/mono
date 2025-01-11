type Node = {
  label: string;
  isChecked: boolean;
  parent: Node | null;
  children: Node[];
};

// function findNode(nodes: Node[], index: number[], depth: number = 0): Node[] {
//   return nodes.map((node, i) => {
//     if (i === index[depth]) {
//       if (depth === index.length - 1) {
//         return { ...node, isChecked: !node.isChecked };
//       } else {
//         return { ...node, children: toggle(node.children, index, depth + 1) };
//       }
//     }
//     return node;
//   });
// }

function getNode(nodes: Node[], index: number[], depth: number = 0): Node | null {
  for (let i = 0; i < nodes.length; i++) {
    if (i === index[depth]) {
      if (depth === index.length - 1) {
        return nodes[i];
      } else {
        return getNode(nodes[i].children, index, depth + 1);
      }
    }
  }
  return null;
}

function toggle(node: Node): Node {
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
