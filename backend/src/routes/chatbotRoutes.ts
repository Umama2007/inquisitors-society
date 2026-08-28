import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { chatbotSchema } from "../middleware/schemas";
import { chat } from "../controllers/chatbotController";

const router = Router();

router.use(authenticate);

router.post("/", validate(chatbotSchema), chat);

export default router;
