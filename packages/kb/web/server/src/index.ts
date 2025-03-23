import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./env";
import { processPull, processPush, pullSchema, pushSchema } from "./replicache";
import { initCommitCache } from "./commit-cache";

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize the commit cache
console.log("Initializing commit cache...");
initCommitCache().catch((error) => {
  console.error("Failed to initialize commit cache:", error);
});

app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve static files from the client build directory
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Replicache pull
app.post(env.REPLICACHE_PULL_PATH, async (req, res) => {
  try {
    const pullBody = pullSchema.safeParse(req.body);
    if (!pullBody.success) {
      console.error("Invalid pull body:", req.body);
      console.error("Error:", pullBody.error);
      return res.status(400).json({ success: false, error: pullBody.error.message });
    }
    // console.log("Pull body:", pullBody.data);
    const pullResponse = await processPull(pullBody.data);
    // console.log("Pull response:", pullResponse);
    res.status(200).json(pullResponse);
  } catch (error) {
    console.error("Error processing pull:", error);
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Replicache push
app.post(env.REPLICACHE_PUSH_PATH, async (req, res) => {
  try {
    const pushBody = pushSchema.safeParse(req.body);
    if (!pushBody.success) {
      console.error("Invalid push body:", req.body);
      console.error("Error:", pushBody.error);
      return res.status(400).json({ success: false, error: pushBody.error.message });
    }
    console.log("Push body:", pushBody.data);
    await processPush(pushBody.data);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing push:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Fallback route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
