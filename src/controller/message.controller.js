import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { Chat } from "../models/chat.model.js";
import { Apierror } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploaodoncloudinary } from "../utils/cloudinary.js";
import { ChatMember } from "../models/chatmembers.js";

const sendmessage = asynchandler(async (req, res) => {
  const { content, chat } = req.body;

  if (!chat || (!content && !req.files?.image)) {
    throw new Apierror(400, "Message or image required");
  }

  let uploadedImage = null;

  if (req.files?.image?.length > 0) {
    const imagepath = req.files.image[0].path;
    uploadedImage = await uploaodoncloudinary(imagepath);
  }

  const newmessage = await Message.create({
    sender: req.user._id,
    content,
    chat,
    image: uploadedImage
      ? {
          public_id: uploadedImage.public_id,
          url: uploadedImage.secure_url,
        }
      : null,
    readby: [req.user._id],
  });

  await Chat.findByIdAndUpdate(chat, {
    lastMessage: newmessage._id,
  });

  const messageData = await Message.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(newmessage._id),
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
      },
    },
    {
      $unwind: "$sender",
    },

    {
      $lookup: {
        from: "chats",
        localField: "chat",
        foreignField: "_id",
        as: "chat",
      },
    },
    {
      $unwind: "$chat",
    },

    {
      $lookup: {
        from: "users",
        localField: "chat.members",
        foreignField: "_id",
        as: "chat.members",
      },
    },

    {
      $project: {
        content: 1,
        image: 1,
        readby: 1,
        createdAt: 1,

        sender: {
          _id: "$sender._id",
          fullname: "$sender.fullname",
          avatar: "$sender.avatar",
        },

        chat: {
          _id: "$chat._id",
          isGroup: "$chat.isGroup",
          members: {
            $map: {
              input: "$chat.members",
              as: "m",
              in: {
                _id: "$$m._id",
                fullname: "$$m.fullname",
                avatar: "$$m.avatar",
                email: "$$m.email",
              },
            },
          },
        },
      },
    },
  ]);
  const io = req.app.get("io");

  const chatId = messageData[0].chat._id.toString();

  io.to(chatId).emit("new_message", messageData[0]);

  messageData[0].chat.members.forEach((member) => {
    const memberId = member._id.toString();
    const senderId = req.user._id.toString();

    if (memberId === senderId) return;

    io.to(memberId).emit("new_message", messageData[0]);

    io.to(memberId).emit("new_notification", {
      sender: messageData[0].sender,
      message: messageData[0],
    });
  });
  res
    .status(200)
    .json(new ApiResponse(200, messageData[0], "message created successfully"));
});

const allmessages = asynchandler(async (req, res) => {
  const { chatId } = req.params;

  if (!chatId) {
    throw new Apierror(404, "chatId not found");
  }
  const member = await ChatMember.findOne({
    chat: chatId,
    user: req.user._id,
  });

  if (!member) {
    throw new Apierror(403, "You are not part of this chat");
  }
  const messages = await Message.aggregate([
    {
      $match: {
        chat: new mongoose.Types.ObjectId(chatId),
        createdAt: { $gte: member.joinedAt },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
      },
    },
    {
      $unwind: "$sender",
    },

    {
      $lookup: {
        from: "chats",
        localField: "chat",
        foreignField: "_id",
        as: "chat",
      },
    },
    {
      $unwind: "$chat",
    },

    {
      $lookup: {
        from: "users",
        localField: "chat.members",
        foreignField: "_id",
        as: "chat.members",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "readby",
        foreignField: "_id",
        as: "readby",
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        readby: 1,
        isDeleted: 1,
        image: 1,
        readby: {
          _id: 1,
          fullname: 1,
          avatar: 1,
        },
        sender: {
          _id: "$sender._id",
          fullname: "$sender.fullname",
          avatar: "$sender.avatar",
        },

        chat: {
          _id: "$chat._id",
          isGroup: "$chat.isGroup",
          members: {
            _id: 1,
            fullname: 1,
            avatar: 1,
            email: 1,
          },
        },
      },
    },

    {
      $sort: {
        createdAt: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { messages: Array.isArray(messages) ? messages : [] },
        "all messages fetched"
      )
    );
});

const markasread = asynchandler(async (req, res) => {
  const { chatId } = req.params;

  if (!chatId) {
    throw new Apierror(400, "chatId required");
  }

  const read = await Message.updateMany(
    {
      chat: chatId,
      sender: { $ne: req.user._id },
      readby: { $ne: req.user._id },
    },
    {
      $addToSet: { readby: req.user._id },
    }
  );

  const io = req.app.get("io");

  const chat = await Chat.findById(chatId);

  chat.members.forEach((member) => {
    if (member.toString() !== req.user._id.toString()) {
      io.to(member.toString()).emit("messages_read", {
        chatId,
        userId: req.user._id,
      });
    }
  });

  res
    .status(200)
    .json(new ApiResponse(200, { read }, "Messages marked as read"));
});

const deletemessage = asynchandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    throw new Apierror(400, "Message ID not provided");
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new Apierror(404, "Message not found");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    throw new Apierror(403, "You can delete only your own message");
  }

  if (message.isDeleted) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message already deleted"));
  }

  const chatId = message.chat;

  const currentLastMessage = await Message.findOne({
    chat: chatId,
    isDeleted: { $ne: true },
  }).sort({ createdAt: -1 });

  const isLastMessage =
    currentLastMessage?._id.toString() === messageId.toString();

  await Message.updateOne(
    { _id: messageId },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    }
  );

  let finalLastMessage = null;

  if (isLastMessage) {
    finalLastMessage = {
      _id: message._id,
      content: "This message was deleted",
      isDeleted: true,
      sender: message.sender,
      createdAt: message.createdAt,
    };
  } else {
    finalLastMessage = await Message.findOne({
      chat: chatId,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "sender",
        select: "fullname avatar",
      });
  }

  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: finalLastMessage?._id || null,
  });

  const chat = await Chat.findById(chatId).select("members");
  const io = req.app.get("io");

  chat.members.forEach((member) => {
    const wasUnread = !(message.readby || []).some(
      (u) => u.toString() === member.toString()
    );

    io.to(member.toString()).emit("message_deleted", {
      messageId: messageId,
      chatId: chatId.toString(),
      lastMessage: finalLastMessage,
      isLastMessageDeleted: isLastMessage,
      wasUnread,
    });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Message deleted successfully"));
});

export { sendmessage, allmessages, markasread, deletemessage };
