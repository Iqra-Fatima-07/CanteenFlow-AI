import { pool } from "@workspace/db";
import { logger } from "./logger";

const legacyOrdersMigrationSql = [
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_name text NOT NULL DEFAULT 'Guest';`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount double precision NOT NULL DEFAULT 0;`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'dine_in';`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_size integer;`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number text;`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod';`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz;`,
];

export async function ensureLegacyOrdersSchema(): Promise<void> {
  try {
    await pool.query("BEGIN");

    for (const sql of legacyOrdersMigrationSql) {
      await pool.query(sql);
    }

    await pool.query(
      `UPDATE orders
       SET user_name = users.name
       FROM users
       WHERE orders.user_id = users.id
         AND orders.user_name = 'Guest';`,
    );

    await pool.query(
      `UPDATE orders
       SET total_amount = total
       WHERE total_amount = 0;`,
    );

    await pool.query(
      `UPDATE orders
       SET estimated_ready_at = created_at + INTERVAL '8 minutes'
       WHERE estimated_ready_at IS NULL;`,
    );

    await pool.query("COMMIT");
    logger.info({ component: "legacy-schema" }, "Orders table schema ensured");
  } catch (err) {
    await pool.query("ROLLBACK");
    logger.error({ err, component: "legacy-schema" }, "Failed to ensure legacy orders schema");
    throw err;
  }
}
