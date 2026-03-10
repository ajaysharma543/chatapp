import { Router } from "express";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import { accesschat } from "../controller/chat.controller.js";

const router = Router();

router.route("/access").post(verifyjwt, accesschat);

export default router;