import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db, ordersTable, menuItemsTable, usersTable } from "@workspace/db";
import { broadcastOrderUpdate } from "../lib/sse";
import {
  ListOrdersResponse,
  CreateOrderBody,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
  ListActiveOrdersResponse,
  GetOrderSummaryResponse,
  ListOrdersQueryParams,
} from "@workspace/api-zod";
import { getOrCreateUser } from "./users";

const router: IRouter = Router();

router.get("/orders/active", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const activeStatuses = ["confirmed", "cooking", "packaging", "ready"];
  const orders = await db.select().from(ordersTable).where(inArray(ordersTable.status, activeStatuses)).orderBy(desc(ordersTable.createdAt));
  res.json(ListActiveOrdersResponse.parse(orders));
});

router.get("/orders/summary", async (req, res): Promise<void> => {
  const allOrders = await db.select().from(ordersTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = allOrders.filter((o) => new Date(o.createdAt) >= today);
  const activeStatuses = ["confirmed", "cooking", "packaging", "ready"];
  const active = todayOrders.filter((o) => activeStatuses.includes(o.status));
  const revenue = todayOrders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.totalAmount, 0);
  const countByStatus = (s: string) => todayOrders.filter((o) => o.status === s).length;
  const res2 = {
    totalToday: todayOrders.length,
    activeNow: active.length,
    avgPrepTime: 12,
    revenue,
    byStatus: {
      confirmed: countByStatus("confirmed"),
      cooking: countByStatus("cooking"),
      packaging: countByStatus("packaging"),
      ready: countByStatus("ready"),
      collected: countByStatus("collected"),
    },
  };
  res.json(GetOrderSummaryResponse.parse(res2));
});

router.get("/orders", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const qp = ListOrdersQueryParams.safeParse(req.query);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.json([]);
    return;
  }
  let orders;
  if (user.role === "canteen") {
    orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  } else {
    orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, user.id)).orderBy(desc(ordersTable.createdAt));
  }
  if (qp.success && qp.data.status) {
    orders = orders.filter((o) => o.status === qp.data.status);
  }
  if (qp.success && qp.data.type) {
    orders = orders.filter((o) => o.type === qp.data.type);
  }
  res.json(ListOrdersResponse.parse(orders));
});

router.post("/orders", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = (req.headers["x-clerk-user-name"] as string) || "Student";
  const email = (req.headers["x-clerk-user-email"] as string) || "";
  const user = await getOrCreateUser(auth.userId, name, email);

  const menuItemIds = parsed.data.items.map((i) => i.menuItemId);
  const menuItems = await db.select().from(menuItemsTable).where(inArray(menuItemsTable.id, menuItemIds));

  let total = 0;
  const orderItems = parsed.data.items.map((item) => {
    const menuItem = menuItems.find((m) => m.id === item.menuItemId);
    if (!menuItem) throw new Error(`Menu item ${item.menuItemId} not found`);
    const subtotal = menuItem.price * item.quantity;
    total += subtotal;
    return {
      menuItemId: item.menuItemId,
      menuItemName: menuItem.name,
      quantity: item.quantity,
      price: menuItem.price,
    };
  });

  const maxPrepTime = Math.max(...menuItems.map((m) => m.prepTimeMinutes));
  const estimatedReadyAt = new Date(Date.now() + maxPrepTime * 60 * 1000);

  const [order] = await db.insert(ordersTable).values({
    userId: user.id,
    userName: user.name,
    items: orderItems,
    totalAmount: total,
    status: "confirmed",
    type: parsed.data.type,
    groupSize: parsed.data.groupSize ?? null,
    paymentMethod: parsed.data.paymentMethod,
    paymentStatus: parsed.data.paymentMethod === "cod" ? "pending" : "pending",
    estimatedReadyAt,
  }).returning();

  res.status(201).json(GetOrderResponse.parse(order));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderResponse.parse(order));
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "collected") {
    updates.paymentStatus = "paid";
  }
  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, params.data.id)).returning();
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  broadcastOrderUpdate({
    orderId: order.id,
    status: order.status,
    userId: order.userId,
    userName: order.userName,
  });
  res.json(UpdateOrderStatusResponse.parse(order));
});

export default router;
