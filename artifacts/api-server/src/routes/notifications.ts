import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, usersTable } from "@workspace/db";
import { addClient, removeClient } from "../lib/sse";

const router: IRouter = Router();

router.get("/notifications/stream", async (req, res): Promise<void> => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const clientId = randomUUID();

  let userId: number | null = null;
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      const [user] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.clerkId, auth.userId));
      if (user) userId = user.id;
    }
  } catch {
    // SSE still allowed without auth; userId stays null
  }

  addClient(clientId, userId, res);

  res.write(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

  const keepAlive = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 25_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeClient(clientId);
  });
});

export default router;
