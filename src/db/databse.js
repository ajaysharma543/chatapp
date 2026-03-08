import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectdatabse = async () => {
  try {
    const connection = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(`\n mongo db connected : ${connection.connection.host}`);
  } catch (error) {
    console.log(`error connecting database ${error}`);
    process.exit(1);
  }
};

export default connectdatabse;
