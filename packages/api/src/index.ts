import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs/promises";

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the data directory
app.use(express.static(path.join(__dirname, "../../data")));

// Configure multer for file uploads
const upload = multer({ dest: path.join(__dirname, "../../data/uploads") });

// API endpoint to add new files
app.post("/api/files", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.path) {
      return res.status(400).json({ error: "File and path are required" });
    }

    const { path: tempPath, originalname } = req.file;
    const targetPath = path.join(__dirname, "../../data", req.body.path, originalname);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.rename(tempPath, targetPath);

    res.json({ message: "File uploaded successfully", path: req.body.path + "/" + originalname });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
