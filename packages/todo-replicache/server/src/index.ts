import express, { Request, Response, NextFunction } from "express";
import { getDb, resetDb } from "./lib/db/helpers";
import { handlePush, handlePull } from "./lib/replicache";
import { replicacheClientTable, replicacheServerTable, itemTable } from "./lib/db/schema";
import cors from "cors";
import path from "path";

const app = express();
const port = process.env.PORT || 3078;
app.use(express.json());
app.use(cors());

// Serve static files from the Vite build output directory
// Assuming your client build output is in "../../client/dist"
const clientBuildPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientBuildPath));

app.get("/api/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Hello World" });
});

app.post("/api/push", handlePush);
app.post("/api/pull", handlePull);

app.get("/api/dump", async (req: Request, res: Response) => {
  const db = await getDb();
  res.status(200).json({
    todos: db.select().from(itemTable).all(),
    replicacheServer: db.select().from(replicacheServerTable).all(),
    replicacheClient: db.select().from(replicacheClientTable).all(),
  });
});

app.use("/api/reset", async (req: Request, res: Response) => {
  resetDb();
  res.status(200).json({ message: "Database reset" });
});

// Catch-all route to serve the frontend for any non-API routes
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    error: "Internal server error",
    message: err.message + (err.stack ? "\n" + err.stack : ""),
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
