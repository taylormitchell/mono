import express, { NextFunction, Request, Response } from "express";
import { getRepoRoot, getRootDir } from "@taylor/common/data";
import { createPost, dateToJournalPath, getOrCreateJournalNote } from "@taylor/common/note";
import { addTodo, listAllTodos } from "@taylor/common/todo/parsers";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { deserializeTodo } from "@taylor/common/todo/types";
import { addLogEntry } from "@taylor/common/logs/utils";
import { LogEntrySchema } from "@taylor/common/logs/types";
import { generateJwt, verifyJwt } from "./jwt";
import { config } from "dotenv";
import { exec, execSync } from "child_process";
import cors from "cors";

const { parsed } = config();
const AUTH_DISABLED = parsed?.AUTH_DISABLED === "true";
const COMMIT_ON_SAVE = parsed?.COMMIT_ON_SAVE === "true";
const SYNC_ENABLED = parsed?.SYNC_ENABLED === "true";
const ADMIN_PASSWORD = parsed?.ADMIN_PASSWORD;
console.log("env:", {
  AUTH_DISABLED,
  COMMIT_ON_SAVE,
  SYNC_ENABLED,
  ADMIN_PASSWORD,
});

const log = {
  info: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.log(`[${new Date().toISOString()}] [INFO] `, message, ...flat);
  },
  warn: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.warn(`[${new Date().toISOString()}] [WARN] `, message, ...flat);
  },
  error: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.error(`[${new Date().toISOString()}] [ERROR] `, message, ...flat);
  },
};

function commitFile(filePath: string, message?: string) {
  message = message || `Save ${filePath}`;
  const log2 = (message: string) => {
    const messageOneLine = message
      .split("\n")
      .map((line) => line.trim())
      .join(" ");
    log.info(message);
    fs.appendFileSync(
      path.join(getRepoRoot(), "sync.log"),
      `${format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxx")} - ${messageOneLine}\n`
    );
  };
  exec(`git add ${filePath} && git commit -m "${message}"`, (error, stdout) => {
    if (error) {
      log2(`Error: ${error.message}`);
    } else {
      log2(stdout);
    }
  });
}

const app = express();
const port = process.env.PORT || 3077;

app.use(express.json());
app.use(cors());
app.use(express.static(getRootDir()));

function flattenOptionalParams(optionalParams: any[]) {
  return optionalParams.map((param) => {
    if (typeof param === "object") {
      return JSON.stringify(param);
    } else if (typeof param === "string" && param.includes("\n")) {
      return param.replace(/\n/g, "\\n");
    }
    return param;
  });
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (AUTH_DISABLED) {
    next();
    return;
  }
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.split(" ")[1];
  try {
    verifyJwt(token);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.use((req, res, next) => {
  log.info(`${req.method} ${req.url}`);
  if (SYNC_ENABLED) {
    const gitStatus = execSync("git status --porcelain", { encoding: "utf-8" });
    try {
      if (gitStatus.trim() !== "") {
        log.warn("Git repository is dirty. Stashing changes before pull.");
        execSync(
          `git stash --include-untracked save "Stashing changes during api request ${new Date().toISOString()}"`,
          { encoding: "utf-8" }
        );
        req.stashed = true;
        log.info("Changes stashed successfully.");
      }
      const pullOutput = execSync(
        "git fetch origin && git rebase --no-rebase-merges --abort-on-conflict origin/main",
        { encoding: "utf-8" }
      );
      log.info(`Pull completed: ${pullOutput.trim()}`);
    } catch (error) {
      log.error(
        "Error during git operations:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
  next();
});

// Files API
app.get("/api/files/:path(*)", authMiddleware, (req, res, next) => {
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
          return `<li><a href="/api/files/${fullPath}">${file}${isDirectory ? "/" : ""}</a></li>`;
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

app.put("/api/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  const content = req.body?.content || "";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const exists = fs.existsSync(filePath);
  fs.writeFileSync(filePath, content);
  if (COMMIT_ON_SAVE) commitFile(filePath, exists ? "Update file" : "Create file");
  res
    .status(200)
    .json({ message: exists ? "File updated successfully" : "File created successfully" });
});

app.patch("/api/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  const { method, content } = req.body;

  if (!method || !content) {
    return res.status(400).json({ error: "Method and content are required" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  switch (method) {
    case "append":
      fs.appendFileSync(filePath, "\n" + content);
      break;
    case "prepend":
      fs.writeFileSync(filePath, content + "\n" + fs.readFileSync(filePath, "utf-8"));
      break;
    case "overwrite":
      fs.writeFileSync(filePath, content);
      break;
    default:
      return res.status(400).json({ error: "Invalid method" });
  }
  if (COMMIT_ON_SAVE) commitFile(filePath);
  res.status(200).json({ message: "File updated successfully" });
});

app.delete("/api/files/:path(*)", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    if (COMMIT_ON_SAVE) commitFile(filePath, "Delete file");
    res.status(200).json({ message: "File deleted successfully" });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

// Log API
app.post("/api/log", authMiddleware, (req, res) => {
  const result = LogEntrySchema.safeParse(req.body);
  if (!result.success) {
    console.error("Invalid log entry: ", result.error);
    return res.status(400).json({ error: "Invalid log entry", message: result.error.message });
  }
  const logEntry = result.data;
  const logPath = addLogEntry(logEntry);
  if (COMMIT_ON_SAVE) commitFile(logPath, "Add log entry");
  res.status(201).json({ message: "Log entry added successfully" });
});

// Note API
app.get("/api/note/daily", (req, res) => {
  handleNoteRequest("daily", req, res);
});

app.get("/api/note/weekly", (req, res) => {
  handleNoteRequest("weekly", req, res);
});

app.get("/api/note/monthly", (req, res) => {
  handleNoteRequest("monthly", req, res);
});

function handleNoteRequest(
  type: "daily" | "weekly" | "monthly",
  req: express.Request,
  res: express.Response
) {
  const { date, offset } = req.query;
  try {
    const notePath = getOrCreateJournalNote({
      type,
      date: date ? new Date(date as string) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    const content = fs.readFileSync(notePath, "utf-8");
    res.json({ content });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create journal note" });
  }
}

app.post("/api/note/post/:dir(*)", (req, res) => {
  const { dir } = req.params;
  const content = req.body?.content || "";
  const dirPath = path.join(getRootDir(), dir);
  const filePath = createPost(dirPath, content);
  if (COMMIT_ON_SAVE) commitFile(filePath, "Create new post");
  res.status(201).json({ message: "Post created successfully", path: filePath });
});

// Todos API
app.get("/api/todos", authMiddleware, (req, res, next) => {
  const todos = listAllTodos();
  res.json({ todos });
});

app.post("/api/todos/today", authMiddleware, (req, res) => {
  const todayPath = dateToJournalPath(new Date());
  return postTodoHandler(req, res, todayPath);
});

app.post("/api/todos/someday", authMiddleware, (req, res) => {
  const somedayPath = path.join(getRootDir(), "gtd", "someday-maybe.md");
  return postTodoHandler(req, res, somedayPath);
});

app.post("/api/todos/:path(*)?", authMiddleware, (req, res) => {
  const { path: relativePath } = req.params;
  return postTodoHandler(req, res, path.join(getRootDir(), relativePath));
});

function postTodoHandler(req: Request, res: Response, filepath?: string) {
  let todo;
  try {
    todo = deserializeTodo(req.body);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "Invalid todo" });
  }
  filepath = filepath || path.join(getRootDir(), "gtd", "todo.md");
  console.log("filepath", filepath);
  addTodo(todo, filepath);
  if (COMMIT_ON_SAVE) commitFile(filepath, "Add todo");
  res.status(201).json({ message: "Todo added successfully", path: filepath });
}

// Auth API (placeholder)
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: generateJwt() });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

app.get("/api", (req, res) => {
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
        <li><code>GET /api/files/:path</code> - Get file content</li>
        <li><code>GET /api/files/:dir</code> - List files in directory</li>
        <li><code>PUT /api/files/:path</code> - Update file content</li>
        <li><code>PATCH /api/files/:path</code> - Modify file content (append/prepend/overwrite)</li>
        <li><code>DELETE /api/files/:path</code> - Delete file</li>
      </ul>
      
      <h2>Notes</h2>
      <ul>
        <li><code>GET /api/note/daily</code> - Get or create daily note</li>
        <li><code>GET /api/note/weekly</code> - Get or create weekly note</li>
        <li><code>GET /api/note/monthly</code> - Get or create monthly note</li>
        <li><code>POST /api/note/post/:dir</code> - Add a post to specified directory</li>
      </ul>
      
      <h2>Todos</h2>
      <ul>
        <li><code>GET /api/todos</code> - List all todos</li>
        <li><code>POST /api/todos/:path</code> - Add todo to specific file</li>
        <li><code>POST /api/todos/today</code> - Add todo to today's note</li>
        <li><code>POST /api/todos/someday</code> - Add todo to someday-maybe.md</li>
        <li><code>POST /api/todos</code> - Add todo to todo.md</li>
      </ul>
      
      <h2>Auth</h2>
      <ul>
        <li><code>POST /api/auth/login</code> - Login (placeholder)</li>
      </ul>
    </body>
    </html>
  `;

  res.send(htmlContent);
});

app.get("/api/git/rebase", authMiddleware, (req, res) => {
  try {
    const stashOutput = execSync("git stash", { encoding: "utf-8" });
    log.info("Stash output: ", stashOutput);

    const pullOutput = execSync("git pull --rebase", { encoding: "utf-8" });
    log.info(`Pull output: ${pullOutput}`);

    if (stashOutput.includes("No local changes to save")) {
      const popOutput = execSync("git stash pop", { encoding: "utf-8" });
      log.info(`Pop output: ${popOutput}`);
    }

    res.status(200).json({ message: "Rebase completed successfully" });
  } catch (error) {
    const message =
      "Failed to execute git commands: " +
      (error instanceof Error ? error.message : "Unknown error");
    log.error(message);
    res.status(500).json({ error: message });
  }
});

// Clean up
app.use((req, res, next) => {
  console.log("next end");
  if (SYNC_ENABLED && req.stashed) {
    try {
      const popOutput = execSync("git stash pop", { encoding: "utf-8" });
      log.info(`Unstash completed: ${popOutput.trim()}`);
    } catch (error) {
      log.error(
        "Error during git unstash:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
