import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roleCheck";
import { validate } from "../middleware/validate";
import {
  createEventSchema,
  updateEventSchema,
  registerStudentSchema,
  markAttendanceSchema,
} from "../middleware/schemas";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerStudent,
  cancelRegistration,
  getAttendance,
  markAttendance,
} from "../controllers/eventController";

const router = Router();

router.use(authenticate);

router.get("/", listEvents);
router.get("/:id", getEvent);
router.post("/", requireRole("admin", "teacher"), validate(createEventSchema), createEvent);
router.put("/:id", requireRole("admin", "teacher"), validate(updateEventSchema), updateEvent);
router.delete("/:id", requireRole("admin", "teacher"), deleteEvent);

router.post("/:id/register", validate(registerStudentSchema), registerStudent);
router.delete("/:id/register", cancelRegistration);

router.get("/:id/attendance", requireRole("admin", "teacher"), getAttendance);
router.post("/:id/attendance", requireRole("admin", "teacher"), validate(markAttendanceSchema), markAttendance);

export default router;
