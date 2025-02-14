import express, { type Request, type Response, type NextFunction } from "express";
import { resetDb } from "./lib/db/helpers";
import { handlePush, handlePull } from "./lib/replicache";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { datatify } from "./lib/ai";
import { z } from "zod";

dotenv.config();

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

const aiRequestSchema = z.object({ message: z.string(), timestamp: z.string() });
app.post("/api/ai", async (req: Request, res: Response) => {
  try {
    console.log("Received AI request", req.body);
    const parsed = aiRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Invalid request", { body: req.body, error: parsed.error });
      return res.status(400).json({ error: "Invalid request" });
    }
    const log = await datatify(parsed.data);
    if (!log) {
      return res.status(500).json({ success: false, error: "Failed to generate log" });
    }
    res.status(200).json({ success: true, data: log });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

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
