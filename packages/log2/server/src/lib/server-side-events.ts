import { type Response } from "express";
import type { SSEMessage } from "../../../shared/types";

const clients = new Set<Response>();

export function addClient(client: Response) {
  clients.add(client);
}

export function removeClient(client: Response) {
  clients.delete(client);
}

export function sendToClient(message: SSEMessage) {
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify(message)}\n\n`);
  });
}
