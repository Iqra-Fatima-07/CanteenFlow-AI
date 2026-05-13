import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import {
  ListMenuItemsResponse,
  CreateMenuItemBody,
  GetMenuItemParams,
  GetMenuItemResponse,
  UpdateMenuItemParams,
  UpdateMenuItemBody,
  UpdateMenuItemResponse,
  DeleteMenuItemParams,
  ListMenuCategoriesResponse,
  ListMenuItemsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/menu/categories", async (_req, res): Promise<void> => {
  const items = await db.select({ category: menuItemsTable.category }).from(menuItemsTable);
  const categories = [...new Set(items.map((i) => i.category))];
  res.json(ListMenuCategoriesResponse.parse(categories));
});

router.get("/menu", async (req, res): Promise<void> => {
  const qp = ListMenuItemsQueryParams.safeParse(req.query);
  let items = await db.select().from(menuItemsTable);
  if (qp.success && qp.data.category) {
    items = items.filter((i) => i.category === qp.data.category);
  }
  if (qp.success && qp.data.available === "true") {
    items = items.filter((i) => i.isAvailable);
  }
  res.json(ListMenuItemsResponse.parse(items));
});

router.post("/menu", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(menuItemsTable).values(parsed.data).returning();
  res.status(201).json(GetMenuItemResponse.parse(item));
});

router.get("/menu/:id", async (req, res): Promise<void> => {
  const params = GetMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [item] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  res.json(GetMenuItemResponse.parse(item));
});

router.patch("/menu/:id", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = UpdateMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.update(menuItemsTable).set(parsed.data).where(eq(menuItemsTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  res.json(UpdateMenuItemResponse.parse(item));
});

router.delete("/menu/:id", async (req, res): Promise<void> => {
  const params = DeleteMenuItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
