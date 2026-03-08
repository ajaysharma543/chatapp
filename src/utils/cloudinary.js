import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Apierror } from "./apierror.js";
import { asynchandler } from "./asynchandler.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploaodoncloudinary = async (localpath) => {
  try {
    if (!localpath) return null;
    const response = await cloudinary.uploader.upload(localpath, {
      folder: "chatapp",
      resource_type: "auto",
    });   
        console.log("file is uploaded on cloudinary ", response);
     return response;
    fs.unlinkSync(localpath);
  } catch (error) {
    fs.unlinkSync(localpath);
    return null;
  }
};

export { uploaodoncloudinary };
