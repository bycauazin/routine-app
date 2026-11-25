import { Router } from "express";
import admin from "./admin.js";
import auth from "./auth.js";
import routine from "./routine.js";
import simulations from "./simulations.js";
import specialDays from "./specialDays.js";
import telegram from "./telegram.js";
import water from "./water.js";
import reports from "./reports.js";
import security from "./security.js";

/** All /api/v1 routes. Each file only connects auth → Form → Controller. */
const router = Router();

router.use(auth);
router.use(security);
router.use(admin);
router.use(routine);
router.use(water);
router.use(telegram);
router.use(simulations);
router.use(specialDays);
router.use(reports);

export default router;
