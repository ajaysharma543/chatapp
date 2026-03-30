import { Router } from "express";
import {
  changeaccountdetails,
  changeuseravatar,
  getallusers,
  getCurrentUser,
  loginuser,
  logout,
  refreshAccesstoken,
  registeruser,
  removeavatar,
  
} from "../controller/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router = Router();

/* ================= AUTH ================= */

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registeruser
);

router.route("/login").post(loginuser);
router.route("/logout").post(verifyjwt, logout);
router.route("/refreshtoken").post(refreshAccesstoken);


router.route("/getcurrentuser").get(verifyjwt, getCurrentUser);
router.route("/getallusers").get(verifyjwt, getallusers);


router.route("/update-profile").patch(verifyjwt, changeaccountdetails);

router.route("/change-avatar").patch(
  verifyjwt,
  upload.single("avatar"),
  changeuseravatar
);
router.route("/remove-avatar").patch(verifyjwt, removeavatar);

export default router;