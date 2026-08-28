import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { env } from "../config/env";

const router = Router();

router.use(authenticate);

router.post("/", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const url = `${env.BACKEND_URL}/uploads/${req.file.filename}`;
  res.json({
    url,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

export default router;
