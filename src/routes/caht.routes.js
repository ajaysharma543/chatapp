import { Router } from "express";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import {
  accesschat,
  creategroupchat,
  fetchchats,
  renameGroup,
} from "../controller/chat.controller.js";

const router = Router();

router.route("/access").post(verifyjwt, accesschat);
router.route("/fetch").get(verifyjwt, fetchchats);
router.route("/group").post(verifyjwt, creategroupchat);
router.route("/namechange").put(verifyjwt, renameGroup);

export default router;
