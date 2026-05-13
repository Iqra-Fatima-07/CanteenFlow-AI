import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import usersRouter from "./users";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import seatsRouter from "./seats";
import aiRouter from "./ai";
import paymentsRouter from "./payments";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import otpRouter from "./otp";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json(HealthCheckResponse.parse({ status: "ok" }));
});

router.use(usersRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(seatsRouter);
router.use(aiRouter);
router.use(paymentsRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);
router.use(otpRouter);

export default router;
