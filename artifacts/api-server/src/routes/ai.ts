import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, menuItemsTable, ordersTable, seatsTable } from "@workspace/db";
import {
  GetAiRecommendationsResponse,
  GetCrowdPredictionResponse,
  GetBestOrderTimeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ai/recommendations", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const items = await db.select().from(menuItemsTable).where(
    (menuItemsTable as any).isAvailable
  );
  const available = await db.select().from(menuItemsTable);
  const quickItems = available.filter((i) => i.isAvailable && i.prepTimeMinutes <= 10)
    .sort((a, b) => a.prepTimeMinutes - b.prepTimeMinutes)
    .slice(0, 4);

  const recommendations = quickItems.map((item) => ({
    menuItemId: item.id,
    name: item.name,
    reason: item.prepTimeMinutes <= 5
      ? "Ready in under 5 minutes — perfect for short breaks"
      : item.isVeg
      ? "Popular vegetarian choice, quick to prepare"
      : "Staff favourite with fast kitchen turnaround",
    prepTimeMinutes: item.prepTimeMinutes,
    price: item.price,
  }));

  const seats = await db.select().from(seatsTable);
  const occupancyPercent = seats.length > 0
    ? ((seats.filter((s) => s.status !== "available").length) / seats.length) * 100
    : 0;

  const message = occupancyPercent > 70
    ? "Canteen is busy now. We recommend quick items to save time."
    : "Good time to visit — seating is available and queues are short.";

  res.json(GetAiRecommendationsResponse.parse({ items: recommendations, message }));
});

router.get("/ai/crowd-prediction", async (_req, res): Promise<void> => {
  const now = new Date();
  const hour = now.getHours();

  const busyHours = [12, 13, 17, 18];
  const moderateHours = [11, 14, 16, 19];

  const getLevelForHour = (h: number) => {
    if (busyHours.includes(h)) return "high";
    if (moderateHours.includes(h)) return "medium";
    if (h < 8 || h > 21) return "low";
    return "low";
  };

  const currentLevel = getLevelForHour(hour) as "low" | "medium" | "high" | "very_high";

  const predictions = [];
  for (let i = 0; i <= 4; i++) {
    const futureHour = (hour + i) % 24;
    const level = getLevelForHour(futureHour) as "low" | "medium" | "high" | "very_high";
    const occupancyMap = { low: 20, medium: 55, high: 80, very_high: 95 };
    predictions.push({
      hour: futureHour,
      minute: 0,
      level,
      occupancyPercent: occupancyMap[level],
    });
  }

  const recommendation = currentLevel === "high" || currentLevel === "very_high"
    ? "Peak hours detected. Order now or wait 30 minutes for reduced crowd."
    : currentLevel === "medium"
    ? "Moderate traffic. Good time to visit with some wait expected."
    : "Low crowd — ideal time to visit the canteen.";

  res.json(GetCrowdPredictionResponse.parse({ currentLevel, predictions, recommendation }));
});

router.get("/ai/best-time", async (_req, res): Promise<void> => {
  const hour = new Date().getHours();
  const busyHours = [12, 13, 17, 18];
  const isBusy = busyHours.includes(hour);

  const currentWaitMinutes = isBusy ? 18 : 5;
  const bestTimeMinutes = isBusy ? 35 : 0;

  const suggestion = isBusy
    ? `Current wait is ~${currentWaitMinutes} min. Best to order in ${bestTimeMinutes} minutes when crowd reduces.`
    : `Great time to order now — average wait is just ${currentWaitMinutes} minutes.`;

  res.json(GetBestOrderTimeResponse.parse({
    currentWaitMinutes,
    bestTimeMinutes,
    suggestion,
    breakTimeOptimized: !isBusy,
  }));
});

export default router;
