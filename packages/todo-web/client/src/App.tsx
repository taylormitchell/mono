import { useState, useEffect } from "react";
import { deserializeTodo, Todo } from "@taylor/common/todo/types";
import "./App.css";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<"byFile" | "byDueDate">("byFile");
  const [showCompleted, setShowCompleted] = useState(false);

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

  const extractKeywords = (text: string): string[] => {
    return text.toLowerCase().split(/\s+/).filter(Boolean);
  };

  const extractFilenameKeywords = (filename: string): string[] => {
    return filename
      .replace(/\.[^/.]+$/, "") // Remove file extension
      .split(/[/\\._-]/) // Split by common separators
      .filter(Boolean) // Remove empty strings
      .map((word) => word.toLowerCase());
  };

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

  const searchFilteredTodos = Object.fromEntries(
    Object.entries(filteredTodos)
      .map(([filename, fileTodos]) => {
        const filenameKeywords = extractFilenameKeywords(filename);
        const searchKeywords = extractKeywords(searchTerm);

        return [
          filename,
          fileTodos.filter((todo) => {
            const todoKeywords = extractKeywords(todo.text);
            const allKeywords = [...todoKeywords, ...filenameKeywords];

            return searchKeywords.every((searchKeyword) =>
              allKeywords.some((keyword) => keyword.includes(searchKeyword))
            );
          }),
        ];
      })
      .filter(([_, todos]) => todos.length > 0)
  ) as Record<string, Todo[]>;

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

  const dueDateGroupedTodos = groupTodosByDueDate(todos);

  const filterCompletedTodos = (todos: Todo[]) => {
    return showCompleted ? todos : todos.filter((todo) => todo.status !== "DONE");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button onClick={() => setFilter("all")} className={filter === "all" ? "active" : ""}>
          All Todos
        </button>
        <button onClick={() => setFilter("today")} className={filter === "today" ? "active" : ""}>
          Today's Todos
        </button>
        <input
          type="text"
          placeholder="Search todos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={() => setView("byFile")} className={view === "byFile" ? "active" : ""}>
          Group by File
        </button>
        <button
          onClick={() => setView("byDueDate")}
          className={view === "byDueDate" ? "active" : ""}
        >
          Group by Due Date
        </button>
        <label className="show-completed-checkbox">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show Completed
        </label>
      </header>
      <div className="todo-list">
        <h1>Todos</h1>
        {view === "byFile"
          ? Object.entries(searchFilteredTodos).map(([filename, fileTodos]) => (
              <div key={filename} className="file-group">
                <h2>{filename}</h2>
                {filterCompletedTodos(fileTodos).map((todo) => (
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
            ))
          : Object.entries(dueDateGroupedTodos)
              .map(([dueDate, dateTodos]) => ({
                dueDate,
                todos: filterCompletedTodos(dateTodos),
              }))
              .filter(({ todos }) => todos.length > 0)
              .map(({ dueDate, todos }) => (
                <div key={dueDate} className="date-group">
                  <h2>{dueDate}</h2>
                  {todos.map((todo) => (
                    <div key={todo.id || todo.text} className="todo-item">
                      <div className="todo-content">
                        <input
                          type="checkbox"
                          checked={todo.status === "DONE"}
                          onChange={() => toggleTodoStatus(todo)}
                          className="todo-checkbox"
                        />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span className="todo-text">{todo.text}</span>
                          <span
                            className="todo-filename"
                            style={{ fontSize: "0.8em", color: "gray" }}
                          >
                            {todo.relativeFilename || "Unspecified"}
                          </span>
                        </div>
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
