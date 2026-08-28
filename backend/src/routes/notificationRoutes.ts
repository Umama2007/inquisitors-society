import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listNotifications, markRead, markAllRead } from "../controllers/notificationController";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);
router.put("/:id/read", markRead);
router.put("/read-all", markAllRead);

export default router;
