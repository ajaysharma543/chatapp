import { User } from "../models/user.model.js";
import { Apierror } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"
export const verifyjwt = asynchandler(async(req, _, next) => {
    try {
 const token =
      req.cookies?.accesstoken ||
      req.header("Authorization")?.replace("Bearer ", "");
               if (!token) {
      throw new Apierror(401, "Unauthorized request");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select(
      "-password -refreshtoken"
    )
     if (!user) {
          throw new Apierror(401, "Invalid access token");
        }
        
        req.user = user;
        next()
    } catch (error) {
    throw new Apierror(401, error?.message || "Invalid access token");
  }
})