import express from "express";
import { app } from "./app.js";
import connectdatabse from "./db/databse.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});
connectdatabse()
  .then(() => {
    app.on("error", (error) => {
      console.log("Error", error);
      throw error;
    });
  })
  .then(() => {
    app.listen(process.env.PORT || 4000, () => {
      console.log(
        `⚙️ Server is running at port : http://localhost:${process.env.PORT}`
      );
    });
  })
  .catch((error) => {
    console.log("mongo connection failed", error);
  });
