import { useState, useEffect, useRef } from "react";
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
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const fileOptions = Object.keys(groupedTodos);

  const fileFilteredTodos =
    selectedFiles.length === 0
      ? searchFilteredTodos
      : (Object.fromEntries(
          Object.entries(searchFilteredTodos).filter(([filename]) =>
            selectedFiles.includes(filename)
          )
        ) as Record<string, Todo[]>);

  const toggleFile = (file: string) => {
    setSelectedFiles((prev) =>
      prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file]
    );
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        <div className="custom-dropdown" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="dropdown-toggle">
            Select Files ({selectedFiles.length})
          </button>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              {fileOptions.map((file) => (
                <label key={file} className="dropdown-item">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file)}
                    onChange={() => toggleFile(file)}
                  />
                  {file}
                </label>
              ))}
            </div>
          )}
        </div>
        {selectedFiles.length > 0 && (
          <button onClick={clearSelection} className="clear-selection">
            Clear
          </button>
        )}
      </header>
      <div className="todo-list">
        <h1>Todos</h1>
        {Object.entries(fileFilteredTodos).map(([filename, fileTodos]) => (
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
