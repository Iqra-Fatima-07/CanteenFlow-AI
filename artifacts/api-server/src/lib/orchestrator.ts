import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { broadcastToAll } from "./sse";
import { logger } from "./logger";

type Task = { id: string; type: string; payload: any; attempts?: number };

const queue: Task[] = [];
let running = false;

function snapshotAgents() {
  // build a lightweight snapshot from in-memory metrics
  return [
    { key: "crowd", title: "Crowd Prediction Agent", status: "ACTIVE", subtitle: "Analytics running", color: "emerald", stat: "--" },
    { key: "seat", title: "Seat Allocation Agent", status: "IDLE", subtitle: "Waiting", color: "blue", stat: "--" },
    { key: "kitchen", title: "Kitchen Optimization Agent", status: "IDLE", subtitle: "Waiting", color: "amber", stat: "--" },
    { key: "pickup", title: "Pickup Coordination Agent", status: "IDLE", subtitle: "Waiting", color: "violet", stat: "--" },
  ];
}

async function processOrderTask(task: Task) {
  const { orderId } = task.payload;
  try {
    broadcastToAll("agent_log", { agent: "kitchen", message: `Received order ${orderId} for processing` });

    // Update order status to cooking
    await db.update(ordersTable).set({ status: "cooking" }).where(eq(ordersTable.id, orderId));
    broadcastToAll("agent_log", { agent: "kitchen", message: `Order ${orderId} status set to cooking` });
    broadcastToAll("agents_snapshot", { agents: snapshotAgents() });

    // Simulate real work by doing a small DB read and a CPU-bound computation
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    const order = orders[0];
    // CPU-bound-ish: compute a hash-like number from item names
    const work = order.items.map((it: any) => it.menuItemName).join("|");
    let acc = 0;
    for (let i = 0; i < work.length; i++) acc = (acc * 31 + work.charCodeAt(i)) % 100000;

    broadcastToAll("agent_log", { agent: "kitchen", message: `Kitchen computed batch id ${acc} for order ${orderId}` });

    // Mark packaging then ready with small delays to stream progress
    await new Promise((r) => setTimeout(r, 800));
    await db.update(ordersTable).set({ status: "packaging" }).where(eq(ordersTable.id, orderId));
    broadcastToAll("agent_log", { agent: "kitchen", message: `Order ${orderId} packaging` });
    broadcastToAll("agents_snapshot", { agents: snapshotAgents() });

    await new Promise((r) => setTimeout(r, 700));
    await db.update(ordersTable).set({ status: "ready" }).where(eq(ordersTable.id, orderId));
    broadcastToAll("agent_log", { agent: "kitchen", message: `Order ${orderId} ready for pickup` });
    broadcastToAll("agents_snapshot", { agents: snapshotAgents() });

    // Notify frontends about order status
    broadcastToAll("order_update", { orderId, status: "ready" });
  } catch (err) {
    logger.error({ err, task }, "processOrderTask failed");
    // retry logic
    if ((task.attempts || 0) < 3) {
      task.attempts = (task.attempts || 0) + 1;
      queue.push(task);
      broadcastToAll("agent_log", { agent: "kitchen", message: `Retrying order ${orderId}, attempt ${task.attempts}` });
    } else {
      broadcastToAll("agent_log", { agent: "kitchen", message: `Order ${orderId} failed after retries` });
    }
  }
}

async function workerLoop() {
  if (running) return;
  running = true;
  while (running) {
    const task = queue.shift();
    if (!task) {
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    try {
      broadcastToAll("agent_log", { agent: "kitchen", message: `Starting task ${task.type} id=${task.id}` });
      if (task.type === "process_order") await processOrderTask(task);
      else broadcastToAll("agent_log", { agent: "crowd", message: `Unknown task ${task.type}` });
    } catch (err) {
      logger.error({ err, task }, "workerLoop task error");
    }
  }
}

export function enqueueTask(type: string, payload: any) {
  const t: Task = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, payload, attempts: 0 };
  queue.push(t);
  broadcastToAll("agent_log", { agent: "crowd", message: `Enqueued task ${type} id=${t.id}` });
  return t.id;
}

export function startOrchestrator() {
  workerLoop().catch((err) => logger.error({ err }, "orchestrator failed to start"));
  broadcastToAll("agents_snapshot", { agents: snapshotAgents() });
}
