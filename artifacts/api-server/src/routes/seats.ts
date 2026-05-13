import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, inArray } from "drizzle-orm";
import { db, seatsTable, reservationsTable, usersTable } from "@workspace/db";
import {
  ListSeatsResponse,
  ReserveSeatsBody,
  GetSeatOccupancyResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function cleanExpiredReservations() {
  const now = new Date();
  const expired = await db.select().from(reservationsTable).where(eq(reservationsTable.expiresAt, now));
  const expiredAll = await db.select().from(reservationsTable);
  const expiredRes = expiredAll.filter((r) => new Date(r.expiresAt) < now);
  for (const res of expiredRes) {
    const seatIds = res.seatIds as number[];
    await db.update(seatsTable).set({ status: "available", reservationId: null, reservedUntil: null }).where(inArray(seatsTable.id, seatIds));
    await db.delete(reservationsTable).where(eq(reservationsTable.id, res.id));
  }
}

router.get("/seats", async (_req, res): Promise<void> => {
  await cleanExpiredReservations();
  const seats = await db.select().from(seatsTable).orderBy(seatsTable.id);
  res.json(ListSeatsResponse.parse(seats));
});

router.post("/seats/reserve", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = ReserveSeatsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = (req.headers["x-clerk-user-name"] as string) || "Student";
  const email = (req.headers["x-clerk-user-email"] as string) || "";
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await cleanExpiredReservations();

  const availableSeats = await db.select().from(seatsTable).where(eq(seatsTable.status, "available")).orderBy(seatsTable.tableNumber, seatsTable.seatNumber);

  if (availableSeats.length < parsed.data.groupSize) {
    res.status(400).json({ error: "Not enough seats available" });
    return;
  }

  const tableGroups = new Map<string, typeof availableSeats>();
  for (const seat of availableSeats) {
    if (!tableGroups.has(seat.tableNumber)) tableGroups.set(seat.tableNumber, []);
    tableGroups.get(seat.tableNumber)!.push(seat);
  }

  let selectedSeats: typeof availableSeats = [];
  for (const [, seats] of tableGroups) {
    if (seats.length >= parsed.data.groupSize) {
      selectedSeats = seats.slice(0, parsed.data.groupSize);
      break;
    }
  }

  if (selectedSeats.length === 0) {
    selectedSeats = availableSeats.slice(0, parsed.data.groupSize);
  }

  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);
  const seatIds = selectedSeats.map((s) => s.id);
  const seatNumbers = selectedSeats.map((s) => s.seatNumber);
  const tableNumber = selectedSeats[0].tableNumber;

  const [reservation] = await db.insert(reservationsTable).values({
    userId: user.id,
    seatIds,
    tableNumber,
    seatNumbers,
    groupSize: parsed.data.groupSize,
    expiresAt,
  }).returning();

  await db.update(seatsTable).set({ status: "reserved", reservationId: reservation.id, reservedUntil: expiresAt }).where(inArray(seatsTable.id, seatIds));

  res.status(201).json({
    id: reservation.id,
    userId: reservation.userId,
    seatIds,
    tableNumber,
    seatNumbers,
    groupSize: reservation.groupSize,
    expiresAt: reservation.expiresAt,
    createdAt: reservation.createdAt,
  });
});

router.get("/seats/my-reservation", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.json(null);
    return;
  }
  await cleanExpiredReservations();
  const [res2] = await db.select().from(reservationsTable).where(eq(reservationsTable.userId, user.id));
  if (!res2) {
    res.json(null);
    return;
  }
  res.json({
    id: res2.id,
    userId: res2.userId,
    seatIds: res2.seatIds as number[],
    tableNumber: res2.tableNumber,
    seatNumbers: res2.seatNumbers as string[],
    groupSize: res2.groupSize,
    expiresAt: res2.expiresAt,
    createdAt: res2.createdAt,
  });
});

router.delete("/seats/my-reservation", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, auth.userId));
  if (!user) {
    res.sendStatus(204);
    return;
  }
  const [reservation] = await db.select().from(reservationsTable).where(eq(reservationsTable.userId, user.id));
  if (reservation) {
    const seatIds = reservation.seatIds as number[];
    await db.update(seatsTable).set({ status: "available", reservationId: null, reservedUntil: null }).where(inArray(seatsTable.id, seatIds));
    await db.delete(reservationsTable).where(eq(reservationsTable.id, reservation.id));
  }
  res.sendStatus(204);
});

router.get("/seats/occupancy", async (_req, res): Promise<void> => {
  await cleanExpiredReservations();
  const seats = await db.select().from(seatsTable);
  const total = seats.length;
  const available = seats.filter((s) => s.status === "available").length;
  const occupied = seats.filter((s) => s.status === "occupied").length;
  const reserved = seats.filter((s) => s.status === "reserved").length;

  const zones = [...new Set(seats.map((s) => s.zone))].map((zone) => {
    const zoneSeats = seats.filter((s) => s.zone === zone);
    return {
      zone,
      available: zoneSeats.filter((s) => s.status === "available").length,
      occupied: zoneSeats.filter((s) => s.status === "occupied").length,
      reserved: zoneSeats.filter((s) => s.status === "reserved").length,
    };
  });

  res.json(GetSeatOccupancyResponse.parse({
    totalSeats: total,
    available,
    occupied,
    reserved,
    occupancyPercent: total > 0 ? ((occupied + reserved) / total) * 100 : 0,
    zones,
  }));
});

export default router;
