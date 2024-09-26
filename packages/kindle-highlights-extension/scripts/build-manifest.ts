import { writeFileSync } from "fs";
import { resolve } from "path";
import { GET_AUTH_API_URL } from "../src/env";

const manifest = {
  manifest_version: 3,
  name: "Kindle Highlights Extractor",
  version: "1.1",
  description: "Regularly pulls Kindle highlights from read.amazon.com.",
  action: {
    default_popup: "popup.html",
  },
  permissions: [
    "alarms",
    "storage",
    "cookies",
    "offscreen",
    "storage",
    "https://read.amazon.com/*",
    GET_AUTH_API_URL,
  ],
  host_permissions: ["https://read.amazon.com/*", GET_AUTH_API_URL],
  background: {
    service_worker: "background.js",
  },
};

writeFileSync(resolve(__dirname, "../dist/manifest.json"), JSON.stringify(manifest, null, 2));

console.log("manifest.json generated successfully.");
