import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./env";
import { processPull, processPush, pullSchema, pushSchema } from "./replicache";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the client build directory
app.use(express.static(path.join(__dirname, "../../client/dist")));

// Replicache pull
app.post(env.REPLICACHE_PULL_PATH, async (req, res) => {
  try {
    console.log("Processing pull");
    const pullResponse = await processPull(pullSchema.parse(req.body));
    console.log("Pull response:", pullResponse);
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
    console.log("Processing push");
    await processPush(pushSchema.parse(req.body));
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
