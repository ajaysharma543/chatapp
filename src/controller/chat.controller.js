import mongoose from "mongoose";
import { Chat } from "../models/chat.model.js";
import { Apierror } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/apiresponse.js";

const accesschat = asynchandler(async (req, res) => {
  const { userid } = req.body;

  if (!userid) {
    throw new Apierror(404, "userid not found");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        members: {
          $all: [
            new mongoose.Types.ObjectId(req.user._id),
            new mongoose.Types.ObjectId(userid),
          ],
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members",   // ✅ FIXED
        foreignField: "_id",
        as: "members",
      },
    },
  ]);

  if (chat.length > 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "chat fetched"));
  }

  const newChat = await Chat.create({
    chatName: "sender",
    members: [req.user._id, userid],
  });

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(newChat._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members",   // ✅ FIXED
        foreignField: "_id",
        as: "members",
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, createdChat[0], "chat created"));
});

export { accesschat };