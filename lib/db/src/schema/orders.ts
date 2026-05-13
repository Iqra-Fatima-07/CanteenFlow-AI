import { pgTable, text, serial, timestamp, doublePrecision, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  userName: text("user_name").notNull(),
  items: jsonb("items").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("confirmed"),
  type: text("type").notNull().default("dine_in"),
  groupSize: integer("group_size"),
  tableNumber: text("table_number"),
  paymentMethod: text("payment_method").notNull().default("cod"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
