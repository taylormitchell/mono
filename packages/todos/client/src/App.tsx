import { useState, useEffect } from "react";
import "./App.css";

const rootDir = "/Users/taylormitchell/Code/taylors-tech/packages/notes/";

const TODO_KEYWORDS = ["TODO", "DOING", "DONE", "MAYBE", "WAITING"] as const;
type Heading = {
  type: "heading";
  level: number;
  text: string;
};
type TodoStatus = (typeof TODO_KEYWORDS)[number];
type Todo = {
  type: "todo";
  text: string;
  status: TodoStatus;
  due?: Date;
  id?: string;
  filename?: string;
  headings?: Heading[];
};

function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    async function fetchTodos() {
      const res = await fetch("http://localhost:3000/api/data");
      if (res.ok) {
        const data = await res.json();
        // parse the todo dates
        const todos = data.todos.map((todo: Todo) => {
          if (todo.due) {
            todo.due = new Date(todo.due);
          }
          return todo;
        });
        setTodos(todos);
      }
    }
    fetchTodos();
  }, []);

  const toggleTodoStatus = async (todo: Todo) => {
    const updatedTodo = { ...todo, status: todo.status === "DONE" ? "TODO" : "DONE" } as Todo;
    const res = await fetch("http://localhost:3000/api/todo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTodo),
    });
    if (res.ok) {
      setTodos(todos.map((t) => (t.id === todo.id ? updatedTodo : t)));
    }
  };

  return { todos, toggleTodoStatus };
}

function App() {
  const { todos, toggleTodoStatus } = useTodos();
  const [filter, setFilter] = useState<"all" | "today">("all");

  // Group todos by filename
  const groupedTodos = todos.reduce((acc, todo) => {
    const filename = todo.filename || "Unspecified";
    const relativeFilename = filename.replace(rootDir, "");
    if (!acc[relativeFilename]) {
      acc[relativeFilename] = [];
    }
    acc[relativeFilename].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  const filteredTodos =
    filter === "all"
      ? groupedTodos
      : (Object.fromEntries(
          Object.entries(groupedTodos)
            .map(([filename, fileTodos]) => [
              filename,
              fileTodos.filter(
                (todo) => todo.due && todo.due.toDateString() === new Date().toDateString()
              ),
            ])
            .filter(([_, todos]) => todos.length > 0)
        ) as Record<string, Todo[]>);

  return (
    <div className="app-container">
      <div className="sidebar">
        <button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>
          All Todos
        </button>
        <button onClick={() => setFilter("today")} className={filter === "today" ? "active" : ""}>
          Today's Todos
        </button>
      </div>
      <div className="todo-list">
        {Object.entries(filteredTodos).map(([filename, fileTodos]) => (
          <div key={filename} className="file-group">
            <h2>{filename}</h2>
            {fileTodos.map((todo) => (
              <div key={todo.id || todo.text} className="todo-item">
                <div className="todo-content">
                  <input
                    type="checkbox"
                    checked={todo.status === "DONE"}
                    onChange={() => toggleTodoStatus(todo)}
                    className="todo-checkbox"
                  />
                  <span className="todo-text">{todo.text}</span>
                  {todo.due && (
                    <span className="todo-due-date">Due: {todo.due.toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
