const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;
// Serve the ICS file with proper headers
app.get("/calendar.ics", (req, res) => {
  const filePath = path.join(__dirname, "sample.ics");

  // Add ngrok header bypass
  res.set("ngrok-skip-browser-warning", "1");

  // Set headers for calendar file
  res.set({
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": "attachment; filename=calendar.ics",
    // Disable caching to ensure fresh content
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  // Stream the file
  fs.createReadStream(filePath).pipe(res);
});

// Optional: Add a simple homepage
app.get("/", (req, res) => {
  res.send("Calendar Server is running. Access the calendar at /calendar.ics");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
