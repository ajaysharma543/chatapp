import { Router } from "express";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import { sendmessage } from "../controller/message.controller.js";

const router = Router();

router.route("/").post(verifyjwt, sendmessage);

export default router;