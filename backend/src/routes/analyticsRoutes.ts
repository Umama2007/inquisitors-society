import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { dashboard, eventAnalytics, internshipAnalytics } from "../controllers/analyticsController";

const router = Router();

router.use(authenticate);

router.get("/dashboard", dashboard);
router.get("/events", eventAnalytics);
router.get("/internships", internshipAnalytics);

export default router;
