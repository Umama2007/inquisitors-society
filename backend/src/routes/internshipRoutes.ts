import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roleCheck";
import { validate } from "../middleware/validate";
import {
  createInternshipSchema,
  updateInternshipSchema,
  applyInternshipSchema,
  evaluateApplicationSchema,
} from "../middleware/schemas";
import {
  listInternships,
  getInternship,
  createInternship,
  updateInternship,
  deleteInternship,
  applyToInternship,
  listApplications,
  evaluateApplication,
} from "../controllers/internshipController";

const router = Router();

router.use(authenticate);

router.get("/", listInternships);
router.get("/:id", getInternship);
router.post("/", requireRole("admin", "teacher"), validate(createInternshipSchema), createInternship);
router.put("/:id", requireRole("admin", "teacher"), validate(updateInternshipSchema), updateInternship);
router.delete("/:id", requireRole("admin", "teacher"), deleteInternship);

router.post("/:id/apply", validate(applyInternshipSchema), applyToInternship);
router.get("/:id/applications", requireRole("admin", "teacher"), listApplications);
router.put("/applications/:id/evaluate", requireRole("admin", "teacher"), validate(evaluateApplicationSchema), evaluateApplication);

export default router;
