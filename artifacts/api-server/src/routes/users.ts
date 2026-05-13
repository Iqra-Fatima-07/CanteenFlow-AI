import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, ordersTable } from "@workspace/db";
import { GetMeResponse, UpdateMeBody, UpdateMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateUser(clerkId: string, name: string, email: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ clerkId, name, email, role: "student" }).returning();
  }
  return user;
}

router.get("/users/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const name = (req.headers["x-clerk-user-name"] as string) || "Unknown";
  const email = (req.headers["x-clerk-user-email"] as string) || "";
  const user = await getOrCreateUser(auth.userId, name, email);
  res.json(GetMeResponse.parse(user));
});

router.get("/users/me/profile", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const name = (req.headers["x-clerk-user-name"] as string) || "Unknown";
  const email = (req.headers["x-clerk-user-email"] as string) || "";
  const user = await getOrCreateUser(auth.userId, name, email);
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, user.id)).orderBy(desc(ordersTable.createdAt));
  res.json({ user, orders });
});

router.patch("/users/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [updated] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.clerkId, auth.userId)).returning();
  res.json(UpdateMeResponse.parse(updated));
});

export { getOrCreateUser };
export default router;
