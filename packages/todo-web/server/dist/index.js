"use strict";
// File: backend/src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const todo_1 = require("@taylor/common/todo");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Mock API route
app.get("/api/data", (req, res) => {
    const todos = (0, todo_1.getTodos)();
    if (todos.length === 0) {
        res.json({ todos: [] });
    }
    else {
        res.json({ todos });
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
    const frontendBuildPath = path_1.default.join(__dirname, "../../client/dist");
    app.use(express_1.default.static(frontendBuildPath));
    app.get("*", (req, res) => {
        res.sendFile(path_1.default.join(frontendBuildPath, "index.html"));
    });
}
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
