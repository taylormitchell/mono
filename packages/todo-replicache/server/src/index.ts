import express, { Request, Response } from "express";
import { getDb, resetDb } from "./lib/db";
import { handlePush, handlePull } from "./lib/replicache";
import { todoTable } from "./lib/db/schema";

const app = express();
const port = process.env.PORT || 3077;

app.post("/push", handlePush);
app.post("/pull", handlePull);

app.get("/dump", async (req: Request, res: Response) => {
  const db = await getDb();
  const todos = db.select().from(todoTable).all();
  res.status(200).json(todos);
});

app.use("/reset", async (req: Request, res: Response) => {
  resetDb();
  res.status(200).json({ message: "Database reset" });
});

// Error handling
app.use((err: Error, req: Request, res: Response) => {
  res.status(500).json({
    error: "Internal server error",
    message: err.message + (err.stack ? "\n" + err.stack : ""),
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
