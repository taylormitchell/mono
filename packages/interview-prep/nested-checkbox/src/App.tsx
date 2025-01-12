import { useState } from "react";
import "./App.css";
import { Node, checkDescendants, createTree, uncheckAncestors } from "./tree";

const defaultTree: Node = createTree({
  label: "root",
  isChecked: false,
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
});

function App() {
  const [tree, setTree] = useState(defaultTree);
  const toggleChecked = (node: Node, index: number[]) => {
    setTree((root) => {
      try {
        if (node.isChecked) {
          return uncheckAncestors([root], index)[0];
        } else {
          return checkDescendants([root], index)[0];
        }
      } catch (e) {
        console.error(e);
        return root;
      }
    });
  };
  console.log(tree);

  return (
    <div>
      <h1>Nested Checkbox</h1>
      {tree.children.map((child, index) => (
        <Tree key={index} node={child} index={[0, index]} toggleChecked={toggleChecked} />
      ))}
    </div>
  );
}

function Tree({
  node,
  index,
  toggleChecked,
}: {
  node: Node;
  index: number[];
  toggleChecked: (node: Node, index: number[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={node.isChecked}
          onChange={() => toggleChecked(node, index)}
        />
        {node.label}
      </div>
      <div className="pl-4">
        {node.children.map((child, i) => (
          <Tree key={i} node={child} index={[...index, i]} toggleChecked={toggleChecked} />
        ))}
      </div>
    </div>
  );
}

export default App;
