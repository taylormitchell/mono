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

function App() {
  const [tree, setTree] = useState(defaultTree);

  return (
    <div>
      <h1>Nested Checkbox</h1>
      {tree.children.map((child) => (
        <Tree node={child} />
      ))}
    </div>
  );
}

function Tree({ node }: { node: Node }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="checkbox" />
        {node.label}
      </div>
      <div className="pl-4">
        {node.children.map((child) => (
          <Tree node={child} />
        ))}
      </div>
    </div>
  );
}

export default App;
