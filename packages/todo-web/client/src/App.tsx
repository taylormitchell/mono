import { useState, useEffect } from "react";
import "./App.css";

type Heading = {
  type: "heading";
  level: number;
  text: string;
};
type TodoStatus = "TODO" | "DOING" | "DONE" | "MAYBE" | "WAITING";
type Todo = {
  type: "todo";
  text: string;
  status: TodoStatus;
  due?: Date;
  id?: string;
  filename?: string;
  relativeFilename?: string;
  headings?: Heading[];
};

function deserializeTodo(todo: Omit<Todo, "due"> & { due?: string }): Todo {
  let due: Date | undefined;
  if (todo.due) {
    const [year, month, day] = todo.due.split("-").map(Number);
    due = new Date(year, month - 1, day);
  }
  return { ...todo, due };
}

function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  console.log("todos", todos);

  useEffect(() => {
    async function fetchTodos() {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        console.error("VITE_API_URL is not set");
        return;
      }
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

function App() {
  const { todos, toggleTodoStatus } = useTodos();
  const [filter, setFilter] = useState<"all" | "today">("all");

  console.log("todos", todos);
  // Group todos by filename
  const groupedTodos = todos.reduce((acc, todo) => {
    const relativeFilename = todo.relativeFilename || "Unspecified";
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
              fileTodos.filter((todo) => {
                const today = new Date().toDateString();
                const due = todo.due?.toDateString();
                console.log({ todo, today, due });
                return due && due === today;
              }),
            ])
            .filter(([_, todos]) => todos.length > 0)
        ) as Record<string, Todo[]>);

  return (
    <div className="app-container">
      <header className="app-header">
        <button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>
          All Todos
        </button>
        <button onClick={() => setFilter("today")} className={filter === "today" ? "active" : ""}>
          Today's Todos
        </button>
      </header>
      <div className="todo-list">
        <h1>Todos</h1>
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
