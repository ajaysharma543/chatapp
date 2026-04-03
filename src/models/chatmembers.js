import mongoose, { Schema } from "mongoose";

const chatMemberSchema = new Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
},
 {
    timestamps: true,
  });

export const ChatMember = mongoose.model("ChatMember", chatMemberSchema);