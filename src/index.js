import express from "express";
import { app } from "./app.js";
import connectdatabse from "./db/databse.js";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import { User } from "./models/user.model.js";
dotenv.config({
  path: "./.env",
});
connectdatabse()
  .then(() => {
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: "http://localhost:5173",
        credentials: true,
      },
    });
    app.use((req, res, next) => {
      req.io = io;
      next();
    });
    app.set("io", io);
    const onlineUsers = new Map();
    io.on("connection", (socket) => {
      // console.log("User connected:", socket.id);

      socket.on("join_user", (userId) => {
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        socket.broadcast.emit("user_online", userId);
      });
      socket.on("join_chat", (chatId) => {
        socket.join(chatId.toString());
        // console.log("➡️ Socket", socket.id, "joining chat:", chatId);
      });
      socket.on("leave_chat", (chatId) => {
        socket.leave(chatId);
        console.log("LEFT:", chatId);
      });

      socket.on("typing", ({ chatId, userId }) => {
        socket.to(chatId).emit("typing", { chatId, userId });
      });

      socket.on("stop_typing", ({ chatId, userId }) => {
        socket.to(chatId).emit("stop_typing", { chatId, userId });
      });

      socket.on("inactive", async (userId) => {
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, {
          lastSeen: new Date(),
        });

        socket.broadcast.emit("user_offline", {
          userId,
          lastSeen: new Date(),
        });
      });

      socket.on("disconnect", async () => {
        let disconnectedUser = null;

        for (let [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
            disconnectedUser = userId;
            onlineUsers.delete(userId);
            break;
          }
        }

        if (disconnectedUser) {
          const lastSeen = new Date();

          await User.findByIdAndUpdate(disconnectedUser, {
            lastSeen,
          });

          socket.broadcast.emit("user_offline", {
            userId: disconnectedUser,
            lastSeen,
          });
        }
      });
    });
    server.listen(process.env.PORT || 4000, () => {
      console.log(
        `⚙️ Server is running at port : http://localhost:${process.env.PORT}`
      );
    });
    app.on("error", (error) => {
      console.log("Error", error);
      throw error;
    });
  })
  .catch((error) => {
    console.log("mongo connection failed", error);
  });
