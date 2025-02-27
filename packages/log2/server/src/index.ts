import "./lib/load-env";
import path from "path";
import express, { type Request, type Response, type NextFunction } from "express";
import { resetDb } from "./lib/db/helpers";
import { handlePush, handlePull, addDataToLog } from "./lib/replicache";
import cors from "cors";
import { requestHandler as sseHandler } from "./lib/server-side-events";

const app = express();
const port = process.env["PORT"] || 3078;
app.use(express.json());
app.use(cors());

// Serve static files from the Vite build output directory
// Assuming your client build output is in "../../client/dist"
const clientBuildPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientBuildPath));

app.get("/api/", (_: Request, res: Response) => {
  res.status(200).json({ message: "Hello World" });
});

app.post("/api/log/:id/extract-data", async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await addDataToLog(id);
  if (!result.success) {
    res.json({ success: false, error: result.error });
  } else {
    res.json({ success: true });
  }
});

app.get("/api/events", sseHandler);
app.post("/api/push", handlePush);
app.post("/api/pull", handlePull);

app.use("/api/reset", async (_: Request, res: Response) => {
  resetDb();
  res.status(200).json({ message: "Database reset" });
});

// Catch-all route to serve the frontend for any non-API routes
app.get("*", (_: Request, res: Response) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// Error handling
app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
  res.status(500).json({
    error: "Internal server error",
    message: err.message + (err.stack ? "\n" + err.stack : ""),
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
