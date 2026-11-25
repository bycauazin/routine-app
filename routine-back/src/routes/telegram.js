import { Router } from "express";
import TelegramController from "../controllers/TelegramController.js";
import { blockDemo, requireAuth } from "../middlewares/auth.js";

const router = Router();
const { routes } = TelegramController;

router.get(routes.telegram, requireAuth, TelegramController.status());
router.post(routes.link, requireAuth, blockDemo, TelegramController.createLink());
router.delete(routes.link, requireAuth, TelegramController.unlink());

export default router;
