import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const seatsTable = pgTable("seats", {
  id: serial("id").primaryKey(),
  seatNumber: text("seat_number").notNull().unique(),
  tableNumber: text("table_number").notNull(),
  zone: text("zone").notNull().default("A"),
  row: integer("row").notNull(),
  col: integer("col").notNull(),
  status: text("status").notNull().default("available"),
  reservationId: integer("reservation_id"),
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSeatSchema = createInsertSchema(seatsTable).omit({ id: true, createdAt: true });
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Seat = typeof seatsTable.$inferSelect;
