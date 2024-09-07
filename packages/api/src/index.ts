import express from "express";
import { getRootDir } from "@taylor/common/data";
import { createDailyNote, createWeeklyNote, createMonthlyNote } from "@taylor/common/note";
import { addTodo } from "@taylor/common/todo/parsers";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

const app = express();
const port = process.env.PORT || 3077;

app.use(express.json());
app.use(express.static(getRootDir()));

// Hello World route

// Files API
app.get("/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isFile()) {
      res.sendFile(filePath);
    } else if (fs.statSync(filePath).isDirectory()) {
      const files = fs.readdirSync(filePath);
      const links = files
        .sort((a, b) => a.localeCompare(b))
        .map((file) => {
          const fullPath = path.join(req.params.path, file);
          const isDirectory = fs.statSync(path.join(filePath, file)).isDirectory();
          return `<li><a href="/files/${fullPath}">${file}${isDirectory ? "/" : ""}</a></li>`;
        })
        .join("\n");

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Directory Listing: ${req.params.path}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            h1 { color: #333; }
            ul { list-style-type: none; padding-left: 0; }
            li { margin-bottom: 5px; }
            a { text-decoration: none; color: #0066cc; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Directory Listing: ${req.params.path}</h1>
          <ul>
            ${links}
          </ul>
        </body>
        </html>
      `;
      res.send(html);
    } else {
      res.status(400).json({ error: "Path is neither a file nor a directory" });
    }
  } else {
    res.status(404).json({ error: "Path not found" });
  }
});

app.put("/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  const content = req.body?.content || "";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const exists = fs.existsSync(filePath);
  fs.writeFileSync(filePath, content);
  res
    .status(200)
    .json({ message: exists ? "File updated successfully" : "File created successfully" });
});

app.patch("/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  const { method, content } = req.body;

  if (!method || !content) {
    return res.status(400).json({ error: "Method and content are required" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  let existingContent = fs.readFileSync(filePath, "utf-8");

  switch (method) {
    case "append":
      existingContent += content;
      break;
    case "prepend":
      existingContent = content + existingContent;
      break;
    case "overwrite":
      existingContent = content;
      break;
    default:
      return res.status(400).json({ error: "Invalid method" });
  }

  fs.writeFileSync(filePath, existingContent);
  res.status(200).json({ message: "File updated successfully" });
});

app.delete("/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.status(200).json({ message: "File deleted successfully" });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// Log API
app.post("/log/:type", (req, res) => {
  const { type } = req.params;
  const { datetime, duration } = req.body;
  const logEntry = {
    type,
    datetime: datetime || format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxx"),
    ...(duration ? { duration } : {}),
  };
  const logPath = path.join(getRootDir(), "log.jsonl");
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
  res.status(201).json({ message: "Log entry added successfully" });
});

// Note API
app.get("/note/:type", (req, res) => {
  const { type } = req.params;
  const { date, offset } = req.query;
  let notePath;

  switch (type) {
    case "daily":
      notePath = createDailyNote(date ? new Date(date as string) : Number(offset) || 0);
      break;
    case "weekly":
      notePath = createWeeklyNote(date ? new Date(date as string) : Number(offset) || 0);
      break;
    case "monthly":
      notePath = createMonthlyNote(date ? new Date(date as string) : Number(offset) || 0);
      break;
    default:
      return res.status(400).json({ error: "Invalid note type" });
  }

  const content = fs.readFileSync(notePath, "utf-8");
  res.json({ content });
});

app.post("/note/post/:dir(*)", (req, res) => {
  const { dir } = req.params;
  const content = req.body?.content || "";
  const dirPath = path.join(getRootDir(), dir);
  const filename = format(new Date(), "yyyy-MM-dd_HH-mm-ss_xx") + ".md";
  const filePath = path.join(dirPath, filename);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filePath, content);
  res.status(201).json({ message: "Post created successfully", path: filePath });
});

// Todos API
app.get("/todos", (req, res) => {
  // Implement this using the listAllTodos function from @taylor/common/todo/parsers
  // You'll need to modify the function to return the data instead of logging it
  res.json({ message: "Not implemented yet" });
});

app.post("/todos/:path(*)", (req, res) => {
  const { path: todoPath } = req.params;
  const { content } = req.body;
  const filePath = path.join(getRootDir(), todoPath);

  try {
    addTodo(
      {
        type: "todo",
        text: content,
        status: "TODO",
      },
      filePath
    );
    res.status(201).json({ message: "Todo added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add todo" });
  }
});

app.post("/todos/today", (req, res) => {
  const { content } = req.body;
  const todayNote = createDailyNote();

  try {
    addTodo(
      {
        type: "todo",
        text: content,
        status: "TODO",
      },
      todayNote
    );
    res.status(201).json({ message: "Todo added to today's note successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add todo to today's note" });
  }
});

app.post("/todos/someday", (req, res) => {
  const { content } = req.body;
  const somedayPath = path.join(getRootDir(), "gtd", "someday-maybe.md");

  try {
    addTodo(
      {
        type: "todo",
        text: content,
        status: "TODO",
      },
      somedayPath
    );
    res.status(201).json({ message: "Todo added to someday-maybe.md successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add todo to someday-maybe.md" });
  }
});

app.post("/todos", (req, res) => {
  const { content } = req.body;
  const todoPath = path.join(getRootDir(), "gtd", "todo.md");

  try {
    addTodo(
      {
        type: "todo",
        text: content,
        status: "TODO",
      },
      todoPath
    );
    res.status(201).json({ message: "Todo added to todo.md successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add todo to todo.md" });
  }
});

// Auth API (placeholder)
app.post("/auth/login", (req, res) => {
  // Implement proper authentication logic here
  res.json({ token: "placeholder_token" });
});

app.get("/", (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Documentation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; }
        ul { list-style-type: none; padding-left: 0; }
        li { margin-bottom: 10px; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>API Documentation</h1>
      <p>This API provides endpoints for managing files, notes, todos, and authentication.</p>
      
      <h2>Files</h2>
      <ul>
        <li><code>GET /files/:path</code> - Get file content</li>
        <li><code>GET /files/:dir</code> - List files in directory</li>
        <li><code>PUT /files/:path</code> - Update file content</li>
        <li><code>PATCH /files/:path</code> - Modify file content (append/prepend/overwrite)</li>
        <li><code>DELETE /files/:path</code> - Delete file</li>
      </ul>
      
      <h2>Notes</h2>
      <ul>
        <li><code>GET /note/daily</code> - Get or create daily note</li>
        <li><code>GET /note/weekly</code> - Get or create weekly note</li>
        <li><code>GET /note/monthly</code> - Get or create monthly note</li>
        <li><code>POST /note/post/:dir</code> - Add a post to specified directory</li>
      </ul>
      
      <h2>Todos</h2>
      <ul>
        <li><code>GET /todos</code> - List all todos</li>
        <li><code>POST /todos/:path</code> - Add todo to specific file</li>
        <li><code>POST /todos/today</code> - Add todo to today's note</li>
        <li><code>POST /todos/someday</code> - Add todo to someday-maybe.md</li>
        <li><code>POST /todos</code> - Add todo to todo.md</li>
      </ul>
      
      <h2>Auth</h2>
      <ul>
        <li><code>POST /auth/login</code> - Login (placeholder)</li>
      </ul>
    </body>
    </html>
  `;

  res.send(htmlContent);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
