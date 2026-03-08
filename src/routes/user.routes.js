import { Router } from "express";
import { getCurrentUser, loginuser, logout, refreshAccesstoken, registeruser } from "../controller/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(upload.fields([
  {
    name: "avatar",
    maxCount: 1,
  },
]), registeruser);
router.route("/login").post(loginuser);
router.route("/logout").post(verifyjwt, logout);
router.route("/getcurrentuser").get(verifyjwt, getCurrentUser);
router.route("/refreshtoken").post(refreshAccesstoken);

export default router;