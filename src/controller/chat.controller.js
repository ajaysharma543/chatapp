import mongoose, { Mongoose } from "mongoose";
import { Chat } from "../models/chat.model.js";
import { Apierror } from "../utils/apierror.js";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { ChatMember } from "../models/chatmembers.js";

const accesschat = asynchandler(async (req, res) => {
  const { userid } = req.body;

  if (!userid) {
    throw new Apierror(400, "userid not provided");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        isGroup: false,
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
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    },

    {
      $lookup: {
        from: "messages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
      },
    },

    {
      $unwind: {
        path: "$lastMessage",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "lastMessage.sender",
        foreignField: "_id",
        as: "lastMessage.sender",
      },
    },

    {
      $unwind: {
        path: "$lastMessage.sender",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        "members.password": 0,
        "members.refreshtoken": 0,
        "members.__v": 0,
        "lastMessage.sender.password": 0,
        "lastMessage.sender.refreshtoken": 0,
        "lastMessage.sender.__v": 0,
      },
    },
  ]);

  if (chat.length > 0) {
    return res.status(200).json(new ApiResponse(200, chat[0], "chat fetched"));
  }

  const newChat = await Chat.create({
    members: [req.user._id, userid],
  });
  await ChatMember.create([
  { chat: newChat._id, user: req.user._id },
  { chat: newChat._id, user: userid },
]);

  const createdChat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(newChat._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    },
    {
      $project: {
        "members.password": 0,
        "members.refreshtoken": 0,
        "members.__v": 0,
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, createdChat[0], "chat created"));
});

const fetchchats = asynchandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const chats = await Chat.aggregate([
    {
      $match: {
        members: new mongoose.Types.ObjectId(req.user._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "members",
      },
    },

    {
      $lookup: {
        from: "messages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
      },
    },

    {
      $unwind: {
        path: "$lastMessage",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "lastMessage.sender",
        foreignField: "_id",
        as: "lastMessage.sender",
      },
    },

    {
      $unwind: {
        path: "$lastMessage.sender",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "messages",
        let: { chatId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$chat", "$$chatId"] },
                  { $ne: ["$sender", userId] },
                  { $not: { $in: [userId, "$readby"] } },
                ],
              },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "unreadData",
      },
    },

    {
      $addFields: {
        unreadCount: {
          $ifNull: [{ $arrayElemAt: ["$unreadData.count", 0] }, 0],
        },
      },
    },

    {
      $project: {
        "members.password": 0,
        "members.refreshtoken": 0,
        "members.__v": 0,
        "lastMessage.sender.password": 0,
        "lastMessage.sender.refreshtoken": 0,
        "lastMessage.sender.__v": 0,
        unreadData: 0,
      },
    },

    {
      $sort: {
        "lastMessage.createdAt": -1,
        createdAt: -1,
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, chats, "Chats fetched"));
});

const creategroupchat = asynchandler(async (req, res) => {
  const { name, members } = req.body;

  if (!name || !members) {
    throw new Apierror(400, "Please fill all fields");
  }

  if (!Array.isArray(members)) {
    throw new Apierror(400, "Members must be an array");
  }

  if (members.length < 2) {
    throw new Apierror(400, "At least 2 members required to create a group");
  }

  let uniqueMembers = [...new Set(members.map((id) => id.toString()))];

  if (!uniqueMembers.includes(req.user._id.toString())) {
    uniqueMembers.push(req.user._id.toString());
  }

  const groupchat = await Chat.create({
    chatName: name,
    isGroup: true,
    members: uniqueMembers,
    groupAdmin: req.user._id,
  });
  await ChatMember.insertMany(
  uniqueMembers.map((memberId) => ({
    chat: groupchat._id,
    user: memberId,
    joinedAt: new Date(),
  }))
);
  const fullGroupChat = await Chat.findById(groupchat._id)
    .populate("members", "-password -refreshtoken")
    .populate("groupAdmin", "-password -refreshtoken");

  let chatObj = fullGroupChat.toObject();

  chatObj.members = chatObj.members.filter(
    (member) => member._id.toString() !== chatObj.groupAdmin._id.toString()
  );

  const io = req.app.get("io");

  uniqueMembers.forEach((memberId) => {
    if (memberId.toString() !== req.user._id.toString()) {
      io.to(memberId.toString()).emit("group_created", chatObj);
    }
  });
  res
    .status(201)
    .json(new ApiResponse(201, chatObj, "Group created successfully"));
});

const renameGroup = asynchandler(async (req, res) => {
  const { chat, chatName } = req.body;

  if (!chatName || !chatName.trim()) {
    throw new Apierror(400, "Please enter a valid name");
  }

  if (!chat) {
    throw new Apierror(400, "invalid chat id");
  }

  const existingChat = await Chat.findById(chat);

  if (!existingChat) {
    throw new Apierror(404, "Group chat not found");
  }

  if (!existingChat.isGroup) {
    throw new Apierror(400, "Cannot rename personal chat");
  }

  if (existingChat.groupAdmin.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "Only admin can rename the group");
  }

  const updatedgroupchat = await Chat.findByIdAndUpdate(
    chat,
    {
      chatName: chatName,
    },
    {
      new: true,
    }
  );

  if (!updatedgroupchat) {
    throw new Apierror(400, "group chat not found");
  }

  const fullGroupChat = await Chat.findById(updatedgroupchat._id)
    .populate("members", "-password -refreshtoken")
    .populate("groupAdmin", "-password -refreshtoken");


  const io = req.app.get("io");

io.to(chat.toString()).emit("group_renamed", fullGroupChat);

fullGroupChat.members.forEach((member) => {
  io.to(member._id.toString()).emit("group_renamed", fullGroupChat);
});
  res
    .status(200)
    .json(new ApiResponse(200, fullGroupChat, "name change successfully"));
});

const removefromgroup = asynchandler(async (req, res) => {
  const { chat, userid } = req.body;

  if (!chat) {
    throw new Apierror(404, "Chat not found");
  }

  if (!userid) {
    throw new Apierror(404, "User not found");
  }

  const chatData = await Chat.findById(chat);

  if (!chatData) {
    throw new Apierror(404, "Chat not found");
  }

  if (!chatData.members.includes(userid)) {
    throw new Apierror(400, "User is not in the group");
  }

  if (chatData.groupAdmin.toString() === userid) {
    throw new Apierror(400, "Admin cannot be removed");
  }

  if (
    chatData.groupAdmin.toString() !== req.user._id.toString() &&
    userid !== req.user._id.toString()
  ) {
    throw new Apierror(403, "Only admin can remove others");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chat,
    {
      $pull: { members: userid },
    },
    { new: true }
  )
    .populate("members", "-password")
    .populate("groupAdmin", "-password");

    await ChatMember.deleteOne({
  chat: chat,
  user: userid,
});
  if (!updatedChat) {
    throw new Apierror(404, "Chat not found");
  }
  const io = req.app.get("io");

  if (userid === req.user._id.toString()) {
    io.to(chat).emit("left_group", {
      chatId: chat,
      userId: userid,
    });
  } else {
    io.to(chat).emit("kicked_from_group", {
      chatId: chat,
      userId: userid,
    });

    io.to(userid).emit("removed_from_group", {
      chatId: chat,
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedChat, "User removed from group"));
});

const addtogroup = asynchandler(async (req, res) => {
  const { userid, chat } = req.body;

  if (!chat) {
    throw new Apierror(404, "Chat not found");
  }

  if (!userid) {
    throw new Apierror(404, "User not found");
  }

  const chatData = await Chat.findById(chat);

  if (!chatData) {
    throw new Apierror(404, "Chat not found");
  }

  if (chatData.members.includes(userid)) {
    throw new Apierror(400, "User is already in the group");
  }
  if (chatData.groupAdmin.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "Only admin can add users");
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    chat,
     {
$addToSet: {
  members: userid
}    },
    { new: true }
  )
    .populate("members", "-password")
    .populate("groupAdmin", "-password");

    await ChatMember.create({
  chat: chat,
  user: userid,
  joinedAt: new Date(),
});

  if (!updatedChat) {
    throw new Apierror(404, "Chat not found");
  }
    const io = req.app.get("io");

  io.to(chat).emit("user_added", {
    chatId: chat,
    userId: userid,
  });

io.to(userid).emit("added_to_group", updatedChat);

  res
    .status(200)
    .json(new ApiResponse(200, updatedChat, "User added to group"));
});

export { accesschat, fetchchats, creategroupchat, renameGroup,removefromgroup,addtogroup };
