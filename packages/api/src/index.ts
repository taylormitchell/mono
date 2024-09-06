import express from "express";
import { getRootDir } from "@taylor/common/data";
import fs from "fs";
import path from "path";

const app = express();
const port = process.env.PORT || 3077;

app.use(express.json());
app.use(express.static(getRootDir()));

// New POST route
app.post("/:filePath", (req, res) => {
  const filePath = path.join(getRootDir(), req.params.filePath);
  const content = req.body.content;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  fs.mkdir(path.dirname(filePath), { recursive: true }, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to create directory" });
    }

    fs.writeFile(filePath, content, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to write file" });
      }
      res.status(201).json({ message: "File created/updated successfully" });
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
