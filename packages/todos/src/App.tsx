import { useEffect, useState } from "react";
import "./App.css";

const initialDoc = `
# August 7th 2024

- [x] Do weekly planning
  - [ ] Write a blog post about the new note-taking system
  - [ ] Book appointment to get engagement ring

# done
- did weekly planning
- booked appointment to get engagment right
- [3/3] heated eyepatch
# next
- [ ] Play with dev stuff
  - maybe todo app on top of my notes
  - or some other thing around my notes and monorepo 
  - probably better to avoid fancy uis for now. focus on workflows and automations first
  - Collect together my thoughts on note-taking (note-cli and adjacent)
`.trim();

type SimpleTodo = {
  type: "simple";
  value: boolean;
  text: string;
};

type FractionTodo = {
  type: "fraction";
  value: { numerator: number; denominator: number };
  text: string;
};

type Todo = SimpleTodo | FractionTodo;

type TodoLine = {
  lineNum: number;
  todo: Todo;
};

function parseTodo(line: string): Todo | null {
  const match = line.match(/^\s*-?\s*(\[.*])(.*)/);
  if (!match) {
    return null;
  }
  const [, value, text] = match;
  if (value.includes("/")) {
    const [numerator, denominator] = value.slice(1, -1).split("/");
    return {
      type: "fraction",
      value: {
        numerator: Number(numerator),
        denominator: Number(denominator),
      },
      text: text.trim(),
    };
  } else {
    return {
      type: "simple",
      value: value.includes("x"),
      text: text.trim(),
    };
  }
}

function updateLine(line: string, todo: Partial<Todo>): string {
  const match = line.match(/^(\s*-?\s*)(\[.*]\s*)?(.*)/);
  if (!match) {
    return line;
  }
  const [, indent, value, text] = match;
  if (todo.type === "simple") {
    return `${indent}${todo.value ? "[x]" : "[ ]"} ${text}`;
  } else if (todo.type === "fraction") {
    const todoValue = todo.value ? `[${todo.value.numerator}/${todo.value.denominator}]` : value;
    return `${indent}${todoValue} ${text}`;
  }
  return line;
}

function useTodos() {
  const [doc, setDoc] = useState(initialDoc);
  const todos = doc
    .split("\n")
    .map((line, i) => ({ lineNum: i, todo: parseTodo(line) }))
    .filter(({ todo }) => !!todo) as TodoLine[];

  useEffect(() => {
    console.log(doc);
  }, [doc]);

  return {
    todos,
    updateTodo: (lineNum: number, todo: Partial<Todo>) => {
      const newDoc = doc
        .split("\n")
        .map((line, i) => {
          if (i === lineNum) {
            console.log("updating line", lineNum, todo);
            return updateLine(line, todo);
          }
          return line;
        })
        .join("\n");
      setDoc(newDoc);
    },
  };
}

function SimpleTodo({
  todo,
  updateTodo,
}: {
  todo: SimpleTodo;
  updateTodo: (todo: Partial<SimpleTodo>) => void;
}) {
  return (
    <div>
      <input
        type="checkbox"
        checked={todo.value}
        onChange={(e) => updateTodo({ value: e.target.checked })}
      />
      {todo.text}
    </div>
  );
}

function FractionTodo({
  todo,
  updateTodo,
}: {
  todo: FractionTodo;
  updateTodo: (todo: Partial<FractionTodo>) => void;
}) {
  return (
    <div>
      <span>
        <input
          type="text"
          value={todo.value.numerator}
          onChange={(e) => {
            console.log(e.target.value);
            updateTodo({ value: { ...todo.value, numerator: Number(e.target.value) } });
          }}
        />
        /
        <input
          type="text"
          value={todo.value.denominator}
          onChange={(e) => {
            console.log(e.target.value);
            updateTodo({ value: { ...todo.value, denominator: Number(e.target.value) } });
          }}
        />
      </span>
      {todo.text}
    </div>
  );
}

function App() {
  const { todos, updateTodo } = useTodos();
  return (
    <>
      <div>
        {todos.map(({ lineNum, todo }) => (
          <div key={lineNum}>
            {todo.type === "simple" ? (
              <SimpleTodo
                todo={todo}
                updateTodo={(todo) => updateTodo(lineNum, { ...todo, type: "simple" })}
              />
            ) : (
              <FractionTodo
                todo={todo}
                updateTodo={(todo) => updateTodo(lineNum, { ...todo, type: "fraction" })}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
