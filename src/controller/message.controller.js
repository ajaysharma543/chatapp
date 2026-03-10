import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { Apierror } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const sendmessage = asynchandler(async (req,res) => {
    const {content, chat} = req.body;
    if (!content && !req.file) {
    throw new Apierror(400, "Message cannot be empty");
  }
     if(!chat) {
        throw new Apierror(400,"chat not found")
    }
const newmessage = await Message.create({
        sender : req.user._id,
        chat : chat,
        content  : content
    })
   const userchat = await Message.aggregate([
  {
    $match: {
      _id: new mongoose.Types.ObjectId(newmessage._id)
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "sender",
      foreignField: "_id",
      as: "userdetails"
    }
  },
  {
    $unwind: "$userdetails"
  },
  {
    $project: {
      content: 1,
      chat: 1,
      createdAt: 1,
      sender: {
        _id: "$userdetails._id",
        fullname: "$userdetails.fullname",
        avatar: "$userdetails.avatar"
      }
    }
  }
]);

    res.status(200).json(new ApiResponse(200,userchat[0], "message created successfully"))

})

export {sendmessage}