import { useState, useEffect } from "react";
import { deserializeTodo, Todo } from "@taylor/common/todo/types";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error("VITE_API_URL is not set");
}

function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  console.log("todos", todos);

  useEffect(() => {
    async function fetchTodos() {
      const res = await fetch(`${apiUrl}/api/data`);
      if (res.ok) {
        const data = await res.json();
        // parse the todo dates
        const todos = data.todos.map(deserializeTodo);
        setTodos(todos);
      }
    }
    fetchTodos();
  }, []);

  const toggleTodoStatus = async (todo: Todo) => {
    console.log("toggling todo", todo);
    // const updatedTodo = { ...todo, status: todo.status === "DONE" ? "TODO" : "DONE" } as Todo;
    // const apiUrl = import.meta.env.VITE_API_URL;
    // if (!apiUrl) {
    //   console.error("VITE_API_URL is not set");
    //   return;
    // }
    // const res = await fetch(`${apiUrl}/api/todo`, {
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(updatedTodo),
    // });
    // if (res.ok) {
    //   console.log("updated todo", updatedTodo);
    //   setTodos((todos) => todos.map((t) => (t.id === todo.id ? updatedTodo : t)));
    // }
  };

  return { todos, toggleTodoStatus };
}

const extractFilenameKeywords = (filename: string): string[] => {
  return filename
    .replace(/\.[^/.]+$/, "") // Remove file extension
    .split(/[/\\._-]/) // Split by common separators
    .filter(Boolean) // Remove empty strings
    .map((word) => word.toLowerCase());
};

const groupTodosByDueDate = (todos: Todo[]): Record<string, Todo[]> => {
  const grouped = todos.reduce((acc, todo) => {
    const dueDate = todo.due ? todo.due.toDateString() : "No Due Date";
    if (!acc[dueDate]) {
      acc[dueDate] = [];
    }
    acc[dueDate].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  // Sort the groups by date (descending)
  return Object.fromEntries(
    Object.entries(grouped).sort((a, b) => {
      if (a[0] === "No Due Date") return 1;
      if (b[0] === "No Due Date") return -1;
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    })
  );
};

const groupTodosByFilename = (todos: Todo[]): Record<string, Todo[]> => {
  return todos.reduce((acc, todo) => {
    const filename = todo.relativeFilename || "Unspecified";
    if (!acc[filename]) {
      acc[filename] = [];
    }
    acc[filename].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);
};

function App() {
  const { todos, toggleTodoStatus } = useTodos();
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupby, setGroupby] = useState<"byFile" | "byDueDate">("byDueDate");
  const [showCompleted, setShowCompleted] = useState(false);

  // Apply filters
  const filteredTodos = todos.filter((todo) => {
    if (filter === "today" && todo.due?.toDateString() !== new Date().toDateString()) {
      return false;
    }
    if (!showCompleted && todo.status === "DONE") {
      return false;
    }
    if (searchTerm) {
      const searchText =
        todo.text + " " + extractFilenameKeywords(todo.relativeFilename || "").join(" ");
      if (!searchText.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <input
          type="text"
          placeholder="Search todos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={groupby}
          onChange={(e) => setGroupby(e.target.value as "byFile" | "byDueDate")}
          className="view-dropdown"
        >
          <option value="byFile">Group by File</option>
          <option value="byDueDate">Group by Due Date</option>
        </select>
        <label className="show-completed-checkbox">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show Completed
        </label>
        <label>
          <input
            type="checkbox"
            checked={filter === "today"}
            onChange={(e) => setFilter(e.target.checked ? "today" : "all")}
          />
          Today only
        </label>
      </header>
      <div className="todo-list">
        {groupby === "byFile" ? (
          <div>
            {Object.entries(groupTodosByFilename(filteredTodos)).map(([filename, fileTodos]) => (
              <div key={filename} className="file-group">
                <h2>{filename}</h2>
                <TodoList todos={fileTodos} />
              </div>
            ))}
          </div>
        ) : (
          <div>
            {Object.entries(groupTodosByDueDate(filteredTodos)).map(([dueDate, dateTodos]) => (
              <div key={dueDate} className="date-group">
                <h2>{dueDate}</h2>
                <TodoList todos={dateTodos} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <div key={todo.id || todo.text} className="todo-item">
          <div className="todo-content">
            <input
              type="checkbox"
              checked={todo.status === "DONE"}
              className="todo-checkbox"
              onChange={() => {}}
            />
            <span className="todo-text">{todo.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default App;
