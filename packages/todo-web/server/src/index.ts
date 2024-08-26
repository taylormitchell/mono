import express from "express";
import cors from "cors";
import path from "path";
import { addTodo, getTodos } from "@taylor/common/todo/parsers";
import { deserializeTodo, serializeTodo } from "@taylor/common/todo/types";
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

app.post("/api/todo", (req, res) => {
  try {
    const todo = deserializeTodo(req.body);
    addTodo(todo);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error adding todo", error);
    res.status(500).send("Error adding todo");
  }
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
