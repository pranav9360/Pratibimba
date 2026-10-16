import express from "express";
import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";
import { getActivityLogs } from "../controllers/activityLogController.js";

const router = express.Router();

router.get("/", authenticate, authorize("super_admin"), getActivityLogs);

export default router;
