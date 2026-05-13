import type { Response } from "express";
import { logger } from "./logger";

interface SSEClient {
  id: string;
  userId: number | null;
  res: Response;
}

const clients = new Map<string, SSEClient>();

export function addClient(id: string, userId: number | null, res: Response): void {
  clients.set(id, { id, userId, res });
  logger.info({ clientId: id, userId, totalClients: clients.size }, "SSE client connected");
}

export function removeClient(id: string): void {
  clients.delete(id);
  logger.info({ clientId: id, totalClients: clients.size }, "SSE client disconnected");
}

export function broadcastOrderUpdate(data: {
  orderId: number;
  status: string;
  userId: number;
  userName: string;
}): void {
  const payload = `data: ${JSON.stringify({ type: "order_update", ...data })}\n\n`;
  let sent = 0;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
      sent++;
    } catch {
      clients.delete(client.id);
    }
  }
  logger.info({ ...data, clientsNotified: sent }, "SSE order update broadcast");
}

export function broadcastToUser(userId: number, event: string, data: unknown): void {
  const payload = `data: ${JSON.stringify({ type: event, ...(typeof data === "object" && data !== null ? data : { data }) })}\n\n`;
  for (const client of clients.values()) {
    if (client.userId === userId) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client.id);
      }
    }
  }
}

export function broadcastToAll(event: string, data: unknown): void {
  const payload = `data: ${JSON.stringify({ type: event, ...( typeof data === "object" && data !== null ? data : { data }) })}\n\n`;
  for (const client of clients.values()) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client.id);
    }
  }
}
