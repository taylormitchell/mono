import express from "express";
import { InMemoryServer } from "../../shared/InMemoryServer";
import cors from "cors";
import { WebSocket, WebSocketServer } from "ws";

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize server with model types
const server = new InMemoryServer();

// Initialize WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Keep track of connected clients
const clients = new Set<WebSocket>();

// WebSocket connection handler
wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("close", () => {
    clients.delete(ws);
  });
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get("/dump", async (req, res) => {
  const dump = server.dump();
  res.status(200).send(JSON.stringify(dump, null, 2));
});

// Push endpoint
app.post("/push", async (req, res) => {
  try {
    const { mutations, clientId } = req.body;
    console.log("push", clientId, mutations);
    await server.handlePush(clientId, mutations);

    // Notify all connected WebSocket clients
    const message = JSON.stringify({ type: "update", clientId });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Pull endpoint
app.post("/pull", async (req, res) => {
  try {
    const { clientId } = req.body;
    console.log("pull", clientId);
    const result = await server.handlePull(clientId);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.use("/health", (req, res) => {
  res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3000;
const httpServer = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Upgrade HTTP server to handle WebSocket connections
httpServer.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
