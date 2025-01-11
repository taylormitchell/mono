import { useState } from "react";
import "./App.css";

type Node = {
  label: string;
  isChecked: boolean;
  children: Node[];
};

type Tree = {
  children: Node[];
};

const defaultTree: Tree = {
  children: [
    {
      label: "p1",
      isChecked: false,
      children: [
        { isChecked: false, label: "p1-c1", children: [] },
        {
          isChecked: false,
          label: "p1-c2",
          children: [
            { isChecked: false, label: "p1-c2-c1", children: [] },
            { isChecked: false, label: "p1-c2-c2", children: [] },
          ],
        },
      ],
    },
    {
      isChecked: false,
      label: "p2",
      children: [
        { isChecked: false, label: "p2-c1", children: [] },
        { isChecked: false, label: "p2-c2", children: [] },
      ],
    },
  ],
};

function toggle(nodes: Node[], index: number[], depth: number = 0): Node[] {
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

function App() {
  const [tree, setTree] = useState(defaultTree);
  const toggleChecked = (index: number[]) => {
    setTree((tree) => ({
      ...tree,
      children: toggle(tree.children, index),
    }));
  };
  console.log(tree);

  return (
    <div>
      <h1>Nested Checkbox</h1>
      {tree.children.map((child, index) => (
        <Tree
          node={child}
          index={[index]}
          isAncestorChecked={false}
          toggleChecked={toggleChecked}
        />
      ))}
    </div>
  );
}

function Tree({
  node,
  index,
  isAncestorChecked,
  toggleChecked,
}: {
  node: Node;
  index: number[];
  isAncestorChecked: boolean;
  toggleChecked: (index: number[]) => void;
}) {
  const isChecked = node.isChecked || isAncestorChecked;
  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={isChecked} onChange={() => toggleChecked(index)} />
        {node.label}
      </div>
      <div className="pl-4">
        {node.children.map((child, i) => (
          <Tree
            node={child}
            index={[...index, i]}
            isAncestorChecked={isChecked}
            toggleChecked={toggleChecked}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
