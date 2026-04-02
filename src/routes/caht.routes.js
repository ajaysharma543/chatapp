import { Router } from "express";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import {
  accesschat,
  addtogroup,
  creategroupchat,
  fetchchats,
  removefromgroup,
  renameGroup,
} from "../controller/chat.controller.js";

const router = Router();

router.route("/access").post(verifyjwt, accesschat);
router.route("/fetch").get(verifyjwt, fetchchats);
router.route("/group").post(verifyjwt, creategroupchat);
router.route("/rename").put(verifyjwt, renameGroup);
router.route("/groupremove").put(verifyjwt, removefromgroup);
router.route("/groupadd").put(verifyjwt, addtogroup);

export default router;
