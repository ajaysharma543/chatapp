import { generatetoken } from "../middlewares/generatetoken.middlewares.js";
import { User } from "../models/user.model.js";
import { Apierror } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploaodoncloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"
const registeruser = asynchandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  const existedemail = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedemail) {
    throw new Apierror(409, "user with same email id already exists");
  }

  const avatarlocalpath = req.files?.avatar?.[0]?.path;

  if (!avatarlocalpath) {
    throw new Apierror(400, "Avatar file not found");
  }

  const avatar = await uploaodoncloudinary(avatarlocalpath);

  if (!avatar) {
    throw new Apierror(400, "Avatar file is required");
  }

  const user = await User.create({
    fullname,
    username,
    email,
    password,
    avatar: {
      public_id: avatar?.public_id || "",
      url: avatar?.secure_url || "",
    },
  });

  const { accesstoken, refreshtoken } = await generatetoken(user._id);

  const createdUser = await User.findById(user?._id).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new Apierror(500, "Something went wrong while registering the user");
  }
  const isProduction = process.env.NODE_ENV === "production";

  const options = {
    httpOnly: true,
    secure: isProduction, // HTTPS only
    sameSite: isProduction ? "none" : "lax", // allow cross-origin in prod
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
  };


  res
    .status(200)
    .cookie("accesstoken", accesstoken, options)
    .cookie("refreshtoken", refreshtoken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: createdUser,
          accesstoken,
          refreshtoken,
        },
        "User registered successfully"
      )
    );
});

const loginuser =asynchandler(async (req,res) => {
  const {email,username,password} = req.body;

  if((!email||username)) {
    throw new Apierror(401, "email or username not found")
  }

  const Existeduser = await User.findOne({
    $or : [{email}, {username}],
  })

  if(!Existeduser) {
    throw new Apierror(404, "user not found")
  }

  const ispasswordcorrect = await Existeduser.ispasswordcorrect(password);

  if(!ispasswordcorrect) {
        throw new Apierror(401, "password not found");
  }

  const {accesstoken,refreshtoken} = await generatetoken(Existeduser?._id)

  const loggeduser = await User.findById(Existeduser?._id).select("-password -refreshtoken")

    const isProduction = process.env.NODE_ENV === "production";

 const options = {
    httpOnly: true,
    secure: isProduction, // HTTPS only
    sameSite: isProduction ? "none" : "lax", // allow cross-origin in prod
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
  };
 res
    .status(200)
    .cookie("accesstoken", accesstoken, options)
    .cookie("refreshtoken", refreshtoken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggeduser,
          accesstoken,
          refreshtoken,
        },
        "user logged in successfully"
      )
    );
})

const logout = asynchandler(async(req,res) => {
  await User.findByIdAndUpdate(
    req.user?._id,{
      $unset : {
        refreshtoken : 1
      }
    },
    {
      new: true,
    }
  )
   const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };
  return res
    .status(200)
    .clearCookie("accesstoken", options)
    .clearCookie("refreshtoken", options)
    .json(new ApiResponse(200, {}, "user logout successfully"));
});

const getCurrentUser = asynchandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});
const refreshAccesstoken = asynchandler(async (req, res) => {

  const incomingRefreshtoken =
    req.cookies?.refreshtoken || req.body.refreshtoken;

  if (!incomingRefreshtoken) {
    throw new Apierror(401, "Unauthorized request");
  }

try {
  const decoded = jwt.verify(incomingRefreshtoken,process.env.REFRESH_TOKEN_SECRET);
   const user = await User.findById(decoded?._id);

    if (!user) {
      throw new Apierror(401, "Invalid refresh token");
    }
      if (incomingRefreshtoken !== user?.refreshtoken) {
          throw new Apierror(401, "Refresh token is expired or used");
        }

            const { accesstoken, refreshtoken: newRefreshtoken } =
      await generatetoken(user._id);

    const options = {
      httpOnly: true,
      secure: true, // use false for local testing if not using HTTPS
    };

    res
      .status(200)
      .cookie("accesstoken", accesstoken, options)
      .cookie("refreshtoken", newRefreshtoken, options)
      .json(
        new ApiResponse(
          200,
          { accesstoken, refreshtoken: newRefreshtoken },
          "Refresh token updated successfully"
        )
      );
  } catch (error) {
    throw new Apierror(401, error?.message || "Invalid refresh token");
  }
});

export { registeruser,loginuser,logout,getCurrentUser,refreshAccesstoken };
