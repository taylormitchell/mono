import express from "express";
import { getRootDir } from "@taylor/common/data";

const app = express();
const port = process.env.PORT || 3077;

// Serve static files from the data directory
app.use(express.static(getRootDir()));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
