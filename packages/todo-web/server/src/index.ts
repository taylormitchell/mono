import express from "express";
import cors from "cors";
import path from "path";
import { getTodos } from "@taylor/common/todo/parsers";
import { serializeTodo } from "@taylor/common/todo/types";
import { execSync } from "child_process";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock API route
app.get("/api/data", (req, res) => {
  execSync("git pull");
  const todos = getTodos();
  if (todos.length === 0) {
    res.json({ todos: [] });
  } else {
    res.json({ todos: todos.map(serializeTodo) });
  }
});

app.get("/api/pull", (req, res) => {
  console.log("Pulling");
  execSync("git pull");
  res.sendStatus(200);
});

// Update todo endpoint
// app.put("/api/todo", (req, res) => {
//   const updatedTodo = req.body as Todo;
//   if (updatedTodo.due) {
//     updatedTodo.due = new Date(updatedTodo.due);
//   }

//   // Attempt to update the todo in the file
//   const updated = updateTodo(updatedTodo);

//   if (updated) {
//     res.json({ todo: updatedTodo });
//   } else {
//     res.status(500).json({ error: "Failed to update todo" });
//   }
// });

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const frontendBuildPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(frontendBuildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
