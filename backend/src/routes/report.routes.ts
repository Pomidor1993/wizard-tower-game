import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import * as ReportController from "../controllers/report.controller.js";

const router = Router();

router.get("/", requireAuth, ReportController.listReports);
router.get("/:reportId", requireAuth, ReportController.getReport);
router.patch("/:reportId/read", requireAuth, ReportController.markRead);

export default router;