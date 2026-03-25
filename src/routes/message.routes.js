import { Router } from "express";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import {
  allmessages,
  deletemessage,
  markasread,
  sendmessage,
} from "../controller/message.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/").post(
  verifyjwt,
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  sendmessage
);
router.route("/:chatId").get(verifyjwt, allmessages);
router.route("/read/:chatId").patch(verifyjwt, markasread);
router.route("/:messageId").delete(verifyjwt, deletemessage);

export default router;
