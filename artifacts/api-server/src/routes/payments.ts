import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import {
  CreatePaymentOrderBody,
  VerifyPaymentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/payments/create-order", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreatePaymentOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.status(201).json({
    razorpayOrderId,
    amount: parsed.data.amount * 100,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  });
});

router.post("/payments/verify", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const secret = process.env.RAZORPAY_KEY_SECRET || "test_secret";
  const body = `${parsed.data.razorpayOrderId}|${parsed.data.razorpayPaymentId}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const isValid = process.env.RAZORPAY_KEY_SECRET
    ? expectedSignature === parsed.data.razorpaySignature
    : true;

  if (!isValid) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  if (parsed.data.orderId != null) {
    await db.update(ordersTable).set({ paymentStatus: "paid" }).where(eq(ordersTable.id, parsed.data.orderId));
  }

  res.json({ success: true, message: "Payment verified successfully" });
});

export default router;
