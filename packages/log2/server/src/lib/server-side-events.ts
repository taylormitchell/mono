import { type Response, type Request } from "express";
import type { SSEMessage } from "../../../shared/types";

const clients = new Set<Response>();

export function sendToClient(message: SSEMessage) {
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify(message)}\n\n`);
  });
}

export function requestHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  clients.add(res);
  req.on("close", () => {
    clients.delete(res);
    console.log(`Client disconnected, ${clients.size} clients remaining`);
  });
  console.log(`Client connected, ${clients.size} clients connected`);
}
