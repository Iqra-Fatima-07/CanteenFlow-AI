import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, ordersTable, usersTable } from "@workspace/db";
import { broadcastToUser } from "../lib/sse";

const router: IRouter = Router();

// In-memory OTP store: orderId -> { otp, expiresAt, userId }
const otpStore = new Map<number, { otp: string; expiresAt: Date; userId: number }>();

// In-memory ID card store: userId -> imageUrl/base64
const idCardStore = new Map<number, string>();

// POST /orders/:id/otp/send — staff generates & sends OTP to student
router.post("/orders/:id/otp/send", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const [staff] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!staff || staff.role !== "canteen") { res.status(403).json({ error: "Forbidden" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const otp = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL
  otpStore.set(orderId, { otp, expiresAt, userId: order.userId });

  // Push OTP to the student in real-time via SSE
  broadcastToUser(order.userId, "otp_sent", {
    orderId,
    otp,
    expiresAt: expiresAt.toISOString(),
  });

  res.json({ success: true, orderId, expiresAt: expiresAt.toISOString() });
});

// POST /orders/:id/otp/verify — staff verifies OTP entered at collection
router.post("/orders/:id/otp/verify", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const { otp } = req.body as { otp?: string };
  if (!otp) { res.status(400).json({ error: "OTP required", valid: false }); return; }

  const stored = otpStore.get(orderId);
  if (!stored) { res.status(400).json({ error: "No OTP found for this order", valid: false }); return; }

  if (new Date() > stored.expiresAt) {
    otpStore.delete(orderId);
    res.status(400).json({ error: "OTP expired", valid: false });
    return;
  }

  if (stored.otp !== String(otp).trim()) {
    res.status(400).json({ error: "Incorrect OTP", valid: false });
    return;
  }

  otpStore.delete(orderId);
  res.json({ valid: true });
});

// GET /orders/:id/otp/status — staff checks if a live OTP exists for the order
router.get("/orders/:id/otp/status", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const stored = otpStore.get(orderId);
  if (!stored || new Date() > stored.expiresAt) {
    res.json({ active: false });
    return;
  }
  res.json({ active: true, expiresAt: stored.expiresAt.toISOString() });
});

// PUT /users/me/id-card — student syncs their ID card URL to server
router.put("/users/me/id-card", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { imageUrl } = req.body as { imageUrl?: string };
  if (!imageUrl) { res.status(400).json({ error: "imageUrl required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  idCardStore.set(user.id, imageUrl);
  res.json({ success: true });
});

// GET /orders/:id/id-card — staff views the student's uploaded ID card
router.get("/orders/:id/id-card", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) { res.status(400).json({ error: "Invalid order id" }); return; }

  const [staff] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!staff || staff.role !== "canteen") { res.status(403).json({ error: "Forbidden" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const imageUrl = idCardStore.get(order.userId) ?? null;
  res.json({ imageUrl, userName: order.userName });
});

export default router;
