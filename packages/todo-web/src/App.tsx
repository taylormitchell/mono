import { useState, useEffect, useCallback } from "react";
import { deserializeTodo, serializeTodo, Todo } from "@taylor/common/todo/types";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error("VITE_API_URL is not set");
}

function useTodos(jwt: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);

  async function fetchTodos(jwt: string) {
    const res = await fetch(`${apiUrl}/api/todos`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log(data);
      // parse the todo dates
      try {
        const todos = data.todos
          .map((todo: unknown) => {
            try {
              return deserializeTodo(todo);
            } catch (e) {
              console.error("Error deserializing todo:", todo, e);
              return null;
            }
          })
          .filter((todo: Todo | null): todo is Todo => todo !== null);
        setTodos(todos);
      } catch (e) {
        console.error("Error processing todos", e);
      }
    }
  }

  useEffect(() => {
    if (jwt) {
      fetchTodos(jwt);
    }
  }, [jwt]);

  return { todos, refetch: fetchTodos };
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const storedJwt = localStorage.getItem("jwt");
    if (storedJwt) {
      setJwt(storedJwt);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (password: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem("jwt", token);
        setJwt(token);
        setIsLoggedIn(true);
      } else {
        console.error("Login failed");
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const { todos, refetch } = useTodos(jwt);
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupby, setGroupby] = useState<"byFile" | "byDueDate">("byDueDate");
  const [showCompleted, setShowCompleted] = useState(false);
  const [showNewTodoModal, setShowNewTodoModal] = useState(false);

  const handleSync = useCallback(async () => {
    if (!jwt) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${apiUrl}/api/git/rebase`, {
        method: "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (response.ok) {
        const result = await response.json();
        console.log("Sync successful:", result.message);
        // Optionally, you can refetch todos here if needed
        refetch(jwt);
      } else {
        console.error("Sync failed");
      }
    } catch (error) {
      console.error("Error during sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [jwt, refetch]);

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

  const handleSaveNewTodo = async (todo: Todo) => {
    const res = await fetch(`${apiUrl}/api/todo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(serializeTodo(todo)),
    });

    if (res.ok) {
      refetch();
    } else {
      console.error("Failed to save new todo");
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

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
        <button onClick={() => setShowNewTodoModal(true)} className="new-todo-button">
          New Todo
        </button>
        <button onClick={handleSync} disabled={isSyncing} className="sync-button">
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
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
      <NewTodoModal
        isOpen={showNewTodoModal}
        onClose={() => setShowNewTodoModal(false)}
        onSave={handleSaveNewTodo}
      />
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

function NewTodoModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
}) {
  const [todo, setTodo] = useState<Todo>({ type: "todo", text: "", status: "TODO" });

  const handleSave = () => {
    onSave(todo);
    setTodo({ type: "todo", text: "", status: "TODO" });
    onClose();
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>New Todo</h2>
        <input
          type="text"
          placeholder="Todo text"
          value={todo.text}
          onChange={(e) => setTodo({ ...todo, text: e.target.value })}
        />
        <input
          type="date"
          value={todo.due?.toISOString().split("T")[0]}
          onChange={(e) => setTodo({ ...todo, due: new Date(e.target.value) })}
        />
        <div className="modal-buttons">
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }: { onLogin: (password: string) => void }) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="login-input"
        />
        <button type="submit" className="login-button">
          Login
        </button>
      </form>
    </div>
  );
}

export default App;
