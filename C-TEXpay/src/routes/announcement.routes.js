import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requirePlatformRole } from "../middleware/platformRole.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createAnnouncementSchema } from "../validation/announcement.validation.js";
import { createAnnouncement } from "../controller/announcement.controller.js";

const router = Router();
router.post("/announcements", protect, requirePlatformRole("ADMIN", "SUPER_ADMIN"), validate(createAnnouncementSchema), createAnnouncement);
export default router;
