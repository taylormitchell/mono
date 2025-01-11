type Node = {
  label: string;
  isChecked: boolean;
  children: Node[];
};

function findNode(nodes: Node[], index: number[], depth: number = 0): Node[] {
  return nodes.map((node, i) => {
    if (i === index[depth]) {
      if (depth === index.length - 1) {
        return { ...node, isChecked: !node.isChecked };
      } else {
        return { ...node, children: toggle(node.children, index, depth + 1) };
      }
    }
    return node;
  });
}

function toggle(node: Node): Node {
    if (node.isChecked) {
        
    } else {
        // check all descendants    
        function check(node: Node): Node {
            return {
                ...node,
                isChecked: true,
                children: node.children.map((child) => check(child)),
            };
        }
        return check(node);
    }

