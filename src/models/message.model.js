import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
    },
    isdeleted: {
      type: Boolean,
      default: false,
    },
    readby: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    image: {
      public_id: String,
      url: String,
    },
  },
  {
    timestamps: true,
  }
);
export const Message = mongoose.model("Message", messageSchema);
