import { useState } from "react";
import "./App.css";

type Node = {
  label: string;
  children: Node[];
};

const defaultTree: Node = {
  label: "root",
  children: [
    {
      label: "p1",
      children: [
        { label: "p1-c1", children: [] },
        {
          label: "p1-c2",
          children: [
            { label: "p1-c2-c1", children: [] },
            { label: "p1-c2-c2", children: [] },
          ],
        },
      ],
    },
    {
      label: "p2",
      children: [
        { label: "p2-c1", children: [] },
        { label: "p2-c2", children: [] },
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
        <Tree tree={child} />
      ))}
    </div>
  );
}

function Tree({ tree }: { tree: Node }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="checkbox" />
        {tree.label}
      </div>
      <div className="pl-4">
        {tree.children.map((child) => (
          <Tree tree={child} />
        ))}
      </div>
    </div>
  );
}

export default App;
