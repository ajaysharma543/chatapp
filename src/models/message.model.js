import mongoose, { Schema }  from "mongoose"

const messageSchema = new Schema(
   {
 sender : {
    type : mongoose.Schema.Types.ObjectId,
    ref : "User"
    },
    content : {
        type: String,
        trim: true
    },
    readby :[
    {
    type : mongoose.Schema.Types.ObjectId,
    ref : "User"
    }
],
    chat : {
    type : mongoose.Schema.Types.ObjectId,
    ref : "Chat"
    },
    image : {
        type: {
        public_id: String,
        url: String,
      },
    }
   },
   {
    timestamps : true,
   }
)
export const Message  = mongoose.model("Message", messageSchema)