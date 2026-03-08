import { generatetoken } from "../middlewares/generatetoken.middlewares.js";
import { User } from "../models/user.model.js";
import { Apierror } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploaodoncloudinary } from "../utils/cloudinary.js";

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

  const options = {
    httpOnly: true,
    maxAge: 10 * 24 * 60 * 60 * 1000,
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

export { registeruser };
