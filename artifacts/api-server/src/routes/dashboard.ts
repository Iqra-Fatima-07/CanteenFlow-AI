import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { desc } from "drizzle-orm";
import { db, ordersTable, seatsTable } from "@workspace/db";
import { GetCanteenDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/canteen", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allOrders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  const todayOrders = allOrders.filter((o) => new Date(o.createdAt) >= today);

  const activeStatuses = ["confirmed", "cooking", "packaging", "ready"];
  const activeOrders = allOrders.filter((o) => activeStatuses.includes(o.status));
  const revenueToday = todayOrders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.totalAmount, 0);

  const seats = await db.select().from(seatsTable);
  const occupiedSeats = seats.filter((s) => s.status !== "available").length;

  const itemCounts = new Map<string, number>();
  for (const order of todayOrders) {
    const items = order.items as Array<{ menuItemName: string; quantity: number }>;
    for (const item of items) {
      itemCounts.set(item.menuItemName, (itemCounts.get(item.menuItemName) || 0) + item.quantity);
    }
  }
  const topItems = [...itemCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const recentOrders = allOrders.slice(0, 10);

  res.json(GetCanteenDashboardResponse.parse({
    ordersToday: todayOrders.length,
    revenueToday,
    activeOrders: activeOrders.length,
    occupiedSeats,
    totalSeats: seats.length,
    avgPrepTime: 12,
    topItems,
    recentOrders,
  }));
});

export default router;
