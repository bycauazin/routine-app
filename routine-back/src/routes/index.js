import { Router } from "express";
import admin from "./admin.js";
import auth from "./auth.js";
import security from "./security.js";

/** All /api/v1 routes. Each file only connects auth → Form → Controller. */
const router = Router();

router.use(auth);
router.use(security);
router.use(admin);

export default router;
